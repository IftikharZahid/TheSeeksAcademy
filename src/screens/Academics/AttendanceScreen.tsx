import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, Dimensions, Easing, RefreshControl, StatusBar } from "react-native";

import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from '../../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const { width } = Dimensions.get("window");

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);



  // Real-time attendance via onSnapshot listener
  const user           = useAppSelector(s => s.auth.user);
  const attendanceData = useAppSelector(s => s.attendance.data);

  // dailyRecords from Firestore (falls back to empty map)
  const attendanceMap: Record<string, 'present' | 'absent' | 'late'> =
    (attendanceData?.dailyRecords as any) || {};

  /* -----------------------------
        MONTH DATA
  ------------------------------ */
  const generateMonths = () => {
    const months = [];
    const date = new Date();
    // Generate the last 12 months chronologically (oldest on left, newest/current on right)
    for (let i = 11; i >= 0; i--) {
        const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
        const monthName = MONTH_NAMES[d.getMonth()];
        months.push(`${monthName} ${d.getFullYear()}`);
    }
    return months;
  };
  const months = generateMonths();
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth()); // Default to current system month, used for calendar generation logic below. Note that this is NOT the index into the `months` array.
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(months.length - 1); // Default to current month (rightmost)
  const selectedMonth = months[selectedMonthIndex];
  const [animating, setAnimating] = useState(false);
  const monthScrollRef = useRef<ScrollView>(null);
  const hasScrolledToEnd = useRef(false);

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
  const getStatusTheme = useCallback((status?: string, isSunday = false, isToday = false) => {
    if (status === 'present') {
      return {
        bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0',
        textColor: isDark ? '#34d399' : '#059669',
        iconName: 'checkmark-circle' as const,
      };
    }
    if (status === 'absent') {
      return {
        bgColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
        textColor: isDark ? '#f87171' : '#dc2626',
        iconName: 'close-circle' as const,
      };
    }
    if (status === 'late') {
      return {
        bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
        borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a',
        textColor: isDark ? '#fbbf24' : '#d97706',
        iconName: 'time' as const,
      };
    }
    if (isToday) {
      return {
        bgColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
        borderColor: theme.primary,
        textColor: theme.primary,
        iconName: 'today' as const,
      };
    }
    if (isSunday) {
      return {
        bgColor: isDark ? 'rgba(239, 68, 68, 0.05)' : '#fff5f5',
        borderColor: 'transparent',
        textColor: isDark ? '#f87171' : '#ef4444',
        iconName: 'calendar' as const,
      };
    }
    return {
      bgColor: isDark ? '#1e293b' : '#f9fafb',
      borderColor: theme.border,
      textColor: theme.text,
      iconName: 'calendar-outline' as const,
    };
  }, [isDark, theme]);

  const getColor = useCallback((status?: string) => {
    if (!status) return isDark ? theme.textSecondary : "#D1D5DB";
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
  }, [isDark, theme]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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

  const openDayModal = (year: number, month: number, day: number) => {
    const mm = (month + 1).toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    const key = `${year}-${mm}-${dd}`;
    const status = attendanceMap[key] ?? "unknown";
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
    const direction = newDropdownIndex > selectedMonthIndex ? -1 : 1;
    
    animTranslate.setValue(direction * width * 0.25);
    animOpacity.setValue(0);

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

      const selectedLabel = months[newDropdownIndex];
      const monthName = selectedLabel.split(" ")[0];
      const parsedMonthIndex = MONTH_NAMES.indexOf(monthName);
      setMonthIndex(parsedMonthIndex);

      setAnimating(false);
    });
  };

  const getModalContent = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return {
          icon: "checkmark-circle" as const,
          color: isDark ? '#34d399' : '#10b981',
          bgColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
          desc: "The student has successfully marked attendance for this date on campus.",
        };
      case "absent":
        return {
          icon: "close-circle" as const,
          color: isDark ? '#f87171' : '#ef4444',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
          desc: "No attendance recorded for this session.",
        };
      case "late":
        return {
          icon: "time" as const,
          color: isDark ? '#fbbf24' : '#f59e0b',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
          desc: "Attendance was recorded after the session standard buffer period.",
        };
      default:
        return {
          icon: "help-circle" as const,
          color: theme.textSecondary,
          bgColor: isDark ? '#1e293b' : '#f3f4f6',
          desc: "No attendance information is available for this date.",
        };
    }
  };
  const modalDetails = getModalContent(selectedDayInfo?.status);

  /* -----------------------------
        RENDER
  ------------------------------ */
  return (
    <ScreenContainer 
      headerTitle="Attendance"
      rightAction={
        <View style={[
          styles.compactScore,
          {
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderColor: 'transparent',
          }
        ]}>
          <Ionicons name="stats-chart" size={11} color="#ffffff" style={styles.scoreIcon} />
          <Text style={[styles.compactPercentage, { color: '#ffffff' }]}>
            {summary.percentage > 0 ? `${summary.percentage}%` : '—'}
          </Text>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* HORIZONTAL MONTH SELECTOR */}
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.horizontalMonthList}
          onContentSizeChange={() => {
            if (!hasScrolledToEnd.current) {
              monthScrollRef.current?.scrollToEnd({ animated: false });
              hasScrolledToEnd.current = true;
            }
          }}
        >
          {months.map((item, index) => {
            const isSelected = index === selectedMonthIndex;
            const parts = item.split(" ");
            const shortMonth = parts[0].substring(0, 3);
            const shortYear = parts[1].substring(2);
            const displayLabel = `${shortMonth} '${shortYear}`;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => changeMonth(index)}
                disabled={animating}
                style={[
                  styles.monthChip,
                  isSelected
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: isDark ? theme.card : '#ffffff', borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: isSelected ? '#ffffff' : theme.textSecondary },
                  ]}
                >
                  {displayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CALENDAR CARD */}
        <Animated.View
          style={{
            transform: [{ translateX: animTranslate }],
            opacity: animOpacity,
          }}
        >
          <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Academic Calendar</Text>
              <Text style={[styles.cardSubTitle, { color: theme.textSecondary }]}>{selectedMonth}</Text>
            </View>

            {/* WEEKDAY HEADERS */}
            <View style={styles.calendarRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
                <Text key={index} style={[styles.calendarHeader, { color: theme.textTertiary }]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* CALENDAR GRID */}
            {monthCalendar.map((week, rowIndex) => (
              <View key={rowIndex} style={styles.calendarRow}>
                {week.map((day, colIndex) => {
                  const showDay = typeof day === "number";
                  const mm = (monthIndex + 1).toString().padStart(2, "0");
                  const dd = showDay ? day.toString().padStart(2, "0") : null;
                  const key = showDay ? `${currentYear}-${mm}-${dd}` : null;
                  const status = key ? attendanceMap[key] : undefined;

                  const isSunday = colIndex === 0;
                  const isToday = isCalendarMonthToday && showDay && day === todayDate;

                  const cellTheme = getStatusTheme(status, isSunday, isToday);

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      style={styles.calendarCell}
                      disabled={!showDay}
                      onPress={() => showDay && openDayModal(currentYear, monthIndex, day)}
                      activeOpacity={0.7}
                    >
                      {showDay ? (
                        <View style={[
                          styles.dayTile,
                          {
                            backgroundColor: cellTheme.bgColor,
                            borderColor: cellTheme.borderColor,
                            borderWidth: isToday ? 1.5 : 1,
                          }
                        ]}>
                          <Text style={[
                            styles.calendarDate,
                            {
                              color: cellTheme.textColor,
                              fontWeight: (status || isToday) ? '700' : '600'
                            }
                          ]}>
                            {day}
                          </Text>
                          {status && (
                            <View style={[styles.microDot, { backgroundColor: cellTheme.textColor }]} />
                          )}
                        </View>
                      ) : (
                        <View style={styles.emptyTile} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* MONTH SUMMARY */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Summary</Text>
        <View style={styles.summaryContainer}>
          {/* Present Card */}
          <View style={[
            styles.summaryMiniCard,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
            }
          ]}>
            <View style={styles.summaryMiniHeader}>
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
              <Text style={[styles.summaryMiniLabel, { color: theme.textSecondary }]}>Present</Text>
            </View>
            <Text style={[styles.summaryMiniNumber, { color: isDark ? '#34d399' : '#059669' }]}>
              {summary.present}
            </Text>
          </View>

          {/* Absent Card */}
          <View style={[
            styles.summaryMiniCard,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
            }
          ]}>
            <View style={styles.summaryMiniHeader}>
              <Ionicons name="close-circle" size={14} color="#ffffff" />
              <Text style={[styles.summaryMiniLabel, { color: theme.textSecondary }]}>Absent</Text>
            </View>
            <Text style={[styles.summaryMiniNumber, { color: isDark ? '#f87171' : '#dc2626' }]}>
              {summary.absent}
            </Text>
          </View>

          {/* Late Card */}
          <View style={[
            styles.summaryMiniCard,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
            }
          ]}>
            <View style={styles.summaryMiniHeader}>
              <Ionicons name="time" size={14} color="#ffffff" />
              <Text style={[styles.summaryMiniLabel, { color: theme.textSecondary }]}>Late</Text>
            </View>
            <Text style={[styles.summaryMiniNumber, { color: isDark ? '#fbbf24' : '#d97706' }]}>
              {summary.late}
            </Text>
          </View>
        </View>

        {/* DAILY LOGS — live from Firestore via attendanceMap */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Records</Text>
        {recentLogs.length === 0 ? (
          <View style={[styles.logEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="calendar-outline" size={24} color={theme.textTertiary} style={styles.emptyIcon} />
            <Text style={[styles.logEmptyText, { color: theme.textSecondary }]}>No records for this month yet.</Text>
          </View>
        ) : (
          recentLogs.map((log) => {
            if (!log) return null;
            const logTheme = getStatusTheme(log.status);
            return (
              <View
                key={log.dateStr}
                style={[
                  styles.logCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderLeftColor: logTheme.textColor,
                  }
                ]}
              >
                <View style={styles.logHeader}>
                  <View style={styles.logInfo}>
                    <Ionicons name={logTheme.iconName} size={15} color={logTheme.textColor} style={styles.logIcon} />
                    <Text style={[styles.logDate, { color: theme.text }]}>{log.label}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: logTheme.bgColor,
                      borderColor: logTheme.borderColor,
                    }
                  ]}>
                    <Text style={[styles.badgeText, { color: logTheme.textColor }]}>
                      {log.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* DAY DETAIL MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Session Detail</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalBody}>
              <View style={[styles.modalIconContainer, { backgroundColor: modalDetails.bgColor }]}>
                <Ionicons name={modalDetails.icon} size={32} color={modalDetails.color} />
              </View>
              
              <Text style={[styles.modalDateLabel, { color: theme.text }]}>
                {selectedDayInfo?.label || "Date"}
              </Text>
              
              <View style={[
                styles.modalStatusBadge,
                {
                  backgroundColor: modalDetails.bgColor,
                  borderColor: modalDetails.color + '30',
                }
              ]}>
                <Text style={[styles.modalStatusText, { color: modalDetails.color }]}>
                  {selectedDayInfo?.status?.toUpperCase() || "UNKNOWN"}
                </Text>
              </View>

              <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                {modalDetails.desc}
              </Text>

              {selectedDayInfo?.status !== "unknown" && (
                <View style={[styles.modalBranchBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: theme.border }]}>
                  <Ionicons name="business" size={13} color={theme.primary} />
                  <Text style={[styles.modalBranchText, { color: theme.textSecondary }]}>
                    Branch: <Text style={{ color: theme.text, fontWeight: '600' }}>Fort Abbas</Text>
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

/* -----------------------------
        STYLES
------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    padding: scale(6),
    borderRadius: scale(8),
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  headerIcon: {
    marginRight: scale(6),
  },
  headerTitle: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  compactScore: {
    flexDirection: 'row',
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(20),
    borderWidth: 1,
  },
  scoreIcon: {
    marginRight: scale(4),
  },
  compactPercentage: {
    fontSize: moderateScale(12),
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: verticalScale(32),
  },
  horizontalMonthList: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  monthChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(18),
    borderWidth: 1,
    marginRight: scale(8),
  },
  monthChipText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    marginLeft: scale(16),
    marginBottom: verticalScale(8),
    marginTop: verticalScale(14),
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  calendarCard: {
    borderRadius: scale(16),
    padding: scale(14),
    marginHorizontal: scale(16),
    marginTop: verticalScale(6),
    marginBottom: verticalScale(4),
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    paddingBottom: verticalScale(6),
  },
  cardTitle: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardSubTitle: {
    fontSize: moderateScale(11),
    fontWeight: "700",
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  calendarHeader: {
    width: (width - scale(60)) / 7,
    textAlign: "center",
    fontWeight: "700",
    fontSize: moderateScale(11),
    paddingVertical: verticalScale(4),
  },
  calendarCell: {
    width: (width - scale(60)) / 7,
    height: scale(34),
    justifyContent: "center",
    alignItems: "center",
  },
  dayTile: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTile: {
    width: scale(28),
    height: scale(28),
  },
  calendarDate: {
    fontSize: moderateScale(11),
  },
  microDot: {
    width: scale(3.5),
    height: scale(3.5),
    borderRadius: scale(1.75),
    position: 'absolute',
    bottom: scale(2),
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    gap: scale(8),
  },
  summaryMiniCard: {
    flex: 1,
    borderRadius: scale(12),
    padding: scale(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
    gap: scale(4),
  },
  summaryMiniLabel: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryMiniNumber: {
    fontSize: moderateScale(18),
    fontWeight: '800',
  },
  logEmptyCard: {
    borderRadius: scale(12),
    paddingVertical: verticalScale(24),
    marginHorizontal: scale(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    marginBottom: verticalScale(6),
    opacity: 0.5,
  },
  logEmptyText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  logCard: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(6),
    borderWidth: 1,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: scale(8),
  },
  logDate: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeText: {
    fontWeight: "800",
    fontSize: moderateScale(9),
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    padding: scale(18),
    borderRadius: scale(20),
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(5) },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  modalTitle: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalCloseIcon: {
    padding: scale(4),
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    width: '100%',
    marginBottom: verticalScale(12),
  },
  modalBody: {
    alignItems: 'center',
    paddingVertical: verticalScale(4),
  },
  modalIconContainer: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  modalDateLabel: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    textAlign: 'center',
    marginBottom: verticalScale(6),
  },
  modalStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    borderWidth: 1,
    marginBottom: verticalScale(12),
  },
  modalStatusText: {
    fontWeight: "800",
    fontSize: moderateScale(11),
    letterSpacing: 0.4,
  },
  modalDesc: {
    fontSize: moderateScale(12),
    textAlign: 'center',
    lineHeight: moderateScale(17),
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(12),
  },
  modalBranchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    borderWidth: 1,
    gap: scale(4),
    marginTop: verticalScale(4),
  },
  modalBranchText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
  },
  modalCloseButton: {
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    alignItems: "center",
    marginTop: verticalScale(16),
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalCloseText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: moderateScale(13),
    letterSpacing: 0.2,
  },
});

export default AttendanceScreen;
