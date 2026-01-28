import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourses } from '../context/CoursesContext';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';

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

  const [likedVideos, setLikedVideos] = useState<any[]>([]);

  // Fetch liked videos
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLikedVideos([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'favorites'),
      orderBy('likedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLikedVideos(videos);
    });

    return () => unsubscribe();
  }, []);

  const handleVideoPress = async (video: any) => {
    // We need to fetch the full gallery to pass to VideoLecturesScreen
    // OR we update VideoLecturesScreen to fetch it.
    // For now, let's fetch it here briefly or just pass what we have
    // Actually VideoLecturesScreen expects { galleryId, galleryName, videos }
    // If we don't pass videos, it won't show anything currently.
    // Solution: Fetch the gallery doc here quickly
    try {
      if (!video.galleryId) return;
      const galleryDoc = await getDoc(doc(db, 'videoGalleries', video.galleryId));
      if (galleryDoc.exists()) {
        const galleryData = galleryDoc.data();
        navigation.navigate('VideoLecturesScreen', {
          galleryId: video.galleryId,
          galleryName: galleryData.name,
          galleryColor: '#6366f1', // Default or random
          videos: galleryData.videos,
          initialVideoId: video.id // Pass this to auto-play specific video
        });
      }
    } catch (e) {
      console.error("Error navigating to video", e);
    }
  };

  const renderTopCourse = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[styles.topCourseCard, { backgroundColor: theme.card }]}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.thumbnail || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
        style={styles.topCourseImage}
        defaultSource={require('../assets/default-profile.png')}
      />
      <View style={styles.topCourseInfo}>
        <Text style={[styles.topCourseCategory, { color: theme.textSecondary }]}>
          {item.galleryName || 'Video'}
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

          {/* Liked Videos Section */}
          <View style={styles.topCoursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Liked Videos</Text>
              {likedVideos.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('LikedVideosScreen')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {likedVideos.length > 0 ? (
              <FlatList
                data={likedVideos}
                renderItem={renderTopCourse}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topCoursesList}
                ItemSeparatorComponent={() => <View style={{ width: scale(12) }} />}
              />
            ) : (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.card }]}>
                <View style={[styles.emptyStateIconContainer, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                  <Ionicons name="heart-outline" size={24} color={theme.textSecondary} />
                </View>
                <View style={styles.emptyStateContent}>
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                    Your Favorites
                  </Text>
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Save your favorite lectures here for quick access.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                  onPress={() => navigation.navigate('VideoGallery')}
                >
                  <Text style={styles.emptyStateButtonText}>Browse Videos</Text>
                </TouchableOpacity>
              </View>
            )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
    paddingRight: scale(16),
  },
  seeAllText: {
    fontSize: scale(13),
    fontWeight: '600',
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
  emptyStateCard: {
    padding: scale(16),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: scale(4),
  },
  emptyStateIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  emptyStateContent: {
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  emptyStateText: {
    fontSize: scale(11),
    lineHeight: scale(16),
  },
  emptyStateButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    marginLeft: scale(8),
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: scale(11),
    fontWeight: '600',
  },
});