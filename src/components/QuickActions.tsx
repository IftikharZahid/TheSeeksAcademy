import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

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
            <Text
              style={[styles.actionTitle, { color: theme.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: scale(8),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(12),
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - scale(64)) / 4,
    minHeight: scale(90),
    padding: scale(8),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 3,
  },
  iconCircle: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(5),
  },
  emoji: {
    fontSize: scale(18),
  },
  actionTitle: {
    fontSize: scale(9),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: scale(11),
  },
});
