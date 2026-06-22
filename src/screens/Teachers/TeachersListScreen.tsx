import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/HomeStack';
import teachersData from '../../../docs/teachers.json';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { scale } from '../../utils/responsive';

const { width } = Dimensions.get('window');

interface Teacher {
  id: string;
  name: string;
  subject: string;
  qualification: string;
  experience: string;
  image: string;
  color?: string;
  students?: string;
  courses?: number;
  rating?: number;
  phone?: string;
}

type TeachersScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'TeachersScreen'>;

// Color palette for cards matching reference design
const cardColors = [
  '#E8F5E9', // Light green
  '#FFF8E1', // Light yellow
  '#FCE4EC', // Light pink
  '#E8EAF6', // Light purple
  '#FFEBEE', // Light coral
  '#E3F2FD', // Light blue
  '#FFF3E0', // Light orange
  '#F3E5F5', // Light lavender
];

export const TeachersScreen: React.FC = () => {
  const navigation = useNavigation<TeachersScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const staffRaw = useAppSelector(state => state.teachers.list);
  const loading = useAppSelector(state => state.teachers.isLoading);
  const [refreshing, setRefreshing] = useState(false);

  // Apply default colors and properties if they don't exist
  const staff = staffRaw.map((teacher: any, index: number) => ({
    ...teacher,
    color: teacher.color || cardColors[index % cardColors.length],
    students: teacher.students || `${Math.floor(Math.random() * 30 + 10)}k`,
    courses: teacher.courses || Math.floor(Math.random() * 15 + 5),
    rating: teacher.rating || 4.5,
    phone: teacher.phone || `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
  }));

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Hide TopHeader and tab bar when this screen is focused
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' },
        headerShown: false,
      });
    }, [navigation])
  );

  const cardWidth = (width - scale(48)) / 2;

  // Modern compact card renderer
  const renderTeacherCard = (teacher: Teacher, index: number) => (
    <TouchableOpacity
      key={teacher.id}
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: isDark ? theme.card : '#ffffff',
          borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)',
        }
      ]}
      onPress={() => navigation.navigate('StaffInfoScreen', { teacher })}
      activeOpacity={0.9}
    >
      {/* Teacher Image & Rating overlay */}
      <View style={[styles.imageWrapper, { backgroundColor: teacher.color }]}>
        <Image source={{ uri: teacher.image }} style={styles.teacherImage} />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={scale(10)} color="#FFD700" />
          <Text style={styles.ratingText}>{teacher.rating}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.teacherName, { color: theme.text }]} numberOfLines={1}>
          {teacher.name}
        </Text>
        <Text style={[styles.subject, { color: theme.primary }]} numberOfLines={1}>
          {teacher.subject}
        </Text>

        <View style={styles.separator} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={scale(12)} color={theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{teacher.students}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="library" size={scale(12)} color={theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{teacher.courses}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeScreen')}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Staff Members</Text>
          <Text style={{ fontSize: scale(12), color: theme.textSecondary }}>{staff.length} available</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('LikedTeachersScreen')}>
          <Ionicons name="heart-outline" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading instructors...</Text>
          </View>
        )}

        {/* Error State */}
        {/* We can omit the retry since it's global, but handle empty */}
        {!loading && staff.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>No teachers found.</Text>
          </View>
        )}

        {/* Teacher Cards Grid */}
        {(!loading || refreshing) && staff.length > 0 && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scale(100) }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
          >
            <View style={styles.cardsGrid}>
              {staff.map((teacher, index) => renderTeacherCard(teacher, index))}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    zIndex: 100,
    elevation: 10,
  },
  contentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
  },
  searchButton: {
    padding: scale(4),
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: scale(8),
  },
  card: {
    borderRadius: scale(16),
    marginBottom: scale(16),
    backgroundColor: '#ffffff',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrapper: {
    width: '100%',
    height: scale(110),
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  teacherImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ratingBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: '#1f2937',
  },
  cardContent: {
    padding: scale(10),
    alignItems: 'center',
  },
  teacherName: {
    fontSize: scale(13),
    fontWeight: '700',
    marginBottom: scale(2),
    textAlign: 'center',
  },
  subject: {
    fontSize: scale(11),
    fontWeight: '600',
    marginBottom: scale(8),
    textAlign: 'center',
    opacity: 0.8,
  },
  separator: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: scale(8),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: scale(12),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: scale(10),
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(15),
    fontWeight: '500',
  },
  errorText: {
    fontSize: scale(15),
    color: '#ef4444',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(20),
  },
  retryButton: {
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(12),
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: scale(15),
    fontWeight: '700',
  },
});
