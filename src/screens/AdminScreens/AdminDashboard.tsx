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
import { MenuRow } from '../../components/CompactUI';


export const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(15)).current;
  const [refreshing, setRefreshing] = useState(false);
  const unsubsRef = useRef<(() => void)[]>([]);



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
    { id: 1, title: 'Exams', icon: 'trophy', color: '#f59e0b', action: () => navigation.navigate('AdminExams') },
    { id: 2, title: 'Assignments', icon: 'document-text', color: '#8b5cf6', action: () => navigation.navigate('AdminAssignmentsScreen') },
    { id: 3, title: 'Timetable', icon: 'calendar', color: '#10b981', action: () => navigation.navigate('AdminTimetable') },
    { id: 4, title: 'Notifications', icon: 'notifications', color: '#06b6d4', action: () => navigation.navigate('AdminNoticeBoardScreen') },
    { id: 5, title: 'Messages', icon: 'chatbubbles', color: '#ec4899', action: () => navigation.navigate('MessagesScreen') },
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

        {/* Dashboard Menu Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MANAGEMENT</Text>
          <Animated.View 
            style={[
              styles.menuCard, 
              { 
                backgroundColor: theme.card, 
                borderColor: theme.border,
                opacity: headerAnim,
              }
            ]}
          >
            {adminActions.map((item, index) => (
              <MenuRow
                key={item.id}
                icon={item.icon}
                label={item.title}
                subtitle={`Manage ${item.title.toLowerCase()}`}
                color={item.color}
                onPress={item.action}
                isLast={index === adminActions.length - 1}
              />
            ))}
          </Animated.View>
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
  // ── Menu Section ───────────────────────────────────────────────────────────
  menuSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
});