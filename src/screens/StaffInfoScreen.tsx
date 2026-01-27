import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';

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
    };
  };
};

type StaffInfoRouteProp = RouteProp<StaffInfoParams, 'StaffInfoScreen'>;

export const StaffInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<StaffInfoRouteProp>();
  const { teacher } = route.params;
  const { theme, isDark } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);

  // Modern Header Background Color
  const headerBg = isDark ? theme.backgroundSecondary : theme.primary; // Dark mode: nice dark gray, Light mode: primary color

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      {/* Custom Header Area */}
      <View style={[styles.headerBackground, { backgroundColor: headerBg }]}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Ionicons name="arrow-back" size={scale(24)} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Teacher Profile</Text>
            <TouchableOpacity
              onPress={() => setIsFavorite(!isFavorite)}
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={scale(22)} color={isFavorite ? "#ff4081" : "#ffffff"} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Profile Info Card (Overlapping) */}
        <View style={styles.profileContainer}>
          <View style={[styles.profileCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: teacher.image }} style={styles.profileImage} />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#4CAF50" />
              </View>
            </View>

            <Text style={[styles.name, { color: theme.text }]}>{teacher.name}</Text>
            <Text style={[styles.role, { color: theme.primary }]}>{teacher.subject} Specialist</Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="book-outline" size={scale(18)} color={theme.primary} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>5+</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Courses</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="time-outline" size={scale(18)} color={theme.primary} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{teacher.experience}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Experience</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: isDark ? '#374151' : '#e0e7ff' }]}>
                  <Ionicons name="people-outline" size={scale(18)} color={theme.primary} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>200+</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Students</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>

          {/* About */}
          <Text style={[styles.sectionHeader, { color: theme.text }]}>About</Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            {teacher.name} is a dedicated {teacher.subject} educator with a passion for student success. With {teacher.experience} of experience, they bring a wealth of knowledge and innovative teaching methods to the classroom.
          </Text>

          {/* Qualification Card */}
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Qualification</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="school" size={scale(24)} color="#D32F2F" />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{teacher.qualification}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Certified Professional</Text>
            </View>
          </View>

          {/* Availability Card */}
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Availability</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="calendar" size={scale(24)} color="#388E3C" />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.infoText, { color: theme.text }]}>Mon - Fri: 08:00 AM - 02:00 PM</Text>
              <Text style={[styles.infoText, { color: theme.text }]}>Sat: 09:00 AM - 01:00 PM</Text>
            </View>
          </View>

        </View>

        {/* Bottom Padding for scroll */}
        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Floating Contact Button */}
      <View style={[styles.floatButtonContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={[styles.contactButton, { backgroundColor: theme.primary }]} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={scale(20)} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.contactButtonText}>Contact Teacher</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    height: scale(180),
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  headerSafeArea: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(10),
    zIndex: 20, // Ensure buttons are clickable
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
    paddingTop: scale(120), // Push content down to overlap header
    zIndex: 10,
    position: 'relative',
  },
  profileContainer: {
    paddingHorizontal: scale(20),
    zIndex: 2,
    marginBottom: scale(24),
  },
  profileCard: {
    borderRadius: scale(20),
    padding: scale(20),
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: scale(10),
    marginTop: scale(-50), // Overlap more onto the colored header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  profileImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    backgroundColor: '#f3f4f6',
  },
  profileImageFallback: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: scale(10),
  },
  name: {
    fontSize: scale(22),
    fontWeight: '800',
    marginBottom: scale(4),
    textAlign: 'center',
  },
  role: {
    fontSize: scale(14),
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: scale(16),
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: scale(16),
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  statValue: {
    fontSize: scale(16),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
  },

  contentSection: {
    paddingHorizontal: scale(20),
  },
  sectionHeader: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: scale(12),
    marginTop: scale(12),
  },
  aboutText: {
    fontSize: scale(14),
    lineHeight: scale(22),
    opacity: 0.8,
    marginBottom: scale(12),
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    marginBottom: scale(8),
  },
  cardIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(2),
  },
  cardSubtitle: {
    fontSize: scale(13),
    opacity: 0.7,
  },
  infoText: {
    fontSize: scale(14),
    fontWeight: '500',
    marginBottom: scale(2),
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
