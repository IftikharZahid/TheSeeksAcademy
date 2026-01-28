import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { db } from '../api/firebaseConfig';
import { doc, onSnapshot, collection } from 'firebase/firestore';

interface ClassSession {
  id: string;
  type: 'LECTURE' | 'PRACTICAL' | 'TUTORIAL';
  subject: string;
  time: string;
  room: string;
  instructor: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOrder: { [key: string]: number } = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

const { width } = Dimensions.get('window');
const pillWidth = (width - 48) / 3 - 8;

export const TimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [activeDay, setActiveDay] = useState('Wednesday');
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'timetable', activeDay);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScheduleData(data.classes || []);
      } else {
        setScheduleData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, [activeDay]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: '#1f2937' }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#1f2937' }]}>Timetable</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4338ca" />
        }
      >
        {/* Day Pills Grid - 3x2 Layout */}
        <View style={styles.dayPillsContainer}>
          <View style={styles.dayPillsRow}>
            {days.slice(0, 3).map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: activeDay === day ? '#312e81' : 'transparent',
                    borderColor: activeDay === day ? '#312e81' : '#6366f1',
                  }
                ]}
              >
                <Text style={[
                  styles.dayPillText,
                  { color: activeDay === day ? '#ffffff' : '#4338ca' }
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dayPillsRow}>
            {days.slice(3, 6).map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: activeDay === day ? '#312e81' : 'transparent',
                    borderColor: activeDay === day ? '#312e81' : '#6366f1',
                  }
                ]}
              >
                <Text style={[
                  styles.dayPillText,
                  { color: activeDay === day ? '#ffffff' : '#4338ca' }
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Day Heading with Underline */}
        <View style={styles.selectedDayContainer}>
          <Text style={styles.selectedDayText}>{activeDay}</Text>
          <View style={styles.selectedDayUnderline} />
        </View>

        {/* Timeline Classes */}
        <View style={styles.timelineWrapper}>
          {loading ? (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.textSecondary }}>Loading...</Text>
          ) : (
            scheduleData.map((classItem, index) => (
              <View key={classItem.id || index} style={styles.timelineRow}>
                {/* Time Column */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{classItem.time}</Text>
                </View>

                {/* Timeline Dot and Line */}
                <View style={styles.timelineCenter}>
                  <View style={styles.timelineDot} />
                  {index < scheduleData.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                {/* Content Card */}
                <View style={styles.contentCard}>
                  <Text style={styles.subjectText}>{classItem.subject}</Text>
                  <Text style={styles.detailsText}>
                    {classItem.instructor}
                  </Text>
                  <Text style={styles.detailsText}>
                    {classItem.room}
                  </Text>
                </View>
              </View>
            ))
          )}

          {!loading && scheduleData.length === 0 && (
            <View style={styles.noClassesContainer}>
              <Text style={styles.noClassesText}>🎉 No classes scheduled for this day!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  dayPillsContainer: {
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dayPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayPill: {
    width: pillWidth,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedDayContainer: {
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  selectedDayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  selectedDayUnderline: {
    height: 2,
    width: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 1,
  },
  timelineWrapper: {
    paddingHorizontal: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 14,
    minHeight: 60,
  },
  timeColumn: {
    width: 100,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6b7280',
    lineHeight: 15,
  },
  timelineCenter: {
    width: 16,
    alignItems: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4338ca',
  },
  timelineLine: {
    position: 'absolute',
    top: 8,
    width: 1,
    height: 70,
    backgroundColor: '#c7d2fe',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#4338ca',
    marginLeft: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  detailsText: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 15,
  },
  noClassesContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#6b7280',
  },
});
