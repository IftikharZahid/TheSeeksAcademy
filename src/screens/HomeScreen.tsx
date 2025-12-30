import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCourses } from '../context/CoursesContext';
import { DeckSwiper } from '../components/DeckSwiper';
import { QuickActions } from '../components/QuickActions';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scale } from '../utils/responsive';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Admissions Open 👨‍🎓',
    subtitle: 'Apply now for Session 2026-27 —limited seats',
    colors: ['#667eea', '#764ba2'] as const,
  },
  {
    id: 2,
    title: 'Test Series Started ✍',
    subtitle: 'Join our Test series to prepare for your exams',
    colors: ['#f093fb', '#f5576c'] as const,
  },
  {
    id: 3,
    title: 'Scholarships Available 📚',
    subtitle: 'Merit-based scholarships up to 50%',
    colors: ['#4facfe', '#00f2fe'] as const,
  },
  {
    id: 4,
    title: 'Pass Guarantee 🐥',
    subtitle: 'Pass in all exams with our expert guidance',
    colors: ['#43e97b', '#38f9d7'] as const,
  },
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
                <LinearGradient key={slide.id} colors={[...slide.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, { width: width - 32 }]}>
                  <Text style={styles.bannerTitle}>{slide.title}</Text>
                  <Text style={styles.bannerSubtitle}>{slide.subtitle}</Text>
                  <TouchableOpacity style={styles.applyButton}>
                    <Text style={[styles.applyButtonText, { color: slide.colors[0] }]}>Get Started!</Text>
                  </TouchableOpacity>
                </LinearGradient>
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
          <QuickActions />

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
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
  },
  carouselContainer: {
    marginBottom: scale(8),
  },
  banner: {
    borderRadius: scale(16),
    padding: scale(16),
    marginRight: 0,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: scale(18),
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#ffffff',
    marginTop: scale(6),
    fontSize: scale(12),
    opacity: 0.9,
  },
  applyButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(18),
    marginTop: scale(12),
    alignSelf: 'flex-start',
  },
  applyButtonText: {
    fontWeight: '700',
    fontSize: scale(12),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: scale(12),
    gap: scale(6),
  },
  paginationDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#d1d5db',
  },
  paginationDotActive: {
    backgroundColor: '#3b82f6',
    width: scale(24),
  },

  featuredSection: {
    marginTop: scale(10),
  },
  featuredTitle: {
    fontWeight: '700',
    fontSize: scale(18),
    marginBottom: scale(12),
  },
});