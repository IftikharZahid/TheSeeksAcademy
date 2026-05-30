import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, SafeAreaView, StatusBar,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../../utils/responsive';
import * as Clipboard from 'expo-clipboard';
import { CompactCard, MenuRow } from '../../components/CompactUI';

type RootStackParamList = {
  AdminStudentRecords: undefined;
  StudentProfile: { student: any };
};
type StudentProfileRouteProp = RouteProp<RootStackParamList, 'StudentProfile'>;

/** Section title with leading icon */
const SectionTitle = ({
  label, icon, theme,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme: any;
}) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={scale(12)} color={theme.textTertiary} />
    <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
      {label.toUpperCase()}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export const StudentProfile: React.FC = () => {
  const route = useRoute<StudentProfileRouteProp>();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { student } = route.params;

  const [toastVisible, setToastVisible] = useState(false);

  const copy = async (text: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1600);
  };

  // Initials for avatar fallback
  const initials = (student.name || '')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => (w[0] || '').toUpperCase())
    .join('');

  // Fee status colour
  const feeColor =
    student.feeStatus === 'Paid' ? theme.success :
    student.feeStatus === 'Pending' ? theme.error :
    theme.warning;
  const feeLabel = student.feeStatus || 'N/A';

  // Hero top padding: status bar height + breathing room
  const statusBarH = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
  const heroPaddingTop = statusBarH + scale(12);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── HERO ──────────────────────────────────────────── */}
      <LinearGradient
        colors={[theme.primaryDark, theme.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: heroPaddingTop }]}
      >
        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: heroPaddingTop + scale(4) }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={scale(19)} color="#fff" />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {student.profileImage ? (
            <Image source={{ uri: student.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials || '?'}</Text>
            </View>
          )}
          {/* Active indicator */}
          <View style={styles.activeDot} />
        </View>

        <Text style={styles.heroName}>{student.name || 'Unknown Student'}</Text>

        {/* Info pills */}
        <View style={styles.heroMeta}>
          {[
            { icon: 'id-card-outline' as const, text: student.studentId },
            { icon: 'school-outline' as const, text: student.grade },
            student.gender ? { icon: 'person-outline' as const, text: student.gender } : null,
          ].filter(Boolean).map((item: any, i) => (
            <View key={i} style={[styles.heroPill, i > 0 && { marginLeft: scale(6) }]}>
              <Ionicons name={item.icon} size={scale(9)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroPillText}>{item.text || 'N/A'}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── SCROLL CONTENT ────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick stats bar */}
        <View style={[styles.statsBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { icon: 'time-outline' as const, value: student.session || '2025–26', label: 'Session', color: theme.primary },
            { icon: 'layers-outline' as const, value: student.section || 'A', label: 'Section', color: theme.info },
            { icon: 'card-outline' as const, value: feeLabel, label: 'Fee', color: feeColor },
          ].map((item, i) => (
            <View
              key={i}
              style={[
                styles.statCell,
                i < 2 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
              ]}
            >
              <Ionicons name={item.icon} size={scale(14)} color={item.color} />
              <Text style={[styles.statValue, { color: item.color }]} numberOfLines={1}>
                {item.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── PERSONAL INFORMATION ──────────────────────── */}
        <SectionTitle label="Personal Information" icon="person-outline" theme={theme} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MenuRow icon="person" label="Full Name" value={student.name} color={theme.primary} copyable onCopy={() => copy(student.name)} />
          <MenuRow icon="people" label="Father's Name" value={student.fatherName} color={theme.info} copyable onCopy={() => copy(student.fatherName)} />
          <MenuRow icon="calendar" label="Date of Birth" value={student.dateofbirth} color={theme.accent} />
          <MenuRow icon="male-female" label="Gender" value={student.gender} color={theme.accent} />
          <MenuRow icon="location" label="Address" value={student.address} color={theme.warning} isLast />
        </View>

        {/* ── ACADEMIC DETAILS ──────────────────────────── */}
        <SectionTitle label="Academic Details" icon="school-outline" theme={theme} />
        <View style={styles.gridRow}>
          <CompactCard icon="id-card" label="Roll / ID" value={student.studentId} color={theme.primary} copyable onCopy={() => copy(student.studentId)} />
          <CompactCard icon="school" label="Class / Grade" value={student.grade} color={theme.info} />
          <CompactCard icon="time" label="Session" value={student.session || '2025–26'} color={theme.accent} />
          <CompactCard icon="layers" label="Section" value={student.section || 'A'} color={theme.warning} />
        </View>

        {/* ── CONTACT & ACCOUNT ─────────────────────────── */}
        <SectionTitle label="Contact & Account" icon="call-outline" theme={theme} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MenuRow icon="mail" label="Email Address" value={student.email} color={theme.info} copyable onCopy={() => copy(student.email)} />
          <MenuRow icon="call" label="Phone Number" value={student.phone} color={theme.success} copyable onCopy={() => copy(student.phone)} />
          <MenuRow icon="key" label="Password" value={student.password} color={theme.warning} copyable onCopy={() => copy(student.password)} isLast />
        </View>

        {/* ── CLIPBOARD TOAST ────────────────────────────── */}
        {toastVisible && (
          <View style={[styles.toast, { backgroundColor: theme.primary }]}>
            <Ionicons name="checkmark-circle" size={scale(13)} color="#fff" />
            <Text style={styles.toastText}>Copied to clipboard</Text>
          </View>
        )}

        <View style={{ height: scale(32) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles — zero `gap` usage, safe for all RN versions
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    paddingBottom: scale(20),
    paddingHorizontal: scale(16),
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: scale(14),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: scale(10),
    marginTop: scale(8),
  },
  avatar: {
    width: scale(78),
    height: scale(78),
    borderRadius: scale(39),
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: scale(26),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: {
    fontSize: scale(19),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: scale(10),
    textAlign: 'center',
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: scale(9),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  heroPillText: {
    fontSize: scale(10),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginLeft: scale(4),
  },

  // Scroll
  scroll: {
    paddingHorizontal: scale(14),
    paddingTop: scale(12),
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    borderRadius: scale(13),
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: scale(18),
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(11),
  },
  statValue: {
    fontSize: scale(12),
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: scale(3),
    marginBottom: scale(1),
  },
  statLabel: {
    fontSize: scale(9),
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(7),
    marginTop: scale(2),
    paddingLeft: scale(2),
  },
  sectionLabel: {
    fontSize: scale(9.5),
    fontWeight: '700',
    letterSpacing: 0.9,
    marginLeft: scale(5),
  },

  // Card wrapper
  card: {
    borderRadius: scale(14),
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: scale(14),
  },

  // 2-col grid (Academic)
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: scale(14),
    marginHorizontal: -scale(4), // cancel out column padding
  },

  // Toast
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginTop: scale(8),
    marginBottom: scale(4),
  },
  toastText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: '#fff',
    marginLeft: scale(6),
  },
});
