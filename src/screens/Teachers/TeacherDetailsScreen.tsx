import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, StatusBar, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleLikeTeacherAsync } from '../../store/slices/teachersSlice';

const { width } = Dimensions.get('window');

type StaffInfoParams = {
  StaffInfoScreen: {
    teacher: {
      id: string;
      name: string;
      subject: string;
      qualification: string;
      experience: string;
      image: string;
      phone?: string;
    };
  };
};

type StaffInfoRouteProp = RouteProp<StaffInfoParams, 'StaffInfoScreen'>;

export const StaffInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<StaffInfoRouteProp>();
  const { teacher } = route.params;
  const { theme, isDark } = useTheme();

  const dispatch = useAppDispatch();
  const likedIds = useAppSelector((state) => state.teachers.likedIds);
  const isFavorite = useMemo(() => likedIds.includes(teacher.id), [likedIds, teacher.id]);

  // Instant optimistic toggle — Redux updates immediately, Firebase syncs in background
  const handleToggleLike = () => {
    dispatch(toggleLikeTeacherAsync({ teacher: teacher as any, isCurrentlyLiked: isFavorite }));
  };

  const allStaff = useAppSelector((state) => state.teachers.list);
  
  // Dynamically find the admin/HOD contact from the staff list
  const adminStaff = useMemo(() => {
    return allStaff.find((s: any) => 
      s.role?.toUpperCase() === 'HOD' || 
      s.position?.toUpperCase() === 'HOD'
    );
  }, [allStaff]);

  // Use the admin's phone number if available, otherwise use a fallback
  const ADMIN_PHONE = (adminStaff as any)?.phone || (adminStaff as any)?.contact || "+920000000000";

  const handleContactPress = () => {
    Linking.openURL(`tel:${ADMIN_PHONE}`).catch((err) => {
      console.warn('Error opening dialer:', err);
      Alert.alert('Error', 'Unable to open the phone dialer.');
    });
  };


  // Modern Header Background Color
  const headerBg = theme.primary;

  return (
    <ScreenContainer headerTitle="Teacher Profile">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: scale(16) }}
        bounces={false}
      >
        {/* Profile Info Card (Overlapping) */}
        <View style={styles.profileContainer}>
          <View style={[styles.profileCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            {/* Horizontal Header Profile Row */}
            <View style={styles.profileMainRow}>
              <View style={styles.imageWrapper}>
                <View style={[styles.imageRing, { borderColor: theme.primary }]}>
                  {teacher.image && teacher.image.trim() !== '' ? (
                    <Image
                      source={{ uri: teacher.image }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
                      <Ionicons 
                        name={(teacher as any).gender?.toLowerCase() === 'female' ? "woman" : "man"} 
                        size={scale(40)} 
                        color="#9ca3af" 
                      />
                    </View>
                  )}
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: theme.card }]}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color="#4CAF50" />
                </View>
              </View>

              <View style={styles.profileMeta}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{teacher.name}</Text>
                <Text style={[styles.role, { color: isDark ? '#93c5fd' : theme.primary }]} numberOfLines={1}>{teacher.subject} Specialist</Text>
                <View style={[styles.badge, { backgroundColor: theme.primary + '12' }]}>
                  <Text style={[styles.badgeText, { color: theme.primary }]}>Active Instructor</Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="book-outline" size={scale(14)} color={theme.primary} />
                </View>
                <View style={styles.statTexts}>
                  <Text style={[styles.statValue, { color: theme.text }]}>5+</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Courses</Text>
                </View>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="time-outline" size={scale(14)} color={theme.primary} />
                </View>
                <View style={styles.statTexts}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{teacher.experience}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Experience</Text>
                </View>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="people-outline" size={scale(14)} color={theme.primary} />
                </View>
                <View style={styles.statTexts}>
                  <Text style={[styles.statValue, { color: theme.text }]}>200+</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Students</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* About */}
          <Text style={[styles.sectionHeader, { color: theme.text }]}>About Educator</Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>{teacher.name}</Text> is a dedicated {teacher.subject} educator with a passion for student success. With {teacher.experience} of experience, they bring innovative teaching methodologies and a highly supportive learning approach to the academy.
          </Text>

          {/* Professional Credentials Card */}
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Credentials & Details</Text>
          <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Qualification Item */}
            <View style={styles.detailsRow}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : '#fee2e2' }]}>
                <Ionicons name="school" size={scale(15)} color="#ef4444" />
              </View>
              <View style={styles.detailsTextContent}>
                <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Qualification</Text>
                <Text style={[styles.detailsValue, { color: theme.text }]}>{teacher.qualification}</Text>
              </View>
            </View>

            <View style={[styles.sep, { backgroundColor: theme.border }]} />

            {/* Availability Item */}
            <View style={styles.detailsRow}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : '#dcfce7' }]}>
                <Ionicons name="calendar" size={scale(15)} color="#22c55e" />
              </View>
              <View style={styles.detailsTextContent}>
                <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Weekly Schedule</Text>
                <Text style={[styles.detailsValue, { color: theme.text }]}>Mon - Fri: 08:00 AM - 02:00 PM</Text>
                <Text style={[styles.detailsValue, { color: theme.text, marginTop: scale(2) }]}>Sat: 09:00 AM - 01:00 PM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Padding for scroll */}
        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Floating Contact Button */}
      <View style={[styles.floatButtonContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.8}
          onPress={handleContactPress}
        >
          <Ionicons name="call-outline" size={scale(20)} color="#fff" style={{ marginRight: scale(8) }} />
          <Text style={styles.contactButtonText}>Call Admin</Text>
        </TouchableOpacity>
      </View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    height: scale(130),
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 100,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(10),
    zIndex: 100,
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: '#ffffff',
  },
  iconButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingTop: scale(90),
    zIndex: 10,
    position: 'relative',
  },
  profileContainer: {
    paddingHorizontal: scale(16),
    zIndex: 10,
    marginBottom: scale(18),
  },
  profileCard: {
    borderRadius: scale(16),
    padding: scale(12),
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRing: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    padding: scale(3),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: scale(68),
    height: scale(68),
    borderRadius: scale(34),
    backgroundColor: '#e5e7eb',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: scale(-2),
    right: scale(-2),
    borderRadius: scale(10),
    padding: scale(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  profileMeta: {
    flex: 1,
    gap: scale(2),
  },
  name: {
    fontSize: scale(16),
    fontWeight: '800',
  },
  role: {
    fontSize: scale(12),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: scale(9),
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: scale(10),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flex: 1,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTexts: {
    flexDirection: 'column',
  },
  statValue: {
    fontSize: scale(11),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scale(9),
    fontWeight: '600',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: '70%',
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
  },

  contentSection: {
    paddingHorizontal: scale(16),
  },
  sectionHeader: {
    fontSize: scale(14),
    fontWeight: '700',
    marginBottom: scale(8),
    marginTop: scale(14),
  },
  aboutText: {
    fontSize: scale(12),
    lineHeight: scale(18),
    opacity: 0.8,
    marginBottom: scale(8),
  },
  detailsCard: {
    borderRadius: scale(14),
    borderWidth: 1,
    padding: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  detailsTextContent: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: scale(9),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailsValue: {
    fontSize: scale(12),
    fontWeight: '700',
    marginTop: scale(1),
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: scale(44),
  },

  floatButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(20),
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingBottom: scale(35),
  },
  contactButton: {
    flexDirection: 'row',
    height: scale(50),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
