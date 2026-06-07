import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, Keyboard, FlatList, Image, Alert, Animated, RefreshControl,
  Modal, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateLastReadTimestamp, fetchMessagingSettings, fetchTodayMessageCount, incrementTodayMsgCount } from '../../store/slices/messagesSlice';
import { scale } from '../../utils/responsive';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../api/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';

// Blinking dot component for unread messages
const BlinkingDot: React.FC<{ count: number }> = ({ count }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.blinkingBadge, { opacity }]}>
      <Text style={styles.blinkingBadgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

import { GROUPS } from '../../store/slices/messagesSlice';

const EMOJI_LIST = [
  "😊","😂","❤️","👍","🎉","🔥","👋","💪","🙏","✨",
  "😍","🤔","👏","💯","🎓","📚","✅","⭐","🏆","💡",
  "😎","🥳","💐","🌟","📝","✍️","🤝","🙌","💬","📢",
];

// Quick-reaction emojis shown on double-tap (subset for speed)
const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏", "🎉"];

// ── Main Component ────────────────────────────────────────────────────────
export const MessagesScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // State
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [inputText, setInputText] = useState('');
  const [groupMsgCounts, setGroupMsgCounts] = useState<Record<string, number>>({});
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, { sender: string; text: string }>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Link & Message Option States
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Keyboard Selection & Emoji States
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  // Reaction States
  const [reactionTargetMsg, setReactionTargetMsg] = useState<any | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionAnim = useRef(new Animated.Value(0)).current;
  // Modal that shows who reacted
  const [reactionNamesModal, setReactionNamesModal] = useState<{
    emoji: string;
    users: { uid: string; name: string }[];
  } | null>(null);

  // Link press and render helper functions
  const handlePressLink = async (url: string) => {
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      fullUrl = `https://${url}`;
    }
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    const { start, end } = selection;
    const newValue = inputText.substring(0, start) + emoji + inputText.substring(end);
    setInputText(newValue);
    setShowEmojiModal(false);

    // Reposition cursor after the inserted emoji
    const newCursor = start + emoji.length;
    setSelection({ start: newCursor, end: newCursor });
  };

  const parseInlineStyles = (text: string) => {
    const segments: Array<{ type: 'text' | 'bold' | 'italic' | 'link'; content: string; label?: string; url?: string }> = [];
    let currentIndex = 0;

    const regex = /(\[(.*?)\]\(((?:https?:\/\/|www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)]*)\))|(\*\*(.*?)\*\*)|(__(.*?)__)|(\*(.*?)\*)|(_(.*?)_)|((?:https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      if (matchIndex > currentIndex) {
        segments.push({
          type: 'text',
          content: text.substring(currentIndex, matchIndex)
        });
      }

      if (match[1]) {
        segments.push({
          type: 'link',
          label: match[2],
          url: match[3],
          content: match[2]
        });
      } else if (match[4]) {
        segments.push({
          type: 'bold',
          content: match[5]
        });
      } else if (match[6]) {
        segments.push({
          type: 'bold',
          content: match[7]
        });
      } else if (match[8]) {
        segments.push({
          type: 'italic',
          content: match[9]
        });
      } else if (match[10]) {
        segments.push({
          type: 'italic',
          content: match[11]
        });
      } else if (match[12]) {
        segments.push({
          type: 'link',
          label: match[12],
          url: match[12],
          content: match[12]
        });
      }

      currentIndex = regex.lastIndex;
    }

    if (currentIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }

    return segments;
  };

  const renderMessageText = (text: string, isMine: boolean) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
      <View style={{ gap: 2 }}>
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          let blockType = 'paragraph';
          let textToParse = line;

          if (trimmed.startsWith('### ')) {
            blockType = 'h3';
            textToParse = trimmed.substring(4);
          } else if (trimmed.startsWith('## ')) {
            blockType = 'h2';
            textToParse = trimmed.substring(3);
          } else if (trimmed.startsWith('# ')) {
            blockType = 'h1';
            textToParse = trimmed.substring(2);
          } else if (trimmed.startsWith('- ')) {
            blockType = 'list';
            textToParse = trimmed.substring(2);
          } else if (trimmed.startsWith('* ')) {
            blockType = 'list';
            textToParse = trimmed.substring(2);
          }

          const segments = parseInlineStyles(textToParse);

          // Base block style
          let blockStyle: any = {
            fontSize: 14,
            lineHeight: 20,
            color: isMine ? '#fff' : theme.text,
          };

          if (blockType === 'h1') {
            blockStyle = {
              fontSize: 18,
              lineHeight: 24,
              fontWeight: '800',
              marginTop: 6,
              marginBottom: 4,
              color: isMine ? '#fff' : theme.text,
            };
          } else if (blockType === 'h2') {
            blockStyle = {
              fontSize: 16,
              lineHeight: 22,
              fontWeight: '700',
              marginTop: 4,
              marginBottom: 2,
              color: isMine ? '#fff' : theme.text,
            };
          } else if (blockType === 'h3') {
            blockStyle = {
              fontSize: 15,
              lineHeight: 20,
              fontWeight: '700',
              marginTop: 3,
              marginBottom: 2,
              color: isMine ? '#fff' : theme.text,
            };
          } else if (blockType === 'list') {
            blockStyle = {
              fontSize: 14,
              lineHeight: 20,
              marginLeft: 12,
              color: isMine ? '#fff' : theme.text,
            };
          }

          return (
            <Text key={lineIdx} style={blockStyle}>
              {blockType === 'list' && <Text style={{ fontWeight: '700' }}>• </Text>}
              {segments.map((seg, segIdx) => {
                if (seg.type === 'bold') {
                  return (
                    <Text key={segIdx} style={{ fontWeight: '700' }}>
                      {seg.content}
                    </Text>
                  );
                }
                if (seg.type === 'italic') {
                  return (
                    <Text key={segIdx} style={{ fontStyle: 'italic' }}>
                      {seg.content}
                    </Text>
                  );
                }
                if (seg.type === 'link') {
                  return (
                    <Text
                      key={segIdx}
                      style={{
                        color: isMine ? '#fff' : theme.primary,
                        textDecorationLine: 'underline',
                        fontWeight: '700',
                      }}
                      onPress={() => handlePressLink(seg.url!)}
                    >
                      {seg.label}
                    </Text>
                  );
                }
                return seg.content;
              })}
            </Text>
          );
        })}
      </View>
    );
  };

  // ── Reaction handlers ─────────────────────────────────────────────────
  const handleDoubleTapMessage = (msg: any) => {
    setReactionTargetMsg(msg);
    setShowReactionPicker(true);
    reactionAnim.setValue(0);
    Animated.spring(reactionAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 6,
    }).start();
  };

  const handleAddReaction = async (emoji: string, msgArg?: any) => {
    const targetMsg = msgArg || reactionTargetMsg;
    if (!targetMsg || !activeGroup || !user) return;
    setShowReactionPicker(false);

    const userName =
      profile?.name || profile?.fullname || user.displayName || 'Unknown';
    const userId = user.uid;

    try {
      const msgDocRef = doc(db, 'chatGroups', activeGroup, 'messages', targetMsg.id);
      const msgSnap = await getDoc(msgDocRef);
      if (!msgSnap.exists()) return;

      // Normalize stored reactions – supports both old string[] and new {uid,name}[] formats
      const rawReactions: Record<string, any[]> = msgSnap.data().reactions || {};
      const existing: Record<string, { uid: string; name: string }[]> = {};
      Object.keys(rawReactions).forEach(e => {
        existing[e] = (rawReactions[e] || []).map((r: any) =>
          typeof r === 'string' ? { uid: r, name: 'Unknown' } : r
        );
      });

      // Find which emoji (if any) the user already reacted with
      const previousEmoji = Object.keys(existing).find(e =>
        existing[e].some(r => r.uid === userId)
      );

      // Build fresh reactions map
      const newReactions: Record<string, { uid: string; name: string }[]> = {};
      Object.keys(existing).forEach(e => {
        if (e === previousEmoji) {
          // Strip user from their old emoji
          const filtered = existing[e].filter(r => r.uid !== userId);
          if (filtered.length > 0) newReactions[e] = filtered;
          // if empty, omit the key entirely
        } else {
          newReactions[e] = existing[e];
        }
      });

      if (previousEmoji !== emoji) {
        // Add user to the new emoji
        newReactions[emoji] = [
          ...(newReactions[emoji] || []),
          { uid: userId, name: userName },
        ];
      }
      // (if previousEmoji === emoji, we just toggled it off — already removed above)

      await updateDoc(msgDocRef, { reactions: newReactions });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Option Action handlers
  const handleLongPressMessage = (msg: any) => {
    setSelectedMessage(msg);
    setShowActionSheet(true);
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.text);
      setShowActionSheet(false);
      Alert.alert('Copied ✓', 'Message copied to clipboard.');
    }
  };

  const handleStartEdit = () => {
    if (selectedMessage) {
      setInputText(selectedMessage.text);
      setEditingMessageId(selectedMessage.id);
      setShowActionSheet(false);
    }
  };

  const handleDelete = () => {
    if (selectedMessage) {
      setShowActionSheet(false);
      // Slight delay ensures ActionSheet fully closes before Modal appears
      setTimeout(() => setShowDeletePrompt(true), Platform.OS === 'ios' ? 350 : 50);
    }
  };

  const confirmDelete = async () => {
    if (selectedMessage) {
      setShowDeletePrompt(false);
      try {
        const msgDocRef = doc(db, 'chatGroups', activeGroup!, 'messages', selectedMessage.id);
        await deleteDoc(msgDocRef);
      } catch (err: any) {
        console.error('Error deleting message:', err);
        Alert.alert('Error', 'Failed to delete message.');
      }
    }
  };

  // Auto-Redirect directly into Group Chat when parameter is received
  const initialGroupId = route.params?.groupId;
  useEffect(() => {
    if (initialGroupId) {
      setActiveGroup(initialGroupId);
      navigation.setParams({ groupId: undefined });
    }
  }, [initialGroupId, navigation]);

  // ── FIX: Track keyboard visibility to avoid double safe-area padding ──
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Messaging settings from Redux
  const messagingEnabled = useAppSelector((state: any) => state.messages.studentMessagingEnabled);
  const dailyMessageLimit = useAppSelector((state: any) => state.messages.dailyMessageLimit);
  const todayMsgCount = useAppSelector((state: any) => state.messages.todayMsgCount);

  const flatListRef = useRef<FlatList>(null);
  const prevMsgCountsRef = useRef<Record<string, number>>({});
  const bellSoundRef = useRef<InstanceType<typeof Audio.Sound> | null>(null);

  // User Profile
  const profile = useAppSelector((state: any) => state.auth.profile);
  const user = useAppSelector((state: any) => state.auth.user);
  const dispatch = useAppDispatch();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(fetchMessagingSettings());
    if (user?.uid && activeGroup) {
      dispatch(fetchTodayMessageCount({ uid: user.uid, groupId: activeGroup }));
    }
    await new Promise((r) => setTimeout(r, 450));
    setRefreshing(false);
  }, [dispatch, user?.uid, activeGroup]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' },
        headerShown: false,
      });

      // Clear global unread badge
      dispatch(updateLastReadTimestamp(Date.now()));
    }, [navigation])
  );

  // Load messaging settings & today's count via Redux
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchMessagingSettings());
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid && activeGroup) {
        dispatch(fetchTodayMessageCount({ uid: user.uid, groupId: activeGroup }));
      }
    }, [user?.uid, activeGroup])
  );

  // Subscribe to message counts for all groups
  useEffect(() => {
    AsyncStorage.getItem('chatReadCounts').then(res => {
      if (res) setReadCounts(JSON.parse(res));
    }).catch(console.error);

    const unsubs: (() => void)[] = [];
    GROUPS.forEach(g => {
      const q = query(
        collection(db, 'chatGroups', g.id, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(99)
      );
      const unsub = onSnapshot(q, (snap) => {
        setGroupMsgCounts(prev => ({ ...prev, [g.id]: snap.size }));
        if (snap.docs.length > 0) {
          const latestDoc = snap.docs[0].data();
          setLastMessages(prev => ({
            ...prev,
            [g.id]: { sender: latestDoc.sender || 'Unknown', text: latestDoc.text || '' }
          }));
        }
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach(u => u());
      if (bellSoundRef.current) {
        bellSoundRef.current.unloadAsync().catch(() => { });
        bellSoundRef.current = null;
      }
    };
  }, []);

  // Ring bell when new messages arrive in any group
  useEffect(() => {
    const prev = prevMsgCountsRef.current;
    let hasNewMessage = false;

    for (const gId of Object.keys(groupMsgCounts)) {
      if (prev[gId] !== undefined && groupMsgCounts[gId] > prev[gId] && gId !== activeGroup) {
        hasNewMessage = true;
        break;
      }
    }

    prevMsgCountsRef.current = { ...groupMsgCounts };

    if (hasNewMessage) {
      (async () => {
        try {
          if (bellSoundRef.current) {
            await bellSoundRef.current.unloadAsync().catch(() => { });
            bellSoundRef.current = null;
          }
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/bell.wav')
          );
          bellSoundRef.current = sound;
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => { });
              bellSoundRef.current = null;
            }
          });
        } catch (e) {
          console.log('Bell sound error:', e);
        }
      })();
    }
  }, [groupMsgCounts, activeGroup]);

  // Sync read count for active group
  useEffect(() => {
    if (activeGroup && groupMsgCounts[activeGroup] !== undefined) {
      setReadCounts(prev => {
        const currentCount = groupMsgCounts[activeGroup];
        if (prev[activeGroup] !== currentCount) {
          const newCounts = { ...prev, [activeGroup]: currentCount };
          AsyncStorage.setItem('chatReadCounts', JSON.stringify(newCounts)).catch(console.error);
          return newCounts;
        }
        return prev;
      });
    }
  }, [activeGroup, groupMsgCounts]);

  useEffect(() => {
    if (!activeGroup) return;

    const messagesRef = collection(db, 'chatGroups', activeGroup, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedTime = '';
        if (data.timestamp) {
          const dateObj = data.timestamp.toDate();
          formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const isMine = data.senderId === user?.uid;

        return {
          id: doc.id,
          text: data.text,
          sender: data.sender,
          senderId: data.senderId,
          avatar: data.avatar || null,
          role: data.role || 'student',
          subject: data.subject || null,
          time: formattedTime,
          isMine,
          isAnnouncement: data.isAnnouncement || false,
          reactions: (() => {
            // Normalize: support both old string[] and new {uid,name}[] formats
            const raw: Record<string, any[]> = data.reactions || {};
            const out: Record<string, { uid: string; name: string }[]> = {};
            Object.keys(raw).forEach(e => {
              const arr = (raw[e] || []).map((r: any) =>
                typeof r === 'string' ? { uid: r, name: 'Unknown' } : r
              ).filter((r: any) => r.uid);
              if (arr.length > 0) out[e] = arr;
            });
            return out;
          })(),
        };
      });

      setMessages(prev => ({
        ...prev,
        [activeGroup]: fetchedMessages
      }));

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeGroup]);

  const normalizeGrade = (gradeStr: string): string => {
    const g = gradeStr.toLowerCase().trim();
    if (g.includes('9th') || g === '9') return '9';
    if (g.includes('10th') || g === '10') return '10';
    if (g.includes('1st') || g.includes('11') || g.includes('eleven')) return '11';
    if (g.includes('2nd') || g.includes('12') || g.includes('twelve')) return '12';
    return g.replace(/[^0-9]/g, '');
  };

  const filteredGroups = GROUPS.filter(g => {
    if (!profile) return false;

    const role = String(profile.role || '').trim().toLowerCase();

    if (role === 'admin' || role === 'teacher' || role === 'staff' || (role && role !== 'student')) return true;

    const studentGrade = String(profile.class || profile.grade || '').trim().toLowerCase();
    const studentGender = String(profile.gender || '').trim().toLowerCase();

    const isBoys = studentGender === 'male' || studentGender === 'boy' || studentGender === 'boys';
    const isGirls = studentGender === 'female' || studentGender === 'girl' || studentGender === 'girls';

    const groupGenderMatch = (g.gender === 'boy' && isBoys) || (g.gender === 'girl' && isGirls);
    const groupGradeMatch = normalizeGrade(studentGrade) === normalizeGrade(g.grade);

    return groupGenderMatch && groupGradeMatch;
  });

  useFocusEffect(
    React.useCallback(() => {
      if (profile && profile.role !== 'admin' && profile.role !== 'teacher' && filteredGroups.length === 1) {
        setActiveGroup(filteredGroups[0].id);
      }
    }, [profile, filteredGroups.length])
  );

  const isStudentRole = profile?.role === 'student' || (!profile?.role);
  const isPrivilegedRole = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'staff';

  const canStudentSend = () => {
    if (isPrivilegedRole) return true;
    if (!messagingEnabled) return false;
    if (dailyMessageLimit === 0) return true;
    return todayMsgCount < dailyMessageLimit;
  };

  const remainingMessages = dailyMessageLimit === 0 ? Infinity : Math.max(0, dailyMessageLimit - todayMsgCount);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!activeGroup) {
      Alert.alert('Error', 'No chat group selected.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'No user credentials found. Please sign in again.');
      return;
    }

    if (isStudentRole && !isPrivilegedRole && !editingMessageId) {
      if (!messagingEnabled) {
        Alert.alert('Messaging Disabled', 'The admin has disabled student messaging in this group.');
        return;
      }
      if (dailyMessageLimit > 0 && todayMsgCount >= dailyMessageLimit) {
        Alert.alert('Limit Reached', `You have reached your daily limit of ${dailyMessageLimit} messages. Try again tomorrow.`);
        return;
      }
    }

    const messageText = inputText.trim();
    const isEditMode = !!editingMessageId;
    setInputText('');
    setEditingMessageId(null);
    Keyboard.dismiss();

    try {
      if (isEditMode && editingMessageId) {
        const msgDocRef = doc(db, 'chatGroups', activeGroup, 'messages', editingMessageId);
        await updateDoc(msgDocRef, {
          text: messageText,
          updatedAt: serverTimestamp(),
          isEdited: true
        });
      } else {
        const messagesRef = collection(db, 'chatGroups', activeGroup, 'messages');
        await addDoc(messagesRef, {
          text: messageText,
          sender: profile?.name || profile?.fullname || user.displayName || 'Unknown User',
          senderId: user.uid,
          avatar: profile?.profileImage || profile?.avatar || profile?.image || user.photoURL || null,
          role: profile?.role || 'student',
          subject: profile?.class || null,
          timestamp: serverTimestamp(),
          isAnnouncement: false
        });
        if (isStudentRole && !isPrivilegedRole) {
          dispatch(incrementTodayMsgCount());
        }
      }
    } catch (error: any) {
      console.error('Error processing message action:', error);
      Alert.alert('Failed to send/edit message', error?.message || 'Please check your connection or database rules.');
    }
  };

  // ── FIX: Compute bottom padding for the input bar ──────────────────────
  // When keyboard is visible, the keyboard itself covers the bottom — no inset needed.
  // When keyboard is hidden, respect the device's home indicator / safe area.
  const inputBarPaddingBottom = keyboardVisible
    ? 8
    : Math.max(8, insets.bottom + 4);

  // ── Render: Groups List ────────────────────────────────────────────────
  if (!activeGroup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.headerNoticeStyle, { backgroundColor: theme.card }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonNoticeStyle}>
            <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleNoticeStyle, { color: theme.text }]}>Messages</Text>
          <View style={styles.placeholderButton} />
        </View>
        <ScrollView
          style={styles.contentContainerNoticeStyle}
          contentContainerStyle={{ paddingVertical: scale(16), paddingBottom: scale(100) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {filteredGroups.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                No chat groups available for your class and gender.
              </Text>
            </View>
          ) : (
            <>
              {filteredGroups.filter(g => g.gender === 'girl').length > 0 && (
                <View style={{ marginBottom: scale(16) }}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginLeft: scale(16) }]}>Girls Sections</Text>
                  <View style={{ backgroundColor: theme.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                    {filteredGroups.filter(g => g.gender === 'girl').map((g, index, arr) => {
                      const lastMsg = lastMessages[g.id] || null;
                      const unread = Math.max(0, (groupMsgCounts[g.id] || 0) - (readCounts[g.id] || 0));
                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[
                            styles.chatRow,
                            index < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
                          ]}
                          onPress={() => setActiveGroup(g.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.chatRowAvatar, { backgroundColor: 'rgba(184,48,96,0.1)' }]}>
                            <Ionicons name="chatbubbles" size={scale(20)} color="#b83060" />
                          </View>
                          <View style={styles.chatRowInfo}>
                            <Text style={[styles.chatRowTitle, { color: theme.text }]} numberOfLines={1}>{g.name}</Text>
                            <Text style={[styles.chatRowMessage, { color: theme.textSecondary }]} numberOfLines={1}>
                              {lastMsg ? `${lastMsg.sender}: ${lastMsg.text}` : 'No messages yet...'}
                            </Text>
                          </View>
                          <View style={styles.chatRowRight}>
                            {unread > 0 ? <BlinkingDot count={unread} /> : <Ionicons name="chevron-forward" size={scale(16)} color={theme.textTertiary} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {filteredGroups.filter(g => g.gender === 'boy').length > 0 && (
                <View style={{ marginBottom: scale(16) }}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginLeft: scale(16) }]}>Boys Sections</Text>
                  <View style={{ backgroundColor: theme.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                    {filteredGroups.filter(g => g.gender === 'boy').map((g, index, arr) => {
                      const lastMsg = lastMessages[g.id] || null;
                      const unread = Math.max(0, (groupMsgCounts[g.id] || 0) - (readCounts[g.id] || 0));
                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[
                            styles.chatRow,
                            index < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
                          ]}
                          onPress={() => setActiveGroup(g.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.chatRowAvatar, { backgroundColor: isDark ? theme.backgroundTertiary : '#e0e7ff' }]}>
                            <Ionicons name="chatbubbles" size={scale(20)} color={theme.primary} />
                          </View>
                          <View style={styles.chatRowInfo}>
                            <Text style={[styles.chatRowTitle, { color: theme.text }]} numberOfLines={1}>{g.name}</Text>
                            <Text style={[styles.chatRowMessage, { color: theme.textSecondary }]} numberOfLines={1}>
                              {lastMsg ? `${lastMsg.sender}: ${lastMsg.text}` : 'No messages yet...'}
                            </Text>
                          </View>
                          <View style={styles.chatRowRight}>
                            {unread > 0 ? <BlinkingDot count={unread} /> : <Ionicons name="chevron-forward" size={scale(16)} color={theme.textTertiary} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Chat Window ─────────────────────────────────────────────────
  const groupObj = GROUPS.find(g => g.id === activeGroup);
  const currentMessages = messages[activeGroup] || [];

  const renderMessage = ({ item }: { item: any }) => {
    if (item.isAnnouncement) {
      return (
        <View style={styles.announcementBubble}>
          <Text style={styles.announcementLabel}>🔔 {item.sender} (Announcement)</Text>
          <Text style={styles.announcementText}>{item.text}</Text>
          <Text style={styles.announcementTime}>{item.time}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {}}
        onLongPress={() => handleLongPressMessage(item)}
        delayLongPress={350}
        onPressOut={(e) => {
          // Detect double-tap via timestamp
          const now = Date.now();
          const lastTap = (handleDoubleTapMessage as any)._lastTap;
          if (lastTap && now - lastTap < 300) {
            handleDoubleTapMessage(item);
          }
          (handleDoubleTapMessage as any)._lastTap = now;
        }}
        style={[styles.msgRow, item.isMine ? styles.msgRight : styles.msgLeft]}>
        {!item.isMine && (
          item.avatar ? (
            <Image source={{ uri: item.avatar }} style={[styles.avatar, { backgroundColor: theme.border }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{item.sender ? item.sender[0] : '?'}</Text>
            </View>
          )
        )}

        <View style={[styles.msgContentWrapper, item.isMine ? { alignItems: 'flex-end', marginRight: 8 } : { alignItems: 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Text style={[styles.msgSender, { color: theme.textSecondary }]}>{item.sender}</Text>
            {item.role && (
              <View style={[styles.roleBadge, {
                backgroundColor:
                  item.role === 'admin' ? '#fef2f2' :
                    item.role === 'teacher' ? '#eff6ff' :
                      item.role === 'staff' ? '#f5f3ff' : '#f0fdf4',
              }]}>
                <Text style={[styles.roleBadgeText, {
                  color:
                    item.role === 'admin' ? '#ef4444' :
                      item.role === 'teacher' ? '#2b5fe7' :
                        item.role === 'staff' ? '#8b5cf6' : '#10b981',
                }]}>
                  {(item.role === 'teacher' || item.role?.toLowerCase().includes('teacher')) && item.subject
                    ? item.subject.toUpperCase()
                    : item.role.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPressMessage(item)}
            onPress={() => {}}
            delayLongPress={350}
            style={[
              styles.msgBubble,
              item.isMine
                ? { backgroundColor: theme.primary, borderTopRightRadius: 2 }
                : { backgroundColor: theme.card, borderTopLeftRadius: 2 }
            ]}
          >
            {/* Double-tap target - invisible overlay removed in favour of outer row handler */}
            {renderMessageText(item.text, item.isMine)}
            <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2 }}>
              {item.isEdited && (
                <Text style={{ fontSize: 8, fontStyle: 'italic', color: item.isMine ? 'rgba(255,255,255,0.6)' : theme.textTertiary }}>
                  (edited)
                </Text>
              )}
              <Text style={[styles.msgTime, { color: item.isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
                {item.time}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Reaction Pills — tap to see who reacted */}
          {item.reactions && Object.keys(item.reactions).length > 0 && (
            <View style={[
              styles.reactionRow,
              item.isMine ? { alignSelf: 'flex-end', marginRight: 4 } : { alignSelf: 'flex-start', marginLeft: 4 }
            ]}>
              {Object.entries(item.reactions as Record<string, { uid: string; name: string }[]>)
                .filter(([, users]) => users.length > 0)
                .map(([emoji, users]) => {
                  const myReaction = users.some(u => u.uid === (user?.uid || ''));
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setReactionNamesModal({ emoji, users })}
                      onLongPress={() => handleAddReaction(emoji, item)}
                      activeOpacity={0.75}
                      style={[
                        styles.reactionPill,
                        myReaction && styles.reactionPillActive,
                        { borderColor: myReaction ? theme.primary : theme.border }
                      ]}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      <Text style={[
                        styles.reactionCount,
                        { color: myReaction ? theme.primary : theme.textSecondary }
                      ]}>{users.length}</Text>
                    </TouchableOpacity>
                  );
              })}
              {/* Add / change reaction button */}
              <TouchableOpacity
                onPress={() => handleDoubleTapMessage(item)}
                style={[
                  styles.reactionPill,
                  { borderColor: theme.border, paddingHorizontal: 7 }
                ]}
              >
                <Text style={{ fontSize: scale(13), opacity: 0.5 }}>+😊</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.isMine && (
          item.avatar ? (
            <Image source={{ uri: item.avatar }} style={[styles.avatar, { backgroundColor: theme.border, marginRight: 0, marginLeft: 8 }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary, marginRight: 0, marginLeft: 8 }]}>
              <Text style={styles.avatarText}>{item.sender ? item.sender[0] : 'U'}</Text>
            </View>
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.headerNoticeStyle, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          onPress={() => {
            setActiveGroup(null);
          }}
          style={styles.backButtonNoticeStyle}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: scale(8) }}>
          <Text style={{ fontSize: scale(16), fontWeight: '700', color: theme.text }} numberOfLines={1}>
            {groupObj?.name || 'Chat'}
          </Text>
          <Text style={{ fontSize: scale(11), color: theme.textSecondary, marginTop: 1, fontWeight: '500', opacity: 0.7 }}>
            {currentMessages.length} Messages
          </Text>
        </View>
        {isStudentRole && !isPrivilegedRole && dailyMessageLimit > 0 ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: remainingMessages <= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.1)',
            paddingHorizontal: scale(10),
            paddingVertical: scale(5),
            borderRadius: scale(14),
            gap: scale(3),
            marginLeft: scale(8),
          }}>
            <Text style={{
              fontSize: scale(14),
              fontWeight: '800',
              color: remainingMessages <= 3 ? '#ef4444' : theme.primary,
            }}>
              {remainingMessages}
            </Text>
            <Text style={{
              fontSize: scale(9),
              fontWeight: '700',
              color: remainingMessages <= 3 ? '#ef4444' : theme.primary,
              opacity: 0.7,
            }}>
              Left
            </Text>
          </View>
        ) : (
          <View style={{ width: scale(32) }} />
        )}
      </View>

      {/*
        ── FIX: KeyboardAvoidingView ─────────────────────────────────────────
        iOS   → behavior="padding"  pushes content up as keyboard rises
        Android → behavior="height"  shrinks the view; combined with
                  windowSoftInputMode="adjustResize" in AndroidManifest this
                  gives the most reliable result on all Android versions.
        keyboardVerticalOffset on iOS must equal the height of everything
        rendered ABOVE this KeyboardAvoidingView (header inside SafeAreaView).
        We use scale(48) as the header height; adjust if your header is taller.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + scale(56) : 0}
        enabled={Platform.OS === 'ios'}
      >
        <FlatList
          ref={flatListRef}
          data={currentMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No messages here yet.{"\n"}Start the conversation!
              </Text>
            </View>
          }
        />

        {/* ── Edit Bar (Only visible when editing a message) ──────────────── */}
        {editingMessageId && (
          <View style={[styles.editBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <View style={styles.editBarContent}>
              <Ionicons name="pencil" size={14} color={theme.primary} />
              <Text style={[styles.editBarText, { color: theme.textSecondary }]}>
                Editing message...
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              setEditingMessageId(null);
              setInputText('');
            }}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input Bar ──────────────────────────────────────────────────────
            paddingBottom is dynamic:
            • keyboard visible  → 8px  (keyboard itself covers the bottom)
            • keyboard hidden   → insets.bottom + 4  (home indicator safe area)
            This prevents the double-gap that appeared before.
        */}
        {isStudentRole && !isPrivilegedRole && !messagingEnabled ? (
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              justifyContent: 'center',
              paddingVertical: 14,
              paddingBottom: inputBarPaddingBottom,
            }
          ]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Ionicons name="lock-closed" size={16} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, fontWeight: '600', textAlign: 'center' }}>
                Messaging is currently disabled by admin
              </Text>
            </View>
          </View>
        ) : (
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: inputBarPaddingBottom,
            }
          ]}>
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'flex-end',
              borderWidth: 1,
              borderRadius: 22,
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: theme.background,
              borderColor: theme.border,
            }}>
              <TouchableOpacity
                onPress={() => setShowEmojiModal(true)}
                style={{ padding: 6, marginRight: 4, marginBottom: 2 }}
              >
                <Ionicons name="happy-outline" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
              
              <TextInput
                style={{
                  flex: 1,
                  minHeight: 34,
                  maxHeight: 100,
                  fontSize: 15,
                  paddingVertical: 6,
                  paddingRight: 6,
                  color: theme.text,
                }}
                placeholder={editingMessageId ? 'Edit your message...' : (canStudentSend() ? 'Type your message...' : 'Daily limit reached')}
                placeholderTextColor={theme.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                multiline
                maxLength={1000}
                editable={canStudentSend() || !!editingMessageId}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() && (canStudentSend() || editingMessageId) ? theme.primary : theme.border }
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || (!canStudentSend() && !editingMessageId)}
            >
              <Ionicons name={editingMessageId ? "checkmark" : "send"} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Custom Action Sheet Bottom Modal ── */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.sheetIndicator, { backgroundColor: theme.border }]} />
            
            <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>
              Message Options
            </Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={20} color={theme.text} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Copy Text</Text>
            </TouchableOpacity>

            {selectedMessage?.isMine && (
              <TouchableOpacity style={styles.sheetOption} onPress={handleStartEdit}>
                <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                <Text style={[styles.sheetOptionText, { color: theme.text }]}>Edit Message</Text>
              </TouchableOpacity>
            )}

            {(selectedMessage?.isMine || isPrivilegedRole) && (
              <TouchableOpacity style={styles.sheetOption} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
                <Text style={[styles.sheetOptionText, { color: theme.error }]}>Delete Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.sheetOption, styles.cancelOption]}
              onPress={() => setShowActionSheet(false)}
            >
              <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.sheetOptionText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Custom Delete Prompt Modal ── */}
      <Modal
        visible={showDeletePrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeletePrompt(false)}
      >
        <TouchableOpacity
          style={styles.centeredBackdrop}
          activeOpacity={1}
          onPress={() => setShowDeletePrompt(false)}
        >
          <View style={[styles.deletePromptCard, { backgroundColor: theme.card }]}>
            <View style={styles.deletePromptIconContainer}>
              <Ionicons name="trash-outline" size={scale(20)} color="#ef4444" />
            </View>
            <Text style={[styles.deletePromptTitle, { color: theme.text }]}>Delete Message?</Text>
            <Text style={[styles.deletePromptMessage, { color: theme.textSecondary }]}>
              Are you sure you want to permanently delete this message? This action cannot be undone.
            </Text>
            
            <View style={styles.deletePromptButtons}>
              <TouchableOpacity
                style={[styles.deletePromptButton, { borderColor: theme.border, borderWidth: 1, backgroundColor: 'transparent' }]}
                onPress={() => setShowDeletePrompt(false)}
              >
                <Text style={[styles.deletePromptButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deletePromptButton, { backgroundColor: '#ef4444' }]}
                onPress={confirmDelete}
              >
                <Text style={[styles.deletePromptButtonText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Custom Emoji Modal Overlay ── */}
      <Modal
        visible={showEmojiModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowEmojiModal(false)}
        >
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.sheetIndicator, { backgroundColor: theme.border }]} />
            
            <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>
              Select Emoji
            </Text>

            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'center',
              paddingBottom: 20,
            }}>
              {EMOJI_LIST.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleInsertEmoji(emoji)}
                  style={{
                    width: scale(40),
                    height: scale(40),
                    borderRadius: scale(20),
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: scale(22) }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reaction Picker Modal ── */}
      <Modal
        visible={showReactionPicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.reactionBackdrop}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        >
          <Animated.View
            style={[
              styles.reactionPickerContainer,
              {
                backgroundColor: theme.card,
                transform: [
                  { scale: reactionAnim },
                  { translateY: reactionAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
                ],
                opacity: reactionAnim,
              }
            ]}
          >
            {/* Quick Reactions Row */}
            <View style={styles.quickReactionsRow}>
              {QUICK_REACTIONS.map((emoji) => {
                // Look up live message data for current reaction state
                const liveMsg = currentMessages.find((m: any) => m.id === reactionTargetMsg?.id);
                const reactors: { uid: string; name: string }[] =
                  (liveMsg?.reactions || reactionTargetMsg?.reactions || {})[emoji] || [];
                const myReacted = reactors.some(r => r.uid === user?.uid);
                // If user has reacted with a DIFFERENT emoji, show which one
                const myCurrentEmoji = Object.keys(
                  liveMsg?.reactions || reactionTargetMsg?.reactions || {}
                ).find(e =>
                  ((liveMsg?.reactions || reactionTargetMsg?.reactions || {})[e] || []).some(
                    (r: any) => r.uid === user?.uid
                  )
                );
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleAddReaction(emoji)}
                    style={[
                      styles.quickReactionBtn,
                      myReacted && { backgroundColor: `${theme.primary}22`, borderWidth: 1.5, borderColor: theme.primary },
                      myCurrentEmoji && myCurrentEmoji !== emoji && { opacity: 0.45 },
                    ]}
                  >
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                    {reactors.length > 0 && (
                      <Text style={{ fontSize: scale(9), color: theme.textTertiary, marginTop: 2 }}>
                        {reactors.length}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hint */}
            <View style={[styles.reactionDivider, { backgroundColor: theme.border }]} />
            <Text style={[styles.reactionLabel, { color: theme.textTertiary }]}>One reaction per message · Tap to change</Text>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reaction Names Modal — shows who reacted ── */}
      <Modal
        visible={!!reactionNamesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionNamesModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setReactionNamesModal(null)}
        >
          <View style={[styles.reactionNamesCard, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={styles.reactionNamesHeader}>
              <Text style={styles.reactionNamesEmoji}>{reactionNamesModal?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reactionNamesTitle, { color: theme.text }]}>
                  {reactionNamesModal?.users.length} Reaction{(reactionNamesModal?.users.length || 0) > 1 ? 's' : ''}
                </Text>
                <Text style={[styles.reactionNamesSubtitle, { color: theme.textTertiary }]}>
                  Long-press pill to change or remove
                </Text>
              </View>
            </View>

            <View style={[styles.reactionNamesDivider, { backgroundColor: theme.border }]} />

            {/* People list */}
            {(reactionNamesModal?.users || []).map((u, i) => (
              <View key={u.uid} style={[
                styles.reactionNameRow,
                i < (reactionNamesModal!.users.length - 1) && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
              ]}>
                <View style={[styles.reactionNameAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: '#fff', fontSize: scale(14), fontWeight: '700' }}>
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={[styles.reactionNameText, { color: theme.text }]}>{u.name}</Text>
                {u.uid === user?.uid && (
                  <View style={[styles.reactionYouBadge, { backgroundColor: `${theme.primary}18` }]}>
                    <Text style={{ fontSize: scale(9), color: theme.primary, fontWeight: '700' }}>YOU</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerNoticeStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  backButtonNoticeStyle: {
    padding: scale(4),
  },
  headerTitleNoticeStyle: {
    fontSize: scale(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholderButton: {
    width: scale(36),
    height: scale(36),
  },
  contentContainerNoticeStyle: {
    flex: 1,
  },
  listContentNoticeStyle: {
    padding: scale(16),
    paddingBottom: scale(100),
  },

  // Professional Compact Group List Items
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
  },
  chatRowAvatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatRowInfo: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  chatRowTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    marginBottom: scale(2),
    letterSpacing: -0.2,
  },
  chatRowMessage: {
    fontSize: scale(13),
    opacity: 0.7,
  },
  chatRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: scale(8),
    minWidth: scale(24),
  },
  sectionLabel: {
    fontSize: scale(11),
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: scale(8),
    marginTop: scale(4),
    paddingLeft: scale(4),
    opacity: 0.5,
  },
  blinkingBadge: {
    backgroundColor: '#10b981',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 5,
    marginRight: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  blinkingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Chat header
  chatHeaderInfoCenter: { flex: 1, alignItems: 'center' },
  chatHeaderSubtitleStyle: {
    fontSize: scale(11),
    marginTop: scale(2),
    fontWeight: '500',
    opacity: 0.5,
  },

  // Messages list
  messagesList: { padding: 16, paddingBottom: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 12, fontSize: 15, lineHeight: 22 },

  // Message bubbles
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2, flexWrap: 'wrap' },
  msgLeft: { justifyContent: 'flex-start' },
  msgRight: { justifyContent: 'flex-end' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    overflow: 'hidden',
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  msgContentWrapper: { maxWidth: width * 0.75 },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  msgSender: { fontSize: 11, fontWeight: '600', marginBottom: 0 },
  roleBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  roleBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  msgTime: { fontSize: 9, alignSelf: 'flex-end', marginTop: 2 },

  announcementBubble: {
    backgroundColor: '#fff3cd',
    padding: 14,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#ffe69c',
    alignSelf: 'center',
    width: '90%',
  },
  announcementLabel: { color: '#856404', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  announcementText: { color: '#856404', fontSize: 14, lineHeight: 20 },
  announcementTime: { color: '#856404', fontSize: 10, alignSelf: 'flex-end', marginTop: 6, opacity: 0.7 },

  // ── FIX: Input container ──────────────────────────────────────────────
  // Removed the static paddingBottom that was conflicting with the dynamic
  // inset-aware value computed above. Top/side padding kept as-is.
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    // paddingBottom is applied inline dynamically via inputBarPaddingBottom
  },
  inputField: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 2,
  },
  // Edit Bar above input
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  editBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBarText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Bottom Sheet Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  centeredBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  cancelOption: {
    borderBottomWidth: 0,
    marginTop: 8,
    justifyContent: 'center',
  },

  // ── Reaction Pills ──────────────────────────────────────────────────────
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  reactionPillActive: {
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  reactionEmoji: { fontSize: scale(14) },
  reactionCount: { fontSize: scale(11), fontWeight: '700' },

  // ── Reaction Picker Modal ───────────────────────────────────────────────
  reactionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    width: width * 0.82,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
  },
  quickReactionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickReactionBtn: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  quickReactionEmoji: { fontSize: scale(26) },
  reactionDivider: { height: 1, width: '80%', marginVertical: 12, opacity: 0.3 },
  reactionLabel: { fontSize: scale(10), fontWeight: '500', opacity: 0.6, textAlign: 'center' },

  // ── Reaction Names Modal ───────────────────────────────────────────────
  reactionNamesCard: {
    borderRadius: 20,
    marginHorizontal: scale(24),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 14,
    maxHeight: '60%',
  },
  reactionNamesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(10),
  },
  reactionNamesEmoji: { fontSize: scale(34) },
  reactionNamesTitle: { fontSize: scale(15), fontWeight: '700' },
  reactionNamesSubtitle: { fontSize: scale(10), marginTop: 2, opacity: 0.7 },
  reactionNamesDivider: { height: StyleSheet.hairlineWidth, marginBottom: scale(6) },
  reactionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    gap: scale(10),
  },
  reactionNameAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionNameText: { flex: 1, fontSize: scale(14), fontWeight: '500' },
  reactionYouBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },

  // ── Custom Delete Prompt Modal ──────────────────────────────────────────
  deletePromptCard: {
    width: scale(260),
    borderRadius: scale(16),
    padding: scale(18),
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deletePromptIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  deletePromptTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    marginBottom: scale(4),
    textAlign: 'center',
  },
  deletePromptMessage: {
    fontSize: scale(10.5),
    textAlign: 'center',
    lineHeight: scale(16),
    marginBottom: scale(18),
  },
  deletePromptButtons: {
    flexDirection: 'row',
    gap: scale(8),
    width: '100%',
  },
  deletePromptButton: {
    flex: 1,
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePromptButtonText: {
    fontSize: scale(11),
    fontWeight: '700',
  },
});