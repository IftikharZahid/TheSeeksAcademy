import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ClassSession {
  id: string;
  type: 'LECTURE' | 'PRACTICAL' | 'TUTORIAL';
  subject: string;
  time: string;
  room: string;
  instructor: string;
}

interface DaySchedule {
  day: string;
  date: string;
  classes: ClassSession[];
}

const weekSchedule: DaySchedule[] = [
  {
    day: 'Monday',
    date: 'Jul 3',
    classes: [
      { id: '1', type: 'LECTURE', subject: 'Data Structures', time: '08:00 - 09:30', room: 'Room 201', instructor: 'Dr. Ahmed' },
      { id: '2', type: 'PRACTICAL', subject: 'Database Lab', time: '10:00 - 12:00', room: 'Lab 3', instructor: 'Ms. Sara' },
      { id: '3', type: 'TUTORIAL', subject: 'OOP Tutorial', time: '02:00 - 03:00', room: 'Room 105', instructor: 'Mr. Khan' },
    ],
  },
  {
    day: 'Tuesday',
    date: 'Jul 4',
    classes: [
      { id: '1', type: 'LECTURE', subject: 'Operating Systems', time: '09:00 - 10:30', room: 'Room 202', instructor: 'Dr. Ali' },
      { id: '2', type: 'LECTURE', subject: 'Computer Networks', time: '11:00 - 12:30', room: 'Room 203', instructor: 'Ms. Fatima' },
    ],
  },
  {
    day: 'Wednesday',
    date: 'Jul 5',
    classes: [
      { id: '1', type: 'PRACTICAL', subject: 'Web Development Lab', time: '08:00 - 10:00', room: 'Lab 1', instructor: 'Mr. Usman' },
      { id: '2', type: 'LECTURE', subject: 'Software Engineering', time: '01:00 - 02:30', room: 'Room 204', instructor: 'Dr. Hassan' },
    ],
  },
  {
    day: 'Saturday',
    date: 'Jul 8',
    classes: [
      { id: '1', type: 'PRACTICAL', subject: 'Mobile App Development', time: '09:00 - 11:00', room: 'Lab 2', instructor: 'Ms. Ayesha' },
    ],
  },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const [activeDay, setActiveDay] = useState('Monday');

  const currentSchedule = weekSchedule.find(s => s.day === activeDay) || weekSchedule[0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Timetable</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Current Date Info */}
        <View style={styles.dateCard}>
          <Text style={styles.currentDate}>Week of July 3, 2025</Text>
          <Text style={styles.semester}>Spring Semester 2025</Text>
        </View>

        {/* Day Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                style={[styles.tab, activeDay === day && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeDay === day && styles.tabTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Classes for Selected Day */}
        <View style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>{currentSchedule.day}'s Classes</Text>
            <Text style={styles.scheduleDate}>{currentSchedule.date}</Text>
          </View>

          {/* Timeline Classes */}
          <View style={styles.classesContainer}>
            {currentSchedule.classes.map((classItem, index) => (
              <View key={classItem.id} style={styles.classRow}>
                {/* Timeline Dot */}
                <View style={styles.timelineContainer}>
                  <View style={[styles.timelineDot, { backgroundColor: getTypeColor(classItem.type) }]} />
                  {index < currentSchedule.classes.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                {/* Class Card */}
                <View style={[styles.classCard, { borderColor: getTypeColor(classItem.type) }]}>
                  <View style={styles.classHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(classItem.type)}20` }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(classItem.type) }]}>
                        {classItem.type}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>🕐 {classItem.time}</Text>
                  </View>
                  
                  <Text style={styles.subjectName}>{classItem.subject}</Text>
                  
                  <View style={styles.classDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📍</Text>
                      <Text style={styles.detailText}>{classItem.room}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>👨‍🏫</Text>
                      <Text style={styles.detailText}>{classItem.instructor}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {currentSchedule.classes.length === 0 && (
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1f2937',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  dateCard: {
    backgroundColor: '#8b5cf6',
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
    marginTop: 20,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
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
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  scheduleDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  classesContainer: {
    marginTop: 8,
  },
  classRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineContainer: {
    width: 30,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    width: 2,
    bottom: -16,
    backgroundColor: '#fed7aa',
  },
  classCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
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
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  classDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  noClassesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
