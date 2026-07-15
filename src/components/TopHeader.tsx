import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Modal,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectUnreadMessagesCount, updateLastReadTimestamp } from '../store/slices/messagesSlice';
import { selectUnreadDiariesCount, markDiaryAsRead, persistReadDiaryIds } from '../store/slices/notificationsSlice';
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
  const dispatch = useAppDispatch();
  const { unreadCount: notificationCount, markAsRead } = useNotifications();
  const unreadMessagesCount = useAppSelector(selectUnreadMessagesCount);
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  const notices = useAppSelector((state) => state.notifications.notices);
  const diaries = useAppSelector((state) => state.notifications.diaries);
  const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);
  const readNoticeIds = useAppSelector((state) => state.notifications.readIds);
  const lastReadTimestampMs = useAppSelector((state) => state.messages.lastReadTimestampMs);
  const unreadDiariesCount = useAppSelector((state) =>
    selectUnreadDiariesCount(state.notifications.diaries, state.notifications.readDiaryIds)
  );
  const messages = useAppSelector((state) => state.messages.list);
  const totalUnreadCount = notificationCount + unreadMessagesCount + unreadDiariesCount;

  // Combine & build recent updates list
  const getNoticeTime = (n: any) => {
    if (n.createdAt?.toMillis) return n.createdAt.toMillis();
    if (n.createdAt?.seconds) return n.createdAt.seconds * 1000;
    return 0;
  };

  const recentUpdates: any[] = [];
  if (notices && notices.length > 0) {
    notices.forEach((n) => {
      recentUpdates.push({ id: `notice-${n.id}`, type: 'notice', item: n, timeMs: getNoticeTime(n) });
    });
  }
  if (diaries && diaries.length > 0) {
    diaries.forEach((d) => {
      recentUpdates.push({ id: `diary-${d.id}`, type: 'diary', item: d, timeMs: getNoticeTime(d) });
    });
  }
  if (messages && messages.length > 0) {
    messages.forEach((m) => {
      const msgTime = typeof m.timestampMs === 'number' ? m.timestampMs : (m.createdAtMs || 0);
      recentUpdates.push({ id: `message-${m.id}`, type: 'message', item: m, timeMs: msgTime });
    });
  }

  // Sort updates by time, newest first
  recentUpdates.sort((a, b) => b.timeMs - a.timeMs);

  // Only show unread items in the dropdown
  const unreadRecentUpdates = recentUpdates.filter((update) => {
    if (update.type === 'diary') return !readDiaryIds.includes(update.item.id);
    if (update.type === 'notice') return !readNoticeIds.includes(update.item.id);
    if (update.type === 'message')
      return (
        lastReadTimestampMs !== null &&
        update.timeMs > lastReadTimestampMs &&
        update.item.senderId !== user?.uid
      );
    return false;
  });

  const [showDropdown, setShowDropdown] = useState(false);

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
    Animated.sequence([
      Animated.timing(bellRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }
      const { sound } = await Audio.Sound.createAsync(require('../../assets/Bell.mp3'));
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing bell sound:', e);
    }
  };

  useEffect(() => {
    if (notificationCount > prevNotifCount.current) ringBell();
    prevNotifCount.current = notificationCount;
  }, [notificationCount]);

  useEffect(() => {
    if (unreadMessagesCount > prevMsgCount.current) ringBell();
    prevMsgCount.current = unreadMessagesCount;
  }, [unreadMessagesCount]);

  const prevDiariesCount = useRef(unreadDiariesCount);
  useEffect(() => {
    if (unreadDiariesCount > prevDiariesCount.current) ringBell();
    prevDiariesCount.current = unreadDiariesCount;
  }, [unreadDiariesCount]);

  const bellRotateInterpolated = bellRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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

        {/* Right Section - Theme Toggle + Notification Bell */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[
              styles.modButton,
              { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(18)} color={'#ffffff'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.notificationButton,
              { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 },
            ]}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: bellRotateInterpolated }] }}>
              <Ionicons name="notifications-outline" size={scale(20)} color={'#ffffff'} />
            </Animated.View>
            {totalUnreadCount > 0 && (
              <View style={[styles.badge, { borderColor: isDark ? theme.background : '#1e3a8a' }]}>
                <Text style={styles.badgeText}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
        statusBarTranslucent={true}
      >
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownWrapper,
                  { top: insets.top + scale(50), right: scale(16) },
                ]}
              >
            {/* Caret pointing up */}
            <View style={[styles.caret, { borderBottomColor: theme.border }]} />
            <View style={[styles.caretInner, { borderBottomColor: theme.card }]} />

            <View
              style={[
                styles.dropdownContainer,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {/* Header */}
              <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.dropdownTitle, { color: theme.text }]}>Recent Updates</Text>
              </View>

              {/* Content: list or empty state */}
              {unreadRecentUpdates.length > 0 ? (
                <ScrollView
                  style={styles.dropdownContent}
                  showsVerticalScrollIndicator={false}
                >
                  {unreadRecentUpdates.slice(0, 5).map((update) => (
                    <TouchableOpacity
                      key={update.id}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setShowDropdown(false);
                        if (update.type === 'notice') {
                          markAsRead(update.item.id);
                          navigation.navigate('Home', { screen: 'DocumentsScreen' });
                        } else if (update.type === 'diary') {
                          dispatch(markDiaryAsRead(update.item.id));
                          persistReadDiaryIds([...readDiaryIds, update.item.id]).catch(() => {});
                          navigation.navigate('Home', { screen: 'DiaryScreen' });
                        } else if (update.type === 'message') {
                          dispatch(updateLastReadTimestamp(Date.now()));
                          navigation.navigate('Messages', { groupId: update.item.groupId || update.item.id });
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor:
                              update.type === 'notice'
                                ? 'rgba(59,130,246,0.12)'
                                : update.type === 'message'
                                ? 'rgba(234,179,8,0.12)'
                                : 'rgba(16,185,129,0.12)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={update.type === 'notice' ? 'notifications-outline' : update.type === 'message' ? 'chatbubble-outline' : 'book-outline'}
                          size={scale(14)}
                          color={update.type === 'notice' ? '#3b82f6' : update.type === 'message' ? '#eab308' : '#10b981'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemTitleRow}>
                          <Text
                            style={[styles.itemTitle, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {update.item.title || (update.type === 'message' ? update.item.senderName : '')}
                          </Text>
                          <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                            {formatRelativeTime(update.timeMs)}
                          </Text>
                        </View>
                        <Text
                          style={[styles.itemText, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {update.item.body || update.item.message || update.item.text || ''}
                        </Text>
                      </View>
                      <View style={[styles.unreadDot, { backgroundColor: '#ef4444' }]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyDropdown}>
                  <Ionicons name="checkmark-circle-outline" size={scale(32)} color="#10b981" />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    No new updates at the moment
                  </Text>
                </View>
              )}
            </View>
          </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
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
    alignSelf: 'flex-end',
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: scale(8),
    fontWeight: 'bold',
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
    marginRight: scale(10),
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
    width: scale(260),
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
    paddingVertical: scale(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownTitle: {
    fontSize: scale(13),
    fontWeight: '700',
  },
  dropdownContent: {
    maxHeight: scale(300),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
    marginTop: scale(2),
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
    paddingVertical: scale(24),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    gap: scale(6),
  },
  emptyTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    marginTop: scale(4),
  },
  emptySubtitle: {
    fontSize: scale(11),
    textAlign: 'center',
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginLeft: scale(8),
    alignSelf: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  viewAllText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
});
