import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';

interface ClassSession {
  id: string;
  type: 'LECTURE' | 'PRACTICAL' | 'TUTORIAL';
  subject: string;
  time: string;
  room: string;
  instructor: string;
  lectureNo?: string | number;
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_EMOJIS: Record<string, string> = {
  Monday: '📅', Tuesday: '📆', Wednesday: '📋',
  Thursday: '📌', Friday: '🕌', Saturday: '📚',
};

// Helper function to format 24h string (e.g. "13:30 - 15:00" or "09:00") into 12h format with AM/PM
const formatTo12Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  
  const convertSingleTime = (time: string): string => {
    const trimmed = time.trim();
    if (/am|pm/i.test(trimmed)) {
      return trimmed;
    }
    
    // Match HH:MM
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // hour 0 should be 12
      return `${hours}:${minutes} ${ampm}`;
    }
    return trimmed;
  };

  if (timeStr.includes('-')) {
    const parts = timeStr.split('-');
    if (parts.length === 2) {
      return `${convertSingleTime(parts[0])} - ${convertSingleTime(parts[1])}`;
    }
  }
  
  return convertSingleTime(timeStr);
};


const AnimatedLectureItem = ({ classItem, index, isLast, theme, selectedDay }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(50);
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedDay, classItem.id]);

  return (
    <Animated.View style={[styles.timelineRow, { opacity, transform: [{ translateY }] }]}>
      {/* Time Column */}
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: theme.textSecondary }]}>
          {formatTo12Hour(classItem.time)}
        </Text>
      </View>

      {/* Timeline Center */}
      <View style={styles.timelineCenter}>
        <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />}
      </View>

      {/* Content Card */}
      <View style={[styles.contentCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, shadowColor: '#000' }]}>
        
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.subjectText, { color: theme.text }]} numberOfLines={1}>
            {classItem.subject}
          </Text>
          <View style={[styles.lectureBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.lectureBadgeText, { color: theme.primary }]}>
              Lec {classItem.lectureNo || (index + 1)}
            </Text>
          </View>
        </View>

        {classItem.combinedDetails ? (
          classItem.combinedDetails.map((detail: any, idx: number) => (
            <View key={idx} style={[styles.cardFooterRow, { marginTop: idx > 0 ? scale(4) : scale(2) }]}>
              <View style={[styles.detailItem, { flexShrink: 1, marginRight: scale(4) }]}>
                <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
                <Text style={[styles.detailsText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                  {detail.instructor}
                </Text>
              </View>

              <View style={[styles.detailItem, { flexShrink: 0, maxWidth: '50%' }]}>
                <Text style={[styles.detailsText, { color: theme.textSecondary, fontWeight: '600' }]}>Room:</Text>
                <Text style={[styles.detailsText, { color: theme.textSecondary, marginLeft: 2 }]} ellipsizeMode="tail" numberOfLines={1}>
                  {detail.room}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.cardFooterRow}>
            <View style={[styles.detailItem, { flexShrink: 1, marginRight: scale(4) }]}>
              <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
              <Text style={[styles.detailsText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                {classItem.instructor}
              </Text>
            </View>

            <View style={[styles.detailItem, { flexShrink: 0, maxWidth: '50%' }]}>
              <Text style={[styles.detailsText, { color: theme.textSecondary, fontWeight: '600' }]}>Room:</Text>
              <Text style={[styles.detailsText, { color: theme.textSecondary, marginLeft: 2 }]} ellipsizeMode="tail" numberOfLines={1}>
                {classItem.room}
              </Text>
            </View>
          </View>
        )}
        
      </View>
    </Animated.View>
  );
};

export const TimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  // Get student's class and gender from Redux profile
  const profile = useAppSelector((state) => state.auth.profile);
  const getTodayName = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = dayNames[new Date().getDay()];
    // If Sunday (not in timetable), default to Monday
    return DAYS_ORDER.includes(today) ? today : 'Monday';
  };
  const [activeDay, setActiveDay] = useState(getTodayName());
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);



  const allEntries = useAppSelector(state => state.timetable.entries);
  const isTimetableLoading = useAppSelector(state => state.timetable.status === 'loading' || state.timetable.status === 'idle');

  const parseTime = (t: string) => {
    if (!t) return 0;
    let [time, modifier] = t.trim().split(' ');
    if (!time) return 0;
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier && modifier.toUpperCase() === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    return parseInt(hours, 10) * 60 + (parseInt(minutes, 10) || 0);
  };

  const getMinutes = (c: any) => {
    const startStr = c.startTime || (c.time ? c.time.split('-')[0] : '');
    const endStr = c.endTime || (c.time ? c.time.split('-')[1] : '');
    const start = parseTime(startStr);
    const end = parseTime(endStr) || (start + 60);
    return { start, end };
  };

  const groupClasses = (classes: any[]) => {
    const grouped: any[] = [];
    classes.forEach(c => {
      const cTimes = getMinutes(c);
      const existing = grouped.find(g => getMinutes(g).start === cTimes.start && getMinutes(g).end === cTimes.end);
      if (existing) {
        let s1 = existing.subject || existing.subjectName || '';
        let s2 = c.subject || c.subjectName || '';
        if (!s1) s1 = 'TBD';
        if (!s2) s2 = 'TBD';
        
        if (s1 !== s2 && !s1.includes(s2)) {
          existing.subject = `${s1} & ${s2}`;
          existing.subjectName = existing.subject;
        }

        if (!existing.combinedDetails) {
          existing.combinedDetails = [{ instructor: existing.instructor || 'Teacher TBD', room: existing.room || 'TBD' }];
        }
        
        const newInstructor = c.instructor || 'Teacher TBD';
        const newRoom = c.room || 'TBD';
        
        const hasDetail = existing.combinedDetails.find((d: any) => d.instructor === newInstructor && d.room === newRoom);
        if (!hasDetail) {
          existing.combinedDetails.push({ instructor: newInstructor, room: newRoom });
        }
      } else {
        grouped.push({ ...c });
      }
    });
    return grouped;
  };

  useEffect(() => {
    if (!profile) {
      setScheduleData([]);
      return;
    }
    
    const rawClasses = allEntries.filter(c => (c as any).day === activeDay);
    const studentClass = profile.class || '';
    const userGender = profile.gender ? profile.gender.toLowerCase().trim() : '';

    const isMale = userGender === 'male' || userGender === 'boy' || userGender === 'boys';
    const isFemale = userGender === 'female' || userGender === 'girl' || userGender === 'girls';

    let filteredClasses = rawClasses.filter((c: any) => {
      // 1. Filter by student class
      const matchClass = !studentClass || !c.class || c.class.toLowerCase().trim() === studentClass.toLowerCase().trim();
      
      // 2. Filter by gender
      let matchGender = true;
      if (c.gender && c.gender.toLowerCase().trim() !== 'all') {
        const entryGender = c.gender.toLowerCase().trim();
        const entryIsMale = ['boys', 'boy', 'male', 'm'].includes(entryGender);
        const entryIsFemale = ['girls', 'girl', 'female', 'f'].includes(entryGender);
        
        if (entryIsMale) {
          matchGender = isMale;
        } else if (entryIsFemale) {
          matchGender = isFemale;
        }
      }
      return matchClass && matchGender;
    });

    // Group concurrent classes and sort them chronologically
    filteredClasses.sort((a: any, b: any) => getMinutes(a).start - getMinutes(b).start);
    const groupedData = groupClasses(filteredClasses);

    setScheduleData(groupedData);
  }, [allEntries, activeDay, profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        backgroundColor={theme.card} 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, zIndex: 10, borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Timetable</Text>
        <View style={{ width: scale(36) }} />
      </View>

      <View style={styles.scrollContainerWrapper}>
        {/* ── Day Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {DAYS_ORDER.map(day => {
            const isSelected = day === activeDay;
            const isToday = day === getTodayName();
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[
                  styles.tab,
                  isSelected && { backgroundColor: theme.primary + '1A' },
                  isToday && !isSelected && { borderBottomWidth: 2, borderBottomColor: theme.primary + '55' },
                ]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: scale(10), marginBottom: scale(1) }}>{DAY_EMOJIS[day]}</Text>
                <Text style={[
                  styles.tabLabel,
                  { color: isSelected ? theme.primary : theme.textSecondary },
                  isSelected && { fontWeight: '800' },
                ]}>
                  {day.slice(0, 3).toUpperCase()}
                </Text>
                {isToday && (
                  <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ paddingBottom: scale(120), paddingTop: scale(14) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {/* Today badge */}
          {activeDay === getTodayName() && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="sunny-outline" size={scale(13)} color={theme.primary} />
              <Text style={[styles.todayBadgeText, { color: theme.primary }]}>Today's Schedule</Text>
            </View>
          )}

          {/* Timeline Classes */}
          <View style={styles.timelineWrapper}>
            {isTimetableLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={{ textAlign: 'center', color: theme.textSecondary }}>Loading schedule...</Text>
              </View>
            ) : (
              scheduleData.map((classItem, index) => {
                const isLast = index === scheduleData.length - 1;
                return (
                  <AnimatedLectureItem 
                      key={classItem.id || index}
                      classItem={classItem}
                      index={index}
                      isLast={isLast}
                      theme={theme}
                      selectedDay={activeDay}
                    />
                  );
              })
            )}

            {!isTimetableLoading && scheduleData.length === 0 && (
              <View style={[styles.noClassesContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="cafe-outline" size={scale(36)} color={theme.textSecondary} style={{ marginBottom: scale(8) }} />
                <Text style={[styles.noClassesText, { color: theme.textSecondary }]}>
                  No classes scheduled for this day!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    zIndex: 10,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContainerWrapper: {
    flex: 1,
  },
  // Day Tabs
  tabBar: {
    maxHeight: scale(58),
    borderBottomWidth: 0.5,
  },
  tabBarContent: {
    paddingHorizontal: scale(8),
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    marginHorizontal: scale(2),
    minWidth: scale(52),
  },
  tabLabel: { fontSize: scale(11), fontWeight: '600', letterSpacing: 0.5 },
  todayDot: {
    width: scale(4), height: scale(4),
    borderRadius: scale(2),
    marginTop: scale(2),
  },
  // Today badge
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    alignSelf: 'flex-start',
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    marginBottom: scale(12),
    marginLeft: scale(16),
  },
  todayBadgeText: { fontSize: scale(11), fontWeight: '700' },
  timelineWrapper: {
    paddingHorizontal: scale(16),
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: scale(8),
  },
  timeColumn: {
    width: scale(65),
    paddingRight: scale(6),
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: scale(4),
  },
  timeText: {
    fontSize: scale(10),
    fontWeight: '600',
    textAlign: 'right',
  },
  timelineCenter: {
    width: scale(18),
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: scale(6),
  },
  timelineDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  timelineLine: {
    position: 'absolute',
    top: scale(14),
    bottom: scale(-14),
    width: scale(1.5),
    borderRadius: 1,
  },
  contentCard: {
    flex: 1,
    borderRadius: scale(8),
    borderLeftWidth: scale(3),
    padding: scale(8),
    marginLeft: scale(6),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  subjectText: {
    fontSize: scale(13),
    fontWeight: '700',
    flex: 1,
    paddingRight: scale(6),
  },
  lectureBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  lectureBadgeText: {
    fontSize: scale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(2),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  detailsText: {
    fontSize: scale(10),
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: scale(40),
    alignItems: 'center',
  },
  noClassesContainer: {
    padding: scale(32),
    alignItems: 'center',
    borderRadius: scale(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: scale(16),
  },
  noClassesText: {
    fontSize: scale(13.5),
    textAlign: 'center',
    fontWeight: '500',
  },
});
