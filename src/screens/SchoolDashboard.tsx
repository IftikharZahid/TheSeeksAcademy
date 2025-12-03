import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* -------------------------
   Sample / Mock Data
--------------------------*/
const KPIS = [
  { id: "students", label: "Total Students", value: "1,240", delta: "+3%" },
  { id: "teachers", label: "Total Teachers", value: "74", delta: "+1%" },
  { id: "attendance", label: "Today Attendance", value: "89%", delta: "-2%" },
  { id: "notices", label: "Notices", value: "12", delta: "+0" },
];

const QUICK_ACTIONS = [
  { key: "students", label: "Students", icon: "🎓" },
  { key: "teachers", label: "Teachers", icon: "🧑‍🏫" },
  { key: "courses", label: "Courses", icon: "📚" },
  { key: "assignments", label: "Assignments", icon: "📝" },
  { key: "timetable", label: "Timetable", icon: "📅" },
  { key: "results", label: "Results", icon: "📊" },
  { key: "fees", label: "Fees", icon: "💳" },
  { key: "notice", label: "Notice", icon: "📢" },
];

const CLASS_DISTRIBUTION = [
  { className: "6th", students: 140 },
  { className: "7th", students: 160 },
  { className: "8th", students: 180 },
  { className: "9th", students: 210 },
  { className: "10th", students: 220 },
];

const ACTIVITIES = [
  { id: "a1", text: "Assignment 3 uploaded for Mathematics", time: "2h ago" },
  { id: "a2", text: "Exam timetable published for Grade 9", time: "6h ago" },
  { id: "a3", text: "New student admission request", time: "1d ago" },
  { id: "a4", text: "Fee reminder: Class 10", time: "2d ago" },
];

const NOTICES = [
  { id: "n1", title: "School closed on 25 Dec", body: "Christmas holiday" },
  { id: "n2", title: "PTM on 03 Jan", body: "Parents invited" },
  { id: "n3", title: "Science fair", body: "Submit projects by Feb 1" },
];

const TEACHERS = [
  { id: "t1", name: "Ms. Aisha", subject: "English", avatar: "https://i.pravatar.cc/100?img=32" },
  { id: "t2", name: "Sir Abdullah", subject: "Mathematics", avatar: "https://i.pravatar.cc/100?img=12" },
  { id: "t3", name: "Sir Hamza", subject: "Physics", avatar: "https://i.pravatar.cc/100?img=5" },
];

const EVENTS = [
  { id: "e1", title: "Science Exhibition", date: "2026-02-12" },
  { id: "e2", title: "Sports Day", date: "2026-03-05" },
];

/* -------------------------
   UI Subcomponents
--------------------------*/
const KPI = React.memo(({ item, styles }: { item: typeof KPIS[0], styles: any }) => {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{item.value}</Text>
      <Text style={styles.kpiLabel}>{item.label}</Text>
      <Text style={styles.kpiDelta}>{item.delta}</Text>
    </View>
  );
});

const ActionButton = React.memo(({ a, styles }: { a: typeof QUICK_ACTIONS[0], styles: any }) => {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
      <Text style={styles.actionIcon}>{a.icon}</Text>
      <Text style={styles.actionLabel}>{a.label}</Text>
    </TouchableOpacity>
  );
});

const TeacherCard = React.memo(({ t, styles }: { t: typeof TEACHERS[0], styles: any }) => (
  <View style={styles.teacherCard}>
    <Image source={{ uri: t.avatar }} style={styles.teacherAvatar} />
    <Text style={styles.teacherName}>{t.name}</Text>
    <Text style={styles.teacherSubject}>{t.subject}</Text>
  </View>
));

