import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AuthAPI } from '../api/api';
import { useTheme } from '../context/ThemeContext';

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    // Validate current password
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }

    // Validate new password
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
      isValid = false;
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdatePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // First, verify the current password with the backend
      try {
        await AuthAPI.verifyPassword(currentPassword);
      } catch (verifyError: any) {
        // Current password is incorrect
        setErrors({
          ...errors,
          currentPassword: 'Current password is incorrect',
        });
        setLoading(false);
        Alert.alert('Error', 'Current password is incorrect. Please try again.');
        return;
      }

      // If verification succeeds, proceed with password change
      const response = await AuthAPI.changePassword(currentPassword, newPassword);

      if (response.data.success) {
        Alert.alert(
          'Success!',
          'Your password has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );

        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(response.data.message || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update password. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: isDark ? theme.card : '#f3f4f6' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content with Keyboard Handling */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Enter your current password and choose a new password
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Current Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: isDark ? theme.card : '#fafafa',
                    borderColor: theme.border,
                    color: theme.text
                  },
                  errors.currentPassword && styles.inputError
                ]}
                placeholder="Enter current password"
                placeholderTextColor={theme.textSecondary}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setErrors({ ...errors, currentPassword: '' });
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Text style={styles.eyeIcon}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.currentPassword ? (
              <Text style={styles.errorText}>{errors.currentPassword}</Text>
            ) : null}
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: isDark ? theme.card : '#fafafa',
                    borderColor: theme.border,
                    color: theme.text
                  },
                  errors.newPassword && styles.inputError
                ]}
                placeholder="Enter new password"
                placeholderTextColor={theme.textSecondary}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrors({ ...errors, newPassword: '' });
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.newPassword ? (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Confirm New Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: isDark ? theme.card : '#fafafa',
                    borderColor: theme.border,
                    color: theme.text
                  },
                  errors.confirmPassword && styles.inputError
                ]}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>

          {/* Password Requirements */}
          <View style={[styles.requirementsCard, { backgroundColor: isDark ? theme.card : '#f9fafb', borderColor: theme.border }]}>
            <Text style={[styles.requirementsTitle, { color: theme.text }]}>Password Requirements:</Text>
            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>• At least 6 characters long</Text>
            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>• Different from current password</Text>
            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>• Passwords must match</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
  },

  // Header Section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 40,
  },

  // Keyboard Avoiding View
  keyboardAvoidingView: {
    flex: 1,
  },

  // Content Section
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Input Fields
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 15,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: '100%',
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 6,
    fontWeight: '600',
  },

  // Update Button
  updateButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Requirements Card
  requirementsCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    marginBottom: 32,
  },
  requirementsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default ChangePasswordScreen;
