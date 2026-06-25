import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNetInfo } from '@react-native-community/netinfo';
import { initCoursesListener } from '../../store/slices/coursesSlice';
import { initTeachersListener } from '../../store/slices/teachersSlice';
import { initAppSettingsListener } from '../../store/slices/appSettingsSlice';
import { initNotificationsListener, initDiariesListener } from '../../store/slices/notificationsSlice';
import { initVideoGalleriesListener, initLikedVideosListener } from '../../store/slices/videosSlice';
import { initExamsListener } from '../../store/slices/adminSlice';
import { initAssignmentsListener } from '../../store/slices/assignmentsSlice';
import { initTimetableListener } from '../../store/slices/timetableSlice';
import { initAttendanceListener } from '../../store/slices/attendanceSlice';

// Components
import { CourseCategories } from '../../components/QuickActions';
import { CourseList } from '../../components/CourseList';
import { TopperSlider } from '../../components/TopperSlider';
import { StudentProfileCard } from '../../components/StudentProfileCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  }, []);

  const dispatch = useAppDispatch();
  const netInfo = useNetInfo();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  // Restore TopHeader and tab bar when HomeScreen gains focus
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        tabBarStyle: undefined,
      });
    }, [navigation])
  );

  const displayName = profile?.fullname || user?.displayName || 'Student';
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning 👋';
    if (hour >= 12 && hour < 14) return 'Good Noon 🌤️';
    if (hour >= 14 && hour < 18) return 'Good Afternoon 🌇';
    if (hour >= 18 && hour < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const unsubCourses = initCoursesListener(dispatch);
      const unsubTeachers = initTeachersListener(dispatch);
      const unsubNotifications = initNotificationsListener(dispatch);
      const unsubAppSettings = initAppSettingsListener(dispatch);
      const unsubDiaries = initDiariesListener(dispatch, profile?.class);
      const unsubGalleries = initVideoGalleriesListener(dispatch);
      const unsubExams = initExamsListener(dispatch);
      const unsubAssignments = initAssignmentsListener(dispatch);
      const unsubTimetable = initTimetableListener(dispatch);
      const unsubAttendance = user?.uid ? initAttendanceListener(dispatch, user.uid) : undefined;

      let unsubLikedVideos: (() => void) | undefined;
      if (user && user.uid) {
        unsubLikedVideos = initLikedVideosListener(dispatch, user.uid);
      }

      await new Promise((r) => setTimeout(r, 1000));

      unsubCourses();
      unsubTeachers();
      unsubNotifications();
      unsubAppSettings();
      unsubDiaries();
      unsubGalleries();
      unsubExams();
      unsubAssignments();
      unsubTimetable();
      if (unsubAttendance) unsubAttendance();
      if (unsubLikedVideos) unsubLikedVideos();
    } catch (e) {
      console.warn('Error during home screen refresh:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user]);

  const likedVideos = useAppSelector((state) => state.videos.likedVideos);
  const galleries = useAppSelector((state) => state.videos.galleries);
  const timetableEntries = useAppSelector((state) => state.timetable.entries);

  const scheduleData = useMemo(() => {
    if (!timetableEntries || timetableEntries.length === 0) return { classes: [], activeIndex: -1, label: 'Today' };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentDayName = days[currentDayIndex];
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr?: string) => {
      if (!timeStr) return 0;
      let match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3].toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
      return 0;
    };

    const formatTo12Hour = (timeStr?: string) => {
      if (!timeStr) return '';
      let match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) return timeStr; // Already 12-hour format
      match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const modifier = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${modifier}`;
      }
      return timeStr;
    };

    const compareDay = (day1?: string, day2?: string) => {
      return day1?.trim().toLowerCase() === day2?.trim().toLowerCase();
    };

    const getMinutes = (c: any) => {
      const startStr = c.startTime || (c.time ? c.time.split('-')[0] : '');
      const endStr = c.endTime || (c.time ? c.time.split('-')[1] : '');
      const start = parseTime(startStr);
      const end = parseTime(endStr) || (start + 60);
      return { start, end };
    };

    const studentClass = profile?.class || '';
    const userGender = profile?.gender ? profile.gender.toLowerCase().trim() : '';
    const isMale = userGender === 'male' || userGender === 'boy' || userGender === 'boys';
    const isFemale = userGender === 'female' || userGender === 'girl' || userGender === 'girls';

    const isMatch = (c: any) => {
      const matchClass = !studentClass || !c.class || c.class.toLowerCase().trim() === studentClass.toLowerCase().trim();
      let matchGender = true;
      if (c.gender && c.gender.toLowerCase().trim() !== 'all') {
        const entryGender = c.gender.toLowerCase().trim();
        const entryIsMale = ['boys', 'boy', 'male', 'm'].includes(entryGender);
        const entryIsFemale = ['girls', 'girl', 'female', 'f'].includes(entryGender);
        if (entryIsMale) {
          matchGender = isMale;
        } else if (entryIsFemale) {
          matchGender = isFemale;
        }
      }
      return matchClass && matchGender;
    };

    let todayClasses = timetableEntries.filter((c: any) => compareDay(c.day, currentDayName) && isMatch(c));
    todayClasses.sort((a, b) => getMinutes(a).start - getMinutes(b).start);
    
    if (todayClasses.length > 0) {
      let activeIndex = todayClasses.findIndex(c => getMinutes(c).end > currentTimeMinutes);
      return { 
        classes: todayClasses.map(c => {
          const startStr = c.startTime || (c.time ? c.time.split('-')[0] : '');
          const endStr = c.endTime || (c.time ? c.time.split('-')[1] : '');
          return { ...c, startTime: formatTo12Hour(startStr), endTime: formatTo12Hour(endStr) };
        }), 
        activeIndex: activeIndex, 
        label: 'Today' 
      };
    }

    for (let i = 1; i <= 7; i++) {
      const nextDayName = days[(currentDayIndex + i) % 7];
      let nextDayClasses = timetableEntries.filter((c: any) => compareDay(c.day, nextDayName) && isMatch(c));
      if (nextDayClasses.length > 0) {
        nextDayClasses.sort((a, b) => getMinutes(a).start - getMinutes(b).start);
        return { 
          classes: nextDayClasses.map(c => {
            const startStr = c.startTime || (c.time ? c.time.split('-')[0] : '');
            const endStr = c.endTime || (c.time ? c.time.split('-')[1] : '');
            return { ...c, startTime: formatTo12Hour(startStr), endTime: formatTo12Hour(endStr) };
          }), 
          activeIndex: 0, 
          label: i === 1 ? 'Tomorrow' : nextDayName 
        };
      }
    }

    return { classes: [], activeIndex: -1, label: 'Today' };
  }, [timetableEntries, profile]);

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
          initialVideoId: video.id
        });
      }
    } catch (e) {
      console.error("Error navigating to video", e);
    }
  };

  // Mock data for new UI parts if real data missing
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <StatusBar backgroundColor="transparent" translucent={true} barStyle="light-content" />

      {/* Fixed Curved Background */}
      <LinearGradient 
        colors={['#1e3a8a', '#1e40af']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={[styles.headerBackground, { backgroundColor: isDark ? theme.card : '#1e3a8a' }]}
      >
        <Image 
          source={require('../../assets/the-seeks-logo.jpg')} 
          style={{ position: 'absolute', right: -scale(135), top: scale(40), width: scale(430), height: scale(90), opacity: 0.15, resizeMode: 'contain' }}        />
      </LinearGradient>

      <View style={{ flex: 1, marginTop: insets.top + scale(50) }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: scale(80), paddingTop: scale(10) }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          <View style={styles.content}>
          {/* Profile Card Section */}
          <StudentProfileCard
            name={displayName}
            role={profile?.role === 'admin' ? 'Admin' : profile?.role === 'teacher' ? 'Teacher' : 'Student'}
            studentId={profile?.rollno || (user as any)?.uid || 'N/A'}
            className={profile?.class || 'Not Assigned'}
            gender={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase() : 'N/A'}
            rollNo={profile?.rollno || 'N/A'}
            email={user?.email || profile?.email || 'N/A'}
            avatarUrl={profile?.image || user?.photoURL || undefined}
          />


          {/* Topper Slider */}
          <TopperSlider />

          {/* Quick Access */}
          <CourseCategories />

          {/* Continue Learning Section */}
          <View style={styles.topCoursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Continue Learning</Text>
              <TouchableOpacity onPress={() => navigation.navigate('LikedVideosScreen')}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {likedVideos && likedVideos.length > 0 ? (
              <>
                <FlatList
                  data={likedVideos}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  keyExtractor={(item, index) => item.id || index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.continueCard, { backgroundColor: theme.card, width: width - scale(28) }]}
                      onPress={() => handleVideoPress(item)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.continueImageContainer}>
                        <Image
                          source={{ uri: item.thumbnail || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
                          style={styles.continueImage}
                          contentFit="cover"
                        />
                        <View style={styles.playOverlay}>
                          <Ionicons name="play" size={24} color="#fff" />
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>{item.duration || '00:00'}</Text>
                        </View>
                      </View>
                      <View style={styles.continueInfo}>
                        <View style={styles.continueHeaderRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="videocam-outline" size={12} color={theme.textSecondary} />
                              <Text style={[styles.statText, { color: theme.textSecondary }]}>Video Lecture</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: theme.textTertiary || '#94a3b8' }}>•</Text>
                            <Text style={[styles.continueCategory, { color: theme.primary }]} numberOfLines={1}>{item.galleryName || 'Subject'}</Text>
                          </View>
                          <TouchableOpacity>
                            <Ionicons name="ellipsis-vertical" size={16} color={theme.textTertiary || '#94a3b8'} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.continueTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Video Title'}</Text>
                        {item.chapterNo && (
                          <Text style={[styles.continueSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                            Chapter# {Number(item.chapterNo) < 10 ? `0${item.chapterNo}` : item.chapterNo}{item.chapterName ? `: ${item.chapterName}` : ''}
                          </Text>
                        )}
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(4), gap: scale(4) }}>
                          <Ionicons name="person-circle-outline" size={12} color={theme.textTertiary || '#94a3b8'} />
                          <Text style={{ fontSize: scale(10), color: theme.textTertiary || '#94a3b8', fontWeight: '500' }} numberOfLines={1}>
                            {galleries.find(g => g.id === item.galleryId)?.teacherName || item.teacherName || 'Subject Teacher'}
                          </Text>
                        </View>
                        
                        <View style={[styles.continueFooter, { justifyContent: 'flex-end' }]}>
                          <TouchableOpacity style={styles.resumeButton} onPress={() => handleVideoPress(item)}>
                            <Ionicons name="play" size={12} color={theme.primary} />
                            <Text style={[styles.resumeButtonText, { color: theme.primary }]}>Resume</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                
                {likedVideos.length > 1 && (
                  <View style={styles.dotsContainer}>
                    {likedVideos.map((_, i) => (
                      <View key={i} style={[styles.dot, activeSlide === i ? [styles.activeDot, { backgroundColor: theme.primary }] : { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />
                    ))}
                  </View>
                )}
              </>
            ) : (
                <View style={[styles.emptyStateCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.emptyStateIconContainer, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                    <Ionicons name="heart-outline" size={24} color={theme.textSecondary} />
                  </View>
                  <View style={styles.emptyStateContent}>
                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                      Continue Learning
                    </Text>
                    <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                      Start watching a video to resume here.
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

          {/* My Classes */}
          <CourseList />

          {/* Upcoming Section */}
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Lecture Schedule</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TimetableScreen')}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>View Calendar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scheduleList}>
              {scheduleData.classes.length === 0 ? (
                <View style={[styles.emptyStateCard, { backgroundColor: theme.card, marginTop: scale(4) }]}>
                  <View style={[styles.emptyStateIconContainer, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                    <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} />
                  </View>
                  <View style={styles.emptyStateContent}>
                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Upcoming Lectures</Text>
                    <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>You don't have any classes scheduled.</Text>
                  </View>
                </View>
              ) : (
                scheduleData.classes.map((session: any, idx: number) => {
                  const isActive = idx === scheduleData.activeIndex;
                  
                  return (
                    <View 
                      key={idx} 
                      style={[
                        styles.scheduleCard, 
                        { backgroundColor: theme.card, borderColor: theme.border },
                        isActive && [
                          styles.activeScheduleCard, 
                          { 
                            backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff',
                            borderColor: theme.primary 
                          }
                        ]
                      ]}
                    >
                      <View style={[styles.scheduleLectureBox, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        <Text style={[styles.scheduleLectureLabel, isActive && { color: '#fff' }]}>Lec</Text>
                        <Text style={[styles.scheduleLectureNumber, isActive && { color: '#fff' }]}>{idx + 1}</Text>
                      </View>
                      <View style={styles.scheduleInfo}>
                        <View style={styles.scheduleRow}>
                          <Text style={[styles.scheduleSubject, { color: theme.text }, isActive && { color: theme.primary }]} numberOfLines={1}>
                            {session.subject || session.subjectName || 'N/A'}
                          </Text>
                          <View style={[styles.scheduleTimeWrap, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}>
                            <Ionicons name="time" size={14} color={theme.primary || '#3b82f6'} style={{marginRight: scale(4)}} />
                            <Text style={[styles.scheduleTimeRight, { color: theme.primary || '#3b82f6' }]}>
                              {session.startTime} - {session.endTime}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scheduleRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: scale(6) }}>
                            <Text style={[styles.scheduleInstructor, { color: theme.textSecondary }]} numberOfLines={1}>
                              {session.instructor || 'Teacher TBD'}
                            </Text>
                          </View>
                          {isActive && (
                            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
                              <Text style={[styles.todayBadgeText, { color: '#fff' }]}>Ongoing / Next</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(230),
    borderBottomLeftRadius: scale(40),
    borderBottomRightRadius: scale(40),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWatermark: {
    width: scale(300),
    height: scale(300),
    opacity: 0.04, // Very subtle
    transform: [{ translateY: scale(-10) }],
  },
  content: {
    paddingHorizontal: scale(14),
    paddingTop: scale(4),
  },
  greetingContainer: {
    marginBottom: scale(14),
  },
  greetingText: {
    fontSize: scale(11),
    fontWeight: '500',
    marginBottom: scale(2),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(2),
  },
  userName: {
    fontSize: scale(20),
    fontWeight: '800',
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  topperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  topperBadgeText: {
    color: '#f59e0b',
    fontSize: scale(10),
    fontWeight: '700',
  },
  motivationalText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  topCoursesSection: {
    marginTop: scale(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
    paddingHorizontal: scale(4),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  continueCard: {
    flexDirection: 'row',
    borderRadius: scale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    padding: scale(10),
  },
  continueImageContainer: {
    width: scale(120),
    height: scale(90),
    borderRadius: scale(10),
    overflow: 'hidden',
    position: 'relative',
  },
  continueImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -scale(16) }, { translateY: -scale(16) }],
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: scale(6),
    right: scale(6),
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: scale(4),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  durationText: {
    color: '#fff',
    fontSize: scale(9),
    fontWeight: '600',
  },
  continueInfo: {
    flex: 1,
    paddingLeft: scale(12),
    justifyContent: 'space-between',
  },
  continueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueCategory: {
    fontSize: scale(10),
    fontWeight: '700',
  },
  continueTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    marginTop: scale(2),
    letterSpacing: -0.2,
  },
  continueSubtitle: {
    fontSize: scale(10),
    marginTop: scale(2),
  },
  continueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(8),
  },
  continueStats: {
    flexDirection: 'row',
    gap: scale(10),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: scale(9),
    fontWeight: '500',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(4),
  },
  resumeButtonText: {
    fontSize: scale(10),
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(12),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  activeDot: {
    width: scale(18),
  },
  upcomingSection: {
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  scheduleList: {
    paddingHorizontal: scale(4),
    gap: scale(12),
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(10),
    borderRadius: scale(10),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  activeScheduleCard: {
    borderTopRightRadius: scale(30),
    borderBottomLeftRadius: scale(30),
    borderTopLeftRadius: scale(10),
    borderBottomRightRadius: scale(10),
    borderWidth: 1.5,
  },
  scheduleLectureBox: {
    backgroundColor: '#eff6ff',
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  scheduleLectureLabel: {
    color: '#3b82f6',
    fontSize: scale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scheduleLectureNumber: {
    color: '#3b82f6',
    fontSize: scale(18),
    fontWeight: '900',
  },
  scheduleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  scheduleSubject: {
    fontSize: scale(14),
    fontWeight: '800',
    flex: 1,
    marginRight: scale(8),
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  scheduleTimeRight: {
    fontSize: scale(10),
    fontWeight: '700',
  },
  scheduleInstructor: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  todayBadgeText: {
    fontSize: scale(9),
    fontWeight: '700',
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
});
