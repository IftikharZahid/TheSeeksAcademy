import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.headerButton, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Teacher Details</Text>
        <TouchableOpacity 
          style={[styles.headerButton, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb' }]}>
          <View style={[styles.imageContainer, { backgroundColor: theme.card }]}>
            <Image source={{ uri: teacher.image }} style={styles.profileImage} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{teacher.name}</Text>
          <Text style={styles.role}>{teacher.subject} Teacher</Text>

          {/* Stats */}
          <View style={[styles.statsContainer, { backgroundColor: theme.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>5+</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Courses</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{teacher.experience}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Experience</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>200+</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Students</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About Teacher</Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            {teacher.name} is a highly experienced {teacher.subject} teacher with {teacher.experience} of excellence in education. 
            {'\n\n'}
            With a {teacher.qualification}, they bring deep knowledge and passion to every class. Known for making complex concepts easy to understand, they have helped hundreds of students achieve their academic goals.
            {'\n\n'}
            Their teaching methodology focuses on practical applications and student engagement, ensuring every student grasps the fundamentals while developing critical thinking skills.
          </Text>
        </View>

        {/* Qualification */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Qualification</Text>
          <View style={[styles.qualificationCard, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb', borderColor: theme.border }]}>
            <Text style={styles.qualificationIcon}>🎓</Text>
            <View style={styles.qualificationInfo}>
              <Text style={[styles.qualificationTitle, { color: theme.text }]}>{teacher.qualification}</Text>
              <Text style={[styles.qualificationSubtitle, { color: theme.textSecondary }]}>Specialized in {teacher.subject}</Text>
            </View>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Availability</Text>
          <View style={[styles.availabilityCard, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb', borderColor: theme.border }]}>
            <Text style={[styles.availabilityText, { color: theme.text }]}>📅 Mon - Fri: 8:00am - 5:00pm</Text>
            <Text style={[styles.availabilityText, { color: theme.text }]}>📅 Sat: 9:00am - 1:00pm</Text>
          </View>
        </View>

        {/* Contact Button */}
        <TouchableOpacity style={[styles.contactButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
          <Text style={styles.contactButtonText}>📧 Contact Teacher</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#374151',
    fontWeight: '700',
    marginTop: -3,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  role: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: '600',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 24,
    fontWeight: '400',
  },
  qualificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qualificationIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  qualificationInfo: {
    flex: 1,
  },
  qualificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  qualificationSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  availabilityCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  availabilityText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  contactButton: {
    backgroundColor: '#8b5cf6',
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
