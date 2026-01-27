import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCourses } from '../context/CoursesContext';
import { Course } from '../data/courses';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';

const CourseCard = memo(
  ({ item, onPress }: { item: Course; onPress: () => void }) => {
    const { theme } = useTheme();

    return (
      <TouchableOpacity
        style={[styles.courseItem, { borderBottomColor: theme.border }]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <Image source={{ uri: item.image }} style={styles.courseImage} />

        <View style={styles.courseContent}>
          <Text style={[styles.courseName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.teacherName, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.teacher}
          </Text>
        </View>

        <View style={styles.actionIcon}>
          <Ionicons name="chevron-forward" size={scale(20)} color={theme.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }
);

export const CoursesScreen: React.FC = () => {
  const navigation = useNavigation<any>(); // Added type
  const { courses, refreshCourses, isLoading } = useCourses();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCourses();
    setRefreshing(false);
  }, [refreshCourses]);

  const renderCourse = useCallback(
    ({ item }: { item: Course }) => {
      return (
        <CourseCard
          item={item}
          onPress={() => navigation.navigate('Home', { screen: 'VideoLecturesScreen', params: { courseId: item.id } })}
        />
      );
    },
    [navigation]
  );

  const renderSkeleton = useCallback(() => {
    return (
      <View style={[styles.courseItem, { borderBottomColor: theme.border }]}>
        <View style={[styles.courseImage, { backgroundColor: theme.border }]} />
        <View style={styles.courseContent}>
          <View style={{ height: 14, width: '60%', backgroundColor: theme.border, marginBottom: 6, borderRadius: 4 }} />
          <View style={{ height: 12, width: '40%', backgroundColor: theme.border, borderRadius: 4 }} />
        </View>
      </View>
    );
  }, [theme]);

  // Use useNavigation from generic import if we didn't use the hook above, 
  // but we declared navigation above. Ensure import exists.
  // Note: 'useNavigation' core import is missing in the file header block in the prompt context but was there in previous file? 
  // Wait, the previous file had 'import React...'. Let's check imports. 
  // Function component has 'const navigation = useNavigation();' usually. 
  // I will assume useNavigation needs to be imported or used from props if not.
  // The original file didn't use useNavigation hook? 
  // Ah, I need to add import { useNavigation } from '@react-navigation/native';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Simple Back Button Header (Like NoticeBoard) */}
      <View style={styles.simpleHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Courses</Text>
        <View style={{ width: scale(32) }} />
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          renderItem={renderSkeleton}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={[styles.list, { backgroundColor: theme.background }]}
        />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={[styles.list, { backgroundColor: theme.background }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
};

/* -------------------------------------
          STYLES (List View)
-------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingBottom: 100,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginLeft: scale(-32), // Balance text center with left icon
  },
  backButton: {
    padding: scale(4),
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  courseImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(8),
    backgroundColor: '#f0f0f0',
  },
  courseContent: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  courseName: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(4),
  },
  teacherName: {
    fontSize: scale(13),
  },
  actionIcon: {
    paddingLeft: scale(8),
  }
});

export default CoursesScreen;
