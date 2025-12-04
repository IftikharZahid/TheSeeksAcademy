import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCourses } from '../context/CoursesContext';
import { Course } from '../data/courses';
import { useTheme } from '../context/ThemeContext';
import {LoaderKitView} from 'react-native-loader-kit';

const CourseCard = memo(
  ({ item, liked }: { item: Course; liked: boolean }) => {
    const [localLiked, setLocalLiked] = React.useState(liked);
    const { theme } = useTheme();

    const handleToggle = () => {
      setLocalLiked((prev) => !prev);
    };

    return (
      <TouchableOpacity 
        style={[styles.courseCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.image }} style={[styles.courseImage, { backgroundColor: theme.border }]} />

        <View style={styles.courseInfo}>
          <Text style={[styles.courseName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={[styles.teacherName, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.teacher}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.likeButton, 
                { backgroundColor: theme.background, borderColor: theme.border },
                localLiked && styles.likeButtonActive
              ]}
              onPress={handleToggle}
            >
              <Text style={[styles.likeText, localLiked && styles.likeTextActive]}>
                {localLiked ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.enrollButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.enrollText}>More Detail...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export const CoursesScreen: React.FC = () => {
  const { courses, isLiked, refreshCourses, isLoading } = useCourses();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCourses();
    setRefreshing(false);
  }, [refreshCourses]);

  const renderCourse = useCallback(
    ({ item }: { item: Course }) => {
      const liked = isLiked(item.id);
      return (
        <CourseCard
          item={item}
          liked={liked}
        />
      );
    },
    [isLiked]
  );

  const renderSkeleton = useCallback(() => {
    return (
      <View style={[styles.courseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.courseImage, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
          <LoaderKitView
            style={{ width: 50, height: 50 }}
            name={'BallTrianglePath'}
            animationSpeedMultiplier={1.0}
            color={theme.primary}
          />
        </View>
        <View style={styles.courseInfo}>
          <View style={{ height: 14, width: '80%', backgroundColor: theme.border, marginBottom: 8, borderRadius: 4 }} />
          <View style={{ height: 14, width: '60%', backgroundColor: theme.border, marginBottom: 12, borderRadius: 4 }} />
          <View style={{ height: 12, width: '40%', backgroundColor: theme.border, marginBottom: 8, borderRadius: 4 }} />
          
          <View style={styles.actionButtons}>
            <View style={{ width: 30, height: 30, backgroundColor: theme.border, borderRadius: 6 }} />
            <View style={{ width: 80, height: 26, backgroundColor: theme.border, borderRadius: 6 }} />
          </View>
        </View>
      </View>
    );
  }, [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          renderItem={renderSkeleton}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          style={[styles.list, { backgroundColor: theme.background }]}
        />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          style={[styles.list, { backgroundColor: theme.background }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }

          // ⚡ Optimization props
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
};

/* -------------------------------------
          STYLES (Optimized)
-------------------------------------- */
const CARD_WIDTH = '48%';

const styles = StyleSheet.create({
  container: { flex: 1 },

  list: { flex: 1 },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  courseCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  courseImage: {
    width: '100%',
    height: 110,
  },

  courseInfo: { padding: 10 },

  courseName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    height: 40,
  },

  teacherName: {
    fontSize: 12,
    marginBottom: 8,
  },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  likeButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },

  likeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },

  likeText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  likeTextActive: {
    color: '#ef4444',
  },

  enrollButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  enrollText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default CoursesScreen;
