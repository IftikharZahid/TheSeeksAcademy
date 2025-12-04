import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCourses } from '../context/CoursesContext';
import { DeckSwiper } from '../components/DeckSwiper';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Admissions Open 👨‍🎓',
    subtitle: 'Apply now for Session 2026-27 — limited seats',
    color: '#3b82f6',
  },
  {
    id: 2,
    title: 'Test Series Started ✍',
    subtitle: 'Join our Test series to prepare for your exams',
    color: '#8b5cf6',
  },
  {
    id: 3,
    title: 'Scholarships Available 📚',
    subtitle: 'Merit-based scholarships up to 50%',
    color: '#10b981',
  },
  {
    id: 4,
    title: 'Pass Guarantee 🐥',
    subtitle: 'Pass in all exams with our expert guidance',
    color: '#b91078ff',
  },
];

const quickItems = [
  { key: 'courses', label: 'Courses', emoji: '📚' },
  { key: 'assignments', label: 'Assignments', emoji: '📝' },
  { key: 'teachers', label: 'Teachers', emoji: '👩‍🏫' },
  { key: 'results', label: 'Results', emoji: '🏆' },
  { key: 'timetable', label: 'Timetable', emoji: '🕐' },
  { key: 'attendance', label: 'Attendance', emoji: '📊' },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { courses, isLiked, refreshCourses } = useCourses();
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCourses();
    setRefreshing(false);
  }, [refreshCourses]);

  // Auto-scroll slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((current) => {
        const next = (current + 1) % slides.length;
        scrollViewRef.current?.scrollTo({
          x: next * (width - 32),
          animated: true,
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
    setActiveSlide(slideIndex);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        
        <View style={styles.content}>
          {/* Carousel Banner */}
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={width - 32}
              decelerationRate="fast"
            >
              {slides.map((slide) => (
                <View key={slide.id} style={[styles.banner, { backgroundColor: slide.color, width: width - 32 }]}>
                  <Text style={styles.bannerTitle}>{slide.title}</Text>
                  <Text style={styles.bannerSubtitle}>{slide.subtitle}</Text>
                  <TouchableOpacity style={styles.applyButton}>
                    <Text style={[styles.applyButtonText, { color: slide.color }]}>Get Started!</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    activeSlide === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            {quickItems.map((q) => (
              <TouchableOpacity 
                key={q.key} 
                onPress={() => {
                  if (q.key === 'courses') navigation.navigate('Courses');
                  if (q.key === 'assignments') navigation.navigate('AssignmentsScreen');
                  if (q.key === 'teachers') navigation.navigate('TeachersScreen');
                  if (q.key === 'results') navigation.navigate('ResultsScreen');
                  if (q.key === 'timetable') navigation.navigate('TimetableScreen');
                  if (q.key === 'attendance') navigation.navigate('AttendanceScreen');
                }} 
                style={[styles.quickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={styles.quickActionEmoji}>{q.emoji}</Text>
                <Text style={[styles.quickActionLabel, { color: theme.text }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Featured Courses */}
          <View style={styles.featuredSection}>
            <Text style={[styles.featuredTitle, { color: theme.text }]}>Featured Courses</Text>
            <DeckSwiper data={courses} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  carouselContainer: {
    marginBottom: 20,
  },
  banner: {
    borderRadius: 16,
    padding: 20,
    marginRight: 0,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#ffffff',
    marginTop: 8,
    fontSize: 14,
    opacity: 0.9,
  },
  applyButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  applyButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  paginationDotActive: {
    backgroundColor: '#3b82f6',
    width: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickActionCard: {
    width: '31%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionLabel: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12,
  },
  featuredSection: {
    marginTop: 10,
  },
  featuredTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
});