import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationHeader } from '../components/NavigationHeader';
import { PageTransition } from '../components/PageTransition';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from './navigation/HomeStack';
import teachersData from '../../docs/teachers.json';
import { useTheme } from '../context/ThemeContext';
import { db } from '../api/firebaseConfig';
import { collection, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';
import { scale } from '../utils/responsive';

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
  const [staff, setStaff] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchTeachers = useCallback(() => {
    setLoading(true);
    setError('');

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const staffCollection = collection(db, "staff");

    const unsubscribe = onSnapshot(staffCollection, async (querySnapshot) => {
      let teachersArray: Teacher[] = [];

      if (querySnapshot.empty) {
        const localTeachers = Object.entries(teachersData.staff).map(
          ([id, teacher], index) => ({
            id,
            ...teacher,
            color: cardColors[index % cardColors.length],
            students: `${Math.floor(Math.random() * 30 + 10)}k`,
            courses: Math.floor(Math.random() * 15 + 5),
            rating: 4.5,
          })
        );

        localTeachers.forEach(async (teacher) => {
          await setDoc(doc(db, "staff", teacher.id), teacher);
        });

        setStaff(localTeachers);
      } else {
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Teacher, 'id'>;
          teachersArray.push({ id: doc.id, ...data });
        });

        teachersArray = teachersArray.map((teacher, index) => ({
          ...teacher,
          color: cardColors[index % cardColors.length],
          students: teacher.students || `${Math.floor(Math.random() * 30 + 10)}k`,
          courses: teacher.courses || Math.floor(Math.random() * 15 + 5),
          rating: teacher.rating || 4.5,
        }));

        setStaff(teachersArray);
      }
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('Error fetching teachers:', err);
      setError('Failed to load teachers.');
      setLoading(false);
      setRefreshing(false);
    });

    unsubscribeRef.current = unsubscribe;
  }, []);

  useEffect(() => {
    fetchTeachers();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchTeachers]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
      {/* Modern Animated Header - With high zIndex to stay on top */}
      <View style={styles.headerWrapper}>
        <NavigationHeader
          title="Staff Members"
          subtitle={`${staff.length} available`}
          showBack={true}
          showSearch={true}
          onBackPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeScreen');
            }
          }}
          onSearchPress={() => {/* TODO: Implement search */ }}
          rightAction={{
            icon: 'heart',
            onPress: () => navigation.navigate('LikedTeachersScreen')
          }}
        />
      </View>

      {/* Content with Page Transition - Lower zIndex */}
      <View style={styles.contentWrapper}>
        <PageTransition type="slide" duration={300}>
          {/* Loading State */}
          {loading && !refreshing && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading instructors...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && !refreshing && (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={fetchTeachers}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Teacher Cards Grid */}
          {(!loading || refreshing) && !error && (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
              }
            >
              <View style={styles.cardsGrid}>
                {staff.map((teacher, index) => renderTeacherCard(teacher, index))}
              </View>
            </ScrollView>
          )}
        </PageTransition>
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
    shadowOffset: { width: 0, height: 4 },
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
