import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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





const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOrder: { [key: string]: number } = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

const getTypeColor = (type: string) => {
  switch (type) {
    case 'LECTURE':
      return '#3b82f6';
    case 'PRACTICAL':
      return '#8b5cf6';
    case 'TUTORIAL':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

export const TimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [activeDay, setActiveDay] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch schedule
    setLoading(true);
    let unsubscribe: () => void;

    if (activeDay === 'All') {
      const colRef = collection(db, 'timetable');
      unsubscribe = onSnapshot(colRef, (snapshot) => {
        let allClasses: any[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const dayName = doc.id;
          if (data.classes && Array.isArray(data.classes)) {
            // Add day name to each class for 'All' view context
            const dayClasses = data.classes.map((c: any) => ({ ...c, day: dayName }));
            allClasses = [...allClasses, ...dayClasses];
          }
        });

        // Sort by Day then Time
        allClasses.sort((a, b) => {
          const dayDiff = (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });

        setScheduleData(allClasses);
        setLoading(false);
      });
    } else {
      const docRef = doc(db, 'timetable', activeDay);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setScheduleData(data.classes || []);
        } else {
          setScheduleData([]);
        }
        setLoading(false);
      });
    }

    return () => unsubscribe && unsubscribe();
  }, [activeDay]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-trigger fetch or just wait a bit since it's real-time
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Simple Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Timetable</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
      
        {/* Day Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[
                  styles.tab, 
                  { backgroundColor: isDark ? theme.card : '#f3f4f6' },
                  activeDay === day && { backgroundColor: theme.primary }
                ]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: theme.textSecondary },
                  activeDay === day && styles.tabTextActive
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

          {/* Classes for Selected Day */}
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleTitle, { color: theme.text }]}>{activeDay}'s Classes</Text>
            </View>

          {/* Timeline Classes */}
          <View style={styles.classesContainer}>
            {loading ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.textSecondary }}>Loading...</Text>
            ) : (
                scheduleData.map((classItem, index) => (
              <View key={classItem.id} style={styles.classRow}>
                {/* Timeline Dot */}
                <View style={styles.timelineContainer}>
                  <View style={[styles.timelineDot, { backgroundColor: getTypeColor(classItem.type) }]} />
                  {index < scheduleData.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                {/* Class Card */}
                <View style={[
                  styles.classCard, 
                  { 
                    backgroundColor: theme.card,
                    borderColor: getTypeColor(classItem.type) 
                  }
                ]}>
                  <View style={styles.classHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(classItem.type)}20` }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(classItem.type) }]}>
                        {classItem.type}
                      </Text>
                    </View>
                      <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                        {activeDay === 'All' ? `${classItem.day} • ` : ''}🕐 {classItem.time}
                      </Text>
                  </View>
                  
                  <Text style={[styles.subjectName, { color: theme.text }]}>{classItem.subject}</Text>
                  
                  <View style={styles.classDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📚 Room No:</Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>{classItem.room}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>👨‍🏫 Instructor:</Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>{classItem.instructor}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
            )}
          </View>

          {!loading && scheduleData.length === 0 && (
            <View style={styles.noClassesContainer}>
              <Text style={[styles.noClassesText, { color: theme.textSecondary }]}>🎉 No classes scheduled for this day!</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  currentDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  semester: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 4,
  },
  tabsContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scheduleContainer: {
    paddingHorizontal: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scheduleDate: {
    fontSize: 14,
  },
  classesContainer: {
    marginTop: 4,
  },
  classRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    width: 2,
    bottom: -8,
    backgroundColor: '#fed7aa',
  },
  classCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  classDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  detailText: {
    fontSize: 12,
  },
  noClassesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
