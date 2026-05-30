import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { scale } from '../../utils/responsive';
import type { RootState } from '../../store/store';

import {
  initExamsListener,
  initTimetableListener,
} from '../../store/slices/adminSlice';
import { initAssignmentsListener } from '../../store/slices/assignmentsSlice';


const selectTotalExams = (state: RootState) => state.admin.exams.length;
const selectTotalAssignments = (state: RootState) => state.assignments.data.length;

const selectTotalSessions = (state: RootState) => {
  return Object.values(state.admin.timetable).reduce((acc, arr) => acc + arr.length, 0);
};

const selectUnreadNotices = (state: RootState) => {
  const notices = state.notifications.notices;
  const readIds = state.notifications.readIds;
  return notices.filter((n: any) => !readIds.includes(n.id)).length;
};

const selectTotalMessages = (state: RootState) => state.messages.list.length;

// ── Quick-action card definitions ────────────────────────────────────────
const quickActions = [
  { key: 'results',     label: 'Exams',       icon: 'document-text-outline' as const, color: '#8b5cf6', bg: '#f5f3ff',  screen: 'AdminExams',            root: true  },
  { key: 'assignments', label: 'Assignments', icon: 'book-outline'          as const, color: '#ec4899', bg: '#fdf2f8',  screen: 'AdminAssignmentsScreen',root: true  },
  { key: 'timetable',   label: 'Timetable',   icon: 'time-outline'          as const, color: '#10b981', bg: '#ecfdf5',  screen: 'TimetableScreen',       root: false },
  { key: 'notices',     label: 'Notices',     icon: 'megaphone-outline'     as const, color: '#f59e0b', bg: '#fffbeb',  screen: 'NoticesScreen',         root: false },
  { key: 'messages',    label: 'Messages',    icon: 'mail-outline'          as const, color: '#0ea5e9', bg: '#f0f9ff',  screen: 'MessagesScreen',        root: false },
];

