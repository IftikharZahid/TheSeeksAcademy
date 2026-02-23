import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Image,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  initStudentsListener,
  initExamsListener,
  initComplaintsListener,
  initTimetableListener,
  initFeeListener,
  fetchAdminFeeRecords,
} from '../../store/slices/adminSlice';


const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 3;

interface StatCardProps {
  value: number;
  label: string;
  icon: string;
  gradientColors: string[];
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon, gradientColors, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          delay,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => interaction.cancel();
  }, []);

  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: value,
      duration: 800,
      delay: delay + 150,
      useNativeDriver: false,
    }).start();

    const listener = countAnim.addListener(({ value: v }) => {
      setDisplayValue(Math.floor(v));
    });

    return () => countAnim.removeListener(listener);
  }, [value]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name={icon as any} size={18} color="rgba(255,255,255,0.95)" />
        </View>
        <Text style={styles.statValue}>{displayValue}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

interface ActionCardProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  delay: number;
  badge?: number;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon, color, onPress, delay, badge }) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          delay,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => interaction.cancel();
  }, []);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.actionCard,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(229, 231, 235, 0.8)',
          }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {badge != null && badge > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <LinearGradient
          colors={[color, `${color}dd`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionIconGradient}
        >
          <Ionicons name={icon as any} size={16} color="#fff" />
        </LinearGradient>
        <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(15)).current;
  const [refreshing, setRefreshing] = useState(false);
  const unsubsRef = useRef<(() => void)[]>([]);

  // Derive counts from Redux instead of separate Firebase listeners
  const studentCount = useAppSelector(state => state.admin.students.length);
  const teacherCount = useAppSelector(state => state.teachers.list.length);
  const courseCount = useAppSelector(state => state.videos.galleries.length);
  const pendingComplaintsCount = useAppSelector(
    state => state.admin.complaints.filter(c => c.status === 'Pending').length
  );

  useEffect(() => {
    // Defer all heavy work until after the navigation transition completes
    const interaction = InteractionManager.runAfterInteractions(() => {
      // Entry animations
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(welcomeAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Initialize admin-specific listeners (not started in App.tsx to avoid
    // loading admin data for regular students)
    const unsubs = [
      initStudentsListener(dispatch),
      initExamsListener(dispatch),
      initComplaintsListener(dispatch),
      initTimetableListener(dispatch),
      initFeeListener(dispatch),
    ];
    unsubsRef.current = unsubs;

    return () => {
      interaction.cancel();
      unsubs.forEach(unsub => unsub());
    };
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Tear down current listeners
    unsubsRef.current.forEach(unsub => unsub());
    // Re-create all listeners
    unsubsRef.current = [
      initStudentsListener(dispatch),
      initExamsListener(dispatch),
      initComplaintsListener(dispatch),
      initTimetableListener(dispatch),
      initFeeListener(dispatch),
    ];
    // Also do a manual fee fetch to ensure immediate data
    await dispatch(fetchAdminFeeRecords()).unwrap().catch(() => { });
    setRefreshing(false);
  }, [dispatch]);

  const adminActions = [
    { id: 1, title: 'Video Gallery', icon: 'videocam', color: '#6366f1', action: () => navigation.navigate('AdminVideoGallery') },
    { id: 2, title: 'Students', icon: 'school', color: '#0ea5e9', action: () => navigation.navigate('AdminStudentRecords') },
    { id: 3, title: 'Faculty', icon: 'people', color: '#ec4899', action: () => navigation.navigate('AdminTeachers') },
    { id: 4, title: 'Exams', icon: 'trophy', color: '#f59e0b', action: () => navigation.navigate('AdminExams') },
    { id: 5, title: 'Timetable', icon: 'calendar', color: '#10b981', action: () => navigation.navigate('AdminTimetable') },
    { id: 6, title: 'Fees', icon: 'wallet', color: '#8b5cf6', action: () => navigation.navigate('AdminFeeScreen') },
    { id: 7, title: 'Complaints', icon: 'chatbubble-ellipses', color: '#ef4444', action: () => navigation.navigate('AdminComplaints'), badge: pendingComplaintsCount },
    { id: 8, title: 'Notifications', icon: 'notifications', color: '#06b6d4', action: () => navigation.navigate('AdminNoticeBoardScreen') },
  ];

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Compact Hero Header with Logo */}
        <Animated.View
          style={[
            styles.heroHeader,
            {
              opacity: headerAnim,
              transform: [{ translateY: welcomeAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={isDark
              ? ['#1e293b', '#0f172a']
              : ['#6366f1', '#8b5cf6']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.heroTextContainer}>
                <Text style={styles.greetingText}>{greeting} 👋</Text>
                <Text style={styles.heroTitle}>Admin Dashboard</Text>
              </View>
              {/* Academy Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/the-seeks-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.heroDecoration} />
          </LinearGradient>
        </Animated.View>

        {/* Statistics Cards - 3 columns */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.statsRow}>
            <StatCard
              value={studentCount}
              label="Students"
              icon="school"
              gradientColors={['#6366f1', '#8b5cf6']}
              delay={0}
            />
            <StatCard
              value={teacherCount}
              label="Teachers"
              icon="people"
              gradientColors={['#ec4899', '#f472b6']}
              delay={80}
            />
            <StatCard
              value={courseCount}
              label="Galleries"
              icon="videocam"
              gradientColors={['#0ea5e9', '#38bdf8']}
              delay={160}
            />
          </View>
        </View>

        {/* Quick Actions - Grid Layout */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {adminActions.map((item, index) => (
              <ActionCard
                key={item.id}
                title={item.title}
                icon={item.icon}
                color={item.color}
                onPress={item.action}
                delay={200 + (index * 40)}
                badge={item.badge}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Compact Hero Header
  heroHeader: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: 38,
    height: 38,
  },
  heroDecoration: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Stats Section
  statsSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 12,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  // Actions Section
  actionsSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  actionCard: {
    width: (width - 48) / 3, // (screen width - 2*paddingHorizontal - 2*gap) / 3 columns
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
});