import React, { useState } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../api/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';



type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    console.log('📝 Starting signup process for:', email.trim());

    try {
      // Step 1: Create Firebase Authentication user
      console.log('🔐 Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      console.log('✅ Firebase Auth user created! UID:', userCredential.user.uid);

      // Step 2: Update profile with name
      if (userCredential.user) {
        console.log('👤 Updating user profile with display name...');
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
        console.log('✅ Display name updated:', name.trim());

        // Step 3: Create profile document in Firestore
        try {
          console.log('💾 Creating user profile in Firestore...');
          await setDoc(doc(db, 'profile', userCredential.user.uid), {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            image: '', // Default empty, user can update later
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          console.log('✅ User profile created in Firestore collection: profile');
        } catch (firestoreError) {
          console.error('❌ Error creating Firestore profile:', firestoreError);
          console.error('Note: Auth user was created, but profile doc failed');
        }
      }

      console.log('🎉 Signup successful!');
      setIsLoading(false);

      Alert.alert(
        'Success',
        'Account created successfully!',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      setIsLoading(false);
      console.error('❌ Signup error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'Something went wrong';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
        console.error('📧 Email already registered:', email.trim());
      }
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
        console.error('❌ Invalid email format:', email.trim());
      }
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
        console.error('🔒 Weak password provided');
      }
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
        console.error('🌐 Network connection failed');
      }

      // Check for Firebase configuration issues
      if (error.message && error.message.includes('API key')) {
        errorMessage = 'Firebase configuration error. Please contact support.';
        console.error('🔥 FIREBASE CONFIG ERROR: Check firebaseConfig.ts credentials');
      }

      Alert.alert('Signup Failed', errorMessage);
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Join The Seeks Academy today</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#f9fafb', borderColor: theme.border }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textTertiary}
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>

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
                placeholder="Create a password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.background : '#f9fafb', borderColor: theme.border }]}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            style={[
              styles.signupButton,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
              isLoading && styles.signupButtonDisabled
            ]}
          >
            <Text style={styles.signupButtonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginPrompt, { color: theme.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>Sign In</Text>
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

  /* ── Button ── */
  signupButton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* ── Footer ── */
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});