// ── Component ────────────────────────────────────────────────────────────
export const TeacherDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { theme, isDark } = useTheme();

  // Auth
  const profileData = useAppSelector(s => s.auth.profile);
  const user         = useAppSelector(s => s.auth.user);

  // Loadings
  const examsLoading      = useAppSelector(s => s.admin.examsLoading);
  const timetableLoading  = useAppSelector(s => s.admin.timetableLoading);
  const assignmentsLoading = useAppSelector(s => s.assignments.status === 'loading');
  const [refreshing, setRefreshing] = useState(false);
  const unsubsRef = useRef<(() => void)[]>([]);

  // ── Bootstrap Firestore listeners once ──────────────────────────────
  useEffect(() => {
    const unsubs = [
      initExamsListener(dispatch),
      initTimetableListener(dispatch),
      initAssignmentsListener(dispatch),
    ];
    unsubsRef.current = unsubs;

    return () => {
      unsubs.forEach(u => {
        if (typeof u === 'function') u();
      });
    };
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Tear down current listeners
    unsubsRef.current.forEach(u => {
      if (typeof u === 'function') u();
    });
    // Re-create all listeners
    unsubsRef.current = [
      initExamsListener(dispatch),
      initTimetableListener(dispatch),
      initAssignmentsListener(dispatch),
    ];
    // Wait briefly for UX, or await specific dispatch if needed
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, [dispatch]);

  // ── Derived stats using memoized selectors ──────────────────────────
  const totalExams        = useAppSelector(selectTotalExams);
  const totalAssignments  = useAppSelector(selectTotalAssignments);
  const totalSessions     = useAppSelector(selectTotalSessions);
  const unreadNotices     = useAppSelector(selectUnreadNotices);
  const totalMessages     = useAppSelector(selectTotalMessages);

  // Map each card key → stat badge
  const statMap: Record<string, { value: string; loading: boolean }> = {
    results:     { value: `${totalExams} Record${totalExams !== 1 ? 's' : ''}`,         loading: examsLoading },
    assignments: { value: `${totalAssignments} Task${totalAssignments !== 1 ? 's' : ''}`, loading: assignmentsLoading },
    timetable:   { value: `${totalSessions} Class${totalSessions !== 1 ? 'es' : ''}`,  loading: timetableLoading },
    notices:     { value: unreadNotices > 0 ? `${unreadNotices} New` : 'All Read',      loading: false },
    messages:    { value: `${totalMessages} Msg${totalMessages !== 1 ? 's' : ''}`,      loading: false },
  };

  // ── Profile display ─────────────────────────────────────────────────
  const displayName = profileData?.fullname || user?.displayName || 'Teacher';
  const displayRole = profileData?.role
    ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)
    : 'Teacher';
  const displaySubject = profileData?.class || 'N/A';
  const displayImage =
    profileData?.image && profileData.image.trim() !== ''
      ? profileData.image
      : user?.photoURL && user.photoURL.trim() !== ''
        ? user.photoURL
        : null;

  // ── Navigation helper (all screens are at root level) ─────────────────────
  const handleNavigate = (screen: string, root?: boolean) => {
    // Root screens navigate directly; inner tab screens navigate via 'Main' -> 'Home'
    if (root || !['TimetableScreen', 'NoticesScreen', 'ComplaintsScreen', 'MessagesScreen'].includes(screen)) {
      (navigation as any).navigate(screen);
    } else {
      (navigation as any).navigate('Main', {
        screen: 'Home',
        params: { screen },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Teacher Dashboard</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: scale(40) }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Profile Summary */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.profileMain}>
            <View style={[styles.avatarWrap, { borderColor: theme.border }]}>
              <Image
                source={
                  displayImage
                    ? { uri: displayImage }
                    : require('../../assets/default-profile.png')
                }
                defaultSource={require('../../assets/default-profile.png')}
                style={[styles.avatar, (!displayImage && isDark) ? { tintColor: '#fff' } : null]}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: theme.primary + '18' }]}>
                  <Text style={[styles.roleBadgeText, { color: theme.primary }]}>{displayRole}</Text>
                </View>
                {profileData?.rollno ? (
                  <View style={[styles.idBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f3f4f6' }]}>
                    <Text style={[styles.idBadgeText, { color: theme.textSecondary }]}>ID: {profileData.rollno}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Compact Professional Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="school-outline" size={13} color="#0284c7" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Subject</Text>
                <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                  {profileData?.class || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#fdf2f8' }]}>
                <Ionicons name="ribbon-outline" size={13} color="#db2777" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Qualification</Text>
                <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                  {profileData?.section || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="calendar-outline" size={13} color="#7c3aed" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Experience</Text>
                <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                  {profileData?.session || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="mail-outline" size={13} color="#059669" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Email</Text>
                <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                  {profileData?.email || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>QUICK ACCESS</Text>
          <View style={styles.grid}>
            {quickActions.map(item => {
              const stat = statMap[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.gridCard, { backgroundColor: theme.card }]}
                  activeOpacity={0.7}
                  onPress={() => handleNavigate(item.screen, item.root)}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: isDark ? item.color + '20' : item.bg }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.text }]}>{item.label}</Text>
                  {/* Live stat badge */}
                  {stat.loading ? (
                    <ActivityIndicator size="small" color={item.color} style={{ marginTop: scale(4) }} />
                  ) : (
                    <Text style={[styles.statBadge, { color: item.color, backgroundColor: isDark ? item.color + '15' : item.bg }]}>
                      {stat.value}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', borderColor: isDark ? '#2563eb40' : '#bfdbfe' }]}>
          <Ionicons name="information-circle" size={18} color="#3b82f6" />
          <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
            All data syncs in real-time via Redux Toolkit. Tap a card to manage.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: scale(18), fontWeight: '700' },

  // Profile card
  profileCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(14),
    padding: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  avatarWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatar: { width: '100%', height: '100%' },
  profileInfo: { flex: 1, gap: scale(3) },
  profileName: { fontSize: scale(15), fontWeight: '800', letterSpacing: -0.2 },
  badgeRow: { flexDirection: 'row', gap: scale(6), alignItems: 'center' },
  roleBadge: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(20) },
  roleBadgeText: { fontSize: scale(10), fontWeight: '700' },
  idBadge: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(20) },
  idBadgeText: { fontSize: scale(10), fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: scale(12),
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: scale(10),
  },
  detailItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  detailIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTexts: {
    flex: 1,
  },
  detailLabel: {
    fontSize: scale(9),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: scale(12),
    fontWeight: '700',
    marginTop: scale(1),
  },

  // Sections
  section: { paddingHorizontal: scale(16), marginTop: scale(20) },
  sectionLabel: {
    fontSize: scale(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: scale(10),
    marginLeft: scale(2),
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  gridCard: {
    width: '30.5%',
    borderRadius: scale(14),
    padding: scale(14),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  gridIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  gridLabel: {
    fontSize: scale(11),
    fontWeight: '700',
    textAlign: 'center',
  },
  statBadge: {
    fontSize: scale(9),
    fontWeight: '700',
    marginTop: scale(5),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    overflow: 'hidden',
    textAlign: 'center',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginHorizontal: scale(16),
    marginTop: scale(20),
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: scale(11),
    fontWeight: '500',
    lineHeight: scale(16),
  },
});

export default TeacherDashboardScreen;
