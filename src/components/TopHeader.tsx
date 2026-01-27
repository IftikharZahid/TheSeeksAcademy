import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';

export const TopHeader: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { unreadCount: notificationCount } = useNotifications();
  const [profileData, setProfileData] = useState<any>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.email) return;
    // ... existing profile logic ...
    const cacheKey = `user_profile_${user.email}`;

    // Load from cache immediately
    const loadCache = async () => {
      try {
        const cachedProfile = await AsyncStorage.getItem(cacheKey);
        if (cachedProfile) {
          setProfileData(JSON.parse(cachedProfile));
        }
      } catch (error) {
        console.error("TopHeader: Error loading cache:", error);
      }
    };
    loadCache();

    // Real-time listener for profile data
    const qProfile = query(collection(db, "profile"), where("email", "==", user.email));

    const unsubscribe = onSnapshot(qProfile, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setProfileData(docData);
        // Update cache
        AsyncStorage.setItem(cacheKey, JSON.stringify(docData)).catch(err =>
          console.error("TopHeader: Error saving to cache:", err)
        );
      } else {
        setProfileData(null);
      }
    }, (error) => {
      console.error("TopHeader: Error fetching user data:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fallback logic
  const displayName = profileData?.fullname || user?.displayName || 'Student';
  const displayImage = profileData?.image || user?.photoURL;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Left Section - Hello + Name */}
        <View style={styles.leftSection}>
          <Text style={[styles.helloText, { color: theme.textSecondary }]}>Hello</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
        </View>

        {/* Right Section - Notification + Avatar */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('Home', { screen: 'NoticesScreen' })}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={scale(22)} color={theme.text} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Image
                source={displayImage ? { uri: displayImage } : require('../assets/default-profile.png')}
                defaultSource={require('../assets/default-profile.png')}
                style={styles.avatarImage}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: scale(14),
    color: '#6b7280',
  },
  userName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#1f2937',
    marginTop: scale(2),
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
});