import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Course } from '../data/courses';
import { useCourses } from '../context/CoursesContext';

export const CoursesScreen: React.FC = () => {
  const { courses, toggleLike, isLiked } = useCourses();

  const renderCourse = ({ item }: { item: Course }) => {
    const liked = isLiked(item.id);
    return (
      <TouchableOpacity style={styles.courseCard}>
        <Image source={{ uri: item.image }} style={styles.courseImage} />
        <View style={styles.courseInfo}>
          <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.teacherName} numberOfLines={1}>{item.teacher}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.likeButton, liked && styles.likeButtonActive]} 
              onPress={() => toggleLike(item.id)}
            >
              <Text style={[styles.likeText, liked && styles.likeTextActive]}>
                {liked ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.enrollButton}>
              <Text style={styles.enrollText}>More Detail...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        key={2} // Force re-render when changing numColumns
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  courseCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  courseImage: {
    width: '100%',
    height: 110,
  },
  courseInfo: {
    padding: 10,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    height: 40, // Fixed height for 2 lines to ensure alignment
  },
  teacherName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  likeButton: {
    padding: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  likeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  likeText: {
    fontSize: 12,
    color: '#9ca3af', // Gray heart/text when inactive
  },
  likeTextActive: {
    color: '#ef4444', // Red when active
  },
  enrollButton: {
    backgroundColor: '#3b82f6',
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