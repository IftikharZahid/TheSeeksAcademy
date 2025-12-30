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
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
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
          console.log('✅ User profile found:', userData.name);

          // Store user data in storage for app-wide access
          await AsyncStorage.setItem('user_data', JSON.stringify({
            uid: userCredential.user.uid,
            email: userData.email,
            name: userData.name,
            image: userData.image || '',
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

      // Step 3: Handle "Remember Me" functionality (email only, NOT password)
      if (rememberMe) {
        await AsyncStorage.setItem('user_email', email.trim());
        console.log('💾 Email saved for next login');
      } else {
        await AsyncStorage.removeItem('user_email');
      }

      // Remove any old password storage for security
      await AsyncStorage.removeItem('user_password');

      console.log('🎉 Login successful! Navigating to Main...');
      setIsLoading(false);
      navigation.replace('Main');

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
    paddingBottom: 40,
  },
  illustrationContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: width,
    height: 240,
  },
  circleBackground: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 10,
  },
  phoneFrame: {
    width: 120,
    height: 220,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    paddingTop: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 16,
    borderRadius: 30,
  },
  mockLineLong: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  mockLineShort: {
    width: '50%',
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  mockLineMedium: {
    width: '70%',
    height: 6,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    color: '#9ca3af',
    marginRight: 10,
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  passwordToggle: {
    marginLeft: 8,
  },
  passwordToggleIcon: {
    fontSize: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 30,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});