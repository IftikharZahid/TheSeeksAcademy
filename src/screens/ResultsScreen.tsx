import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface Subject {
  id: string;
  name: string;
  date: string;
  score: number;
  status: string;
}

interface Exam {
  id: string;
  title: string;
  category: string;
  dateRange: string;
  status: 'Promoted' | 'Pending' | 'Failed';
  subjects: Subject[];
}

const exams: Exam[] = [
  {
    id: '1',
    title: '1st Midterm',
    category: 'Quarterly',
    dateRange: '15 Sep to 18 Sep',
    status: 'Promoted',
    subjects: [
      { id: '1', name: 'Chemistry 1', date: '28/08/2019', score: 65, status: 'PASS' },
      { id: '2', name: 'Physics 1', date: '28/08/2019', score: 56, status: 'PASS' },
      { id: '3', name: 'Mathematics 1', date: '29/08/2019', score: 78, status: 'PASS' },
    ],
  },
  {
    id: '2',
    title: '2nd Midterm',
    category: 'Half yearly',
    dateRange: '20 Oct to 23 Oct',
    status: 'Promoted',
    subjects: [
      { id: '1', name: 'Chemistry 2', date: '20/10/2019', score: 72, status: 'PASS' },
      { id: '2', name: 'Physics 2', date: '21/10/2019', score: 68, status: 'PASS' },
    ],
  },
  {
    id: '3',
    title: 'Final Exam',
    category: 'Annual',
    dateRange: '10 Mar to 20 Mar',
    status: 'Pending',
    subjects: [
      { id: '1', name: 'Chemistry Final', date: '10/03/2020', score: 85, status: 'PASS' },
      { id: '2', name: 'Physics Final', date: '12/03/2020', score: 75, status: 'PASS' },
      { id: '3', name: 'Math Final', date: '15/03/2020', score: 90, status: 'PASS' },
    ],
  },
];

const tabs = ['All Exams', 'Quarterly', 'Half yearly', 'Annual'];

export const ResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('All Exams');

  const filteredExams = activeTab === 'All Exams' 
    ? exams 
    : exams.filter(exam => exam.category === activeTab);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Simple Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Results</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Student Card */}
        <View style={[styles.studentCard, { backgroundColor: theme.primary }]}>
          <View style={styles.studentCardContent}>
            <View style={styles.studentAvatar}>
              <Image 
                source={require('../assets/profile.jpg')} 
                style={styles.avatarImage}
              />
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>Iftikhar Zahid</Text>
              <Text style={styles.studentClass}>BSCS A</Text>
            </View>
            <View style={styles.percentageSection}>
              <Text style={styles.percentageValue}>85%</Text>
              <Text style={styles.percentageLabel}>Over all percentage</Text>
            </View>
          </View>
        </View>

        {/* Exams Results Section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Exams Results</Text>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab, 
                  { backgroundColor: isDark ? theme.card : '#f3f4f6' },
                  activeTab === tab && { backgroundColor: theme.primary }
                ]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: theme.textSecondary },
                  activeTab === tab && styles.tabTextActive
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Exam Cards */}
        <View style={styles.examsContainer}>
          {filteredExams.map((exam, examIndex) => (
            <View key={exam.id} style={[styles.examCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Exam Header */}
              <View style={[styles.examHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View>
                  <Text style={[styles.examTitle, { color: theme.text }]}>{exam.title}</Text>
                  <Text style={[styles.examDate, { color: theme.textSecondary }]}>{exam.dateRange}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5' }]}>
                  <Text style={styles.statusIcon}>✓</Text>
                  <Text style={styles.statusText}>{exam.status}</Text>
                </View>
              </View>

              {/* Subjects */}
              <View style={styles.subjectsContainer}>
                {exam.subjects.map((subject, subjectIndex) => (
                  <View key={subject.id} style={styles.subjectRow}>
                    {/* Timeline Dot */}
                    <View style={styles.timelineContainer}>
                      <View style={styles.timelineDot} />
                      {subjectIndex < exam.subjects.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>

                    {/* Subject Card */}
                    <View style={[styles.subjectCard, { backgroundColor: theme.card, borderColor: '#f97316' }]}>
                      <View style={styles.subjectInfo}>
                        <View style={styles.subjectDateRow}>
                          <Text style={styles.dateIcon}>📅</Text>
                          <Text style={[styles.subjectDate, { color: theme.textSecondary }]}>{subject.date}</Text>
                        </View>
                        <View style={styles.subjectNameRow}>
                          <Text style={styles.subjectIcon}>📚</Text>
                          <Text style={[styles.subjectName, { color: theme.text }]}>{subject.name}</Text>
                        </View>
                      </View>
                      <View style={styles.scoreSection}>
                        <Text style={[styles.scoreValue, { color: theme.text }]}>{subject.score}</Text>
                        <Text style={styles.scoreStatus}>{subject.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
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
  studentCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  studentClass: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  percentageSection: {
    alignItems: 'flex-end',
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  percentageLabel: {
    fontSize: 11,
    color: '#e0e7ff',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  examsContainer: {
    paddingHorizontal: 16,
  },
  examCard: {
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  examDate: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusIcon: {
    fontSize: 14,
    color: '#059669',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  subjectsContainer: {
    padding: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
    backgroundColor: '#f97316',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    width: 2,
    bottom: -12,
    backgroundColor: '#fed7aa',
  },
  subjectCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  subjectDate: {
    fontSize: 12,
  },
  subjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
});
