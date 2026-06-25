import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, or } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scale } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const isSmall = height < 700;

// Exact Colors from the Design
const COLORS = {
  darkBlue: "#0B2D64",
  gold: "#D4AF37",
  textGray: "#64748B",
  lightBlueBg: "#EBF4FB",
  white: "#FFFFFF",
  lineGray: "#CBD5E1",
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interactive Focus States for Input Glow
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Keyboard Height State
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Native Keyboard Listeners for flawless scrolling
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('user_email');
      const savedPassword = await AsyncStorage.getItem('user_password');

      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }

      if (savedPassword) {
        setPassword(savedPassword);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Institutional Email is required.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Security Password is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email format.');
      return;
    }

    setIsLoading(true);
    console.log('🔐 Starting login process for:', email.trim());

    try {
      // Step 1: Authenticate with Firebase
      console.log('📝 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('✅ Firebase authentication successful! UID:', userCredential.user.uid);

      // Step 2: Fetch user profile data from Firestore
      try {
        console.log('📥 Fetching user profile from Firestore...');
        let profileFound = false;
        let userName = 'User';
        let userImage = '';

        let userDocSnap = await getDoc(doc(db, 'studentsprofile', userCredential.user.uid));
        if (userDocSnap.exists()) {
            profileFound = true;
            userName = userDocSnap.data().fullname || userDocSnap.data().name || 'User';
            userImage = userDocSnap.data().image || '';
        } else {
            userDocSnap = await getDoc(doc(db, 'profile', userCredential.user.uid));
            if (userDocSnap.exists()) {
                profileFound = true;
                userName = userDocSnap.data().fullname || userDocSnap.data().name || 'User';
                userImage = userDocSnap.data().image || '';
            } else {
                userDocSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
                if (userDocSnap.exists()) {
                    profileFound = true;
                    userName = userDocSnap.data().fullname || userDocSnap.data().name || 'User';
                    userImage = userDocSnap.data().image || '';
                } else {
                    const emailLower = email.trim().toLowerCase();
                    const emailParts = emailLower.split('@');
                    const emailMixed = emailParts.length === 2 ? `${emailParts[0].toUpperCase()}@TheSeeksAcademy.edu.pk` : emailLower;
                    const sq = emailMixed !== emailLower
                        ? query(collection(db, 'students'), or(where('email', '==', emailLower), where('email', '==', emailMixed)))
                        : query(collection(db, 'students'), where('email', '==', emailLower));
                    const sSnapshot = await getDocs(sq);
                    if (!sSnapshot.empty) {
                        profileFound = true;
                        userName = sSnapshot.docs[0].data().name || 'User';
                        userImage = sSnapshot.docs[0].data().profileImage || '';
                    }
                }
            }
        }

        if (profileFound) {
            await AsyncStorage.setItem('user_data', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                name: userName,
                image: userImage,
            }));
            console.log('💾 User data saved to storage');
        } else {
            console.warn('⚠️ No user profile found in Firestore for UID:', userCredential.user.uid);
            await signOut(auth);
            throw new Error('auth/deleted-account');
        }
      } catch (firestoreError: any) {
        if (firestoreError.message === 'auth/deleted-account') {
            throw firestoreError; // Re-throw to main catch block
        }
        console.error('❌ Error fetching Firestore data:', firestoreError);
        // Continue with login even if Firestore fetch fails
      }

      // Step 3: Handle "Remember Me" functionality (email AND password)
      if (rememberMe) {
        await AsyncStorage.setItem('user_email', email.trim());
        await AsyncStorage.setItem('user_password', password);
        console.log('💾 Credentials saved for next login');
      } else {
        await AsyncStorage.removeItem('user_email');
        await AsyncStorage.removeItem('user_password');
      }

      console.log('🎉 Login successful!');
      setIsLoading(false);
      // Navigation is handled automatically by onAuthStateChanged in AppNavigator

    } catch (error: any) {
      setIsLoading(false);
      console.error('❌ Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'An unexpected error occurred.';
      if (error.message === 'auth/deleted-account') errorMessage = 'Account deactivated by administration.';
      if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email format.';
      if (error.code === 'auth/user-disabled') errorMessage = 'Account disabled.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = 'Invalid credentials.';
      if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Check connection.';
      if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Try again later.';

      // Check for Firebase configuration issues
      if (error.message && error.message.includes('API key')) {
        errorMessage = 'System error. Contact support.';
        console.error('🔥 FIREBASE CONFIG ERROR: Check firebaseConfig.ts credentials');
      }

      setErrorMsg(errorMessage);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Account Security',
      'For security and privacy compliance, student credentials are managed centrally by the academy administration.\n\nPlease contact your campus administrator or IT Support Desk directly to request a password reset.',
      [{ text: 'Understood', style: 'default' }]
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* ── Background Graphic (Fixed position) ── */}
      <View style={styles.backgroundGraphic}>
        <Svg height={Math.max(height, 800)} width="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Path d="M0,18 L50,45 L100,18 L100,100 L0,100 Z" fill="#F4F8FC" />
          <Path d="M0,25 L50,55 L100,25 L100,100 L0,100 Z" fill="#EAF2F8" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Top Header Section ── */}
            <View style={styles.topSection}>
              <Text style={styles.mainTitle}>STUDENT PORTAL</Text>

              <View style={styles.dividerRow}>
                <View style={styles.thinLine} />
                <Ionicons name="school" size={14} color={COLORS.darkBlue} style={styles.hatIcon} />
                <View style={styles.thinLine} />
              </View>

              <Text style={styles.topSubtitle}>Your Gateway to Academic Excellence</Text>
            </View>

            {/* ── Logo & Middle Header ── */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.starsRow}>
                <Ionicons name="star" size={12} color={COLORS.gold} />
                <Ionicons name="star" size={14} color={COLORS.gold} style={styles.centerStar} />
                <Ionicons name="star" size={12} color={COLORS.gold} />
              </View>

              <Text style={styles.academyTitle}>THE SEEKS ACADEMY</Text>

              <View style={styles.locationRow}>
                <View style={styles.locationLine} />
                <Text style={styles.locationText}>F O R T  A B B A S</Text>
                <View style={styles.locationLine} />
              </View>
            </View>

            {/* Form Card Container */}
            <View style={styles.formCard}>

              {/* Welcome Section */}
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Welcome Back!</Text>
                <Text style={styles.welcomeSubtitle}>Sign in to continue to your account</Text>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Institutional Email / ID</Text>
                <View style={[
                  styles.inputContainer,
                  isEmailFocused && styles.inputContainerFocused
                ]}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={isEmailFocused ? COLORS.darkBlue : COLORS.textGray}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrorMsg(null); }}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    placeholder="e.g. student@theseeksacademy.com"
                    placeholderTextColor={COLORS.textGray}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Security Password</Text>
                <View style={[
                  styles.inputContainer,
                  isPasswordFocused && styles.inputContainerFocused
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={isPasswordFocused ? COLORS.darkBlue : COLORS.textGray}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={password}
                    onChangeText={(text) => { setPassword(text); setErrorMsg(null); }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textGray}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.textGray}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMeContainer}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxActive
                  ]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color={COLORS.white} style={{ fontWeight: 'bold' }} />}
                  </View>
                  <Text style={styles.rememberMeText}>Save Credentials</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Reset Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Professional Error Message Inline */}
              {errorMsg && (
                <View style={styles.inlineErrorContainer}>
                  <Ionicons name="warning" size={16} color="#ef4444" style={{ marginRight: scale(6) }} />
                  <Text style={styles.inlineErrorText}>{errorMsg}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.primaryBtn, isLoading && styles.loginButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={18} color={COLORS.white} style={styles.btnIcon} />
                    <Text style={styles.primaryBtnText}>SIGN IN</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Contact Support */}
              <View style={styles.supportRow}>
                <Ionicons name="headset-outline" size={16} color={COLORS.textGray} />
                <Text style={styles.supportText}>Need help? </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => Linking.openURL('https://wa.link/330h0s')}
                >
                  <Text style={styles.supportLink}>Contact Support &gt;</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  backgroundGraphic: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -500,
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: isSmall ? 16 : 24,
    paddingTop: isSmall ? 5 : 10,
    paddingBottom: 0,
  },

  /* ── Top Section ── */
  topSection: {
    alignItems: "center",
    width: "100%",
    marginBottom: 0,
    zIndex: 1,
  },
  mainTitle: {
    fontSize: isSmall ? 22 : 26,
    fontWeight: "900",
    color: COLORS.darkBlue,
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginVertical: scale(2),
  },
  thinLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lineGray,
  },
  hatIcon: {
    marginHorizontal: scale(12),
  },
  topSubtitle: {
    fontSize: isSmall ? 12 : 13,
    color: COLORS.textGray,
    fontWeight: "500",
  },

  /* ── Logo Section ── */
  logoSection: {
    alignItems: "center",
    width: "100%",
    marginTop: scale(-20),
    marginBottom: isSmall ? 4 : 8,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: isSmall ? 2 : 4,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: isSmall ? 90 : 120,
    height: isSmall ? 90 : 120,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmall ? 4 : 8,
  },
  centerStar: {
    marginHorizontal: scale(4),
    marginTop: -4,
  },
  academyTitle: {
    fontSize: isSmall ? 18 : 22,
    fontWeight: "800",
    color: COLORS.darkBlue,
    letterSpacing: 1,
    marginBottom: isSmall ? 2 : 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(6),
  },
  locationLine: {
    width: scale(30),
    height: 1,
    backgroundColor: COLORS.lineGray,
    marginHorizontal: scale(10),
  },
  locationText: {
    fontSize: scale(11),
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: 4,
  },

  /* ── Form Card ── */
  formCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    paddingHorizontal: isSmall ? 16 : 22,
    paddingVertical: isSmall ? 16 : 22,
    marginBottom: scale(12),
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: scale(12),
  },
  inputLabel: {
    fontSize: scale(10),
    fontWeight: "700",
    color: COLORS.darkBlue,
    marginBottom: scale(6),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: COLORS.lineGray,
    backgroundColor: COLORS.white,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    height: isSmall ? 42 : 46,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainerFocused: {
    borderColor: COLORS.darkBlue,
  },
  inputIcon: {
    marginRight: scale(8),
  },
  textInput: {
    flex: 1,
    fontSize: scale(13),
    padding: 0,
    fontWeight: "500",
    color: COLORS.darkBlue,
  },
  passwordToggle: {
    paddingLeft: scale(6),
  },

  /* ── Options Row ── */
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    marginBottom: scale(16),
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(5),
    borderWidth: 1.5,
    borderColor: COLORS.lineGray,
    marginRight: scale(6),
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.darkBlue,
  },
  rememberMeText: {
    fontSize: scale(12),
    fontWeight: "500",
    color: COLORS.textGray,
  },
  forgotPasswordText: {
    fontSize: scale(12),
    fontWeight: "600",
    color: "#2563eb",
  },

  /* ── Welcome Section ── */
  welcomeSection: {
    alignItems: "center",
    marginBottom: isSmall ? 14 : 20,
    marginTop: isSmall ? 0 : 4,
  },
  welcomeTitle: {
    fontSize: isSmall ? 18 : 20,
    fontWeight: "800",
    color: COLORS.darkBlue,
    marginBottom: scale(4),
  },
  welcomeSubtitle: {
    fontSize: scale(12),
    color: COLORS.textGray,
    fontWeight: "500",
  },

  /* ── Error Message Display ── */
  inlineErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    marginBottom: scale(16),
  },
  inlineErrorText: {
    color: "#ef4444",
    fontSize: scale(12),
    fontWeight: "600",
    flex: 1,
  },

  /* ── Sign In Button ── */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.darkBlue,
    borderRadius: scale(10),
    height: isSmall ? 42 : 48, // Compacted
    elevation: 4,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  btnIcon: {
    marginRight: scale(8),
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },

  /* ── OR Divider ── */
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: scale(18),
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lineGray,
    opacity: 0.5,
  },
  orText: {
    marginHorizontal: scale(12),
    fontSize: scale(11),
    color: COLORS.textGray,
    fontWeight: "600",
  },

  /* ── Secondary Button ── */
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: scale(10),
    borderWidth: 1.2,
    borderColor: COLORS.lineGray,
    height: isSmall ? 44 : 48,
    marginBottom: scale(16),
  },
  secondaryBtnText: {
    color: COLORS.darkBlue,
    fontSize: scale(14),
    fontWeight: "700",
  },

  /* ── Support Row ── */
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(4),
    marginBottom: scale(4),
  },
  supportText: {
    fontSize: scale(12),
    color: COLORS.textGray,
    marginLeft: scale(6),
  },
  supportLink: {
    fontSize: scale(12),
    color: "#2563eb",
    fontWeight: "600",
  },
});