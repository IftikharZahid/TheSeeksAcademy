import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TouchableWithoutFeedback, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppSelector } from '../store/hooks';
import { selectUnreadMessagesCount } from '../store/slices/messagesSlice';
import { selectUnreadDiariesCount } from '../store/slices/notificationsSlice';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { scale } from '../utils/responsive';

const formatRelativeTime = (timeMs: number): string => {
  if (!timeMs) return '';
  const diffMs = Date.now() - timeMs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return new Date(timeMs).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const TopHeader: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { unreadCount: notificationCount } = useNotifications();
  const unreadMessagesCount = useAppSelector(selectUnreadMessagesCount);
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  const notices = useAppSelector((state) => state.notifications.notices);
  const diaries = useAppSelector((state) => state.notifications.diaries);
  const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);
  const unreadDiariesCount = useAppSelector((state) => selectUnreadDiariesCount(state.notifications.diaries, state.notifications.readDiaryIds));
  const messages = useAppSelector((state) => state.messages.list);
  const totalUnreadCount = notificationCount + unreadMessagesCount + unreadDiariesCount;

  // Combine & Sort Recent Updates
  const recentUpdates: any[] = [];
  const getNoticeTime = (n: any) => {
    if (n.createdAt?.toMillis) return n.createdAt.toMillis();
    if (n.createdAt?.seconds) return n.createdAt.seconds * 1000;
    return 0;
  };
  
  if (notices && notices.length > 0) {
    notices.forEach(n => {
      recentUpdates.push({ id: `notice-${n.id}`, type: 'notice', item: n, timeMs: getNoticeTime(n) });
    });
  }
  if (diaries && diaries.length > 0) {
    diaries.forEach(d => {
      recentUpdates.push({ id: `diary-${d.id}`, type: 'diary', item: d, timeMs: getNoticeTime(d) });
    });
  }
  if (messages && messages.length > 0) {
    messages.forEach(m => {
      recentUpdates.push({ id: `msg-${m.id}`, type: 'message', item: m, timeMs: (m as any).createdAtMs || 0 });
    });
  }
  
  recentUpdates.sort((a, b) => b.timeMs - a.timeMs);
  const topUpdates = recentUpdates.slice(0, 4);
  const [showDropdown, setShowDropdown] = useState(false);

  // Time-based academic greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning ☀️';
    if (hour >= 12 && hour < 14) return 'Good Noon 🌤️';
    if (hour >= 14 && hour < 18) return 'Good Afternoon 🌇';
    if (hour >= 18 && hour < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
  };

  // ── Bell ring animation & sound ─────────────────────────
  const bellRotate = useRef(new Animated.Value(0)).current;
  const prevNotifCount = useRef(notificationCount);
  const prevMsgCount = useRef(unreadMessagesCount);
  const soundRef = useRef<InstanceType<typeof Audio.Sound> | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const ringBell = async () => {
    // Animate
    Animated.sequence([
      Animated.timing(bellRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    // Play Sound
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/bell.wav')
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing bell sound:', e);
    }
  };

  // Trigger ring when notification count goes UP
  useEffect(() => {
    if (notificationCount > prevNotifCount.current) {
      ringBell();
    }
    prevNotifCount.current = notificationCount;
  }, [notificationCount]);

  // Trigger ring when unread messages count goes UP
  useEffect(() => {
    if (unreadMessagesCount > prevMsgCount.current) {
      ringBell();
    }
    prevMsgCount.current = unreadMessagesCount;
  }, [unreadMessagesCount]);

  // Trigger ring when unread diaries count goes UP
  const prevDiariesCount = useRef(unreadDiariesCount);
  useEffect(() => {
    if (unreadDiariesCount > prevDiariesCount.current) {
      ringBell();
    }
    prevDiariesCount.current = unreadDiariesCount;
  }, [unreadDiariesCount]);

  const bellRotateInterpolated = bellRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Left Section - Logo & Title */}
        <View style={styles.middleSection}>
          <Image
            source={require('../../assets/HomeScreenLogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.academyTextContainer}>
            <Text style={[styles.headerTitle, { color: '#ffffff' }]} numberOfLines={1}>
              THE SEEKS ACADEMY
            </Text>
            <Text style={[styles.headerSubtitle, { color: '#fbbf24' }]} numberOfLines={1}>
              FORT ABBAS
            </Text>
          </View>
        </View>

        {/* Right Section - Mod Button + Notification Bell */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.modButton, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(16)} color={'#ffffff'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 }]}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: bellRotateInterpolated }] }}>
              <Ionicons name="notifications-outline" size={scale(18)} color={'#ffffff'} />
              {(notificationCount > 0 || unreadMessagesCount > 0 || unreadDiariesCount > 0) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount + unreadMessagesCount + unreadDiariesCount}
                  </Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdownWrapper, { top: insets.top + scale(46), right: scale(16) }]}>
            {/* Caret pointing up */}
            <View style={[styles.caret, { borderBottomColor: theme.border }]} />
            <View style={[styles.caretInner, { borderBottomColor: theme.card }]} />

            <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.dropdownTitle, { color: theme.text }]}>Recent Updates</Text>
              </View>
            <ScrollView style={styles.dropdownContent} showsVerticalScrollIndicator={false}>
              {topUpdates.length > 0 ? (
                topUpdates.map((update, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setShowDropdown(false);
                      if (update.type === 'diary') {
                        navigation.navigate('Diary' as never);
                      } else if (update.type === 'message') {
                        navigation.navigate('Messages' as never);
                      }
                      // Notices were removed, so we do nothing for 'notice' type
                    }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                      <Ionicons
                        name={
                          update.type === 'notice' ? 'megaphone-outline' :
                          update.type === 'diary' ? 'book-outline' : 'chatbubbles-outline'
                        }
                        size={scale(16)}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {update.item.title || update.item.subject || update.item.teacherName || 'Update'}
                      </Text>
                      <Text style={[styles.itemText, { color: theme.textSecondary }]} numberOfLines={1}>
                        {update.item.content || update.item.message || update.item.description || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyDropdown}>
                  <Ionicons name="notifications-off-outline" size={scale(24)} color={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary, marginTop: scale(8), fontSize: scale(12) }}>
                    No recent updates.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
  },
  middleSection: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: scale(10),
  },
  logoImage: {
    width: scale(56),
    height: scale(56),
    marginLeft: scale(4),
  },
  academyTextContainer: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  headerTitle: {
    fontSize: scale(16),
    fontFamily: 'Arial',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: -2,
  },
  headerSubtitle: {
    fontSize: scale(12),
    fontFamily: 'Arial',
    fontWeight: 'bold',
    letterSpacing: 1,
    alignSelf:'flex-end'
 
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: scale(10),
  },
  modButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  notificationButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: scale(9),
    fontWeight: '700',
  },
  dropdownOverlay: {
    flex: 1,
  },
  dropdownWrapper: {
    position: 'absolute',
    alignItems: 'flex-end',
    width: scale(280),
  },
  caret: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: scale(8),
    borderRightWidth: scale(8),
    borderBottomWidth: scale(8),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginRight: scale(10), // align with the center of the notification bell
  },
  caretInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: scale(7),
    borderRightWidth: scale(7),
    borderBottomWidth: scale(7),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginRight: scale(11),
    position: 'absolute',
    top: scale(1.5),
    zIndex: 2,
  },
  dropdownContainer: {
    width: '100%',
    borderRadius: scale(12),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownTitle: {
    fontSize: scale(13),
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  dropdownContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: scale(12),
    fontWeight: '600',
    flex: 1,
    marginRight: scale(6),
  },
  itemTime: {
    fontSize: scale(9),
    fontWeight: '500',
  },
  itemText: {
    fontSize: scale(11),
  },
  emptyDropdown: {
    padding: scale(20),
    alignItems: 'center',
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginLeft: scale(8),
  },
});
