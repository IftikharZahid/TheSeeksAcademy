import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './navigation/ProfileStack';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

interface ProfileData {
  fullname: string;
  email: string;
  phone: string;
  dateofbirth: string;
  rollno: string;
  class: string;
  section: string;
  session: string;
  image: string;
  role?: string;
}

// Stats data
const stats = [
  { key: 'videos', value: '178', label: 'Videos', iconColor: '#2196F3' },
  { key: 'course', value: '128', label: 'Course', iconColor: '#f44336' },
  { key: 'rating', value: '4.5', label: 'Rating', iconColor: '#ffc107' },
];

// Menu items - Main section
const mainMenuItems = [
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    iconType: 'Ionicons',
    iconColor: '#6b7280',
  },
  {
    key: 'payment',
    label: 'Payment Details',
    icon: 'credit-card',
    iconType: 'MaterialIcons',
    iconColor: '#ec407a',
  },
  {
    key: 'achievement',
    label: 'Achievement',
    icon: 'trophy',
    iconType: 'Ionicons',
    iconColor: '#f59e0b',
  },
];

// Preferences section
const preferenceItems = [
  {
    key: 'darkMode',
    label: 'Dark Mode',
    icon: 'moon',
    iconType: 'Ionicons',
    iconColor: '#8b5cf6',
    hasToggle: true,
  },
  {
    key: 'changePassword',
    label: 'Change Password',
    icon: 'lock-closed',
    iconType: 'Ionicons',
    iconColor: '#10b981',
  },
];

// Support section
const supportItems = [
  {
    key: 'helpCenter',
    label: 'Help Center',
    icon: 'help-circle',
    iconType: 'Ionicons',
    iconColor: '#0ea5e9',
  },
  {
    key: 'privacyPolicy',
    label: 'Privacy Policy',
    icon: 'shield-checkmark',
    iconType: 'Ionicons',
    iconColor: '#14b8a6',
  },
  {
    key: 'aboutApp',
    label: 'About App',
    icon: 'information-circle',
    iconType: 'Ionicons',
    iconColor: '#6366f1',
  },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { theme, isDark, toggleTheme } = useTheme();
  const user = auth.currentUser;
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const cacheKey = `user_profile_${user.email}`;

    try {
      if (!refreshing) setLoading(true);

      // Try to load from cache first
      const cachedProfile = await AsyncStorage.getItem(cacheKey);
      if (cachedProfile) {
        setProfileData(JSON.parse(cachedProfile));
        setLoading(false);
      }

      // Query the 'profile' collection
      const q = query(collection(db, "profile"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data() as ProfileData;
        setProfileData(docData);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(docData));
      } else {
        setProfileData(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation will be handled by auth state listener
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'settings':
        (navigation as any).navigate('Home', { screen: 'SettingsScreen' });
        break;
      case 'payment':
        (navigation as any).navigate('Home', { screen: 'FeeDetailScreen' });
        break;
      case 'changePassword':
        (navigation as any).navigate('Home', { screen: 'ChangePasswordScreen' });
        break;
      case 'helpCenter':
        (navigation as any).navigate('Home', { screen: 'HelpCenterScreen' });
        break;
      case 'privacyPolicy':
        (navigation as any).navigate('Home', { screen: 'PrivacyPolicyScreen' });
        break;
      case 'aboutApp':
        (navigation as any).navigate('Home', { screen: 'AboutScreen' });
        break;
      default:
        break;
    }
  };

  const renderIcon = (item: any, size: number) => {
    if (item.iconType === 'MaterialIcons') {
      return <MaterialIcons name={item.icon as any} size={size} color={item.iconColor} />;
    }
    return <Ionicons name={item.icon as any} size={size} color={item.iconColor} />;
  };

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.key}
      style={styles.menuItem}
      onPress={() => !item.hasToggle && handleMenuPress(item.key)}
      activeOpacity={item.hasToggle ? 1 : 0.7}
    >
      <View style={[
        styles.menuIconContainer,
        { backgroundColor: isDark ? item.iconColor + '20' : item.iconColor + '15' }
      ]}>
        {renderIcon(item, scale(18))}
      </View>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
      {item.hasToggle ? (
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#e5e7eb', true: `${item.iconColor}50` }}
          thumbColor={isDark ? item.iconColor : '#f4f3f4'}
          ios_backgroundColor="#e5e7eb"
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const displayName = profileData?.fullname || user?.displayName || 'Student';
  const displayImage = profileData?.image || user?.photoURL;
  const displayRole = profileData?.role || 'Student';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            {/* Top Bar with Logout */}
            <View style={styles.topBar}>
              <Text style={[styles.screenTitle, { color: theme.text }]}>Profile</Text>
              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <View style={styles.header}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.card }]}>
                <Image
                  source={displayImage ? { uri: displayImage } : require('../assets/default-profile.png')}
                  defaultSource={require('../assets/default-profile.png')}
                  style={styles.avatar}
                />
              </View>
              <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.role, { color: theme.textSecondary }]}>{displayRole}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
              {stats.map((stat) => (
                <TouchableOpacity
                  key={stat.key}
                  style={styles.statItem}
                  onPress={() => {
                    if (stat.key === 'videos') {
                      (navigation as any).navigate('Home', { screen: 'VideoGalleryScreen' });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.statIconContainer,
                    { backgroundColor: isDark ? stat.iconColor + '20' : stat.iconColor + '15' }
                  ]}>
                    {stat.key === 'videos' && <Ionicons name="videocam" size={scale(20)} color={stat.iconColor} />}
                    {stat.key === 'course' && <Ionicons name="book" size={scale(20)} color={stat.iconColor} />}
                    {stat.key === 'rating' && <Ionicons name="star" size={scale(20)} color={stat.iconColor} />}
                  </View>
                  <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Main Menu Items */}
            <View style={styles.menuContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>General</Text>
              {mainMenuItems.map(renderMenuItem)}
            </View>

            {/* Preferences Section */}
            <View style={styles.menuContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
              {preferenceItems.map(renderMenuItem)}
            </View>

            {/* Support Section */}
            <View style={styles.menuContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Support</Text>
              {supportItems.map(renderMenuItem)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: scale(40),
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(4),
  },
  screenTitle: {
    fontSize: scale(22),
    fontWeight: '700',
  },
  logoutBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: scale(12),
    paddingBottom: scale(16),
  },
  avatarContainer: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: scale(12),
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: scale(20),
    fontWeight: '700',
    marginBottom: scale(2),
  },
  role: {
    fontSize: scale(13),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(36),
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  statValue: {
    fontSize: scale(15),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scale(11),
    marginTop: scale(1),
  },
  divider: {
    height: 1,
    marginHorizontal: scale(16),
    marginVertical: scale(8),
  },
  menuContainer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
  },
  sectionTitle: {
    fontSize: scale(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(8),
    marginLeft: scale(4),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  menuIconContainer: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  menuLabel: {
    flex: 1,
    fontSize: scale(14),
    fontWeight: '500',
  },
});
