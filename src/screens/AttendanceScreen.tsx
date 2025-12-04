import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
  Easing,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  /* -----------------------------
        MONTH DATA
  ------------------------------ */
  const months = [
    "January 2025",
    "February 2025",
    "March 2025",
    "April 2025",
    "May 2025",
    "June 2025",
    "July 2025",
    "August 2025",
    "September 2025",
    "October 2025",
    "November 2025",
    "December 2025",
  ];
  const [monthIndex, setMonthIndex] = useState(10); // Default: November
  const selectedMonth = months[monthIndex];
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  /* -----------------------------
        SAMPLE ATTENDANCE DATA (MAP)
        key format: 'YYYY-MM-DD' -> status
  ------------------------------ */
  // Replace these with your backend data
  const attendanceMap: Record<string, "present" | "absent" | "late"> = {
    "2025-11-18": "present",
    "2025-11-19": "late",
    "2025-11-20": "absent",
    "2025-11-21": "present",
    "2025-11-22": "present",
    "2025-11-23": "present",
    "2025-11-24": "absent",
    "2025-11-25": "present",
    "2025-11-26": "present",
  };

  /* -----------------------------
        SUMMARY / DAILY LOGS
  ------------------------------ */
  const summary = {
    present: 22,
    absent: 4,
    late: 2,
    percentage: 85,
  };

  const dailyLogs = [
    { date: "21 Nov, Tue", status: "present", timeIn: "08:00 AM", timeOut: "02:00 PM" },
    { date: "20 Nov, Mon", status: "absent" },
    { date: "19 Nov, Sun", status: "late", timeIn: "08:30 AM", timeOut: "02:00 PM" },
  ];

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Mock refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  /* -----------------------------
        CALENDAR GENERATION
  ------------------------------ */
  const yearFromLabel = (label: string) => {
    const parts = label.split(" ");
    return parseInt(parts[1], 10) || new Date().getFullYear();
  };

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

  const openDayModal = (year: number, month: number, day: number) => {
    const mm = (month + 1).toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    const key = `${year}-${mm}-${dd}`;
    const status = attendanceMap[key] ?? "unknown";
    const match = dailyLogs.find((d) => {
      // rough match by day number
      return d.date.includes(`${day}`) || d.date.includes(`${dd}`);
    });

    setSelectedDayInfo({
      year,
      month,
      day,
      status,
      timeIn: match?.timeIn,
      timeOut: match?.timeOut,
      label: `${day} ${months[month].split(" ")[0]} ${year}`,
    });

    setModalVisible(true);
  };

  /* -----------------------------
        PROGRESS RING ANIMATION
  ------------------------------ */
  const progress = useRef(new Animated.Value(0)).current;
  const RADIUS = 60;
  const STROKE_WIDTH = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: summary.percentage,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  /* -----------------------------
        MONTH SWITCH ANIMATION (SLIDE + FADE)
  ------------------------------ */
  const animTranslate = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;

  const changeMonth = (newIndex: number) => {
    if (animating || newIndex === monthIndex) return;
    setAnimating(true);
    const direction = newIndex > monthIndex ? -1 : 1; // left for next, right for prev
    animTranslate.setValue(direction * width * 0.25); // start offset
    animOpacity.setValue(0);
    // run parallel slide in + fade in
    setTimeout(() => setDropdownVisible(false), 100); // close dropdown if open
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
      setMonthIndex(newIndex);
      setAnimating(false);
    });
  };

  /* -----------------------------
        RENDER
  ------------------------------ */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Monthly calendar view</Text>

        {/* MONTH DROPDOWN */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            onPress={() => setDropdownVisible((s) => !s)}
            style={[styles.dropdownButton, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}
            disabled={animating}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>{selectedMonth}</Text>
            <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>{dropdownVisible ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={[styles.dropdownList, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
              {months.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={styles.dropdownItem}
                  onPress={() => changeMonth(i)}
                >
                  <Text style={[styles.dropdownItemText, { color: theme.text }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* PROGRESS RING */}
        <View style={styles.progressContainer}>
          <View style={styles.circleWrapper}>
            <Svg width={160} height={160}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={theme.primary} />
                  <Stop offset="0.5" stopColor="#a78bfa" />
                  <Stop offset="1" stopColor="#c4b5fd" />
                </LinearGradient>
              </Defs>

              <Circle
                cx="80"
                cy="80"
                r={RADIUS}
                stroke={isDark ? theme.border : "#E5E7EB"}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />

              <AnimatedCircle
                cx="80"
                cy="80"
                r={RADIUS}
                stroke="url(#grad)"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                transform="rotate(-90 80 80)"
              />
            </Svg>

            <View style={styles.centerTextContainer}>
              <Text style={[styles.percentageTextBig, { color: theme.primary }]}>{summary.percentage}%</Text>
              <Text style={[styles.percentageLabel, { color: theme.textSecondary }]}>Present</Text>
            </View>
          </View>
        </View>

        {/* Animated calendar container */}
        <Animated.View
          style={{
            transform: [{ translateX: animTranslate }],
            opacity: animOpacity,
          }}
        >
          {/* WEEKDAY HEADERS */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Calendar</Text>
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
                      
                      {/* Optional: Label for Sunday/Off if needed, or just visual */}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
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

        {/* DAILY LOGS */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Records</Text>
        {dailyLogs.map((log, i) => (
          <View key={i} style={[styles.logCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.logDate, { color: theme.text }]}>{log.date}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getColor(log.status) }]}>
                <Text style={styles.badgeText}>{log.status.toUpperCase()}</Text>
              </View>
            </View>
            {log.timeIn && <Text style={[styles.logText, { color: theme.textSecondary }]}>Time In: {log.timeIn}</Text>}
            {log.timeOut && <Text style={[styles.logText, { color: theme.textSecondary }]}>Time Out: {log.timeOut}</Text>}
          </View>
        ))}
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

            {selectedDayInfo?.timeIn && <Text style={[styles.modalText, { color: theme.textSecondary }]}>Time In: {selectedDayInfo.timeIn}</Text>}
            {selectedDayInfo?.timeOut && <Text style={[styles.modalText, { color: theme.textSecondary }]}>Time Out: {selectedDayInfo.timeOut}</Text>}

            {!selectedDayInfo?.timeIn && selectedDayInfo?.status === "unknown" && (
              <Text style={[styles.modalText, { color: theme.textSecondary }]}>No attendance information available.</Text>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    padding: 16,
  },
  backIcon: { fontSize: 24, fontWeight: "700" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  subtitle: { textAlign: "center", marginBottom: 15 },

  dropdownContainer: { marginHorizontal: 16 },
  dropdownButton: {
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dropdownText: { fontSize: 15, fontWeight: "600" },
  dropdownArrow: { fontSize: 16 },
  dropdownList: {
    marginTop: 6,
    borderRadius: 10,
    elevation: 4,
    borderWidth: 1,
  },
  dropdownItem: { padding: 12 },
  dropdownItemText: { fontSize: 14 },

  progressContainer: { alignItems: "center", marginVertical: 20 },
  circleWrapper: { width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  centerTextContainer: { position: "absolute", alignItems: "center" },
  percentageTextBig: { fontSize: 30, fontWeight: "700" },
  percentageLabel: { },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginLeft: 16, marginBottom: 10 },

  /* CALENDAR */
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  calendarHeader: {
    width: width / 7 - 12,
    textAlign: "center",
    fontWeight: "700",
    paddingVertical: 4,
  },
  calendarCell: {
    width: width / 7 - 12,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDate: {
    fontSize: 16,
    fontWeight: "600",
  },

  /* today highlight - REPLACED by generic dayCircle logic but keeping for ref if needed, 
     actually we can remove todayOuter/todayInner and use dayCircle */
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sundayBackground: {
    // backgroundColor: '#FEF2F2', // Light red background for Sundays - Handled inline for dark mode support
  },

  /* SUMMARY */
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryBox: { alignItems: "center", flex: 1 },
  summaryNumber: { fontSize: 22, fontWeight: "700", color: "#10B981" },
  summaryLabel: { fontSize: 12 },

  /* DAILY LOGS */
  logCard: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between" },
  logDate: { fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#fff", fontWeight: "700" },
  logText: { marginTop: 6 },

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
