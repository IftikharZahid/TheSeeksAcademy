import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCourses } from '../context/CoursesContext';
import { DeckSwiper } from '../components/DeckSwiper';

const quickItems = [
  { key: 'courses', label: 'Courses', emoji: '📚' },
  { key: 'assignments', label: 'Assignments', emoji: '📝' },
  { key: 'teachers', label: 'Teachers', emoji: '👩‍🏫' },
  { key: 'attendance', label: 'Attendance', emoji: '📊' },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { courses, isLiked } = useCourses();

  const featuredCourses = courses.filter(c => isLiked(c.id));
  const displayCourses = featuredCourses.length > 0 ? featuredCourses : courses.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={styles.content}>
          {/* Admissions Banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Admissions Open</Text>
            <Text style={styles.bannerSubtitle}>Apply now for Spring 2026 — limited seats</Text>
            <View style={styles.bannerButtons}>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.learnMoreButton}>
                <Text style={styles.learnMoreButtonText}>Learn more</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            {quickItems.map((q) => (
              <TouchableOpacity 
                key={q.key} 
                onPress={() => q.key === 'courses' && navigation.navigate('Courses')} 
                style={styles.quickActionCard}
              >
                <Text style={styles.quickActionEmoji}>{q.emoji}</Text>
                <Text style={styles.quickActionLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Featured Courses */}
          <View style={styles.featuredSection}>
            <Text style={styles.featuredTitle}>
              {featuredCourses.length > 0 ? 'Your Selected Courses' : 'Featured Courses'}
            </Text>
            <DeckSwiper data={displayCourses} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  banner: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#3b82f6',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: '#ffffff',
    marginTop: 8,
  },
  bannerButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  applyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  applyButtonText: {
    color: '#ffffff',
  },
  learnMoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  learnMoreButtonText: {
    color: '#ffffff',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  quickActionEmoji: {
    fontSize: 32,
  },
  quickActionLabel: {
    fontWeight: '600',
  },
  featuredSection: {
    marginTop: 1,
  },
  featuredTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 1,
  },
});