import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notices } from '../screens/NoticesScreen';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { Ionicons } from '@expo/vector-icons';
import { scale } from '../utils/responsive'; // Verify import path

// ... 

export const TopHeader: React.FC<{ title?: string; onBell?: () => void; notificationCount?: number }> = ({ title = 'Home', onBell, notificationCount }) => {
  // ... (keep existing hook logic) ...
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [profileData, setProfileData] = useState<any>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.email) return;

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
    const q = query(collection(db, "profile"), where("email", "==", user.email));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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

  const handleBellPress = () => {
    if (onBell) {
      onBell();
    } else {
      // Navigate to NoticeBoard tab in MainTabs
      navigation.navigate('NoticeBoard');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning 🌄';
    if (hour >= 12 && hour < 13) return 'Good Noon 🌞';
    if (hour >= 13 && hour < 17) return 'Good Afternoon 🌤️';
    if (hour >= 17 && hour < 20) return 'Good Evening 🌃';
    return 'Good Night, Sweet Dreams 🌌';
  };

  const count = notificationCount !== undefined ? notificationCount : notices.length;

  // Fallback logic
  const displayName = profileData?.fullname || user?.displayName || 'Student';
  const displayImage = profileData?.image || user?.photoURL;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Image
                source={displayImage ? { uri: displayImage } : require('../assets/default-profile.png')}
                defaultSource={require('../assets/default-profile.png')}
                style={styles.avatarImage}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
            <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{getGreeting()}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity onPress={handleBellPress} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={scale(24)} color={theme.text} />
            {count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'SettingsScreen' })} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={scale(24)} color={theme.text} />
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
    paddingVertical: scale(12),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    marginLeft: scale(12),
  },
  userName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#1f2937',
  },
  greetingText: {
    fontSize: scale(11),
    color: '#6b7280',
    marginTop: scale(2),
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  iconButton: {
    padding: scale(8),
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: '#ef4444',
    borderRadius: scale(10),
    minWidth: scale(16),
    height: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(2),
  },
  badgeText: {
    color: '#ffffff',
    fontSize: scale(10),
    fontWeight: 'bold',
  },
});