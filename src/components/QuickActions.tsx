import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const quickItems = [
  { key: 'courses', label: 'Courses', emoji: '📚', color: '#4f46e5' },
  { key: 'assignments', label: 'Assignments', emoji: '📝', color: '#ea580c' },
  { key: 'teachers', label: 'Teachers', emoji: '👩‍🏫', color: '#db2777' },
  { key: 'results', label: 'Results', emoji: '🏆', color: '#eab308' },
  { key: 'timetable', label: 'Timetable', emoji: '📅', color: '#16a34a' },
  { key: 'attendance', label: 'Attendance', emoji: '📊', color: '#0891b2' },
  { key: 'complaints', label: 'Complaints', emoji: '📢', color: '#dc2626' },
  { key: 'fees', label: 'Fee Details', emoji: '💰', color: '#7c3aed' },
];

export const QuickActions: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const handlePress = (key: string) => {
    switch (key) {
      case 'courses':
        navigation.navigate('Courses');
        break;
      case 'assignments':
        navigation.navigate('AssignmentsScreen');
        break;
      case 'teachers':
        navigation.navigate('TeachersScreen');
        break;
      case 'results':
        navigation.navigate('ResultsScreen');
        break;
      case 'timetable':
        navigation.navigate('TimetableScreen');
        break;
      case 'attendance':
        navigation.navigate('AttendanceScreen');
        break;
      case 'complaints':
        navigation.navigate('ComplaintsScreen');
        break;
      case 'fees':
        navigation.navigate('FeeDetailScreen');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
      <View style={styles.grid}>
        {quickItems.map((item) => (
          <TouchableOpacity 
            key={item.key}
            style={[styles.actionCard, { backgroundColor: theme.card }]}
            onPress={() => handlePress(item.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 80) / 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
