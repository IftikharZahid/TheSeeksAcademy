import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, StatusBar, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import { auth, db, storage } from '../../api/firebaseConfig';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNetInfo } from '@react-native-community/netinfo';
import { fetchUserProfile, setProfile } from '../../store/slices/authSlice';
import { CompactCard, MenuRow } from '../../components/CompactUI';
import { StudentProfileBanner } from '../../components/StudentProfileBanner';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'fathername' | 'phone' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  const isOffline = netInfo.isConnected === false;

  React.useEffect(() => {
    if (user?.uid) {
      AsyncStorage.getItem(`profile_picture_${user.uid}`).then(res => {
        if (res) setLocalImageUri(res);
      }).catch(() => {});
    }
  }, [user?.uid]);



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
      if (user?.uid) {
        await AsyncStorage.removeItem(`profile_picture_${user.uid}`).catch(() => {});
      }
      await signOut(auth); 
      setLogoutModalVisible(false);
    } catch { 
      setLoggingOut(false);
      Alert.alert('Error', 'Failed to logout. Please try again.'); 
    }
  };

  const openEditModal = (field: 'fathername' | 'phone') => {
    if (isOffline) {
      Alert.alert('Offline', 'Please connect to the internet to update your profile.');
      return;
    }
    setEditField(field);
    setEditValue(profileData?.[field] || '');
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!user?.uid || !editField) return;
    setSavingEdit(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { [editField]: editValue.trim() });
      await dispatch(fetchUserProfile({ uid: user.uid, email: user.email }));
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    }
    setSavingEdit(false);
  };

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'helpCenter':    navigation.navigate('HelpCenterScreen');    break;
      case 'privacyPolicy': navigation.navigate('PrivacyPolicyScreen'); break;
      case 'aboutApp':      navigation.navigate('AboutScreen');         break;
    }
  };

  const handleImagePick = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'Please connect to the internet to update your profile picture.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, // Enables the professional OS-level square cropping tool
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        setUploadingImage(true);
        const asset = pickerResult.assets[0];
        
        // Compress aggressively and get base64 for local storage
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: scale(300), height: scale(300) } }], // Small dimension for avatars
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true } // 50% quality JPEG
        );

        if (manipResult.base64 && user?.uid) {
          const imageData = `data:image/jpeg;base64,${manipResult.base64}`;
          await AsyncStorage.setItem(`profile_picture_${user.uid}`, imageData);
          setLocalImageUri(imageData);
          if (profileData) {
            dispatch(setProfile({ ...profileData, image: imageData }));
          }
          Alert.alert('Success', 'Profile picture saved locally in cache!');
        } else {
          Alert.alert('Error', 'Could not process image.');
        }
      }
    } catch (error) {
      console.error('Image pick/upload error:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const displayName  = profileData?.fullname || user?.displayName || 'User';
  const displayRole  = profileData?.role
    ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)
    : 'Student';
  const displayImage = localImageUri || ((profileData?.image && profileData.image.trim() !== '') ? profileData.image : (user?.photoURL && user.photoURL.trim() !== '' ? user.photoURL : null));
  const isTeacher    = ['teacher', 'hod', 'principal', 'vice principal', 'senior teacher', 'assistant teacher']
    .some(r => (profileData?.role || '').toLowerCase().includes(r));

  // ── Sub-components ─────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: StatusBar.currentHeight || 0 }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: StatusBar.currentHeight || 0, backgroundColor: theme.primary, zIndex: 999 }} />
      <StatusBar barStyle="light-content" backgroundColor={isDark ? theme.card : theme.primary} translucent={false} />
      
      {/* Fixed Header (Transparent, Absolute) */}
      <View style={[styles.topBar, { 
        position: 'absolute', 
        top: StatusBar.currentHeight || 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'transparent', 
        borderBottomColor: 'transparent', 
        paddingTop: scale(10),
        paddingBottom: scale(10),
        paddingHorizontal: scale(10), 
        zIndex: 100 
      }]}>
        <TouchableOpacity
          style={{ 
            width: scale(38), 
            height: scale(38), 
            borderRadius: scale(12), 
            backgroundColor: 'rgba(255, 255, 255, 0.15)', 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginRight: scale(12) 
          }} 
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(22)} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={[styles.screenTitle, { color: '#fff' }]}>Profile</Text>
          {isOffline && profileData && (
            <View style={[styles.offlineBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="cloud-offline-outline" size={scale(8)} color="#f59e0b" style={{ marginRight: scale(3) }} />
              <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ 
            width: scale(38), 
            height: scale(38), 
            borderRadius: scale(12), 
            backgroundColor: 'rgba(255, 255, 255, 0.2)', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={scale(20)} color="#fff" />
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
            <View style={{ marginHorizontal: -scale(14), marginTop: -scale(8) }}>
              <StudentProfileBanner />
            </View>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={[styles.avatarContainer, { borderColor: theme.background, backgroundColor: isDark ? theme.card : '#fff' }]} onPress={handleImagePick} disabled={uploadingImage} activeOpacity={0.7}>
                <Image
                  source={displayImage && !imageError ? { uri: displayImage } : require('../../assets/default-profile.png')}
                  defaultSource={require('../../assets/default-profile.png')}
                  onError={() => setImageError(true)}
                  style={[styles.avatar, (!displayImage || imageError) && isDark ? { tintColor: '#ffffff' } : null]}
                />
                {uploadingImage && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.primary, width: scale(30), height: scale(30), borderRadius: scale(15), justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.background }}>
                  <Ionicons name="camera" size={scale(16)} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
              {profileData?.email ? (
                <Text style={[styles.heroEmail, { color: theme.textSecondary, marginBottom: scale(4) }]} numberOfLines={1}>{profileData.email}</Text>
              ) : null}
              <View style={styles.heroBadges}>
                <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.roleText, { color: theme.primary }]}>{displayRole}</Text>
                </View>
                {!!profileData?.gender && (
                  <View style={[styles.roleBadge, { backgroundColor: '#10b98115' }]}>
                    <Text style={[styles.roleText, { color: '#10b981' }]}>{profileData.gender}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Details Grid ──────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFORMATION</Text>
              <View style={styles.gridRow}>
                <CompactCard icon="person" label="Full Name" value={profileData?.fullname} color="#6366f1" />
                <CompactCard 
                  icon="people" 
                  label="Father Name" 
                  value={profileData?.fathername} 
                  color="#f59e0b" 
                  editable={true}
                  onEdit={() => openEditModal('fathername')}
                />
                <CompactCard 
                  icon="call" 
                  label="Phone" 
                  value={profileData?.phone} 
                  color="#3b82f6" 
                  editable={true}
                  onEdit={() => openEditModal('phone')}
                />
                <CompactCard icon="school" label={isTeacher ? 'Subject' : 'Class'} value={profileData?.class} color="#ec4899" />
                <CompactCard icon="albums" label={isTeacher ? 'Qual.' : 'Session'} value={profileData?.session} color="#8b5cf6" />
                <CompactCard icon="id-card" label="ID / Roll No" value={profileData?.rollno} color="#10b981" />
              </View>
            </View>

            {/* ── Support ──────────────────────────────────── */}

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

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Ionicons name="pencil-outline" size={scale(20)} color="#3b82f6" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Edit {editField === 'fathername' ? 'Father Name' : 'Phone'}
            </Text>
            
            <TextInput
              style={[styles.editInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editField === 'fathername' ? 'Father Name' : 'Phone'}`}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize={editField === 'fathername' ? 'words' : 'none'}
              keyboardType={editField === 'phone' ? 'phone-pad' : 'default'}
            />
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: theme.primary }]}
                onPress={saveEdit}
                disabled={savingEdit}
                activeOpacity={0.7}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  avatarSection: {
    alignItems: 'center',
    marginTop: -scale(80),
    paddingBottom: scale(16),
    zIndex: 10,
  },
  avatarContainer: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: { width: '100%', height: '100%' },
  name: {
    fontSize: scale(20),
    fontWeight: '800',
    marginTop: scale(12),
    letterSpacing: -0.5,
  },
  heroEmail: { fontSize: scale(11), marginBottom: scale(6) },
  heroBadges: { flexDirection: 'row', gap: scale(6), justifyContent: 'center' },
  roleBadge: {
    marginTop: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  roleText: {
    fontSize: scale(11),
    fontWeight: '700',
  },

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
  modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  modalCard: { width: scale(260), borderRadius: scale(16), padding: scale(18), alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalIconWrap: { width: scale(40), height: scale(40), borderRadius: scale(20), justifyContent: 'center', alignItems: 'center', marginBottom: scale(10) },
  modalTitle: { fontSize: scale(14), fontWeight: '700', marginBottom: scale(4), textAlign: 'center' },
  modalMsg: { fontSize: scale(10.5), textAlign: 'center', marginBottom: scale(18), lineHeight: scale(16) },
  modalBtnRow: { flexDirection: 'row', gap: scale(8), width: '100%' },
  modalBtn: { flex: 1, height: scale(36), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: 'transparent' },
  modalBtnConfirm: { },
  modalBtnText: { fontSize: scale(13), fontWeight: '700' },
  editInput: {
    width: '100%',
    height: scale(40),
    borderWidth: 1,
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
    fontSize: scale(12),
  },
});
