import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../api/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
              <Text style={[styles.teacherName, { color: theme.text }]}>{item.teacherName}</Text>
              <Text style={[styles.teacherRole, { color: theme.textSecondary }]}>Expert Instructor</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>Rs. 5,000</Text>
              <Text style={[styles.price, { color: theme.primary }]}>Free</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.button, styles.outlineButton, { borderColor: theme.primary }]}>
              <Text style={[styles.buttonText, { color: theme.primary }]}>👁️ Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.filledButton, { backgroundColor: theme.primary }]}>
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>🎓 Enroll Now</Text>
            </TouchableOpacity>
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
    marginVertical: 10,
  },
  loadingContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    paddingBottom: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    height: 180,
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
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingStars: {
    color: '#fbbf24',
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(139,92,246,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: 20,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  teacherInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  teacherInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700',
  },
  teacherRole: {
    fontSize: 12,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  filledButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
