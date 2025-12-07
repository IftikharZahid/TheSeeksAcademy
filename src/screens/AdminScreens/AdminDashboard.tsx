import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface StatCardProps {
  value: number;
  label: string;
  icon: string;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon, color, delay }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.statContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={[styles.circularStat, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Ionicons name={icon as any} size={24} color={color} style={{ marginBottom: 4 }} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    </Animated.View>
  );
};

export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const headerAnim = useRef(new Animated.Value(0)).current;
  
  const [studentCount, setStudentCount] = React.useState(0);
  const [teacherCount, setTeacherCount] = React.useState(0);
  const [courseCount, setCourseCount] = React.useState(0);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudentCount(snapshot.size);
    });

    const unsubTeachers = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setTeacherCount(snapshot.size);
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setCourseCount(snapshot.size);
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubCourses();
    };
  }, []);

  const adminActions = [
    { id: 1, title: 'Courses', icon: 'book-outline', color: '#4f46e5', action: () => navigation.navigate('AdminCourses') },
    { id: 2, title: 'Students', icon: 'school-outline', color: '#0891b2', action: () => navigation.navigate('AdminStudentRecords') },
    { id: 3, title: 'Teachers', icon: 'people-outline', color: '#db2777', action: () => navigation.navigate('AdminTeachers') },
    { id: 4, title: 'Exams', icon: 'trophy-outline', color: '#ea580c', action: () => navigation.navigate('AdminExams') },
    { id: 5, title: 'Timetable', icon: 'calendar-outline', color: '#16a34a', action: () => navigation.navigate('AdminTimetable') },
    { id: 6, title: 'Fees', icon: 'cash-outline', color: '#7c3aed', action: () => navigation.navigate('AdminFeeScreen') },
    { id: 7, title: 'Complaints', icon: 'alert-circle-outline', color: '#dc2626', action: () => navigation.navigate('AdminComplaints') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: theme.card, 
            borderBottomColor: theme.border,
            opacity: headerAnim,
          }
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Section */}
        <View style={styles.statsRow}>
          <StatCard 
            value={studentCount}
            label="Students"
            icon="people"
            color="#6366f1"
            delay={0}
          />
          <StatCard 
            value={teacherCount}
            label="Teachers"
            icon="person"
            color="#ec4899"
            delay={100}
          />
          <StatCard 
            value={courseCount}
            label="Courses"
            icon="book"
            color="#06b6d4"
            delay={200}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          
          <View style={styles.grid}>
            {adminActions.map((item, index) => (
              <TouchableOpacity 
                key={item.id}
                style={[styles.actionCard, { backgroundColor: theme.card }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={[styles.actionTitle, { color: theme.text }]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  statContainer: {
    alignItems: 'center',
  },
  circularStat: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});