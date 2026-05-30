import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAppSelector } from '../../store/hooks';
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

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

export const TimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  // Get student's class and gender from Redux profile
  const profile = useAppSelector((state) => state.auth.profile);
  const getTodayName = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = dayNames[new Date().getDay()];
    // If Sunday (not in timetable), default to Monday
    return days.includes(today) ? today : 'Monday';
  };
  const [activeDay, setActiveDay] = useState(getTodayName());
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      // Hide tab bar and header immediately when entering screen
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' },
        headerShown: false,
      });

      return () => {
        // Restore tab bar and header when leaving screen
        navigation.getParent()?.setOptions({
          tabBarStyle: undefined,
          headerShown: true,
        });
      };
    }, [navigation])
  );

  useEffect(() => {
    if (!profile) {
      setLoading(true);
      return;
    }
    setLoading(true);
    const docRef = doc(db, 'timetable', activeDay);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawClasses = data.classes || [];
        const studentClass = profile.class || '';
        const userGender = profile.gender ? profile.gender.toLowerCase().trim() : '';

        const isMale = userGender === 'male' || userGender === 'boy' || userGender === 'boys';
        const isFemale = userGender === 'female' || userGender === 'girl' || userGender === 'girls';

        const filteredClasses = rawClasses.filter((c: any) => {
          // 1. Filter by student class (if class field is set in timetable entry)
          const matchClass = !studentClass || !c.class || c.class.toLowerCase().trim() === studentClass.toLowerCase().trim();
          
          // 2. Filter by student gender (supporting Boys, Girls, and All/Both entries)
          let matchGender = true;
          if (c.gender && c.gender.toLowerCase().trim() !== 'all') {
            const entryGender = c.gender.toLowerCase().trim();
            if (entryGender === 'boys') {
              matchGender = isMale;
            } else if (entryGender === 'girls') {
              matchGender = isFemale;
            }
          }
          return matchClass && matchGender;
        });

        // Sort by time or order if needed, otherwise rely on Firestore array order
        setScheduleData(filteredClasses);
      } else {
        setScheduleData([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to timetable:", error);
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, [activeDay, profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Timetable</Text>
        <View style={{ width: scale(36) }} />
      </View>

      <View style={styles.scrollContainerWrapper}>
        {/* Horizontal Scrollable Day Pills */}
        <View style={styles.dayPillsScrollViewContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPillsScrollContent}
            style={styles.dayPillsScrollView}
          >
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: activeDay === day ? theme.primary : 'transparent',
                    borderWidth: 0,
                  }
                ]}
              >
                <Text style={[
                  styles.dayPillText,
                  { color: activeDay === day ? '#fff' : theme.textSecondary }
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: scale(120) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {/* Selected Day Heading with Underline */}
          <View style={styles.selectedDayContainer}>
            <Text style={[styles.selectedDayText, { color: theme.text }]}>{activeDay}</Text>
            <View style={[styles.selectedDayUnderline, { backgroundColor: theme.primary }]} />
          </View>

          {/* Timeline Classes */}
          <View style={styles.timelineWrapper}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={{ textAlign: 'center', color: theme.textSecondary }}>Loading schedule...</Text>
              </View>
            ) : (
              scheduleData.map((classItem, index) => {
                const isLast = index === scheduleData.length - 1;
                return (
                  <View key={classItem.id || index} style={styles.timelineRow}>
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

                      <View style={styles.cardFooterRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
                          <Text style={[styles.detailsText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {classItem.instructor}
                          </Text>
                        </View>

                        <View style={styles.detailItem}>
                          <Ionicons name="location-outline" size={scale(14)} color={theme.textSecondary} />
                          <Text style={[styles.detailsText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {classItem.room}
                          </Text>
                        </View>
                      </View>
                      
                    </View>
                  </View>
                );
              })
            )}

            {!loading && scheduleData.length === 0 && (
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
  dayPillsScrollViewContainer: {
    marginVertical: scale(8),
    height: scale(42),
  },
  dayPillsScrollView: {
    paddingHorizontal: scale(16),
  },
  dayPillsScrollContent: {
    paddingRight: scale(32),
    alignItems: 'center',
  },
  dayPill: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginRight: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  selectedDayContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(4),
    marginBottom: scale(12),
    alignSelf: 'flex-start',
  },
  selectedDayText: {
    fontSize: scale(15),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(2),
  },
  selectedDayUnderline: {
    height: scale(3),
    width: '60%',
    borderRadius: scale(1.5),
  },
  timelineWrapper: {
    paddingHorizontal: scale(16),
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: scale(14),
  },
  timeColumn: {
    width: scale(75),
    paddingRight: scale(8),
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: scale(4),
  },
  timeText: {
    fontSize: scale(11),
    fontWeight: '600',
    textAlign: 'right',
  },
  timelineCenter: {
    width: scale(20),
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: scale(8),
  },
  timelineDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineLine: {
    position: 'absolute',
    top: scale(18),
    bottom: scale(-18),
    width: scale(2),
    borderRadius: 1,
  },
  contentCard: {
    flex: 1,
    borderRadius: scale(10),
    borderLeftWidth: scale(4),
    padding: scale(12),
    marginLeft: scale(8),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  subjectText: {
    fontSize: scale(14),
    fontWeight: '700',
    flex: 1,
    paddingRight: scale(8),
  },
  lectureBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  lectureBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(4),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  detailsText: {
    fontSize: scale(11.5),
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
