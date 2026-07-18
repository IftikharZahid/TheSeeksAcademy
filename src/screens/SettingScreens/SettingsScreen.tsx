import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, StatusBar } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import { signOut } from "firebase/auth";
import { auth } from "../../api/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../../utils/responsive';

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const preferenceItems = [
    { icon: 'information-circle', color: '#6366f1', title: 'About App', screen: 'AboutScreen' },
    { icon: 'shield-checkmark', color: '#10b981', title: 'Privacy Policy', screen: 'PrivacyPolicyScreen' },
    { icon: 'help-circle', color: '#f59e0b', title: 'Help Center', screen: 'HelpCenterScreen' },
  ];

  return (
    <ScreenContainer headerTitle="Settings">
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>GENERAL</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>

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



        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: scale(24) }} />
      </ScrollView>
    </ScreenContainer>
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
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
  },
  backButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(16),
  },
  section: {
    marginTop: scale(16),
    paddingHorizontal: scale(12),
  },
  sectionTitle: {
    fontSize: scale(11),
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: scale(8),
    marginLeft: scale(4),
  },
  card: {
    borderRadius: scale(14),
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(11),
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  settingText: {
    flex: 1,
    fontSize: scale(14),
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: scale(13),
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: scale(56),
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(11),
  },
  adminIconGradient: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  adminTextContainer: {
    flex: 1,
  },
  adminTitle: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  adminSubtitle: {
    fontSize: scale(11),
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: scale(12),
    marginTop: scale(24),
    paddingVertical: scale(12),
    backgroundColor: '#ef4444',
    borderRadius: scale(12),
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#fff',
  },
});
