import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl, Keyboard, Dimensions, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: Timestamp | null;
  createdAt: Date;
}

const FONT_SIZES = [
  { label: 'Small', value: 12 },
  { label: 'Medium', value: 14 },
  { label: 'Large', value: 16 },
  { label: 'Large', value: 16 },
  { label: 'Extra Large', value: 18 },
];

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    icon: 'happy-outline',
    data: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴']
  },
  {
    id: 'nature',
    icon: 'paw-outline',
    data: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', 'cow', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🦭', '🐊', '🐅', '🐆', '🦍', '🦧', '🦣', '🦛', '🦏', '🐫', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔']
  },
  {
    id: 'food',
    icon: 'fast-food-outline',
    data: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🌮', '🌯', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢', '🧂']
  },
  {
    id: 'activity',
    icon: 'football-outline',
    data: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️‍♀️', '🏋', '🤺', '🤼‍♀️', '🤼', '🤸‍♀️', '🤸', '⛹️‍♀️', '⛹', '🤾‍♀️', '🤾', '🧗‍♀️', '🧗', '🏌️‍♀️', '🏌', '🧘‍♀️', '🧘', '🧖‍♀️', '🧖', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🚣‍♀️', '🏇', '🚵‍♀️', '🎽', '🏅', '🥇', '🥈', '🥉', '🏆', '🏵', '🎗', '🎫', '🎟', 'circus', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩']
  },
  {
    id: 'objects',
    icon: 'bulb-outline',
    data: ['⌚', '📱', '📲', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '📞', '☎', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '⌛', '⏳', '🪔', '🧯', '🪙', '💳', '💎', '⚖', '🪛', '🔨', '⚒', '⛏', '⚙', '⛓', '🔫', '💣', '🪓', '🗡', '⚔', '🛡', '🚬', '⚰', '⚱', '🏺', '📿', '💈', '⚗', '🔭', '🔬', '🕳', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🌡', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛀', '🪒', '🧽', '🪣', '🧴', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂', '🖊', '🖋', '✒', '🖌', '🖍', '📝', '✏', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓']
  }
];

