import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const socialLinks = [
    { key: 'github',   icon: 'logo-github',   label: 'GitHub',    color: isDark ? '#e2e8f0' : '#24292e', url: 'https://github.com/iftikharzahid' },
    { key: 'linkedin', icon: 'logo-linkedin', label: 'LinkedIn',  color: '#0A66C2',                      url: 'https://linkedin.com/in/iftikharzahid' },
    { key: 'globe',    icon: 'globe-outline', label: 'Portfolio', color: theme.primary,                  url: 'https://zahid.codes' },
    { key: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp',  color: '#25D366',                      url: 'https://wa.me/923007971374' },
  ];



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* App Identity Card */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.appCard}
        >
          <Image source={require('../../../assets/icon.png')} style={styles.appLogo} resizeMode="contain" />
          <View>
            <Text style={styles.appName}>The Seeks Academy</Text>
            <Text style={styles.appLocation}>Fort Abbas, Bahawalnagar</Text>
          </View>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.1</Text>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { label: 'Version',  value: '1.0.1' },
            { label: 'Released', value: '2026'  },
            { label: 'Rating',   value: '5.0 ★' },
          ].map((stat, idx, arr) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              </View>
              {idx < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: theme.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Developer Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>DEVELOPER</Text>
          <View style={styles.devRow}>
            <Image source={require('../../assets/profile.jpg')} style={[styles.devAvatar, { borderColor: theme.border }]} />
            <View style={styles.devInfo}>
              <Text style={[styles.devName, { color: theme.text }]}>Iftikhar Zahid</Text>
              <View style={[styles.rolePill, { backgroundColor: theme.primary + '18' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>Full Stack Developer</Text>
              </View>
              <Text style={[styles.devBio, { color: theme.textSecondary }]}>
                Building intuitive mobile apps with clean code & modern design.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>CONNECT</Text>
          <View style={styles.socialGrid}>
            {socialLinks.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.socialBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}
                onPress={() => Linking.openURL(item.url)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={16} color={item.color} />
                <Text style={[styles.socialLabel, { color: theme.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


        {/* App Purpose Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 16 }]}>
          <View style={styles.purposeHeader}>
            <View style={[styles.purposeIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="rocket-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.purposeTitle, { color: theme.text }]}>Our Mission</Text>
          </View>
          <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
            The Seeks Academy app is thoughtfully designed to streamline communication and management. We aim to digitize operations like attendance tracking, fee management, and academic progress sharing, fostering a more cohesive, efficient, and transparent educational environment for students, parents, and staff.
          </Text>
        </View>

        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Made with ❤️ by </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://zahid.codes')} activeOpacity={0.7} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>ZahidCodes</Text>
          </TouchableOpacity>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}> · v1.0.1</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  scroll: { padding: 12, paddingBottom: 32, gap: 10 },

  /* App Identity */
  appCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appLogo: { width: 46, height: 46, borderRadius: 11 },
  appName: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  appLocation: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  versionBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  versionText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, marginVertical: 4 },

  /* Shared Card */
  card: {
    borderRadius: 14, borderWidth: 1,
    padding: 12,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10,
  },
  divider: { height: 1, marginVertical: 12 },

  /* Developer */
  devRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  devAvatar: { width: 52, height: 52, borderRadius: 13, borderWidth: 1 },
  devInfo: { flex: 1 },
  devName: { fontSize: 14, fontWeight: '700' },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  devBio: { fontSize: 12, lineHeight: 17, marginTop: 6 },

  /* Social */
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    gap: 7, width: '48%',
  },
  socialLabel: { fontSize: 13, fontWeight: '500' },



  /* App Purpose */
  purposeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  purposeIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  purposeTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  purposeText: { fontSize: 13, lineHeight: 22, letterSpacing: 0.2 },

  footerWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 11 },
  footerLink: { fontSize: 11, fontWeight: '600' },
});
