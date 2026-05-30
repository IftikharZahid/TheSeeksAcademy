import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal,
  Platform, StatusBar, Animated, FlatList, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { scale } from '../../utils/responsive';
import {
  setAdminDb,
  setAdminLoading,
  updateStudentDay,
  updateAllStudentsDay,
  writeStudentAttendance,
} from '../../store/slices/attendanceSlice';

/* ─────────────────── Types ─────────────────── */
type StatusType = 'present' | 'absent' | 'late' | 'pending';

const STATUS_META: Record<StatusType, { label: string; color: string; icon: string; short: string }> = {
  present: { label: 'Present', color: '#10b981', icon: 'checkmark-circle', short: 'P' },
  absent:  { label: 'Absent',  color: '#ef4444', icon: 'close-circle',     short: 'A' },
  late:    { label: 'Late',    color: '#f59e0b', icon: 'time',             short: 'L' },
  pending: { label: 'Pending', color: '#94a3b8', icon: 'help-circle',      short: '–' },
};

interface StudentRow {
  studentId: string; studentName: string; rollno: string; class: string; gender?: string;
}

/* ─────────────────── Helpers ─────────────────── */
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}

/* ── Firestore: read existing dailyRecords for one student ── */
async function loadStudentRecords(studentId: string): Promise<Record<string, StatusType>> {
  try {
    const snap = await getDoc(doc(db, 'attendance', studentId));
    if (snap.exists()) return (snap.data().dailyRecords || {}) as Record<string, StatusType>;
  } catch (e) { console.warn('load err', e); }
  return {};
}