export const MessagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentUser = auth.currentUser;
  const userPhotoUrl = currentUser?.photoURL;

  // Fetch user profile data
  useEffect(() => {
    fetchUserData();
  }, []);

  // Listen for real-time messages from Firebase
  useEffect(() => {
    const messagesRef = collection(db, 'group_messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesList.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          senderName: data.senderName,
          senderPhoto: data.senderPhoto,
          timestamp: data.timestamp,
          createdAt: data.timestamp?.toDate() || new Date(),
        });
      });
      setMessages(messagesList);
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, (error) => {
      console.error('Error listening to messages:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setIsKeyboardActive(true);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsKeyboardActive(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    const cacheKey = `user_profile_${user.email}`;
    try {
      const cachedProfile = await AsyncStorage.getItem(cacheKey);
      if (cachedProfile) setProfileData(JSON.parse(cachedProfile));
      const q = query(collection(db, "profile"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setProfileData(data);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  // Send or Update message
  const handleSend = async () => {
    if (!message.trim() || !currentUser || isSending) return;

    const messageText = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      if (editingMessageId) {
        await updateDoc(doc(db, 'group_messages', editingMessageId), {
          text: messageText,
          isEdited: true
        });
        setEditingMessageId(null);
      } else {
        await addDoc(collection(db, 'group_messages'), {
          text: messageText,
          senderId: currentUser.uid,
          senderName: profileData?.fullname || currentUser.displayName || 'Anonymous',
          senderPhoto: profileData?.image || currentUser.photoURL || null,
          timestamp: serverTimestamp(),
        });
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText); // Restore if failed
    } finally {
      setIsSending(false);
    }
  };
  // Format timestamp for display
  const formatTime = (timestamp: Timestamp | null): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if message is from current user
  const isOwnMessage = (senderId: string): boolean => {
    return currentUser?.uid === senderId;
  };

  // Message options (Action Sheet)
  const handleMessageOptions = (msg: Message) => {
    if (isOwnMessage(msg.senderId)) {
      setActionMessage(msg);
    }
  };

  // Clear all messages (admin function)
  const handleClearAllMessages = () => {
    Alert.alert(
      'Clear All Messages',
      'Are you sure you want to delete all your messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const myMessages = messages.filter(msg => isOwnMessage(msg.senderId));
              for (const msg of myMessages) {
                await deleteDoc(doc(db, 'group_messages', msg.id));
              }
            } catch (error) {
              console.error('Error clearing messages:', error);
              Alert.alert('Error', 'Failed to clear messages');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header with App Theme */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryDark, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="chatbubbles" size={16} color="#fff" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>The Seeks Academy Group</Text>
            <Text style={styles.profileStatus}>{messages.length} messages</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Settings Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>Settings</Text>

                {/* Theme Toggle */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { toggleTheme(); setShowMenu(false); }}
                >
                  <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </TouchableOpacity>

                {/* Font Size */}
                <View style={styles.menuSection}>
                  <View style={styles.menuItem}>
                    <Ionicons name="text-outline" size={20} color={theme.primary} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>Font Size</Text>
                  </View>
                  <View style={styles.fontSizeRow}>
                    {FONT_SIZES.map((size) => (
                      <TouchableOpacity
                        key={size.value}
                        style={[
                          styles.fontSizeBtn,
                          { borderColor: theme.border },
                          fontSize === size.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => setFontSize(size.value)}
                      >
                        <Text style={[
                          styles.fontSizeBtnText,
                          { color: theme.textSecondary },
                          fontSize === size.value && { color: '#fff' }
                        ]}>{size.label[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Clear Chat */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowMenu(false); handleClearAllMessages(); }}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                  <Text style={[styles.menuItemText, { color: theme.error }]}>Clear My Messages</Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => setShowMenu(false)}
                >
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Action Sheet Modal (iPhone Style) */}
      <Modal
        visible={!!actionMessage}
        transparent
        animationType="slide"
        onRequestClose={() => setActionMessage(null)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setActionMessage(null)}>
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
              {/* Options Group */}
              <View style={[styles.sheetGroup, { backgroundColor: theme.card }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1, alignItems: 'center', paddingRight: 20 }}>
                    <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>Message Options</Text>
                    <Text style={[styles.sheetSubtitle, { color: theme.textTertiary }]}>
                      {actionMessage?.text ? (actionMessage.text.length > 30 ? actionMessage.text.substring(0, 30) + '...' : actionMessage.text) : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setActionMessage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={() => {
                    const msg = actionMessage;
                    setActionMessage(null);
                    if (msg) {
                      setMessage(msg.text);
                      setEditingMessageId(msg.id);
                    }
                  }}
                >
                  <Text style={[styles.sheetBtnText, { color: theme.primary }]}>Edit Message</Text>
                </TouchableOpacity>

                <View style={[styles.sheetDivider, { backgroundColor: theme.border }]} />

                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={() => {
                    const msg = actionMessage;
                    setActionMessage(null);
                    if (msg) setDeleteTarget(msg);
                  }}
                >
                  <Text style={[styles.sheetBtnText, { color: theme.error }]}>Delete Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Sheet */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetContent, { paddingBottom: 40 }]}>
              <View style={[styles.sheetGroup, { backgroundColor: theme.card }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 20 }}>
                    <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>Delete Message?</Text>
                    <Text style={[styles.sheetSubtitle, { color: theme.textTertiary, textAlign: 'center' }]}>
                      Are you sure you want to delete this message? This cannot be undone.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setDeleteTarget(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={async () => {
                    if (deleteTarget) {
                      try {
                        const id = deleteTarget.id;
                        setDeleteTarget(null);
                        await deleteDoc(doc(db, 'group_messages', id));
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                >
                  <Text style={[styles.sheetBtnText, { color: theme.error, fontWeight: '700' }]}>Delete Message</Text>
                </TouchableOpacity>

                <View style={[styles.sheetDivider, { backgroundColor: theme.border }]} />

                <TouchableOpacity
                  style={styles.sheetBtn}
                  onPress={() => setDeleteTarget(null)}
                >
                  <Text style={[styles.sheetBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetContent, { paddingBottom: 0 }]}>
              <View style={[styles.sheetGroup, { backgroundColor: theme.card, height: 350 }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: theme.border, paddingVertical: 8, justifyContent: 'space-between' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiTabs} style={{ flex: 1 }}>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.emojiTab, activeEmojiCategory === cat.id && { backgroundColor: theme.cardSecondary || 'rgba(0,0,0,0.05)' }]}
                        onPress={() => setActiveEmojiCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={22}
                          color={activeEmojiCategory === cat.id ? theme.primary : theme.textTertiary}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.sheetCloseBtnStatic}
                    onPress={() => setShowEmojiPicker(false)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.emojiGrid}>
                  {EMOJI_CATEGORIES.find(c => c.id === activeEmojiCategory)?.data.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiBtn}
                      onPress={() => setMessage(prev => prev + emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesArea, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Date Separator */}
            <View style={[styles.dateSeparator, { backgroundColor: theme.card }]}>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>Today</Text>
            </View>

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading messages...</Text>
              </View>
            )}

            {/* Empty state */}
            {!isLoading && messages.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.primary} />
                <Text style={[styles.emptyText, { color: theme.text }]}>Start a conversation</Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Be the first to share something!</Text>
              </View>
            )}

            {/* Messages list */}
            {messages.map((msg) => {
              const isMine = isOwnMessage(msg.senderId);
              return (
                <View key={msg.id} style={[styles.messageRow, isMine ? styles.sentRow : styles.receivedRow]}>
                  {/* Avatar for others */}
                  {!isMine && (
                    <Image
                      source={msg.senderPhoto ? { uri: msg.senderPhoto } : require('../assets/default-profile.png')}
                      style={styles.msgAvatar}
                    />
                  )}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => isMine && handleMessageOptions(msg)}
                    delayLongPress={400}
                    style={[
                      styles.bubble,
                      isMine ? styles.sentBubble : styles.receivedBubble,
                      { backgroundColor: isMine ? theme.primary : theme.card }
                    ]}
                  >
                    {/* Sender name for others */}
                    {!isMine && (
                      <Text style={[styles.senderName, { color: theme.accent }]}>{msg.senderName}</Text>
                    )}
                    <Text style={[styles.msgText, { color: isMine ? '#fff' : theme.text, fontSize }]}>{msg.text}</Text>
                    <View style={styles.msgMeta}>
                      <Text style={[styles.msgTime, { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textTertiary }]}>
                        {formatTime(msg.timestamp)}
                      </Text>
                      {isMine && <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.8)" style={{ marginLeft: 3 }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Avatar for me */}
                  {isMine && (
                    <Image
                      source={currentUser?.photoURL ? { uri: currentUser.photoURL } : require('../assets/default-profile.png')}
                      style={[styles.msgAvatar, { marginRight: 0, marginLeft: 6 }]}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Input Area */}
          <View style={[styles.inputArea, {
            backgroundColor: theme.card,
            paddingBottom: Platform.OS === 'android' ? (isKeyboardActive ? 5 : 35) : (isKeyboardActive ? 6 : Math.max(insets.bottom, 8)),
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }]}>
            <TouchableOpacity
              style={styles.inputBtn}
              onPress={() => {
                Keyboard.dismiss();
                setShowEmojiPicker(true);
              }}
            >
              <Ionicons name="happy-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            {editingMessageId && (
              <TouchableOpacity onPress={() => { setEditingMessageId(null); setMessage(''); }} style={styles.inputBtn}>
                <Ionicons name="close-circle" size={24} color={theme.error || '#ff4444'} />
              </TouchableOpacity>
            )}
            <View style={[styles.inputField, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                placeholderTextColor={theme.placeholder}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={4096}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: theme.primary }]}
              onPress={handleSend}
              disabled={!message.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={editingMessageId ? "checkmark" : "send"} size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header - Compact
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, elevation: 3 },
  backBtn: { padding: 4, marginRight: 4 },
  profileSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  profileText: { marginLeft: 10, flex: 1 },
  profileName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  profileStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerActions: { flexDirection: 'row' },
  headerBtn: { padding: 8 },

  // Messages Area
  messagesArea: { flex: 1 },
  messagesContent: { padding: 8, paddingBottom: 16 },
  dateSeparator: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginVertical: 8 },
  dateText: { fontSize: 11, fontWeight: '500' },

  // Message Rows
  messageRow: { marginBottom: 4, flexDirection: 'row', alignItems: 'flex-end' },
  sentRow: { justifyContent: 'flex-end' },
  receivedRow: { justifyContent: 'flex-start' },

  // Message Bubbles
  bubble: { maxWidth: SCREEN_WIDTH * 0.72, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, minHeight: 30 },
  sentBubble: { borderBottomRightRadius: 4, marginLeft: 32 },
  receivedBubble: { borderBottomLeftRadius: 4 },

  msgText: { fontSize: 14, lineHeight: 18 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  msgTime: { fontSize: 10 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },

  // Voice (unused now but kept for compatibility)
  voiceBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, minWidth: 180 },
  playBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  waveformArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1, height: 20 },
  waveBar: { width: 2, borderRadius: 1 },
  voiceDuration: { fontSize: 10, marginLeft: 4, marginRight: 4 },

  // Input Area - Compact
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 8, minHeight: 50 },
  inputBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  inputField: { flex: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 4, minHeight: 36, borderWidth: 1 },
  textInput: { fontSize: 14, lineHeight: 18, paddingVertical: 0, maxHeight: 80 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Loading & Empty States
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  // Modal & Menu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: SCREEN_WIDTH * 0.8, borderRadius: 16, padding: 16, maxWidth: 320 },
  menuTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  menuSection: { marginVertical: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  menuItemText: { fontSize: 15, marginLeft: 12, fontWeight: '500' },
  fontSizeRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingHorizontal: 8 },
  fontSizeBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  fontSizeBtnText: { fontSize: 14, fontWeight: '600' },
  closeBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600' },

  // Action Sheet Styles
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetContent: { padding: 16, paddingBottom: 34 },
  sheetGroup: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  sheetCloseBtn: { position: 'absolute', right: 10, top: 10, padding: 4 },
  sheetTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  sheetSubtitle: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  sheetBtn: { paddingVertical: 16, alignItems: 'center', backgroundColor: 'transparent' },
  sheetBtnText: { fontSize: 17, fontWeight: '500' },
  sheetDivider: { height: 1, opacity: 0.5 },

  // Emoji Picker Styles
  emojiTabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  emojiTab: { padding: 8, borderRadius: 8, marginHorizontal: 4 },
  sheetCloseBtnStatic: { marginLeft: 10, padding: 4 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, paddingBottom: 40 },
  emojiBtn: { width: '12.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 24 },
});
