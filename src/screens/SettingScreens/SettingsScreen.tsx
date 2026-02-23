import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { signOut } from "firebase/auth";
import { auth } from "../../api/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SettingItemProps {
  icon: string;
  iconColor: string;
  title: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor,
  title,
  onPress,
  rightElement,
  showChevron = true
}) => {
  const { theme } = useTheme();

  const Content = (
    <View style={styles.settingRow}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.settingText, { color: theme.text }]}>{title}</Text>
      {rightElement || (showChevron && (
        <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
      ))}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();

  const ADMIN_EMAILS = ['theseeksacademyfta@gmail.com', 'iftikharzahid@outlook.com'];
  const currentUserEmail = auth.currentUser?.email?.toLowerCase() || '';
  const isAdmin = ADMIN_EMAILS.includes(currentUserEmail);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const accountItems = [
    { icon: 'phone-portrait', color: '#6366f1', title: 'SIM Tracker', screen: 'SimTrackerScreen' },
    { icon: 'bar-chart', color: '#0ea5e9', title: 'Attendance Log', screen: 'AttendanceScreen' },
    { icon: 'document-text', color: '#10b981', title: 'Assignments', screen: 'AssignmentsScreen' },
    { icon: 'chatbubbles', color: '#f59e0b', title: 'Messages', screen: 'MessagesScreen' },
    { icon: 'notifications', color: '#ef4444', title: 'Notifications', screen: 'NoticesScreen' },
  ];

  const generalItems = [
    { icon: 'key', color: '#8b5cf6', title: 'Change Password', screen: 'ChangePasswordScreen' },
  ];

  const preferenceItems = [
    { icon: 'information-circle', color: '#6366f1', title: 'About App', screen: 'AboutScreen' },
    { icon: 'shield-checkmark', color: '#10b981', title: 'Privacy Policy', screen: 'PrivacyPolicyScreen' },
    { icon: 'help-circle', color: '#f59e0b', title: 'Help Center', screen: 'HelpCenterScreen' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Compact Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {accountItems.map((item, index) => (
              <React.Fragment key={item.title}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <SettingItem
                  icon={item.icon}
                  iconColor={item.color}
                  title={item.title}
                  onPress={item.screen ? () => navigation.navigate(item.screen as never) : undefined}
                />
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>GENERAL</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {generalItems.map((item, index) => (
              <React.Fragment key={item.title}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <SettingItem
                  icon={item.icon}
                  iconColor={item.color}
                  title={item.title}
                  onPress={item.screen ? () => navigation.navigate(item.screen as never) : undefined}
                  rightElement={(item as any).value ? (
                    <View style={styles.valueContainer}>
                      <Text style={[styles.valueText, { color: theme.textSecondary }]}>{(item as any).value}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                    </View>
                  ) : undefined}
                />
              </React.Fragment>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Dark Mode Toggle */}
            <SettingItem
              icon={isDark ? 'moon' : 'sunny'}
              iconColor="#f59e0b"
              title="Dark Mode"
              showChevron={false}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.border, true: theme.primaryLight }}
                  thumbColor={isDark ? theme.primary : '#fff'}
                  style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                />
              }
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {preferenceItems.map((item, index) => (
              <React.Fragment key={item.title}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <SettingItem
                  icon={item.icon}
                  iconColor={item.color}
                  title={item.title}
                  onPress={() => navigation.navigate(item.screen as never)}
                />
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Admin Panel */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ADMIN</Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.adminRow}
                onPress={() => navigation.navigate('Admin' as never)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminIconGradient}
                >
                  <Ionicons name="settings" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.adminTextContainer}>
                  <Text style={[styles.adminTitle, { color: theme.text }]}>Admin Dashboard</Text>
                  <Text style={[styles.adminSubtitle, { color: theme.textSecondary }]}>Manage academy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  adminIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminTextContainer: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
