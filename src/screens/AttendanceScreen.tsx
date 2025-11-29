import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const { width } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();

  /* -----------------------------
        MONTH DATA
  ------------------------------ */
  const months = [
    "January 2025", "February 2025", "March 2025",
    "April 2025", "May 2025", "June 2025",
    "July 2025", "August 2025", "September 2025",
    "October 2025", "November 2025", "December 2025",
  ];
  const [monthIndex, setMonthIndex] = useState(10); // Default: November
  const selectedMonth = months[monthIndex];
  const [dropdownVisible, setDropdownVisible] = useState(false);

  /* -----------------------------
        SAMPLE ATTENDANCE DATA
  ------------------------------ */
  const summary = {
    present: 22,
    absent: 4,
    late: 2,
    percentage: 85,
  };

  /* -----------------------------
        WEEKLY QUICK INFO
  ------------------------------ */
  const weeklyData = [
    { day: "Mon", date: "18", status: "present", timeIn: "08:00 AM", timeOut: "02:00 PM" },
    { day: "Tue", date: "19", status: "late", timeIn: "08:30 AM", timeOut: "02:00 PM" },
    { day: "Wed", date: "20", status: "absent" },
    { day: "Thu", date: "21", status: "present", timeIn: "08:00 AM", timeOut: "02:00 PM" },
    { day: "Fri", date: "22", status: "present", timeIn: "08:05 AM", timeOut: "02:00 PM" },
    { day: "Sat", date: "23", status: "present", timeIn: "08:00 AM", timeOut: "12:00 PM" },
    { day: "Sun", date: "24", status: "absent" },
  ];

  /* -----------------------------
        MONTHLY CALENDAR GENERATOR
  ------------------------------ */
  const generateMonthCalendar = (year: number, monthIndex: number) => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    const startDay = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    let calendar: (number | null)[][] = [];
    let dayCounter = 1;

    for (let row = 0; row < 6; row++) {
      let week: (number | null)[] = [];

      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < startDay) {
          week.push(null); // Empty cells before start
        } else if (dayCounter > totalDays) {
          week.push(null); // After last day
        } else {
          week.push(dayCounter);
          dayCounter++;
        }
      }

      calendar.push(week);
    }

    return calendar;
  };

  const monthCalendar = generateMonthCalendar(2025, monthIndex);

  /* -----------------------------
        DAILY LOGS
  ------------------------------ */
  const dailyLogs = [
    { date: "21 Nov, Tue", status: "present", timeIn: "08:00 AM", timeOut: "02:00 PM" },
    { date: "20 Nov, Mon", status: "absent" },
    { date: "19 Nov, Sun", status: "late", timeIn: "08:30 AM", timeOut: "02:00 PM" },
  ];

  const getColor = (status?: string) => {
    if (!status) return "#F59E0B";
    switch (status.toLowerCase()) {
      case "present": return "#10B981";
      case "absent": return "#EF4444";
      case "late": return "#F59E0B";
      default: return "#F59E0B";
    }
  };

  /* -----------------------------
        MODAL
  ------------------------------ */
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);

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
      duration: 1500,
      useNativeDriver: false, // strokeDashoffset is not supported by native driver
    }).start();
  }, []);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  /* -----------------------------
        UI LAYOUT START
  ------------------------------ */
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>

        <Text style={styles.subtitle}>Monthly calendar view</Text>

        {/* MONTH DROPDOWN */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            onPress={() => setDropdownVisible(!dropdownVisible)}
            style={styles.dropdownButton}
          >
            <Text style={styles.dropdownText}>{selectedMonth}</Text>
            <Text style={styles.dropdownArrow}>
              {dropdownVisible ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownList}>
              {months.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setDropdownVisible(false);
                    setMonthIndex(i);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{m}</Text>
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
                  <Stop offset="0" stopColor="#6366F1" />
                  <Stop offset="0.5" stopColor="#1E66FF" />
                  <Stop offset="1" stopColor="#0EA5E9" />
                </LinearGradient>
              </Defs>

              <Circle
                cx="80"
                cy="80"
                r={RADIUS}
                stroke="#E5E7EB"
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
                rotation="-90"
                origin="80, 80"
              />
            </Svg>

            <View style={styles.centerTextContainer}>
              <Text style={styles.percentageTextBig}>
                {summary.percentage}%
              </Text>
              <Text style={styles.percentageLabel}>Present</Text>
            </View>
          </View>
        </View>

        {/* -----------------------------
              FULL GRID CALENDAR
        ------------------------------ */ }
        <Text style={styles.sectionTitle}>Monthly Calendar</Text>

        {/* WEEK DAY HEADERS */}
        <View style={styles.calendarRow}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={styles.calendarHeader}>
              {d}
            </Text>
          ))}
        </View>

        {/* CALENDAR GRID */}
        {monthCalendar.map((week, rowIndex) => (
          <View key={rowIndex} style={styles.calendarRow}>
            {week.map((day, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={styles.calendarCell}
                disabled={!day}
                onPress={() => {
                  if (day) {
                    const match = weeklyData.find((x) => parseInt(x.date) === day);
                    setSelectedDay(match || { date: day.toString(), status: "unknown" });
                    setModalVisible(true);
                  }
                }}
              >
                <Text
                  style={[
                    styles.calendarDate,
                    {
                      color: day
                        ? "#1f2937"
                        : "transparent",
                    },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* MONTH SUMMARY */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Monthly Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumber}>{summary.present}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>
                {summary.absent}
              </Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: "#F59E0B" }]}>
                {summary.late}
              </Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
          </View>
        </View>

        {/* DAILY LOGS */}
        <Text style={styles.sectionTitle}>Daily Records</Text>

        {dailyLogs.map((log, index) => (
          <View key={index} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logDate}>{log.date}</Text>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getColor(log.status) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {log.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {log.timeIn && (
              <Text style={styles.logText}>Time In: {log.timeIn}</Text>
            )}
            {log.timeOut && (
              <Text style={styles.logText}>Time Out: {log.timeOut}</Text>
            )}
          </View>
        ))}

      </ScrollView>

      {/* -----------------------------
              DAY DETAIL MODAL
      ------------------------------ */ }
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDay?.day || "Date"}, {selectedDay?.date}
            </Text>

            <View
              style={[
                styles.modalStatusBadge,
                { backgroundColor: getColor(selectedDay?.status) },
              ]}
            >
              <Text style={styles.modalStatusText}>
                {selectedDay?.status?.toUpperCase() || "UNKNOWN"}
              </Text>
            </View>

            {selectedDay?.timeIn && (
              <Text style={styles.modalText}>
                Time In: {selectedDay?.timeIn}
              </Text>
            )}

            {selectedDay?.timeOut && (
              <Text style={styles.modalText}>
                Time Out: {selectedDay?.timeOut}
              </Text>
            )}

            {!selectedDay?.timeIn &&
              selectedDay?.status === "unknown" && (
                <Text style={styles.modalText}>
                  No attendance information available.
                </Text>
              )}

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  backIcon: { fontSize: 24, fontWeight: "700" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  subtitle: { textAlign: "center", color: "#6B7280", marginBottom: 15 },

  dropdownContainer: { marginHorizontal: 16 },
  dropdownButton: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dropdownText: { fontSize: 15, fontWeight: "600" },
  dropdownArrow: { fontSize: 16 },
  dropdownList: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 4,
  },
  dropdownItem: { padding: 12 },
  dropdownItemText: { fontSize: 14 },

  progressContainer: { alignItems: "center", marginVertical: 20 },
  circleWrapper: { width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  centerTextContainer: { position: "absolute", alignItems: "center" },
  percentageTextBig: { fontSize: 30, fontWeight: "700" },
  percentageLabel: { color: "#6B7280" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginLeft: 16, marginBottom: 10 },

  /* FULL GRID CALENDAR */
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  calendarHeader: {
    width: width / 7 - 12,
    textAlign: "center",
    fontWeight: "700",
    color: "#6B7280",
    paddingVertical: 4,
  },
  calendarCell: {
    width: width / 7 - 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDate: {
    fontSize: 16,
    fontWeight: "600",
  },

  /* SUMMARY */
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryBox: { alignItems: "center", flex: 1 },
  summaryNumber: { fontSize: 22, fontWeight: "700", color: "#10B981" },
  summaryLabel: { fontSize: 12, color: "#6B7280" },

  /* DAILY LOGS */
  logCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between" },
  logDate: { fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#fff", fontWeight: "700" },
  logText: { marginTop: 6, color: "#4B5563" },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalText: { marginTop: 8, color: "#4B5563" },
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
    backgroundColor: "#1E66FF",
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseText: { color: "#fff", fontWeight: "700" },
});
