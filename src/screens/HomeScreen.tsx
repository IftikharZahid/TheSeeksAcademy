import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourses } from '../context/CoursesContext';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

// Components
// Components
import { CourseCategories } from '../components/CourseCategories';
import { TopperSlider } from '../components/TopperSlider';
import { CourseList } from '../components/CourseList';

const { width } = Dimensions.get('window');

// Top Courses data
interface TopCourse {
  id: string;
  category: string;
  title: string;
  image: string;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { courses, refreshCourses } = useCourses();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCourses();
    setRefreshing(false);
  }, [refreshCourses]);

  // Transform courses for top courses section
  const topCourses: TopCourse[] = courses.slice(0, 5).map((course: any, index) => ({
    id: course.id || index.toString(),
    category: course.category || ['Programming', 'Business', 'Science', 'Arts', 'Design'][index % 5],
    title: course.title || course.name || 'Course Title',
    image: course.image || course.thumbnail || `https://picsum.photos/200/150?random=${index}`,
  }));

  const renderTopCourse = ({ item, index }: { item: TopCourse; index: number }) => (
    <TouchableOpacity
      style={[styles.topCourseCard, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('VideoLecturesScreen')}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.topCourseImage}
        defaultSource={require('../assets/default-profile.png')}
      />
      <View style={styles.topCourseInfo}>
        <Text style={[styles.topCourseCategory, { color: theme.textSecondary }]}>
          {item.category}
        </Text>
        <Text style={[styles.topCourseTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.content}>




          {/* Topper Students Slider */}
          <TopperSlider />

          {/* Course Categories */}
          <CourseCategories />

          {/* Top Course This Week */}
          <View style={styles.topCoursesSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Course This Week</Text>
            <FlatList
              data={topCourses}
              renderItem={renderTopCourse}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topCoursesList}
              ItemSeparatorComponent={() => <View style={{ width: scale(12) }} />}
            />
          </View>

          {/* Course List */}
          <CourseList />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const cardWidth = width * 0.42;


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
    marginTop: scale(8),
  },
  profileHeaderImage: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#f0f0f0',
  },
  notificationButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: scale(8),
    right: scale(10),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  topCoursesSection: {
    marginTop: scale(12),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(8),
  },
  topCoursesList: {
    paddingRight: scale(16),
  },
  topCourseCard: {
    width: cardWidth,
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topCourseImage: {
    width: '100%',
    height: cardWidth * 0.65,
    backgroundColor: '#f3f4f6',
  },
  topCourseInfo: {
    padding: scale(10),
  },
  topCourseCategory: {
    fontSize: scale(11),
    marginBottom: scale(4),
  },
  topCourseTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    lineHeight: scale(18),
  },
});