/* ─────────────────── Component ─────────────────── */
export const AdminAttendanceScreen: React.FC = () => {
  const navigation  = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const studentsRaw = useAppSelector(s => s.admin.students);
  const loadingStudents = useAppSelector(s => s.admin.studentsLoading);

  // ── Redux-backed attendance DB (replaces local db_mem) ──
  const db_mem = useAppSelector(s => s.attendance.adminDb) as Record<string, Record<string, StatusType>>;
  const dbLoading = useAppSelector(s => s.attendance.adminLoading);

  const now = new Date();
  const todayStr = fmt(now);

  const [students, setStudents]   = useState<StudentRow[]>([]);
  // writeTimers: debounce per student — dispatches writeStudentAttendance after 600ms of inactivity
  const writeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [searchQuery, setSearchQuery]   = useState('');
  const [classFilter, setClassFilter]   = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);

  // Month navigation
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // History modal
  const [historyStudent, setHistoryStudent] = useState<StudentRow | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Mark-all modal
  const [markAllVisible, setMarkAllVisible] = useState(false);

  // Monthly report modal
  const [monthlyReportVisible, setMonthlyReportVisible] = useState(false);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const mLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const dateStripRef  = useRef<ScrollView>(null);

  // Auto-scroll the date strip so today is visible
  const scrollToToday = useCallback(() => {
    // today is the last (or near-last) day in the current-month strip
    // Each chip is scale(38) wide + scale(6) gap ≈ 44px per slot
    const todayIndex   = now.getDate() - 1;          // 0-indexed
    const chipWidth    = scale(38) + scale(6);        // width + gap
    const screenWidth  = require('react-native').Dimensions.get('window').width;
    const offset       = Math.max(0, todayIndex * chipWidth - screenWidth / 2 + chipWidth / 2);
    setTimeout(() => dateStripRef.current?.scrollTo({ x: offset, animated: true }), 150);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    scrollToToday(); // scroll date strip to today on first render
  }, []);

  /* Init students from Redux — resolve Firebase Auth UID for each student */
  useEffect(() => {
    if (loadingStudents || studentsRaw.length === 0) return;

    (async () => {
      // Build a map of email → Auth UID from studentsprofile for any student missing s.uid
      const studentsNeedingLookup = studentsRaw.filter(
        s => !(s.uid || s.authUid) && s.email
      );

      const emailToUid: Record<string, string> = {};
      if (studentsNeedingLookup.length > 0) {
        try {
          const snap = await getDocs(collection(db, 'studentsprofile'));
          snap.forEach(d => {
            const email = (d.data().email || '').toLowerCase();
            if (email) emailToUid[email] = d.id; // doc ID = Firebase Auth UID
          });
        } catch (e) {
          console.warn('UID lookup failed:', e);
        }
      }

      const rows: StudentRow[] = studentsRaw.map(s => {
        // 1. Prefer explicitly stored Firebase Auth UID
        // 2. Fallback: look up from studentsprofile by email
        // 3. Last resort: Firestore doc ID (may be wrong for older students)
        const resolvedUid =
          s.uid?.trim() ||
          s.authUid?.trim() ||
          (s.email ? emailToUid[(s.email || '').toLowerCase()] : undefined) ||
          s.id;

        return {
          studentId:   resolvedUid,
          studentName: s.fullname || (s as any).name || 'Unknown',
          rollno:      s.rollno || 'N/A',
          class:       s.class  || (s as any).grade || 'N/A',
          gender:      s.gender || (s as any).gender || 'N/A',
        };
      });

      setStudents(rows);
    })();
  }, [studentsRaw, loadingStudents]);

  /* Load all students' Firestore records on mount — populate Redux adminDb */
  useEffect(() => {
    if (students.length === 0) return;
    dispatch(setAdminLoading(true));
    Promise.all(students.map(async s => ({
      id: s.studentId,
      records: await loadStudentRecords(s.studentId),
    }))).then(results => {
      const merged: Record<string, Record<string, StatusType>> = {};
      results.forEach(r => { merged[r.id] = r.records; });
      dispatch(setAdminDb(merged));
    }).catch(() => dispatch(setAdminLoading(false)));
  }, [students]);

  const daysInMonth = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  /* Quick-update one student — instant Redux update, debounced Firestore write */
  const quickUpdate = useCallback((studentId: string, status: StatusType) => {
    if (!selectedDate) return;
    // Sundays are holidays — block any marking
    if (new Date(selectedDate.replace(/-/g, '/')).getDay() === 0) return;

    // 1. Instant optimistic update in Redux
    dispatch(updateStudentDay({ studentId, date: selectedDate, status }));

    // 2. Debounced Firestore write — rapid taps only trigger one write
    clearTimeout(writeTimers.current[studentId]);
    writeTimers.current[studentId] = setTimeout(() => {
      const updated = { ...(db_mem[studentId] || {}), [selectedDate]: status };
      dispatch(writeStudentAttendance({ studentId, dailyRecords: updated }));
    }, 600);
  }, [selectedDate, db_mem, dispatch]);


  /* Month navigation */
  const prevMonth = () => {
    const newM = viewMonth === 0 ? 11 : viewMonth - 1;
    const newY = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewMonth(newM);
    if (viewMonth === 0) setViewYear(newY);
    // If landing on current month, restore today; otherwise blank
    const landingOnCurrent = newY === now.getFullYear() && newM === now.getMonth();
    setSelectedDate(landingOnCurrent ? todayStr : '');
    if (landingOnCurrent) setTimeout(() => scrollToToday(), 100);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    const newM = viewMonth === 11 ? 0 : viewMonth + 1;
    const newY = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewMonth(newM);
    if (viewMonth === 11) setViewYear(newY);
    const landingOnCurrent = newY === now.getFullYear() && newM === now.getMonth();
    setSelectedDate(landingOnCurrent ? todayStr : '');
    if (landingOnCurrent) setTimeout(() => scrollToToday(), 100);
  };

  /* Class chip options */
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.class && s.class !== 'N/A') set.add(s.class); });
    return ['All', ...Array.from(set).sort()];
  }, [students]);

  /* Filtered list — declared before markAll to avoid used-before-declaration error */
  const filtered = useMemo(() => {
    let list = students;
    if (classFilter !== 'All') list = list.filter(s => s.class === classFilter);
    if (genderFilter !== 'All') {
      const isBoys = genderFilter === 'Boys';
      list = list.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return isBoys ? (g === 'male' || g === 'boy') : (g === 'female' || g === 'girl');
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        String(s.studentName || '').toLowerCase().includes(q) ||
        String(s.rollno || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, classFilter, genderFilter, searchQuery]);

  /* Mark all visible students — instant Redux update, fire-and-forget batch writes */
  const markAll = useCallback((status: StatusType) => {
    if (!selectedDate) return;
    if (new Date(selectedDate.replace(/-/g, '/')).getDay() === 0) {
      setMarkAllVisible(false);
      return;
    }
    setMarkAllVisible(false);

    // 1. Batch optimistic Redux update
    dispatch(updateAllStudentsDay({
      studentIds: filtered.map(s => s.studentId),
      date: selectedDate,
      status,
    }));

    // 2. Fire Firestore writes for each student
    filtered.forEach(s => {
      const updated = { ...(db_mem[s.studentId] || {}), [selectedDate]: status };
      dispatch(writeStudentAttendance({ studentId: s.studentId, dailyRecords: updated }));
    });
  }, [selectedDate, db_mem, filtered, dispatch]);

  /* Counts for selected date */
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, pending: 0 };
    if (!selectedDate) return c;
    students.forEach(s => { const st: StatusType = db_mem[s.studentId]?.[selectedDate] || 'pending'; c[st]++; });
    return c;
  }, [students, db_mem, selectedDate]);

  const pct = students.length > 0 ? Math.round(counts.present / students.length * 100) : 0;

  /* ── Row ── */
  const QUICK: { key: StatusType; color: string }[] = [
    { key: 'present', color: '#10b981' },
    { key: 'late',    color: '#f59e0b' },
    { key: 'absent',  color: '#ef4444' },
  ];

  const renderItem = ({ item, index }: { item: StudentRow; index: number }) => {
    const status: StatusType = (selectedDate && db_mem[item.studentId]?.[selectedDate]) || 'pending';
    const { color } = STATUS_META[status];
    const initial   = item.studentName[0]?.toUpperCase() || '?';

    return (
      <View style={[styles.row, {
        backgroundColor: isDark ? theme.card : (index % 2 === 0 ? '#fff' : '#f8fafc'),
        borderBottomColor: theme.border + '40',
      }]}>
        {/* Left: info */}
        <TouchableOpacity
          style={styles.rowLeft}
          onPress={() => { setHistoryStudent(item); setHistoryVisible(true); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.serial, { color: theme.textSecondary }]}>{index + 1}</Text>
          <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
            <Text style={[styles.avatarText, { color }]}>{initial}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.studentName}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{item.rollno} · {item.class}</Text>
          </View>
          <Ionicons name="time-outline" size={12} color={theme.textSecondary} style={{ marginRight: scale(6) }} />
        </TouchableOpacity>

        {/* Right: P / L / A */}
        <View style={styles.quickBtns}>
          {QUICK.map(q => {
            const active = status === q.key;
            return (
              <TouchableOpacity
                key={q.key}
                style={[styles.qBtn, {
                  backgroundColor: active ? q.color : (isDark ? theme.background : '#f1f5f9'),
                  borderColor:     active ? q.color : theme.border,
                  opacity: !selectedDate ? 0.4 : 1,
                }]}
                onPress={() => quickUpdate(item.studentId, q.key)}
                activeOpacity={0.7}
                disabled={!selectedDate || new Date(selectedDate.replace(/-/g, '/')).getDay() === 0}
              >
                <Text style={[styles.qBtnText, { color: active ? '#fff' : theme.textSecondary }]}>
                  {STATUS_META[q.key].short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  /* ── History modal ── */
  const renderHistory = () => {
    if (!historyStudent) return null;
    const sid = historyStudent.studentId;
    const mDays = getDaysInMonth(viewYear, viewMonth).filter(d => d <= now);
    const mCounts = { present: 0, absent: 0, late: 0 };
    mDays.forEach(d => {
      const st = db_mem[sid]?.[fmt(d)];
      if (st === 'present') mCounts.present++;
      else if (st === 'absent') mCounts.absent++;
      else if (st === 'late') mCounts.late++;
    });
    const firstDow = mDays[0]?.getDay() ?? 0;
    const cells: (Date | null)[] = [
      ...Array(firstDow).fill(null),
      ...getDaysInMonth(viewYear, viewMonth),
    ];

    return (
      <Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setHistoryVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeader}>
              <View style={[styles.histAvatar, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.histAvatarText, { color: theme.primary }]}>{historyStudent.studentName[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: scale(10) }}>
                <Text style={[styles.histName, { color: theme.text }]}>{historyStudent.studentName}</Text>
                <Text style={[styles.histMeta, { color: theme.textSecondary }]}>Roll: {historyStudent.rollno} · Class: {historyStudent.class}</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? theme.card : '#f1f5f9' }]} onPress={() => setHistoryVisible(false)}>
                <Ionicons name="close" size={17} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: scale(4) }]}>
              HISTORY — {mLabel.toUpperCase()}
            </Text>
            <View style={styles.histPills}>
              {([['present','#10b981'],['absent','#ef4444'],['late','#f59e0b']] as [StatusType, string][]).map(([k, c]) => (
                <View key={k} style={[styles.histPill, { backgroundColor: c + '18', borderColor: c + '40' }]}>
                  <Text style={[styles.histPillNum, { color: c }]}>{mCounts[k as keyof typeof mCounts]}</Text>
                  <Text style={[styles.histPillLabel, { color: c }]}>{STATUS_META[k].label}</Text>
                </View>
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.calGrid}>
                {DAY_LABELS.map((d, i) => (
                  <View key={i} style={styles.calCell}>
                    <Text style={[styles.calDayLabel, { color: theme.textSecondary }]}>{d}</Text>
                  </View>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <View key={`b-${i}`} style={styles.calCell} />;
                  const dStr  = fmt(day);
                  const st    = db_mem[sid]?.[dStr] as StatusType | undefined;
                  const isFut = day > now;
                  const isSel = dStr === selectedDate;
                  const isToday = dStr === todayStr;
                  return (
                    <TouchableOpacity key={dStr} style={styles.calCell}
                      onPress={() => { if (!isFut) { setSelectedDate(dStr); setHistoryVisible(false); } }}
                      activeOpacity={isFut ? 1 : 0.7}
                    >
                      <View style={[
                        styles.calDot,
                        { backgroundColor: isFut ? 'transparent' : (st ? STATUS_META[st].color + '30' : (isDark ? theme.card : '#f1f5f9')) },
                        isSel && { borderWidth: 1.5, borderColor: theme.primary },
                        isToday && !isSel && { borderWidth: 1, borderColor: theme.primary + '60' },
                      ]}>
                        <Text style={[styles.calDayNum, { color: isFut ? theme.textSecondary + '40' : (st ? STATUS_META[st].color : theme.textSecondary) },
                          (isSel || isToday) && { fontWeight: '800' }]}>
                          {day.getDate()}
                        </Text>
                        {st && !isFut && <View style={[styles.calStatusDot, { backgroundColor: STATUS_META[st].color }]} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.legend}>
                {(Object.entries(STATUS_META) as [StatusType, typeof STATUS_META[StatusType]][]).map(([k, m]) => (
                  <View key={k} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Mark-All modal ── */
  const renderMarkAll = () => (
    <Modal visible={markAllVisible} transparent animationType="fade" onRequestClose={() => setMarkAllVisible(false)}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMarkAllVisible(false)} />
        <View style={[styles.markAllSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.markAllTitle, { color: theme.text }]}>Mark All Students</Text>
          <Text style={[styles.markAllSub, { color: theme.textSecondary }]}>
            {selectedDate}  ·  {filtered.length} student{filtered.length !== 1 ? 's' : ''}
            {classFilter !== 'All' ? ` · ${classFilter}` : ''}
          </Text>
          <View style={styles.markAllBtns}>
            {QUICK.map(q => (
              <TouchableOpacity
                key={q.key}
                style={[styles.markAllBtn, { backgroundColor: q.color }]}
                onPress={() => markAll(q.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={STATUS_META[q.key].icon as any} size={20} color="#fff" />
                <Text style={styles.markAllBtnText}>All {STATUS_META[q.key].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.markAllCancel, { borderColor: theme.border }]} onPress={() => setMarkAllVisible(false)}>
            <Text style={[styles.markAllCancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  /* ── Monthly Report modal ── */
  const renderMonthlyReport = () => {
    const rows = buildMonthlyStats(students, db_mem, viewYear, viewMonth, now);
    const daysInMonthSoFar = daysInMonth.filter(d => d <= now).length;
    return (
      <Modal visible={monthlyReportVisible} transparent animationType="slide" onRequestClose={() => setMonthlyReportVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMonthlyReportVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border, maxHeight: '92%' }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            {/* Sheet Header */}
            <View style={[styles.sheetHeader, { marginBottom: scale(8) }]}>
              <View style={[styles.histAvatar, { backgroundColor: '#8b5cf620' }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1, marginLeft: scale(10) }}>
                <Text style={[styles.histName, { color: theme.text }]}>Monthly Report</Text>
                <Text style={[styles.histMeta, { color: theme.textSecondary }]}>{mLabel} · {daysInMonthSoFar} school days · {rows.length} students</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? theme.card : '#f1f5f9' }]} onPress={() => setMonthlyReportVisible(false)}>
                <Ionicons name="close" size={17} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Table header */}
            <View style={[styles.rptHead, { borderBottomColor: theme.border, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={[styles.rptHCell, { flex: 1, color: theme.textSecondary }]}>STUDENT</Text>
              <Text style={[styles.rptHCell, { color: '#10b981' }]}>P</Text>
              <Text style={[styles.rptHCell, { color: '#f59e0b' }]}>L</Text>
              <Text style={[styles.rptHCell, { color: '#ef4444' }]}>A</Text>
              <Text style={[styles.rptHCell, { color: theme.primary, minWidth: scale(36) }]}>%</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {rows.map((s, idx) => (
                <View key={s.studentId} style={[styles.rptRow, {
                  backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                  borderBottomColor: theme.border + '30',
                }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rptName, { color: theme.text }]} numberOfLines={1}>{s.studentName}</Text>
                    <Text style={[styles.rptMeta, { color: theme.textSecondary }]}>{s.rollno} · {s.class}</Text>
                  </View>
                  <Text style={[styles.rptCell, { color: '#10b981' }]}>{s.present}</Text>
                  <Text style={[styles.rptCell, { color: '#f59e0b' }]}>{s.late}</Text>
                  <Text style={[styles.rptCell, { color: '#ef4444' }]}>{s.absent}</Text>
                  <View style={[styles.rptPctWrap, {
                    backgroundColor: s.pct >= 75 ? '#10b98118' : s.pct >= 50 ? '#f59e0b18' : '#ef444418',
                  }]}>
                    <Text style={[styles.rptPct, {
                      color: s.pct >= 75 ? '#10b981' : s.pct >= 50 ? '#f59e0b' : '#ef4444'
                    }]}>{s.total > 0 ? `${s.pct}%` : '—'}</Text>
                  </View>
                </View>
              ))}
              {rows.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: scale(30) }}>
                  <Ionicons name="document-outline" size={28} color={theme.textSecondary} />
                  <Text style={[styles.histMeta, { color: theme.textSecondary, marginTop: scale(6) }]}>No data recorded yet for {mLabel}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Main Render ── */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#1e293b','#0f172a'] : ['#4338ca','#6366f1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Attendance Register</Text>
            <Text style={styles.headerSub}>{selectedDate || 'Select a date'}</Text>
          </View>
          {dbLoading
            ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: scale(4) }} />
            : <View style={styles.pctBadge}>
                <Text style={styles.pctNum}>{pct}%</Text>
                <Text style={styles.pctLabel}>Present</Text>
              </View>
          }
        </LinearGradient>

        {/* Month nav */}
        <View style={[styles.monthNav, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
          <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{mLabel}</Text>
          <TouchableOpacity style={[styles.monthArrow, isCurrentMonth && { opacity: 0.3 }]} onPress={nextMonth} disabled={isCurrentMonth}>
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable date strip — shows all days, future ones dimmed */}
        <ScrollView
          ref={dateStripRef}
          horizontal showsHorizontalScrollIndicator={false}
          style={[styles.dateStrip, { borderColor: theme.border }]}
          contentContainerStyle={styles.dateStripContent}
        >
          {daysInMonth.map(day => {
            const dStr     = fmt(day);
            const isFuture = day > now;
            const isSunday = day.getDay() === 0;       // holiday
            const blocked  = isFuture || isSunday;
            const isSel    = dStr === selectedDate;
            const isToday  = dStr === todayStr;
            const dayPct   = !blocked && students.length > 0
              ? Math.round((students.filter(s => db_mem[s.studentId]?.[dStr] === 'present').length / students.length) * 100)
              : 0;

            // Pick background
            let bgColor = isDark ? theme.background : '#f8fafc';
            let bdrColor = theme.border;
            if (isSunday) { bgColor = isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2'; bdrColor = '#EF444430'; }
            else if (isFuture) { bgColor = isDark ? 'rgba(255,255,255,0.03)' : '#f0f0f0'; bdrColor = isDark ? theme.border + '30' : theme.border + '50'; }
            else if (isSel) { bgColor = theme.primary; bdrColor = theme.primary; }
            else if (isToday) { bgColor = theme.primary + '18'; bdrColor = theme.primary + '50'; }

            return (
              <TouchableOpacity
                key={dStr}
                disabled={blocked}
                style={[styles.dateCell, {
                  backgroundColor: bgColor,
                  borderColor: bdrColor,
                  opacity: isFuture ? 0.45 : 1,
                }]}
                onPress={() => setSelectedDate(dStr)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateCellDay, {
                  color: isSel ? 'rgba(255,255,255,0.8)' : isSunday ? '#EF4444' : theme.textSecondary,
                  fontWeight: isSunday ? '700' : '500',
                }]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[styles.dateCellNum, {
                  color: isSel ? '#fff' : isSunday ? '#EF4444' : (isFuture ? theme.textSecondary : theme.text),
                }]}>{day.getDate()}</Text>
                {isSunday && !isSel && (
                  <Text style={{ fontSize: scale(7), color: '#EF4444', fontWeight: '700', marginTop: 1 }}>OFF</Text>
                )}
                {dayPct > 0 && <View style={[styles.dateCellBar, { backgroundColor: isSel ? 'rgba(255,255,255,0.4)' : '#10b981' + '60', width: `${dayPct}%` as any }]} />}
              </TouchableOpacity>
            );
          })}

        </ScrollView>

        {/* Stats strip */}
        <View style={[styles.statsStrip, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
          {(Object.entries(STATUS_META) as [StatusType, typeof STATUS_META[StatusType]][]).map(([key, meta]) => (
            <View key={key} style={styles.statCell}>
              <Text style={[styles.statNum, { color: meta.color }]}>{counts[key]}</Text>
              <Text style={[styles.statSmall, { color: theme.textSecondary }]}>{meta.label}</Text>
            </View>
          ))}
        </View>

        {/* Search + class filter */}
        <View style={styles.controls}>
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
              <Ionicons name="search" size={14} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search name or roll…"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {/* Mark-all + Monthly Report buttons */}
            <TouchableOpacity
              style={[styles.markAllTrigger, { backgroundColor: theme.primary, opacity: selectedDate ? 1 : 0.4 }]}
              onPress={() => setMarkAllVisible(true)}
              disabled={!selectedDate}
            >
              <Ionicons name="checkmark-done" size={15} color="#fff" />
              <Text style={styles.markAllTriggerText}>Mark All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.markAllTrigger, { backgroundColor: '#8b5cf6' }]}
              onPress={() => setMonthlyReportVisible(true)}
            >
              <Ionicons name="bar-chart-outline" size={15} color="#fff" />
              <Text style={styles.markAllTriggerText}>Report</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {['All', 'Boys', 'Girls'].map(opt => {
              const active = genderFilter === opt;
              return (
                <TouchableOpacity key={'g_'+opt}
                  style={[styles.chip, {
                    backgroundColor: active ? theme.primary : (isDark ? theme.card : '#f1f5f9'),
                    borderColor: active ? theme.primary : theme.border,
                  }]}
                  onPress={() => setGenderFilter(opt)}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ width: 1, backgroundColor: theme.border, marginHorizontal: 6, height: '60%', alignSelf: 'center' }} />
            {classOptions.map(opt => {
              const active = classFilter === opt;
              return (
                <TouchableOpacity key={opt}
                  style={[styles.chip, {
                    backgroundColor: active ? theme.primary : (isDark ? theme.card : '#f1f5f9'),
                    borderColor: active ? theme.primary : theme.border,
                  }]}
                  onPress={() => setClassFilter(opt)}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* No date banner */}
      {!selectedDate && (
        <View style={[styles.noDateBanner, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b40' }]}>
          <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
          <Text style={[styles.noDateText, { color: '#f59e0b' }]}>Select a date above to mark attendance</Text>
        </View>
      )}

      {/* Column header */}
      <View style={[styles.tableHead, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderBottomColor: theme.border }]}>
        <Text style={[styles.thSerial, { color: theme.textSecondary }]}>#</Text>
        <View style={{ width: scale(28) }} />
        <Text style={[styles.th, { flex: 1, color: theme.textSecondary, marginLeft: scale(12) }]}>STUDENT</Text>
        <Text style={[styles.th, { color: theme.textSecondary, marginRight: scale(4) }]}>P · L · A</Text>
      </View>

      {/* Student list */}
      <FlatList
        data={filtered.slice(0, visibleCount)}
        keyExtractor={item => item.studentId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPad}
        onEndReached={() => visibleCount < filtered.length && setVisibleCount(v => v + 30)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Ionicons name="people-outline" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Students Found</Text>
          </View>
        }
        ListFooterComponent={
          filtered.length > 0
            ? visibleCount < filtered.length
              ? <TouchableOpacity style={styles.loadMore} onPress={() => setVisibleCount(v => v + 30)}>
                  <Text style={[styles.loadMoreText, { color: theme.primary }]}>Load more · {filtered.length - visibleCount} left</Text>
                </TouchableOpacity>
              : <Text style={[styles.allLoaded, { color: theme.textSecondary }]}>All {filtered.length} students</Text>
            : null
        }
      />

      {renderHistory()}
      {renderMarkAll()}
      {renderMonthlyReport()}
    </SafeAreaView>
  );
};

/* helper outside component */
function buildMonthlyStats(
  students: { studentId: string; studentName: string; rollno: string; class: string }[],
  db_mem: Record<string, Record<string, string>>,
  viewYear: number,
  viewMonth: number,
  now: Date
) {
  const prefix = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-`;
  return students
    .map(s => {
      const rec = db_mem[s.studentId] || {};
      let present = 0, absent = 0, late = 0;
      Object.entries(rec).forEach(([d, st]) => {
        if (!d.startsWith(prefix)) return;
        if (new Date(d.replace(/-/g, '/')) > now) return;
        if (st === 'present') present++;
        else if (st === 'absent') absent++;
        else if (st === 'late') late++;
      });
      const total = present + absent + late;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ...s, present, absent, late, total, pct };
    })
    .sort((a, b) => b.pct - a.pct);
}

/* ─────────────────── Styles ─────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), paddingVertical: scale(11) },
  backBtn: { width: scale(32), height: scale(32), borderRadius: scale(8), backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  headerText:  { flex: 1, marginLeft: scale(10) },
  headerTitle: { fontSize: scale(15), fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  headerSub:   { fontSize: scale(10), color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  pctBadge:    { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: scale(8), paddingHorizontal: scale(10), paddingVertical: scale(5) },
  pctNum:      { fontSize: scale(14), fontWeight: '800', color: '#fff' },
  pctLabel:    { fontSize: scale(8),  fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(12), paddingVertical: scale(7), borderBottomWidth: 1 },
  monthArrow: { width: scale(30), height: scale(30), justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: scale(13), fontWeight: '700', letterSpacing: -0.2 },

  dateStrip:        { borderBottomWidth: 1, maxHeight: scale(62) },
  dateStripContent: { paddingHorizontal: scale(10), gap: scale(6), paddingVertical: scale(6) },
  dateCell: { width: scale(38), alignItems: 'center', borderRadius: scale(8), borderWidth: 1, paddingVertical: scale(4), overflow: 'hidden', position: 'relative' },
  dateCellDay: { fontSize: scale(8),  fontWeight: '700' },
  dateCellNum: { fontSize: scale(14), fontWeight: '800' },
  dateCellBar: { position: 'absolute', bottom: 0, left: 0, height: scale(3), borderRadius: 1 },

  statsStrip: { flexDirection: 'row', borderBottomWidth: 1 },
  statCell:   { flex: 1, alignItems: 'center', paddingVertical: scale(7) },
  statNum:    { fontSize: scale(15), fontWeight: '800' },
  statSmall:  { fontSize: scale(8), fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  controls:  { paddingHorizontal: scale(10), paddingTop: scale(7), paddingBottom: scale(4) },
  searchRow: { flexDirection: 'row', gap: scale(7), marginBottom: scale(6), alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(7), borderRadius: scale(8), borderWidth: 1, paddingHorizontal: scale(10), paddingVertical: scale(6) },
  searchInput: { flex: 1, fontSize: scale(12), padding: 0, margin: 0 },

  markAllTrigger: { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(10), paddingVertical: scale(7), borderRadius: scale(8) },
  markAllTriggerText: { fontSize: scale(11), fontWeight: '700', color: '#fff' },

  chips:    { gap: scale(6), paddingBottom: scale(2) },
  chip:     { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(14), borderWidth: 1 },
  chipText: { fontSize: scale(11), fontWeight: '600' },

  noDateBanner: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginHorizontal: scale(10), marginBottom: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), borderWidth: 1 },
  noDateText:   { fontSize: scale(11), fontWeight: '600' },

  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(5), borderBottomWidth: 1 },
  thSerial:  { fontSize: scale(9), fontWeight: '700', width: scale(22), textAlign: 'center', textTransform: 'uppercase' },
  th:        { fontSize: scale(9), fontWeight: '700', textTransform: 'uppercase' },

  listPad: { paddingBottom: scale(24) },

  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(7), borderBottomWidth: 1 },
  rowLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
  serial:     { width: scale(22), fontSize: scale(10), textAlign: 'center' },
  avatar:     { width: scale(28), height: scale(28), borderRadius: scale(7), justifyContent: 'center', alignItems: 'center', marginLeft: scale(4) },
  avatarText: { fontSize: scale(11), fontWeight: '700' },
  info:       { flex: 1, marginLeft: scale(8) },
  name:       { fontSize: scale(12), fontWeight: '600' },
  meta:       { fontSize: scale(10), marginTop: 1 },

  quickBtns: { flexDirection: 'row', gap: scale(5) },
  qBtn:      { width: scale(28), height: scale(28), borderRadius: scale(7), borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qBtnText:  { fontSize: scale(11), fontWeight: '800' },

  empty:       { alignItems: 'center', paddingVertical: scale(36), margin: scale(12), borderRadius: scale(12), borderWidth: 1 },
  emptyTitle:  { fontSize: scale(13), fontWeight: '700', marginTop: scale(6) },
  loadMore:    { alignItems: 'center', paddingVertical: scale(12) },
  loadMoreText:{ fontSize: scale(12), fontWeight: '700' },
  allLoaded:   { textAlign: 'center', fontSize: scale(10), paddingVertical: scale(10) },

  /* History / Mark-all modals */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: scale(18), borderTopRightRadius: scale(18), borderTopWidth: 1, paddingHorizontal: scale(16), paddingBottom: Platform.OS === 'ios' ? scale(32) : scale(18), paddingTop: scale(10), maxHeight: '90%' },
  handle:  { width: scale(36), height: scale(4), borderRadius: scale(2), alignSelf: 'center', marginBottom: scale(12) },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) },
  closeBtn:    { width: scale(32), height: scale(32), borderRadius: scale(8), justifyContent: 'center', alignItems: 'center' },
  histAvatar:     { width: scale(40), height: scale(40), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  histAvatarText: { fontSize: scale(18), fontWeight: '800' },
  histName:       { fontSize: scale(14), fontWeight: '700' },
  histMeta:       { fontSize: scale(10), marginTop: 1 },
  sectionLabel:   { fontSize: scale(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: scale(8) },
  histPills:      { flexDirection: 'row', gap: scale(8), marginBottom: scale(12) },
  histPill:       { flex: 1, alignItems: 'center', paddingVertical: scale(7), borderRadius: scale(8), borderWidth: 1 },
  histPillNum:    { fontSize: scale(18), fontWeight: '800' },
  histPillLabel:  { fontSize: scale(9),  fontWeight: '600', marginTop: 1 },
  calGrid:        { flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(10) },
  calCell:        { width: `${100 / 7}%` as any, alignItems: 'center', marginBottom: scale(4) },
  calDayLabel:    { fontSize: scale(9), fontWeight: '700', textTransform: 'uppercase', marginBottom: scale(2) },
  calDot:         { width: scale(32), height: scale(32), borderRadius: scale(8), justifyContent: 'center', alignItems: 'center', position: 'relative' },
  calDayNum:      { fontSize: scale(11), fontWeight: '600' },
  calStatusDot:   { position: 'absolute', bottom: scale(2), width: scale(4), height: scale(4), borderRadius: scale(2) },
  legend:         { flexDirection: 'row', justifyContent: 'center', gap: scale(14), marginTop: scale(4), marginBottom: scale(8) },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  legendDot:      { width: scale(8), height: scale(8), borderRadius: scale(4) },
  legendText:     { fontSize: scale(10) },

  /* Mark-all sheet */
  markAllSheet:      { borderTopLeftRadius: scale(18), borderTopRightRadius: scale(18), borderTopWidth: 1, paddingHorizontal: scale(16), paddingBottom: Platform.OS === 'ios' ? scale(32) : scale(18), paddingTop: scale(10), alignItems: 'center' },
  markAllTitle:      { fontSize: scale(16), fontWeight: '800', marginTop: scale(4) },
  markAllSub:        { fontSize: scale(11), marginBottom: scale(16), marginTop: scale(4) },
  markAllBtns:       { flexDirection: 'row', gap: scale(10), width: '100%', marginBottom: scale(12) },
  markAllBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(13), borderRadius: scale(12) },
  markAllBtnText:    { fontSize: scale(12), fontWeight: '800', color: '#fff' },
  markAllCancel:     { width: '100%', paddingVertical: scale(11), borderRadius: scale(10), borderWidth: 1, alignItems: 'center' },
  markAllCancelText: { fontSize: scale(13), fontWeight: '600' },

  /* Monthly Report */
  rptHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(6), borderBottomWidth: 1 },
  rptHCell: { fontSize: scale(9), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', minWidth: scale(24) },
  rptRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(7), borderBottomWidth: 1 },
  rptName: { fontSize: scale(12), fontWeight: '600' },
  rptMeta: { fontSize: scale(9), marginTop: 1 },
  rptCell: { fontSize: scale(13), fontWeight: '700', minWidth: scale(24), textAlign: 'center' },
  rptPctWrap: { minWidth: scale(36), paddingHorizontal: scale(5), paddingVertical: scale(2), borderRadius: scale(5), alignItems: 'center' },
  rptPct:  { fontSize: scale(11), fontWeight: '800' },
});
