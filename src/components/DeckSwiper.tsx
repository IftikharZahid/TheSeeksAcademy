import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../api/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // iPhone 11/Pro width
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

interface StaffData {
  id: string;
  name: string;
  subject: string;
  qualification: string;
  experience: string;
  image: string;
  bookimage?: string;
  booktitle?: string;
}

interface FeaturedCourse {
  id: string;
  bookTitle: string;
  bookImage: string;
  teacherName: string;
  teacherImage: string;
  subject: string;
  qualification: string;
  experience: string;
}

interface DeckSwiperProps {
  data?: any[]; // Keep for backward compatibility
}

export const DeckSwiper: React.FC<DeckSwiperProps> = () => {
  const { theme, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch book data from Firebase
  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      setLoading(true);
      const staffCollection = collection(db, "staff");
      const querySnapshot = await getDocs(staffCollection);

      const courses: FeaturedCourse[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as StaffData;
        // Only include if bookimage exists
        if (data.bookimage || data.booktitle) {
          courses.push({
            id: doc.id,
            bookTitle: data.booktitle || data.subject,
            bookImage: data.bookimage || data.image,
            teacherName: data.name,
            teacherImage: data.image,
            subject: data.subject,
            qualification: data.qualification || 'Not Specified',
            experience: data.experience || 'N/A',
          });
        }
      });

      // If no books found, fallback to using subject as title and teacher image
      if (courses.length === 0) {
        querySnapshot.forEach((doc) => {
          const data = doc.data() as StaffData;
          courses.push({
            id: doc.id,
            bookTitle: data.subject,
            bookImage: data.image,
            teacherName: data.name,
            teacherImage: data.image,
            subject: data.subject,
            qualification: data.qualification || 'Not Specified',
            experience: data.experience || 'N/A',
          });
        });
      }

      setFeaturedCourses(courses);
    } catch (error) {
      console.error('Error fetching featured courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActiveIndex(roundIndex);
  };

  const renderItem = ({ item, index }: { item: FeaturedCourse; index: number }) => (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {/* Image Section with Gradient Overlay */}
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.bookImage }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />

          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.badgeText}>🔥 HOT</Text>
          </View>

          {/* Rating Stars */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStars}>★★★★★</Text>
            <Text style={styles.ratingText}>4.9</Text>
          </View>

          {/* Course Title on Image */}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={2}>{item.bookTitle}</Text>
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>📚 Premium</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: 'rgba(16,185,129,0.9)' }]}>
                <Text style={styles.tagText}>✓ Certificate Free</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.cardBody}>
          {/* Teacher Info with Avatar */}
          <View style={styles.teacherRow}>
            <Image
              source={{ uri: item.teacherImage }}
              style={styles.teacherAvatar}
            />
            <View style={styles.teacherInfo}>
              <Text style={[styles.teacherName, { color: theme.text }]} numberOfLines={1}>{item.teacherName}</Text>
              <Text style={[styles.teacherRole, { color: theme.textSecondary }]} numberOfLines={1}>🎓 {item.qualification}</Text>
            </View>
            <View style={styles.experienceContainer}>
              <Text style={[styles.experienceLabel, { color: theme.textSecondary }]}>Experience</Text>
              <Text style={[styles.experienceValue, { color: theme.primary }]} numberOfLines={1}>{item.experience}</Text>
            </View>
          </View>


        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading courses...</Text>
      </View>
    );
  }

  if (featuredCourses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No courses available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={featuredCourses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {featuredCourses.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === activeIndex ? theme.primary : '#d1d5db' },
              index === activeIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: scale(10),
  },
  loadingContainer: {
    height: scale(280),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    paddingBottom: scale(20),
  },
  cardContainer: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: CARD_WIDTH,
    borderRadius: scale(24),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.15,
    shadowRadius: scale(16),
    elevation: 8,
  },
  cardHeader: {
    height: scale(180),
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    top: scale(12),
    left: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  badgeText: {
    color: '#ffffff',
    fontSize: scale(11),
    fontWeight: '700',
  },
  ratingContainer: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  ratingStars: {
    color: '#fbbf24',
    fontSize: scale(12),
    marginRight: 4,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: scale(12),
    fontWeight: '700',
  },
  headerContent: {
    position: 'absolute',
    bottom: scale(16),
    left: scale(16),
    right: scale(16),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: scale(8),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  tag: {
    backgroundColor: 'rgba(139,92,246,0.9)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  tagText: {
    color: '#ffffff',
    fontSize: scale(11),
    fontWeight: '600',
  },
  cardBody: {
    padding: scale(20),
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  teacherAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
  },
  teacherInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  teacherName: {
    fontSize: scale(14),
    fontWeight: '700',
  },
  teacherRole: {
    fontSize: scale(11),
    marginTop: scale(3),
    fontWeight: '500',
  },
  experienceContainer: {
    alignItems: 'flex-end',
  },
  experienceLabel: {
    fontSize: scale(10),
    fontWeight: '500',
  },
  experienceValue: {
    fontSize: scale(14),
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
    marginTop: 0,
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  activeDot: {
    width: scale(24),
  },
  emptyContainer: {
    height: scale(200),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: scale(16),
  },
});
