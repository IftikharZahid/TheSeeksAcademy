import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList, Modal, Animated } from 'react-native';
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
  const [showWelcome, setShowWelcome] = useState(true);

  const popupScale = useRef(new Animated.Value(0.5)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showWelcome) {
      Animated.parallel([
        Animated.spring(popupScale, {
          toValue: 1,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(popupOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(popupScale, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => setShowWelcome(false));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, popupScale, popupOpacity]);

  const handleScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  }, []);

  const dispatch = useAppDispatch();
  const netInfo = useNetInfo();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

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

    const groupClasses = (classes: any[]) => {
      const grouped: any[] = [];
      classes.forEach(c => {
        const cTimes = getMinutes(c);
        const existing = grouped.find(g => getMinutes(g).start === cTimes.start && getMinutes(g).end === cTimes.end);
        if (existing) {
          let s1 = existing.subject || existing.subjectName || '';
          let s2 = c.subject || c.subjectName || '';
          if (!s1) s1 = 'TBD';
          if (!s2) s2 = 'TBD';
          
          if (s1 !== s2 && !s1.includes(s2)) {
            existing.subject = `${s1} & ${s2}`;
            existing.subjectName = existing.subject;
          }

          if (!existing.combinedDetails) {
            existing.combinedDetails = [{ instructor: existing.instructor || 'Teacher TBD', room: existing.room || existing.roomNo || 'TBA' }];
          }
          
          const newInstructor = c.instructor || 'Teacher TBD';
          const newRoom = c.room || c.roomNo || 'TBA';
          
          const hasDetail = existing.combinedDetails.find((d: any) => d.instructor === newInstructor && d.room === newRoom);
          if (!hasDetail) {
            existing.combinedDetails.push({ instructor: newInstructor, room: newRoom });
          }
        } else {
          grouped.push({ ...c });
        }
      });
      return grouped;
    };

    let todayClasses = timetableEntries.filter((c: any) => compareDay(c.day, currentDayName) && isMatch(c));
    todayClasses.sort((a, b) => getMinutes(a).start - getMinutes(b).start);
    todayClasses = groupClasses(todayClasses);
    
    if (todayClasses.length > 0) {
      let activeIndex = todayClasses.findIndex(c => {
        const times = getMinutes(c);
        return currentTimeMinutes >= times.start && currentTimeMinutes <= times.end;
      });
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
        nextDayClasses = groupClasses(nextDayClasses);
        return { 
          classes: nextDayClasses.map(c => {
            const startStr = c.startTime || (c.time ? c.time.split('-')[0] : '');
            const endStr = c.endTime || (c.time ? c.time.split('-')[1] : '');
            return { ...c, startTime: formatTo12Hour(startStr), endTime: formatTo12Hour(endStr) };
          }), 
          activeIndex: -1, 
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
        // Navigate to VideoGallery tab → VideoLecturesScreen within VideoStack
        navigation.navigate('VideoGallery', {
          screen: 'VideoLecturesScreen',
          params: {
            galleryId: video.galleryId,
            galleryName: galleryData.name,
            galleryColor: galleryData.color || '#6366f1',
            videos: galleryData.videos || [],
            initialVideoId: video.id
          }
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const academicYearText = `Academic Year ${startYear}-${(startYear + 1).toString().slice(-2)}`;

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
          source={require('../../assets/the-seeks-logo.png')} 
          style={{ position: 'absolute', right: -scale(135), top: scale(40), width: scale(430), height: scale(90), opacity: 0.15 }}
          contentFit="contain"
        />
      </LinearGradient>
      {/* The header section is a gradient background with the logo. It is fixed at the top and does not scroll.*/}
      <View style={{ flex: 1, marginTop: insets.top + scale(60) }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: scale(10) }}
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
            studentId={profile?.studentId || 'N/A'}
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
              <TouchableOpacity onPress={() => navigation.navigate('VideoGallery', { screen: 'LikedVideosScreen' })}>
                <Text style={[styles.seeAllText, { color: isDark ? '#60a5fa' : theme.primary }]}>See All</Text>
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
                  initialNumToRender={2}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.continueCard, { backgroundColor: theme.card, width: width - scale(28) }]}
                      onPress={() => handleVideoPress(item)}
                      activeOpacity={0.88}
                    >
                      {/* Compact Thumbnail */}
                      <View style={styles.continueImageContainer}>
                        <Image
                          source={{ uri: item.thumbnail || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
                          style={styles.continueImage}
                          contentFit="cover"
                        />
                        <View style={styles.playOverlay}>
                          <Ionicons name="play" size={16} color="#fff" />
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>{item.duration || '00:00'}</Text>
                        </View>
                      </View>

                      {/* Compact Info */}
                      <View style={styles.continueInfo}>
                        {/* Category chip */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(2) }}>
                          <View style={[styles.chipTag, { backgroundColor: (theme.primary || '#3b82f6') + '15' }]}>
                            <Text style={[styles.chipTagText, { color: isDark ? '#60a5fa' : theme.primary }]} numberOfLines={1}>
                              {item.galleryName || 'Subject'}
                            </Text>
                          </View>
                        </View>

                        {/* Title */}
                        <Text style={[styles.continueTitle, { color: theme.text }]} numberOfLines={2}>
                          {item.title || 'Video Title'}
                        </Text>

                        {/* Teacher Name */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) }}>
                          <Ionicons name="person-circle-outline" size={scale(11)} color={theme.textSecondary} />
                          <Text style={[styles.teacherText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {galleries.find(g => g.id === item.galleryId)?.teacherName || item.teacherName || 'Teacher'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, marginTop: scale(2) }}>
                          {/* Chapter info */}
                          <View style={{ flex: 1, paddingRight: scale(6), justifyContent: 'flex-end', paddingBottom: scale(2) }}>
                            {item.chapterNo && (
                              <Text style={[styles.continueSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                                Chapter {Number(item.chapterNo) < 10 ? `0${item.chapterNo}` : item.chapterNo}{item.chapterName ? `: ${item.chapterName}` : ''}
                              </Text>
                            )}
                          </View>

                          {/* Resume button */}
                          <TouchableOpacity
                            style={[styles.resumeButton, { backgroundColor: (theme.primary || '#3b82f6') + '15' }]}
                            onPress={() => handleVideoPress(item)}
                          >
                            <Ionicons name="play" size={scale(9)} color={isDark ? '#60a5fa' : theme.primary} />
                            <Text style={[styles.resumeButtonText, { color: isDark ? '#60a5fa' : theme.primary }]}>Resume</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TimetableScreen')}>
                <Text style={[styles.seeAllText, { color: isDark ? '#60a5fa' : theme.primary }]}>View Calendar</Text>
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
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      <View style={{ width: scale(16), alignItems: 'center', marginRight: scale(6) }}>
                        <View style={[{ width: scale(8), height: scale(8), borderRadius: scale(4), marginTop: scale(18), zIndex: 2 }, isActive ? { backgroundColor: '#f97316', transform: [{ scale: 1.3 }], shadowColor: '#f97316', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.6, shadowRadius: 4, elevation: 3 } : { backgroundColor: isDark ? '#9a3412' : '#fdba74' }]} />
                        {idx < scheduleData.classes.length - 1 && (
                          <View style={{ position: 'absolute', top: scale(26), bottom: -scale(6), width: 2, backgroundColor: isActive ? theme.primary : (isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.3)'), opacity: isActive ? 0.8 : 1 }} />
                        )}
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <View 
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
                          <Text style={[styles.scheduleSubject, { color: theme.text }, isActive && { color: isDark ? '#60a5fa' : theme.primary }]} numberOfLines={2}>
                            {session.subject || session.subjectName || 'N/A'}
                          </Text>
                          <View style={[styles.scheduleTimeWrap, { backgroundColor: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.1)' }]}>
                            <Ionicons name="time" size={scale(10)} color={isDark ? '#60a5fa' : theme.primary || '#3b82f6'} style={{marginRight: scale(3)}} />
                            <Text style={[styles.scheduleTimeRight, { color: isDark ? '#60a5fa' : theme.primary || '#3b82f6' }]}>
                              {session.startTime} - {session.endTime}
                            </Text>
                          </View>
                        </View>
                        {session.combinedDetails ? (
                          session.combinedDetails.map((detail: any, idx: number) => (
                            <View key={idx} style={[styles.scheduleRow, { alignItems: 'flex-start', marginBottom: idx === session.combinedDetails.length - 1 ? 0 : scale(2) }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: scale(8) }}>
                                <Text style={[styles.scheduleInstructor, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                                  {detail.instructor}
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[{ color: theme.textSecondary, fontSize: scale(10), fontWeight: '500' }]}>
                                  Room: {detail.room}
                                </Text>
                                {isActive && idx === session.combinedDetails.length - 1 && (
                                  <View style={[styles.todayBadge, { backgroundColor: theme.primary, marginTop: scale(4) }]}>
                                    <Text style={[styles.todayBadgeText, { color: '#fff' }]}>Ongoing / Next</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))
                        ) : (
                          <View style={[styles.scheduleRow, { alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: scale(8) }}>
                              <Text style={[styles.scheduleInstructor, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={2}>
                                {session.instructor || 'Teacher TBD'}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[{ color: theme.textSecondary, fontSize: scale(10), fontWeight: '500' }]}>
                                Room: {session.room || session.roomNo || 'TBA'}
                              </Text>
                              {isActive && (
                                <View style={[styles.todayBadge, { backgroundColor: theme.primary, marginTop: scale(4) }]}>
                                  <Text style={[styles.todayBadgeText, { color: '#fff' }]}>Ongoing / Next</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                        </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* Footer Banner */}
        <View style={[styles.footerBanner, { backgroundColor: isDark ? theme.card : '#0f172a', borderColor: isDark ? theme.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
          <Ionicons name="ribbon" size={16} color="#fbbf24" />
          <Text style={[styles.footerText, { color: isDark ? theme.textSecondary : '#e2e8f0' }]}>Empowering Education, Inspiring Futures.</Text>
          <Text style={styles.footerYearText}>{academicYearText}</Text>
        </View>

        </ScrollView>
      </View>

      {/* Premium Welcome Popup */}
      {showWelcome && (
        <Animated.View style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 9999, 
          opacity: popupOpacity,
        }}>
          <Animated.View style={{ 
            backgroundColor: '#ffffff', 
            width: scale(260),
            height: scale(260),
            borderRadius: scale(130),
            borderWidth: scale(6),
            borderColor: 'rgba(124, 58, 237, 0.1)', // subtle purple ring around the popup
            alignItems: 'center', 
            justifyContent: 'center',
            shadowColor: '#7c3aed', 
            shadowOpacity: 0.4, 
            shadowOffset: { width: 0, height: 0 }, 
            shadowRadius: 40, 
            elevation: 25, 
            transform: [
              { scale: popupScale }
            ]
          }}>
            {/* Sparkles */}
            <Text style={{ position: 'absolute', top: scale(50), left: scale(40), fontSize: scale(14), color: '#c4b5fd', opacity: 0.8 }}>✦</Text>
            <Text style={{ position: 'absolute', top: scale(40), right: scale(50), fontSize: scale(9), color: '#c4b5fd', opacity: 0.6 }}>✦</Text>
            <Text style={{ position: 'absolute', bottom: scale(80), left: scale(40), fontSize: scale(10), color: '#c4b5fd', opacity: 0.7 }}>✦</Text>
            <Text style={{ position: 'absolute', top: scale(110), right: scale(35), fontSize: scale(16), color: '#c4b5fd', opacity: 0.5 }}>✦</Text>
            
            {/* Waving Hand Icon */}
            <View style={{
              width: scale(48), height: scale(48),
              borderRadius: scale(24),
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: scale(6)
            }}>
              <Animated.Text style={{ 
                fontSize: scale(26),
                lineHeight: scale(32), 
                transform: [{
                  rotate: popupScale.interpolate({
                    inputRange: [0.8, 1],
                    outputRange: ['-20deg', '10deg']
                  })
                }]
              }}>
                👋
              </Animated.Text>
            </View>
            
            {/* Heading */}
            <Text style={{ fontSize: scale(16), fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
              Welcome,
            </Text>
            <Text style={{ fontSize: scale(19), fontWeight: '800', color: '#7c3aed', textAlign: 'center', marginBottom: scale(4) }}>
              {displayName.split(' ')[0]}!
            </Text>
            
            {/* Divider */}
            <View style={{ width: scale(30), height: scale(3), borderRadius: scale(2), backgroundColor: '#7c3aed', opacity: 0.3, marginBottom: scale(8) }} />
            
            {/* Body */}
            <Text style={{ fontSize: scale(10.5), color: '#475569', textAlign: 'center', lineHeight: scale(14), marginBottom: scale(14), paddingHorizontal: scale(20) }}>
              Good to see you again!{'\n'}
              Keep learning & achieve greatness ✨
            </Text>
            
            {/* Button */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#7c3aed',
              paddingVertical: scale(8),
              paddingHorizontal: scale(16),
              borderRadius: scale(20),
              shadowColor: '#7c3aed',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <Ionicons name="heart" size={scale(12)} color="#ffffff" style={{ marginRight: scale(4) }} />
              <Text style={{ fontSize: scale(11), color: '#ffffff', fontWeight: '700' }}>
                Let's do great today!
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
    borderRadius: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    padding: scale(8),
    gap: scale(10),
  },
  continueImageContainer: {
    width: scale(100),
    height: scale(75),
    borderRadius: scale(8),
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
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
    transform: [{ translateX: -scale(13) }, { translateY: -scale(13) }],
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    justifyContent: 'center',
  },
  chipTag: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  chipTagText: {
    fontSize: scale(9),
    fontWeight: '700',
  },
  teacherText: {
    fontSize: scale(9),
    fontWeight: '700',
    flex: 1,
  },
  continueTitle: {
    fontSize: scale(12),
    fontWeight: '700',
    marginTop: scale(1),
    letterSpacing: -0.2,
    lineHeight: scale(16),
  },
  continueSubtitle: {
    fontSize: scale(9),
    marginTop: scale(2),
    fontWeight: '500',
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
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(3),
  },
  resumeButtonText: {
    fontSize: scale(9),
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
    padding: scale(6),
    borderRadius: scale(10),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  activeScheduleCard: {
    borderTopRightRadius: scale(24),
    borderBottomLeftRadius: scale(24),
    borderTopLeftRadius: scale(8),
    borderBottomRightRadius: scale(8),
    borderWidth: 1.5,
  },
  scheduleLectureBox: {
    backgroundColor: '#eff6ff',
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
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
    fontSize: scale(14),
    fontWeight: '900',
  },
  scheduleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(4),
  },
  scheduleSubject: {
    fontSize: scale(12),
    fontWeight: '800',
    flex: 1,
    marginRight: scale(8),
    lineHeight: scale(16),
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  scheduleTimeRight: {
    fontSize: scale(8.5),
    fontWeight: '700',
  },
  scheduleInstructor: {
    fontSize: scale(9.5),
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(4),
  },
  todayBadgeText: {
    fontSize: scale(8),
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
  footerBanner: {
    backgroundColor: '#0f172a',
    marginHorizontal: scale(16),
    marginTop: scale(4),
    marginBottom: scale(5),
    borderRadius: scale(12),
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    color: '#e2e8f0',
    fontSize: scale(10),
    fontWeight: '500',
    flex: 1,
    marginLeft: scale(10),
  },
  footerYearText: {
    color: '#fbbf24',
    fontSize: scale(11),
    fontWeight: '700',
  },
});
