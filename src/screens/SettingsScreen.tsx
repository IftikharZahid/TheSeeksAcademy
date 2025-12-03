import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.background }]}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('SimTrackerScreen' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📱</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>SIM Tracker</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📊</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Attendance Log</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📝</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Assignments</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>💬</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Messages</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔔</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Notification Settings</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>General</Text>
          
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('ChangePasswordScreen' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔑</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Change Password</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>☀️</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={isDark ? theme.primary : theme.background}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌐</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Language</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.languageValue, { color: theme.textSecondary }]}>English</Text>
                <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
          
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('AboutScreen' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>ℹ️</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>About The App</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('PrivacyPolicyScreen' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🛡️</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Privacy & Policy</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('HelpCenterScreen' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📞</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Help Center</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Panel (Temporary) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Panel (Temporary)</Text>
          
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('Admin' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🛠️</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>Admin Dashboard</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('SchoolDashboard' as never)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🏫</Text>
                <Text style={[styles.settingText, { color: theme.text }]}>School Dashboard</Text>
              </View>
              <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Account Button */}
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
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
  backIcon: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageValue: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
