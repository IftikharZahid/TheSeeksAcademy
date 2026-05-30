import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../api/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Interactive Focus States for Input Glow
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address (e.g., name@gmail.com)');
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
        let userDocSnap = await getDoc(doc(db, 'studentsprofile', userCredential.user.uid));
        let profileSource = 'studentsprofile';

        if (!userDocSnap.exists()) {
          userDocSnap = await getDoc(doc(db, 'profile', userCredential.user.uid));
          profileSource = 'profile';
        }

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          const userName = userData.fullname || userData.name || userData.displayName || userData.fullName || userCredential.user.displayName || 'User';
          console.log(`👤 Student profile fetched from ${profileSource}/`, userCredential.user.uid, '- name:', userName);

          // Store user data in storage for app-wide access
          await AsyncStorage.setItem('user_data', JSON.stringify({
            uid: userCredential.user.uid,
            email: userData.email || userCredential.user.email,
            name: userName,
            image: userData.image || userData.photoURL || '',
          }));
          console.log('💾 User data saved to storage');
        } else {
          console.warn('⚠️ No user profile found in Firestore for UID:', userCredential.user.uid);
          // Store basic info from auth
          await AsyncStorage.setItem('user_data', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName || 'User',
            image: '',
          }));
        }
      } catch (firestoreError) {
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

      let errorMessage = 'Something went wrong';
      if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
      if (error.code === 'auth/user-disabled') errorMessage = 'User account disabled';
      if (error.code === 'auth/user-not-found') errorMessage = 'User not found';
      if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      if (error.code === 'auth/invalid-credential') errorMessage = 'Invalid credentials';
      if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      if (error.code === 'auth/too-many-requests') errorMessage = 'Too many failed attempts. Please try again later';

      // Check for Firebase configuration issues
      if (error.message && error.message.includes('API key')) {
        errorMessage = 'Firebase configuration error. Please contact support.';
        console.error('🔥 FIREBASE CONFIG ERROR: Check firebaseConfig.ts credentials');
      }

      Alert.alert('Login Failed', errorMessage);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Academic Shield / Crest Logo Section */}
        <View style={styles.logoOuterContainer}>
          {/* Authentically shaped Academic Shield, floating with premium shadow */}
          <View style={[styles.crestInnerShield, { backgroundColor: theme.card, borderColor: '#d4af37' }]}>
            {/* Translucent Gold Honor Sash */}
            <View style={styles.diagonalRibbon} />
            
            {/* Logo Image centered */}
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {/* Stars of Academic Excellence inside shield tip */}
            <View style={styles.crestStarRow}>
              <Ionicons name="star" size={8} color="#d4af37" />
              <Ionicons name="star" size={8} color="#d4af37" style={{ marginHorizontal: 2 }} />
              <Ionicons name="star" size={8} color="#d4af37" />
            </View>
          </View>
        </View>

        {/* Academic Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.academyTitle, { color: theme.text }]}>THE SEEKS ACADEMY</Text>
          <Text style={[styles.academyMotto, { color: '#d4af37' }]}>FORT ABBAS</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            PORTAL OF ACADEMIC EXCELLENCE
          </Text>
        </View>

        {/* Form Card Container */}
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
          
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Institutional Email / ID</Text>
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: isDark ? theme.background : '#f8fafc', 
                borderColor: isEmailFocused ? theme.primary : theme.border 
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={18} 
                color={isEmailFocused ? theme.primary : theme.textTertiary} 
                style={styles.inputIcon} 
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                placeholder="e.g. student@theseeksacademy.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Security Password</Text>
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: isDark ? theme.background : '#f8fafc', 
                borderColor: isPasswordFocused ? theme.primary : theme.border 
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={18} 
                color={isPasswordFocused ? theme.primary : theme.textTertiary} 
                style={styles.inputIcon} 
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.textInput, { color: theme.text }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={18} 
                  color={theme.textSecondary} 
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
                { borderColor: theme.border },
                rememberMe && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" style={{ fontWeight: 'bold' }} />}
              </View>
              <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>Save Credentials</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Reset Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button with Premium Linear Gradient */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
            style={styles.loginButtonWrapper}
          >
            <LinearGradient
              colors={[theme.primaryDark || '#7c3aed', theme.primary || '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.loginButtonGradient,
                isLoading && styles.loginButtonDisabled
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.loginButtonContent}>
                  <Ionicons name="log-in-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>SIGN IN</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Professional Academic Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.dividerRow}>
            <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
            <Ionicons name="book-outline" size={14} color="#d4af37" style={{ marginHorizontal: 10 }} />
            <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
          </View>

          <Text style={[styles.securityMotto, { color: theme.textSecondary }]}>
            KNOWLEDGE  •  INTEGRITY  •  LEADERSHIP
          </Text>
          <View style={styles.securityStatusRow}>
            <Ionicons name="shield-checkmark" size={11} color={theme.success} style={{ marginRight: 4 }} />
            <Text style={[styles.securityText, { color: theme.textTertiary }]}>
              Official Student Information Portal • Secure Connection
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },

  /* ── Academic Crest Shield ── */
  logoOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  crestInnerShield: {
    width: 76,
    height: 86,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  diagonalRibbon: {
    position: 'absolute',
    width: '150%',
    height: 14,
    backgroundColor: '#d4af37',
    transform: [{ rotate: '-45deg' }],
    opacity: 0.15,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    zIndex: 2,
  },
  crestStarRow: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  /* ── Academic Header ── */
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  academyTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  academyMotto: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  /* ── Form Card ── */
  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
    fontWeight: '500',
  },
  passwordToggle: {
    paddingLeft: 6,
  },

  /* ── Options Row ── */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberMeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ── Sign In Button ── */
  loginButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loginButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },

  /* ── Academic Footer ── */
  footerContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  footerLine: {
    height: 1,
    flex: 0.35,
  },
  securityMotto: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  motivationalQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  securityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
});