/* -------------------------
   Main Screen
--------------------------*/
export const SchoolDashboard: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate network request
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const styles = useMemo(() => createStyles(theme, width), [theme, width]);

  // animated attendance ring
  const attendancePercent = 89; // example
  const progress = useRef(new Animated.Value(0)).current;
  const RADIUS = 48;
  const STROKE = 10;
  const CIRC = 2 * Math.PI * RADIUS;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: attendancePercent,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [attendancePercent]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRC, 0],
  });

  const renderActivity = useCallback(({ item }: { item: typeof ACTIVITIES[0] }) => {
    return (
      <View style={styles.activityRow}>
        <View style={styles.activityDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.activityText}>{item.text}</Text>
          <Text style={styles.activityTime}>{item.time}</Text>
        </View>
      </View>
    );
  }, [styles]);

  const renderNotice = useCallback(({ item }: { item: typeof NOTICES[0] }) => (
    <View style={styles.noticeCard}>
      <Text style={styles.noticeTitle}>{item.title}</Text>
      <Text style={styles.noticeBody}>{item.body}</Text>
    </View>
  ), [styles]);

  const maxStudents = useMemo(() => Math.max(...CLASS_DISTRIBUTION.map((c) => c.students)), []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={{ uri: "https://i.pravatar.cc/80?img=15" }} style={styles.headerAvatar} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerName}>Iftikhar Zahid</Text>
              <Text style={styles.headerSub}>Welcome back — Today: Good Luck!</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}><Text>🔔</Text></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Text>⚙️</Text></TouchableOpacity>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {KPIS.map((k) => <KPI key={k.id} item={k} styles={styles} />)}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => <ActionButton key={a.key} a={a} styles={styles} />)}
        </View>

        {/* Attendance + Classes */}
        <View style={styles.row}>
          {/* Attendance Ring */}
          <View style={styles.attendanceCard}>
            <Text style={styles.sectionSmallTitle}>Today's Attendance</Text>
            <View style={styles.attendanceInner}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Defs>
                  <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#4F46E5" />
                    <Stop offset="1" stopColor="#06B6D4" />
                  </LinearGradient>
                </Defs>

                <Circle cx="60" cy="60" r={RADIUS} stroke="#E6E6E6" strokeWidth={STROKE} fill="transparent" />
                <AnimatedCircle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  stroke="url(#g1)"
                  strokeWidth={STROKE}
                  strokeDasharray={CIRC}
                  strokeDashoffset={strokeDashoffset as any}
                  strokeLinecap="round"
                  fill="transparent"
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.attendanceCenter}>
                <Text style={styles.attPercent}>{attendancePercent}%</Text>
                <Text style={styles.attLabel}>Present</Text>
              </View>
            </View>
          </View>

          {/* Class Distribution */}
          <View style={styles.distributionCard}>
            <Text style={styles.sectionSmallTitle}>Class Distribution</Text>
            <View style={{ marginTop: 8 }}>
              {CLASS_DISTRIBUTION.map((c) => {
                const widthPct = (c.students / maxStudents) * 100;
                return (
                  <View key={c.className} style={styles.barRow}>
                    <Text style={styles.barLabel}>{c.className}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{c.students}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Recent Activities */}
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <FlatList
          data={ACTIVITIES}
          keyExtractor={(i) => i.id}
          renderItem={renderActivity}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />

        {/* Notice Board */}
        <Text style={styles.sectionTitle}>Notice Board</Text>
        <FlatList
          data={NOTICES}
          keyExtractor={(n) => n.id}
          renderItem={renderNotice}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16 }}
        />

        {/* Teachers */}
        <View style={{ marginTop: 12, marginBottom: 6, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.sectionTitle}>Teachers</Text>
          <TouchableOpacity><Text style={styles.linkText}>View all</Text></TouchableOpacity>
        </View>
        <FlatList
          data={TEACHERS}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TeacherCard t={item} styles={styles} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16 }}
        />

        {/* Events & Fees */}
        <View style={styles.row}>
          <View style={styles.eventCard}>
            <Text style={styles.sectionSmallTitle}>Upcoming Events</Text>
            {EVENTS.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventDate}>{e.date}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.feeCard}>
            <Text style={styles.sectionSmallTitle}>Fee Snapshot</Text>
            <Text style={styles.feeValue}>₨ 120,000</Text>
            <Text style={styles.feeLabel}>Collected (This Month)</Text>
            <TouchableOpacity style={styles.feeBtn}><Text style={styles.feeBtnText}>Manage Fees</Text></TouchableOpacity>
          </View>
        </View>

        {/* Performance */}
        <Text style={styles.sectionTitle}>Performance Analytics</Text>
        <View style={styles.analyticsCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[styles.analyticsText, { fontSize: 14, color: theme.textSecondary }]}>Average Score</Text>
              <Text style={[styles.analyticsText, { fontSize: 28, marginTop: 4 }]}>78%</Text>
            </View>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              borderWidth: 4, borderColor: theme.primary,
              alignItems: "center", justifyContent: "center"
            }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: theme.primary }}>B+</Text>
            </View>
          </View>
          
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: 8, width: "78%", backgroundColor: theme.primary }} />
            </View>
            <Text style={styles.analyticsSub}>Top 15% of class performance</Text>
          </View>

          <TouchableOpacity style={{ marginTop: 16, alignSelf: "flex-start" }}>
            <Text style={styles.linkText}>View Detailed Report →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default SchoolDashboard;

