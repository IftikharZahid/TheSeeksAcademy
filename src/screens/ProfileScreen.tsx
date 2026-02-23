import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './navigation/ProfileStack';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../api/firebaseConfig';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchUserProfile } from '../store/slices/authSlice';



type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;



// Stats data
const stats = [
  { key: 'videos', value: '178', label: 'Videos', iconColor: '#2196F3' },
  { key: 'course', value: '128', label: 'Course', iconColor: '#f44336' },
  { key: 'rating', value: '4.5', label: 'Rating', iconColor: '#ffc107' },
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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const profileData = useAppSelector((state) => state.auth.profile);
  const loading = useAppSelector((state) => state.auth.profileLoading);
  const profileError = useAppSelector((state) => state.auth.error);
  const [refreshing, setRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await dispatch(fetchUserProfile({ uid: user.uid, email: user.email }));
    setRefreshing(false);
    setImageError(false);
  }, [user, dispatch]);

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
      onPress={() => handleMenuPress(item.key)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.menuIconContainer,
        { backgroundColor: isDark ? item.iconColor + '20' : item.iconColor + '15' }
      ]}>
        {renderIcon(item, scale(18))}
      </View>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const displayName = profileData?.fullname || user?.displayName || 'Student';
  const displayImage = (profileData?.image && profileData.image.trim() !== '') ? profileData.image : (user?.photoURL || null);
  const displayRole = profileData?.role || 'Student';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, scale(32)) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : profileError && !profileData ? (
          <View style={styles.errorContainer}>
            <View style={[styles.errorCard, { backgroundColor: theme.card }]}>
              <View style={[styles.errorIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' }]}>
                <Ionicons name="cloud-offline-outline" size={scale(40)} color="#ef4444" />
              </View>
              <Text style={[styles.errorTitle, { color: theme.text }]}>Something Went Wrong</Text>
              <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
                {profileError.includes('network')
                  ? 'Please check your internet connection and try again.'
                  : profileError.includes('not found')
                    ? 'We couldn\'t find your profile. Please contact support if this persists.'
                    : 'We\'re having trouble loading your profile. Please try again.'}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={onRefresh}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Top Bar with Settings */}
            <View style={styles.topBar}>
              <Text style={[styles.screenTitle, { color: theme.text }]}>Profile</Text>
              <TouchableOpacity
                style={[styles.settingsBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}
                onPress={() => (navigation as any).navigate('Home', { screen: 'SettingsScreen' })}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <View style={styles.header}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.card }]}>
                <Image
                  source={displayImage && !imageError ? { uri: displayImage } : require('../assets/default-profile.png')}
                  defaultSource={require('../assets/default-profile.png')}
                  onError={() => {
                    console.warn('⚠️ Profile image failed to load, using default avatar');
                    setImageError(true);
                  }}
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

            {/* Personal Information Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleText, { color: theme.text }]}>Personal Information</Text>
              </View>
              <View style={[styles.detailsContainer, { backgroundColor: theme.card }]}>
                {/* Full Name */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#e0e7ff' }]}>
                    <Ionicons name="person" size={18} color="#667eea" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Full Name</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{displayName}</Text>
                  </View>
                </View>

                {/* Father Name */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="people" size={18} color="#f59e0b" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Father Name</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.fathername || 'N/A'}</Text>
                  </View>
                </View>

                {/* Gender */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name={profileData?.gender === 'Male' ? 'male' : profileData?.gender === 'Female' ? 'female' : 'male-female'} size={18} color="#0284c7" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Gender</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.gender || 'N/A'}</Text>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="mail" size={18} color="#10b981" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Email</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]} numberOfLines={1}>{profileData?.email || 'N/A'}</Text>
                  </View>
                </View>

                {/* Phone */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="call" size={18} color="#3b82f6" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Phone</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.phone || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Academic Information Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="school-outline" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleText, { color: theme.text }]}>Academic Information</Text>
              </View>
              <View style={[styles.detailsContainer, { backgroundColor: theme.card }]}>
                {/* Role */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="shield-checkmark" size={18} color="#3b82f6" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Role</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{displayRole}</Text>
                  </View>
                </View>

                {/* Class */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#fce7f3' }]}>
                    <Ionicons name="school" size={18} color="#ec4899" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Class</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.class || 'N/A'}</Text>
                  </View>
                </View>

                {/* Section */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="albums" size={18} color="#f59e0b" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Section</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.section || 'N/A'}</Text>
                  </View>
                </View>

                {/* Roll No */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="id-card" size={18} color="#10b981" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Roll No</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.rollno || 'N/A'}</Text>
                  </View>
                </View>

                {/* Session */}
                <View style={styles.compactInfoRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#ede9fe' }]}>
                    <Ionicons name="calendar" size={18} color="#8b5cf6" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Session</Text>
                    <Text style={[styles.compactValue, { color: theme.text }]}>{profileData?.session || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>


            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />


            {/* Support Section */}
            <View style={styles.menuContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Support</Text>
              {supportItems.map(renderMenuItem)}
            </View>


            {/* Professional Logout Button */}
            <TouchableOpacity
              style={[styles.professionalLogoutBtn, {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                marginBottom: scale(24)
              }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={styles.professionalLogoutText}>Sign Out</Text>
            </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingTop: scale(80),
  },
  errorCard: {
    width: '100%',
    borderRadius: scale(20),
    padding: scale(32),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorIconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  errorTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: scale(8),
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: scale(13),
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(8),
  },
  retryButtonText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '700',
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
  settingsBtn: {
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
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  sectionContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
    marginLeft: scale(4),
    gap: scale(8),
  },
  sectionTitleText: {
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  professionalLogoutBtn: {
    marginHorizontal: scale(16),
    marginTop: scale(30),
    marginBottom: scale(16),
    height: scale(54),
    borderRadius: scale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  professionalLogoutText: {
    color: '#ef4444',
    fontSize: scale(16),
    fontWeight: '700',
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
  detailsContainer: {
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  infoTextContainer: {
    flex: 1,
  },
  compactLabel: {
    fontSize: scale(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(3),
  },
  compactValue: {
    fontSize: scale(15),
    fontWeight: '600',
  },
});
