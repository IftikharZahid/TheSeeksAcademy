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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../api/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        const userDocRef = doc(db, 'profile', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          const userName = userData.fullname || userData.name || userData.displayName || userData.fullName || userCredential.user.displayName || 'User';
          console.log('✅ User profile found:', userName);

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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address to reset password');
      return;
    }

    console.log('🔄 Password reset requested for:', email.trim());

    try {
      console.log('📧 Sending password reset email...');
      await sendPasswordResetEmail(auth, email.trim());
      console.log('✅ Password reset email sent successfully!');

      Alert.alert(
        'Success',
        `Password reset link has been sent to ${email.trim()}. Please check your email inbox (and spam folder).`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'Failed to send reset email';

      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
        console.error('❌ Invalid email format:', email.trim());
      }
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
        console.error('❌ User not found:', email.trim());
      }
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection';
        console.error('🌐 Network connection failed');
      }
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
        console.error('⚠️ Rate limit exceeded');
      }

      // Check for Firebase configuration issues
      if (error.message && error.message.includes('API key')) {
        errorMessage = 'Firebase configuration error. Please contact support.';
        console.error('🔥 FIREBASE CONFIG ERROR: Check firebaseConfig.ts credentials');
      }

      Alert.alert('Password Reset Failed', errorMessage);
    }
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
        {/* Illustration Section */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.circleBackground, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]} />
          <View style={[styles.phoneFrame, { backgroundColor: theme.card, borderColor: theme.text }]}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* Mock UI lines */}
            <View style={[styles.mockLineLong, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineShort, { backgroundColor: theme.border }]} />
            <View style={[styles.mockLineMedium, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/* Header Text */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Welcome Back!</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Sign in to continue learning</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Email Address</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#f9fafb', borderColor: theme.border }]}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
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
            <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#f9fafb', borderColor: theme.border }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.textInput, { color: theme.text }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={styles.rememberMeContainer}
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.border },
                rememberMe && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={[
              styles.loginButton,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
              isLoading && styles.loginButtonDisabled
            ]}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupPrompt, { color: theme.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: theme.primary }]}>Sign Up</Text>
            </TouchableOpacity>
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
    paddingVertical: 20,
  },

  /* ── Illustration (compact) ── */
  illustrationContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 160,
  },
  circleBackground: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 6,
  },
  phoneFrame: {
    width: 85,
    height: 150,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center',
    paddingTop: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  logoImage: {
    width: 40,
    height: 40,
    marginBottom: 10,
    borderRadius: 20,
  },
  mockLineLong: {
    width: '70%',
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
  },
  mockLineShort: {
    width: '45%',
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  mockLineMedium: {
    width: '58%',
    height: 4,
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },

  /* ── Header ── */
  headerContainer: {
    marginBottom: 18,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },

  /* ── Form ── */
  formContainer: {},
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    color: '#9ca3af',
    marginRight: 8,
    fontSize: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  passwordToggle: {
    paddingLeft: 8,
  },
  passwordToggleIcon: {
    fontSize: 15,
  },

  /* ── Options ── */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 13,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Button ── */
  loginButton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
    marginBottom: 14,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* ── Footer ── */
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    fontSize: 13,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});