/* -------------------------
   STYLES
--------------------------*/
/* -------------------------
   STYLES
--------------------------*/
const createStyles = (theme: any, width: number) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  container: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerAvatar: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.border },
  headerName: { fontSize: 18, fontWeight: "800", color: theme.text },
  headerSub: { fontSize: 13, color: theme.textSecondary },
  headerIcons: { flexDirection: "row", gap: 8 },

  /* KPI */
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, justifyContent: "space-between" },
  kpiCard: {
    width: (width - 48) / 2,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kpiValue: { fontSize: 20, fontWeight: "800", color: theme.text },
  kpiLabel: { fontSize: 13, color: theme.textSecondary, marginTop: 6 },
  kpiDelta: { fontSize: 12, color: theme.primary, marginTop: 8 },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: theme.text, marginTop: 12, marginLeft: 16 },
  sectionSmallTitle: { fontSize: 14, fontWeight: "700", color: theme.text },

  /* Actions */
  actionsGrid: { paddingHorizontal: 12, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    width: (width - 64) / 4,
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    margin: 6,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOpacity: 0.05,
  },
  actionIcon: { fontSize: 22, marginBottom: 6, color: theme.text },
  actionLabel: { fontSize: 12, color: theme.text, textAlign: "center" },

  /* Attendance + Distribution */
  row: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginTop: 12 },
  attendanceCard: { flex: 1.1, backgroundColor: theme.card, borderRadius: 12, padding: 12, alignItems: "center", elevation: 2 },
  attendanceInner: { alignItems: "center", justifyContent: "center" },
  attendanceCenter: { position: "absolute", alignItems: "center" },
  attPercent: { fontSize: 20, fontWeight: "800", color: theme.text },
  attLabel: { fontSize: 12, color: theme.textSecondary },

  distributionCard: { flex: 1.7, backgroundColor: theme.card, borderRadius: 12, padding: 12, elevation: 2 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  barLabel: { width: 48, fontSize: 12, color: theme.textSecondary },
  barTrack: { flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 6, marginHorizontal: 8 },
  barFill: { height: 8, backgroundColor: theme.primary, borderRadius: 6 },
  barValue: { width: 40, fontSize: 12, color: theme.textSecondary },

  /* Activities */
  activityRow: { flexDirection: "row", paddingHorizontal: 16, alignItems: "flex-start", paddingVertical: 8 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6, marginRight: 12 },
  activityText: { fontSize: 14, color: theme.text },
  activityTime: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },

  /* Notices */
  noticeCard: { width: width * 0.72, backgroundColor: theme.card, borderRadius: 12, padding: 14, marginRight: 12, elevation: 2 },
  noticeTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
  noticeBody: { fontSize: 13, color: theme.textSecondary, marginTop: 6 },

  /* Teachers */
  teacherCard: { width: 120, backgroundColor: theme.card, borderRadius: 12, padding: 12, marginRight: 12, alignItems: "center", elevation: 2 },
  teacherAvatar: { width: 56, height: 56, borderRadius: 10, marginBottom: 8, backgroundColor: theme.border },
  teacherName: { fontSize: 13, fontWeight: "700", color: theme.text },
  teacherSubject: { fontSize: 12, color: theme.textSecondary },

  linkText: { color: theme.primary, fontWeight: "700" },

  /* Events & Fee */
  eventCard: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 12, elevation: 2 },
  eventRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 10 },
  eventTitle: { fontSize: 13, fontWeight: "700", color: theme.text },
  eventDate: { fontSize: 12, color: theme.textSecondary },

  feeCard: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 12, marginLeft: 12, elevation: 2, alignItems: "center" },
  feeValue: { fontSize: 18, fontWeight: "800", color: theme.text },
  feeLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 12 },
  feeBtn: { backgroundColor: theme.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  feeBtnText: { color: "#fff", fontWeight: "700" },

  /* Analytics */
  analyticsCard: { backgroundColor: theme.card, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 20, elevation: 2 },
  analyticsText: { fontSize: 16, fontWeight: "800", color: theme.text },
  analyticsSub: { color: theme.textSecondary, marginTop: 6 },

  /* Misc */
  iconBtn: { padding: 8, marginLeft: 8 },
});
