import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppSelector } from '../store/hooks';
import { selectUnreadMessagesCount } from '../store/slices/messagesSlice';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { scale } from '../utils/responsive';

export const TopHeader: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { unreadCount: notificationCount } = useNotifications();
  const unreadMessagesCount = useAppSelector(selectUnreadMessagesCount);
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  const notices = useAppSelector((state) => state.notifications.notices);
  const messages = useAppSelector((state) => state.messages.list);

  // Find latest items
  const latestNotice = notices.length > 0 ? notices[0] : null;
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const [showDropdown, setShowDropdown] = useState(false);

  // Fallback logic
  const displayName = profile?.fullname || user?.displayName || 'Student';
  const displayImage = (profile?.image && profile.image.trim() !== '') ? profile.image : (user?.photoURL || null);

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

  const playSound = async () => {
    try {
      // Unload any previously playing sound before creating a new one
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/bell.wav')
      );
      soundRef.current = sound;
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.log('Error playing bell sound:', e);
    }
  };

  const ringBell = () => {
    playSound();
    bellRotate.setValue(0);
    // Swing: right → left → right → left → center  (realistic ring)
    Animated.sequence([
      Animated.timing(bellRotate, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 0.7, duration: 70, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -0.7, duration: 70, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 0.4, duration: 60, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: -0.4, duration: 60, useNativeDriver: true }),
      Animated.timing(bellRotate, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
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

  const bellRotateInterpolated = bellRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Left Section - Welcome + Name + Greeting */}
        <View style={styles.leftSection}>
          <Text style={[styles.helloText, { color: theme.textSecondary }]}>Welcome 🎓</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.greetingText, { color: theme.primary }]}>{getGreeting()}</Text>
        </View>

        {/* Right Section - Notification Bell + Avatar */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: theme.card }]}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}
          >
            {/* Animated bell icon — pivots from top centre */}
            <Animated.View style={{ transform: [{ rotate: bellRotateInterpolated }], transformOrigin: 'top' }}>
              <Ionicons
                name={notificationCount > 0 || unreadMessagesCount > 0 ? 'notifications' : 'notifications-outline'}
                size={scale(22)}
                color={notificationCount > 0 || unreadMessagesCount > 0 ? '#F59E0B' : theme.text}
              />
            </Animated.View>

            {/* Badge — shows combined unread count */}
            {(notificationCount + unreadMessagesCount) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {(notificationCount + unreadMessagesCount) > 9 ? '9+' : (notificationCount + unreadMessagesCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Image
                source={displayImage ? { uri: displayImage } : require('../assets/default-profile.png')}
                placeholder={require('../assets/default-profile.png')}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Dropdown Overlay */}
      <Modal visible={showDropdown} transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.dropdownTitle, { color: theme.text }]}>Recent Updates</Text>
                  <TouchableOpacity onPress={() => { setShowDropdown(false); navigation.navigate('Home', { screen: 'NoticesScreen' }) }}>
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                  </TouchableOpacity>
                </View>

                {/* Latest Notice */}
                {latestNotice ? (
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    onPress={() => { setShowDropdown(false); navigation.navigate('Home', { screen: 'NoticesScreen' }) }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: latestNotice.iconBgColor || theme.backgroundSecondary }]}>
                      <Ionicons name={(latestNotice.iconName as any) || 'notifications'} size={20} color={latestNotice.iconColor || theme.primary} />
                    </View>
                    <View style={styles.dropdownContent}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{latestNotice.title}</Text>
                      <Text style={[styles.itemText, { color: theme.textSecondary }]} numberOfLines={1}>{latestNotice.message}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Latest Message */}
                {latestMessage ? (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setShowDropdown(false); navigation.navigate('Home', { screen: 'MessagesScreen' }) }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: theme.backgroundSecondary }]}>
                      <Ionicons name="chatbubbles" size={20} color={theme.accent} />
                    </View>
                    <View style={styles.dropdownContent}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>Groups: {latestMessage.senderName}</Text>
                      <Text style={[styles.itemText, { color: theme.textSecondary }]} numberOfLines={1}>{latestMessage.text}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {!latestNotice && !latestMessage && (
                  <View style={styles.emptyDropdown}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>No recent updates</Text>
                  </View>
                )}
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
    backgroundColor: '#ffffff',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  leftSection: {
    flexDirection: 'column',
  },
  helloText: {
    fontSize: scale(12),
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#6b7280',
    // marginBottom: scale(2),
    // alignSelf: 'center',
  },
  userName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#1f2937',
    marginTop: scale(2),
  },
  greetingText: {
    fontSize: scale(13),
    fontWeight: '500',
    marginTop: scale(2),
    letterSpacing: 0.2,
  },
  avatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  notificationButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
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
  dropdownContainer: {
    position: 'absolute',
    top: scale(60), // Just below header
    right: scale(16),
    width: scale(280),
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 12,
  },
  emptyDropdown: {
    padding: 20,
    alignItems: 'center',
  }
});