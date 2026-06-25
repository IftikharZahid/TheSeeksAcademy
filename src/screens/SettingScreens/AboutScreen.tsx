import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../../utils/responsive';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const socialLinks = [
    { key: 'github', icon: 'logo-github', label: 'GitHub', color: isDark ? '#e2e8f0' : '#24292e', url: 'https://github.com/iftikharzahid' },
    { key: 'linkedin', icon: 'logo-linkedin', label: 'LinkedIn', color: '#0A66C2', url: 'https://linkedin.com/in/iftikharzahid' },
    { key: 'globe', icon: 'globe-outline', label: 'Portfolio', color: theme.primary, url: 'https://zahid.codes' },
    { key: 'logo-whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366', url: 'https://wa.link/330h0s' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={scale(16)} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>About</Text>
        </View>

        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── App Identity & Stats ────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroTop}>
            <Image source={require('../../../assets/icon.png')} style={styles.appLogo} resizeMode="contain" />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>The Seeks Academy</Text>
              <Text style={styles.heroLocation}>Fort Abbas, Bahawalnagar</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Ionicons name="cube" size={scale(14)} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroStatValue}>v1.0.1</Text>
              <Text style={styles.heroStatLabel}>Version</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="calendar" size={scale(14)} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroStatValue}>2026</Text>
              <Text style={styles.heroStatLabel}>Released</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="star" size={scale(14)} color="#fbbf24" />
              <Text style={styles.heroStatValue}>5.0</Text>
              <Text style={styles.heroStatLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Developer Card ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DEVELOPER & CONNECT</Text>
          <View style={[styles.devCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.devRow}>
              <Image source={require('../../assets/profile.jpg')} style={[styles.devAvatar, { borderColor: theme.border }]} />
              <View style={styles.devInfo}>
                <Text style={[styles.devName, { color: theme.text }]}>Iftikhar Zahid</Text>
                <View style={[styles.rolePill, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.roleText, { color: theme.primary }]}>Full Stack Developer</Text>
                </View>
                <Text style={[styles.devBio, { color: theme.textSecondary }]}>
                  Building intuitive mobile apps with clean code & modern design.
                </Text>
              </View>
            </View>

            {/* Separator */}
            <View style={[styles.devDivider, { backgroundColor: theme.border }]} />

            {/* Social Links Row */}
            <View style={styles.socialRow}>
              {socialLinks.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.socialIconBtn, { backgroundColor: item.color + '15' }]}
                  onPress={() => Linking.openURL(item.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={scale(18)} color={item.color} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Mission ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>OUR MISSION</Text>
          <View style={[styles.missionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.missionText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.primary }}>The Seeks Academy</Text> app is thoughtfully designed to streamline communication and management. We aim to digitize operations like attendance tracking, fee management, and academic progress sharing, fostering a more cohesive, efficient, and transparent educational environment for students, parents, and staff.
            </Text>
          </View>
        </View>

        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Made with ❤️ by </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://zahid.codes')} activeOpacity={0.7} hitSlop={{ top: scale(10), bottom: scale(10), left: scale(10), right: scale(10) }}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>ZahidCodes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: scale(14), paddingTop: scale(8), paddingBottom: scale(32) },

  // ── Top Bar ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingTop: scale(10),
    paddingBottom: scale(10)
  },
  titleCenter: { alignItems: 'center', flex: 1 },
  screenTitle: { fontSize: scale(16), fontWeight: '800', letterSpacing: -0.3 },
  iconBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center'
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  heroSection: {
    borderRadius: scale(14),
    padding: scale(16),
    marginBottom: scale(18),
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLogo: { width: scale(52), height: scale(52), borderRadius: scale(12), marginRight: scale(14) },
  heroInfo: { flex: 1, justifyContent: 'center' },
  heroName: { fontSize: scale(16), fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  heroLocation: { fontSize: scale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(4) },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: scale(16),
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: scale(13),
    fontWeight: '700',
    color: '#fff',
    marginTop: scale(6),
  },
  heroStatLabel: {
    fontSize: scale(9.5),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: scale(3),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: scale(28),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: { marginBottom: scale(18) },
  sectionTitle: {
    fontSize: scale(9.5),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: scale(8),
    marginLeft: scale(4),
  },

  // ── Developer Card ─────────────────────────────────────────────────────────
  devCard: {
    borderRadius: scale(14),
    borderWidth: 1,
    padding: scale(14),
  },
  devRow: { flexDirection: 'row', alignItems: 'flex-start' },
  devAvatar: { width: scale(48), height: scale(48), borderRadius: scale(12), borderWidth: 1, marginRight: scale(12) },
  devInfo: { flex: 1 },
  devName: { fontSize: scale(14), fontWeight: '700' },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    marginTop: scale(4),
  },
  roleText: { fontSize: scale(9.5), fontWeight: '700', letterSpacing: 0.2 },
  devBio: { fontSize: scale(11), lineHeight: scale(16), marginTop: scale(6) },
  devDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: scale(12),
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(8),
  },
  socialIconBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Mission Card ───────────────────────────────────────────────────────────
  missionCard: {
    borderRadius: scale(14),
    borderWidth: 1,
    padding: scale(14),
  },
  missionText: { fontSize: scale(11.5), lineHeight: scale(18), letterSpacing: 0.2 },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: scale(8) },
  footerText: { fontSize: scale(10) },
  footerLink: { fontSize: scale(10), fontWeight: '700' },
});
