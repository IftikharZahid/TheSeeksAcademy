import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, Dimensions, Easing, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from '../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { initAttendanceListener } from '../store/slices/attendanceSlice';

const { width } = Dimensions.get("window");

export const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  // Real-time attendance via onSnapshot listener
  const user           = useAppSelector(s => s.auth.user);
  const attendanceData = useAppSelector(s => s.attendance.data);

  // Subscribe once per uid — auto-updates when admin changes records
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = initAttendanceListener(dispatch, user.uid);
    return () => unsub();
  }, [user?.uid]);

  // dailyRecords from Firestore (falls back to empty map)
  const attendanceMap: Record<string, 'present' | 'absent' | 'late'> =
    (attendanceData?.dailyRecords as any) || {};

  /* -----------------------------
        MONTH DATA
  ------------------------------ */
  const generateMonths = () => {
    const months = [];
    const date = new Date();
    // Default system month is the current month
    for (let i = 0; i < 12; i++) {
        const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
        const monthName = d.toLocaleString('default', { month: 'long' });
        months.push(`${monthName} ${d.getFullYear()}`);
    }
    return months;
  };
  const months = generateMonths();
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth()); // Default to current system month, used for calendar generation logic below. Note that this is NOT the index into the `months` array.
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0); // This is the index into the `months` array.
  const selectedMonth = months[selectedMonthIndex];
  const [animating, setAnimating] = useState(false);
  const monthListRef = useRef<FlatList<string>>(null);



  /* -----------------------------
        SUMMARY / DAILY LOGS
  ------------------------------ */
  const yearFromLabel = (label: string) => {
    const parts = label.split(" ");
    return parseInt(parts[1], 10) || new Date().getFullYear();
  };

  const calculateMonthSummary = () => {
    let present = 0;
    let absent = 0;
    let late = 0;

    const currentYearStr = yearFromLabel(selectedMonth).toString();
    const currentMonthStr = (monthIndex + 1).toString().padStart(2, "0");
    const prefix = `${currentYearStr}-${currentMonthStr}-`;

    Object.entries(attendanceMap).forEach(([dateStr, status]) => {
      if (dateStr.startsWith(prefix)) {
        // Skip Sundays — they are holidays, not counted
        const parts = dateStr.split('-');
        const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
        if (new Date(y, m - 1, d).getDay() === 0) return;
        if (status === "present") present++;
        else if (status === "absent") absent++;
        else if (status === "late") late++;
      }
    });

    const total = present + absent + late;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, late, percentage };
  };

  const summary = calculateMonthSummary();

  // Derive live recent records from attendanceMap for the selected month
  const recentLogs = useMemo(() => {
    const currentYearStr = yearFromLabel(selectedMonth).toString();
    const currentMonthStr = (monthIndex + 1).toString().padStart(2, '0');
    const prefix = `${currentYearStr}-${currentMonthStr}-`;

    const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    return Object.entries(attendanceMap)
      .filter(([dateStr]) => {
        if (!dateStr.startsWith(prefix)) return false;
        // Exclude Sundays — they are holidays
        const p = dateStr.split('-');
        const y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
        return new Date(y, m - 1, d).getDay() !== 0;
      })
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, status]) => {
        // Manual parse → always local time, no NaN, no UTC-shift (safe on Hermes)
        const parts = dateStr.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
        const dateObj = new Date(y, m - 1, d);
        const dayNum  = d.toString().padStart(2, '0');
        const dayName = DAY_SHORT[dateObj.getDay()];
        const monthName = MON_SHORT[m - 1];
        return {
          dateStr,
          label: `${dayNum} ${monthName}, ${dayName}`,
          status: status as 'present' | 'absent' | 'late',
        };
      })
      .filter((x): x is { dateStr: string; label: string; status: 'present' | 'absent' | 'late' } => x !== null);
  }, [attendanceMap, selectedMonth, monthIndex]);

  /* -----------------------------
        UTILITIES
  ------------------------------ */
  const getColor = (status?: string) => {
    if (!status) return isDark ? theme.textSecondary : "#D1D5DB"; // neutral
    switch (status.toLowerCase()) {
      case "present":
        return "#10B981";
      case "absent":
        return "#EF4444";
      case "late":
        return "#F59E0B";
      default:
        return isDark ? theme.textSecondary : "#D1D5DB";
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Data is already live via onSnapshot — just give visual feedback
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  /* -----------------------------
        CALENDAR GENERATION
  ------------------------------ */
  const generateMonthCalendar = (year: number, mIndex: number) => {
    const firstDay = new Date(year, mIndex, 1);
    const lastDay = new Date(year, mIndex + 1, 0);

    const startDay = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    let calendar: (number | null)[][] = [];
    let dayCounter = 1;

    for (let row = 0; row < 6; row++) {
      let week: (number | null)[] = [];

      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < startDay) {
          week.push(null);
        } else if (dayCounter > totalDays) {
          week.push(null);
        } else {
          week.push(dayCounter);
          dayCounter++;
        }
      }

      calendar.push(week);
    }

    return calendar;
  };

  const currentYear = yearFromLabel(selectedMonth);
  const monthCalendar = generateMonthCalendar(currentYear, monthIndex);

  /* -----------------------------
        TODAY HIGHLIGHT
  ------------------------------ */
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const isCalendarMonthToday = todayYear === currentYear && todayMonth === monthIndex;

  /* -----------------------------
        MODAL
  ------------------------------ */
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const openDayModal = (year: number, month: number, day: number) => {
    const mm = (month + 1).toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    const key = `${year}-${mm}-${dd}`;
    const status = attendanceMap[key] ?? "unknown";
    // Build a local date to get the correct weekday name
    const dateObj = new Date(year, month, day);
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    setSelectedDayInfo({
      year,
      month,
      day,
      status,
      label: `${weekday}, ${day} ${MONTH_NAMES[month]} ${year}`,
    });

    setModalVisible(true);
  };


  /* -----------------------------
        MONTH SWITCH ANIMATION (SLIDE + FADE)
  ------------------------------ */
  const animTranslate = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;

  const changeMonth = (newDropdownIndex: number) => {
    if (animating || newDropdownIndex === selectedMonthIndex) return;
    setAnimating(true);
    const direction = newDropdownIndex > selectedMonthIndex ? -1 : 1; // left for next, right for prev
    
    animTranslate.setValue(direction * width * 0.25); // start offset
    animOpacity.setValue(0);
    // run parallel slide in + fade in

    Animated.parallel([
      Animated.timing(animTranslate, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedMonthIndex(newDropdownIndex);

      // Now correctly extract the month index from the label.
      const selectedLabel = months[newDropdownIndex];
      const monthName = selectedLabel.split(" ")[0];
      const parsedMonthIndex = new Date(`${monthName} 1, 2026`).getMonth();
      setMonthIndex(parsedMonthIndex);

      setAnimating(false);
    });
  };

  /* -----------------------------
        RENDER
  ------------------------------ */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity style={{ padding: 4 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Attendance</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* HORIZONTAL MONTH SELECTOR */}
        <FlatList
          ref={monthListRef}
          data={months}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalMonthList}
          renderItem={({ item, index }) => {
            const isSelected = index === selectedMonthIndex;
            return (
              <TouchableOpacity
                onPress={() => changeMonth(index)}
                disabled={animating}
                style={[
                  styles.monthChip,
                  isSelected
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: isSelected ? '#fff' : theme.text },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />


        {/* CALENDAR CARD */}
        <Animated.View
          style={{
            transform: [{ translateX: animTranslate }],
            opacity: animOpacity,
          }}
        >
          <View style={[styles.calendarCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Calendar</Text>

            {/* WEEKDAY HEADERS */}
            <View style={styles.calendarRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text key={d} style={[styles.calendarHeader, { color: theme.textSecondary }]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* CALENDAR GRID */}
            {monthCalendar.map((week, rowIndex) => (
              <View key={rowIndex} style={styles.calendarRow}>
                {week.map((day, colIndex) => {
                  const showDay = typeof day === "number";
                  // determine attendance key
                  const mm = (monthIndex + 1).toString().padStart(2, "0");
                  const dd = showDay ? day.toString().padStart(2, "0") : null;
                  const key = showDay ? `${currentYear}-${mm}-${dd}` : null;
                  const status = key ? attendanceMap[key] : undefined;

                  const isSunday = colIndex === 0;
                  const isToday = isCalendarMonthToday && showDay && day === todayDate;

                  // Determine background color and text color
                  let bgColor = "transparent";
                  let textColor = showDay ? (isDark ? theme.text : "#1f2937") : "transparent";

                  if (showDay) {
                    if (isSunday) {
                      textColor = "#EF4444"; // Red text for Sunday
                    } else {
                      if (status === 'present') {
                        bgColor = "#10B981"; // Green
                        textColor = "#ffffff";
                      } else if (status === 'absent') {
                        bgColor = "#EF4444"; // Red
                        textColor = "#ffffff";
                      } else if (status === 'late') {
                        bgColor = "#F59E0B"; // Amber
                        textColor = "#ffffff";
                      } else if (isToday) {
                        bgColor = theme.primary; // Purple (Primary)
                        textColor = "#ffffff";
                      }
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      style={styles.calendarCell}
                      disabled={!showDay}
                      onPress={() => showDay && openDayModal(currentYear, monthIndex, day)}
                    >
                      <View style={{ alignItems: "center", justifyContent: 'center' }}>
                        <View style={[
                          styles.dayCircle,
                          { backgroundColor: bgColor },
                          isSunday && !isToday && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }
                        ]}>
                          <Text style={[
                            styles.calendarDate,
                            { color: textColor },
                          ]}>
                            {showDay ? day : ""}
                          </Text>
                        </View>

                        {isSunday && showDay && (
                          <Text style={{ fontSize: 7, color: '#EF4444', fontWeight: '800', marginTop: 1 }}>OFF</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* MONTH SUMMARY */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Monthly Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumber}>{summary.present}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Present</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>{summary.absent}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Absent</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: "#F59E0B" }]}>{summary.late}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Late</Text>
            </View>
          </View>
        </View>

        {/* DAILY LOGS — live from Firestore via attendanceMap */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Records</Text>
        {recentLogs.length === 0 ? (
          <View style={[styles.logCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border, alignItems: 'center', paddingVertical: 18 }]}>
            <Text style={[styles.logText, { color: theme.textSecondary }]}>No records for this month yet.</Text>
          </View>
        ) : (
          recentLogs.map((log) => {
            if (!log) return null;
            return (
              <View key={log.dateStr} style={[styles.logCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logDate, { color: theme.text }]}>{log.label}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getColor(log.status) }]}>
                    <Text style={styles.badgeText}>{log.status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* DAY DETAIL MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? theme.card : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedDayInfo?.label || "Date"}</Text>

            <View style={[styles.modalStatusBadge, { backgroundColor: getColor(selectedDayInfo?.status) }]}>
              <Text style={styles.modalStatusText}>
                {selectedDayInfo?.status?.toUpperCase() || "UNKNOWN"}
              </Text>
            </View>

            {!selectedDayInfo?.timeIn && selectedDayInfo?.status === "unknown" && (
              <Text style={[styles.modalText, { color: theme.textSecondary }]}>No attendance information available.</Text>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

/* -----------------------------
        STYLES
------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, marginLeft: 12 },

  compactScore: {
    alignItems: "flex-end",
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  compactPercentage: {
    fontSize: 14,
    fontWeight: "800",
  },
  compactLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  subtitle: { textAlign: "center", marginBottom: 8, fontSize: 12 },

  horizontalMonthList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  progressContainer: { alignItems: "center", marginVertical: 12 },
  circleWrapper: { width: 130, height: 130, justifyContent: "center", alignItems: "center" },
  centerTextContainer: { position: "absolute", alignItems: "center" },
  percentageTextBig: { fontSize: 24, fontWeight: "700" },
  percentageLabel: {},

  sectionTitle: { fontSize: 16, fontWeight: "700", marginLeft: 16, marginBottom: 8, marginTop: 8 },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },

  /* CALENDAR CARD */
  calendarCard: {
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },

  /* CALENDAR */
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  calendarHeader: {
    width: width / 7 - 12,
    textAlign: "center",
    fontWeight: "700",
    paddingVertical: 4,
  },
  calendarCell: {
    width: width / 7 - 12,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SUMMARY */
  summaryCard: {
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryBox: { alignItems: "center", flex: 1 },
  summaryNumber: { fontSize: 18, fontWeight: "800", color: "#10B981" },
  summaryLabel: { fontSize: 10, marginTop: 2, fontWeight: "600", textTransform: "uppercase" },

  /* DAILY LOGS */
  logCard: {
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    borderWidth: 1,
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginBottom: 2 },
  logDate: { fontSize: 12, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 9, letterSpacing: 0.5 },
  logText: { fontSize: 11 },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalText: { marginTop: 8 },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginVertical: 10,
  },
  modalStatusText: { color: "#fff", fontWeight: "700" },
  modalCloseButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseText: { color: "#fff", fontWeight: "700" },
});

export default AttendanceScreen;
