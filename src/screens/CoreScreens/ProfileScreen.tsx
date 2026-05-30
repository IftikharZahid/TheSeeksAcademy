import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../api/firebaseConfig';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNetInfo } from '@react-native-community/netinfo';
import { fetchUserProfile } from '../../store/slices/authSlice';
import { CompactCard, MenuRow } from '../../components/CompactUI';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const supportItems = [
  { key: 'helpCenter',    label: 'Help Center',    icon: 'help-circle',      iconColor: '#0ea5e9' },
  { key: 'privacyPolicy', label: 'Privacy Policy', icon: 'shield-checkmark', iconColor: '#14b8a6' },
  { key: 'aboutApp',      label: 'About App',      icon: 'information-circle',iconColor: '#6366f1' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const netInfo = useNetInfo();
  
  const user         = useAppSelector((s) => s.auth.user);
  const profileData  = useAppSelector((s) => s.auth.profile);
  const loading      = useAppSelector((s) => s.auth.profileLoading);
  const profileError = useAppSelector((s) => s.auth.error);
  
  const [refreshing, setRefreshing]  = useState(false);
  const [imageError, setImageError]  = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isOffline = netInfo.isConnected === false;

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [navigation])
  );

  const ADMIN_EMAILS      = ['theseeksacademyfta@gmail.com', 'iftikharzahid@outlook.com'];
  const currentUserEmail  = auth.currentUser?.email?.toLowerCase() || '';
  const isAdmin           = ADMIN_EMAILS.includes(currentUserEmail);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await dispatch(fetchUserProfile({ uid: user.uid, email: user.email }));
    setRefreshing(false);
    setImageError(false);
  }, [user, dispatch]);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try { 
      await signOut(auth); 
      setLogoutModalVisible(false);
    } catch { 
      setLoggingOut(false);
      Alert.alert('Error', 'Failed to logout. Please try again.'); 
    }
  };

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'helpCenter':    navigation.navigate('HelpCenterScreen');    break;
      case 'privacyPolicy': navigation.navigate('PrivacyPolicyScreen'); break;
      case 'aboutApp':      navigation.navigate('AboutScreen');         break;
    }
  };

  const displayName  = profileData?.fullname || user?.displayName || 'User';
  const displayRole  = profileData?.role
    ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)
    : 'Student';
  const displayImage = (profileData?.image && profileData.image.trim() !== '') ? profileData.image : (user?.photoURL && user.photoURL.trim() !== '' ? user.photoURL : null);
  const isTeacher    = ['teacher', 'hod', 'principal', 'vice principal', 'senior teacher', 'assistant teacher']
    .some(r => (profileData?.role || '').toLowerCase().includes(r));

  // ── Sub-components ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(16)} color={isDark ? '#fbbf24' : '#64748b'} />
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Profile</Text>
          {isOffline && profileData && (
            <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
              <Ionicons name="cloud-offline-outline" size={scale(8)} color="#f59e0b" style={{ marginRight: scale(3) }} />
              <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={scale(16)} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, scale(24)) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading && !refreshing && !profileData ? (
          <View style={styles.loaderWrap}><ActivityIndicator size="large" color={theme.primary} /></View>
        ) : (isOffline || profileError) && !profileData ? (
          <View style={styles.errorWrap}>
            <View style={[styles.errorCard, { backgroundColor: theme.card }]}>
              <Ionicons name="cloud-offline-outline" size={scale(36)} color="#ef4444" />
              <Text style={[styles.errorTitle, { color: theme.text }]}>{isOffline ? 'Connection Lost' : 'Something Went Wrong'}</Text>
              <Text style={[styles.errorMsg, { color: theme.textSecondary }]}>
                {isOffline ? "Connect to the internet to load your profile." : "We're having trouble loading your profile. Please try again."}
              </Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={onRefresh} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={scale(14)} color="#fff" />
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {/* ── Profile Header ────────────────────────────────────────── */}
            <View style={styles.heroSection}>
              <View style={[styles.avatarWrap, { borderColor: theme.border }]}>
                <Image
                  source={displayImage && !imageError ? { uri: displayImage } : require('../../assets/default-profile.png')}
                  defaultSource={require('../../assets/default-profile.png')}
                  onError={() => setImageError(true)}
                  style={[styles.avatar, (!displayImage || imageError) && isDark ? { tintColor: '#fff' } : null]}
                />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                {profileData?.email ? (
                  <Text style={[styles.heroEmail, { color: theme.textSecondary }]} numberOfLines={1}>{profileData.email}</Text>
                ) : null}
                <View style={styles.heroBadges}>
                  <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{displayRole}</Text>
                  </View>
                  {!!profileData?.gender && (
                    <View style={[styles.badge, { backgroundColor: '#10b98115' }]}>
                      <Text style={[styles.badgeText, { color: '#10b981' }]}>{profileData.gender}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ── Details Grid ──────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFORMATION</Text>
              <View style={styles.gridRow}>
                <CompactCard icon="person" label="Full Name" value={profileData?.fullname} color="#6366f1" />
                <CompactCard icon="people" label="Father Name" value={profileData?.fathername} color="#f59e0b" />
                <CompactCard icon="call" label="Phone" value={profileData?.phone} color="#3b82f6" />
                <CompactCard icon="school" label={isTeacher ? 'Subject' : 'Class'} value={profileData?.class} color="#ec4899" />
                <CompactCard icon="albums" label={isTeacher ? 'Qual.' : 'Section'} value={profileData?.section} color="#8b5cf6" />
                <CompactCard icon="id-card" label="ID / Roll No" value={profileData?.rollno} color="#10b981" />
              </View>
            </View>

            {/* ── Management & Support ──────────────────────────────────── */}
            {(isTeacher || isAdmin) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MANAGEMENT</Text>
                <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {isTeacher && <MenuRow icon="briefcase" label="Teacher Dashboard" subtitle="Attendance & exams" color="#3b82f6" onPress={() => navigation.navigate('TeacherDashboardScreen' as never)} isLast={!isAdmin} />}
                  {isAdmin && <MenuRow icon="settings" label="Admin Dashboard" subtitle="Manage academy" color="#6366f1" onPress={() => navigation.navigate('Admin')} isLast />}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>
              <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {supportItems.map((item, idx) => (
                  <MenuRow 
                    key={item.key} 
                    icon={item.icon} 
                    label={item.label} 
                    color={item.iconColor} 
                    onPress={() => handleMenuPress(item.key)} 
                    isLast={idx === supportItems.length - 1} 
                  />
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>

      {/* ── Logout Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="log-out-outline" size={scale(20)} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sign Out</Text>
            <Text style={[styles.modalMsg, { color: theme.textSecondary }]}>Are you sure you want to sign out from your account?</Text>
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: '#ef4444' }]}
                onPress={confirmLogout}
                disabled={loggingOut}
                activeOpacity={0.7}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderWrap: { padding: scale(60), alignItems: 'center' },
  content: { paddingHorizontal: scale(14), paddingTop: scale(8) },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorWrap:  { paddingHorizontal: scale(24), paddingTop: scale(40) },
  errorCard:  { borderRadius: scale(16), padding: scale(24), alignItems: 'center' },
  errorTitle: { fontSize: scale(15), fontWeight: '700', marginTop: scale(10), marginBottom: scale(4) },
  errorMsg:   { fontSize: scale(11), textAlign: 'center', marginBottom: scale(16) },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(8) },
  retryText:  { color: '#fff', fontSize: scale(11), fontWeight: '700' },

  // ── Top Bar ────────────────────────────────────────────────────────────────
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: scale(14), 
    paddingTop: scale(10), 
    paddingBottom: scale(10) 
  },
  titleCenter: { alignItems: 'center', flex: 1 },
  screenTitle: { fontSize: scale(16), fontWeight: '800', letterSpacing: -0.3 },
  iconBtn: { 
    width: scale(32), 
    height: scale(32), 
    borderRadius: scale(10), 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(6), marginTop: scale(2) },
  offlineBadgeText: { fontSize: scale(9), fontWeight: '700' },

  // ── Profile Hero ───────────────────────────────────────────────────────────
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
    paddingHorizontal: scale(4),
  },
  avatarWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: scale(14),
  },
  avatar: { width: '100%', height: '100%' },
  heroInfo: { flex: 1, justifyContent: 'center' },
  heroName: { fontSize: scale(16), fontWeight: '700', letterSpacing: -0.2, marginBottom: scale(2) },
  heroEmail: { fontSize: scale(11), marginBottom: scale(6) },
  heroBadges: { flexDirection: 'row', gap: scale(6) },
  badge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(12) },
  badgeText: { fontSize: scale(9), fontWeight: '700', textTransform: 'uppercase' },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: { marginBottom: scale(18) },
  sectionTitle: {
    fontSize: scale(9.5),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: scale(8),
    marginLeft: scale(4),
  },

  // ── Grid Row ───────────────────────────────────────────────────────────────
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -scale(4),
  },

  // ── Menu Cards ─────────────────────────────────────────────────────────────
  menuCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  modalCard: { width: scale(260), borderRadius: scale(16), padding: scale(18), alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalIconWrap: { width: scale(40), height: scale(40), borderRadius: scale(20), justifyContent: 'center', alignItems: 'center', marginBottom: scale(10) },
  modalTitle: { fontSize: scale(14), fontWeight: '700', marginBottom: scale(4), textAlign: 'center' },
  modalMsg: { fontSize: scale(10.5), textAlign: 'center', marginBottom: scale(18), lineHeight: scale(16) },
  modalBtnRow: { flexDirection: 'row', gap: scale(8), width: '100%' },
  modalBtn: { flex: 1, height: scale(36), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: 'transparent' },
  modalBtnConfirm: { },
  modalBtnText: { fontSize: scale(11), fontWeight: '700' },
});

