import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNetInfo } from '@react-native-community/netinfo';
import { initCoursesListener } from '../../store/slices/coursesSlice';
import { initTeachersListener } from '../../store/slices/teachersSlice';
import { initNotificationsListener } from '../../store/slices/notificationsSlice';
import { initVideoGalleriesListener, initLikedVideosListener } from '../../store/slices/videosSlice';
import { initExamsListener } from '../../store/slices/adminSlice';

// Components
import { CourseCategories } from '../../components/QuickActions';
import { TopperSlider } from '../../components/TopperSlider';
import { CourseList } from '../../components/CourseList';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.42;

// Preloading Skeleton Screen component for video card
const SkeletonVideoCard: React.FC<{ theme: any; isDark: boolean }> = ({ theme, isDark }) => {
  const skeletonColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  return (
    <View style={[styles.topCourseCard, { backgroundColor: theme.card, elevation: 0, shadowOpacity: 0 }]}>
      {/* Thumbnail placeholder */}
      <View style={[styles.topCourseImage, { backgroundColor: skeletonColor }]} />
      <View style={styles.topCourseInfo}>
        {/* Category placeholder */}
        <View style={{ width: '55%', height: scale(9), backgroundColor: skeletonColor, borderRadius: scale(2), marginBottom: scale(8) }} />
        {/* Title line 1 placeholder */}
        <View style={{ width: '95%', height: scale(11), backgroundColor: skeletonColor, borderRadius: scale(3), marginBottom: scale(6) }} />
        {/* Title line 2 placeholder */}
        <View style={{ width: '75%', height: scale(11), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
      </View>
    </View>
  );
};

// Top Performers data
interface TopPerformer {
  id: string;
  name: string;
  score: string;
  rank: number;
  image: string;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();
  const netInfo = useNetInfo();
  const user = useAppSelector((state) => state.auth.user);

  // Restore TopHeader and tab bar when HomeScreen gains focus
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        tabBarStyle: undefined,
      });
    }, [navigation])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Re-trigger all global listeners to force refresh
      const unsubCourses = initCoursesListener(dispatch);
      const unsubTeachers = initTeachersListener(dispatch);
      const unsubNotifications = initNotificationsListener(dispatch);
      const unsubGalleries = initVideoGalleriesListener(dispatch);
      const unsubExams = initExamsListener(dispatch);

      let unsubLikedVideos: (() => void) | undefined;
      if (user && user.uid) {
        unsubLikedVideos = initLikedVideosListener(dispatch, user.uid);
      }

      // Wait 1 second to allow firestore listener to fetch latest data
      await new Promise((r) => setTimeout(r, 1000));

      unsubCourses();
      unsubTeachers();
      unsubNotifications();
      unsubGalleries();
      unsubExams();
      if (unsubLikedVideos) unsubLikedVideos();
    } catch (e) {
      console.warn('Error during home screen refresh:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user]);

  const likedVideos = useAppSelector((state) => state.videos.likedVideos);
  const favoritesLoading = useAppSelector((state) => state.videos.favoritesLoading);
  const galleries = useAppSelector((state) => state.videos.galleries);
  const isOffline = netInfo.isConnected === false;

  const handleVideoPress = (video: any) => {
    try {
      if (!video.galleryId) return;
      const galleryData = galleries.find(g => g.id === video.galleryId);
      if (galleryData) {
        navigation.navigate('VideoLecturesScreen', {
          galleryId: video.galleryId,
          galleryName: galleryData.name,
          galleryColor: galleryData.color || '#6366f1',
          videos: galleryData.videos || [],
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
        placeholder="L6PZUOOht7yX%5NtWAof%MaxRjWB"
        contentFit="cover"
        transition={200}
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
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.content}>
          <TopperSlider />

          {/* Course Categories */}
          <CourseCategories />

          {/* Liked Videos Section */}
          <View style={styles.topCoursesSection}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Liked Videos</Text>
                {isOffline && likedVideos.length > 0 && (
                  <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                    <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" style={{ marginRight: scale(3) }} />
                    <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
                  </View>
                )}
              </View>
              {likedVideos.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('LikedVideosScreen')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {favoritesLoading && likedVideos.length === 0 ? (
              <FlatList
                data={[1, 2, 3]}
                renderItem={() => <SkeletonVideoCard theme={theme} isDark={isDark} />}
                keyExtractor={(item) => item.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topCoursesList}
                ItemSeparatorComponent={() => <View style={{ width: scale(12) }} />}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={true}
              />
            ) : isOffline && likedVideos.length === 0 ? (
              <View style={[styles.errorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.errorIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                  <Ionicons name="cloud-offline-outline" size={20} color="#ef4444" />
                </View>
                <View style={styles.errorContent}>
                  <Text style={[styles.errorTitle, { color: theme.text }]}>Connection Lost</Text>
                  <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                    Connect to the internet to load your liked videos.
                  </Text>
                </View>
              </View>
            ) : likedVideos.length > 0 ? (
              <FlatList
                data={likedVideos}
                renderItem={renderTopCourse}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topCoursesList}
                ItemSeparatorComponent={() => <View style={{ width: scale(12) }} />}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
                removeClippedSubviews={true}
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


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: scale(14),
    paddingTop: 0,
  },
  topCoursesSection: {
    marginTop: scale(8),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    marginBottom: scale(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(2),
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
    padding: scale(12),
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
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
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
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  offlineBadgeText: {
    fontSize: scale(9),
    fontWeight: '700',
  },
  errorCard: {
    padding: scale(12),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  errorIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  errorText: {
    fontSize: scale(11),
    lineHeight: scale(15),
  },
});