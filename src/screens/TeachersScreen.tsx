import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from './navigation/HomeStack';
import teachersData from '../../teachers.json';
import { useTheme } from '../context/ThemeContext';
import { db } from '../api/firebaseConfig';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  qualification: string;
  experience: string;
  image: string;
  color?: string;
}

type TeachersScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'TeachersScreen'>;

export const TeachersScreen: React.FC = () => {
  const navigation = useNavigation<TeachersScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [staff, setStaff] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Define color palette for teacher cards
  const colors = [
    "#FEF3C7", "#DBEAFE", "#E0E7FF", "#FCE7F3", 
    "#D1FAE5", "#FEF3C7", "#DBEAFE", "#E0E7FF", 
    "#FCE7F3", "#D1FAE5"
  ];

  // Fetch teachers from Firebase
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      
      const staffCollection = collection(db, "staff");
      const querySnapshot = await getDocs(staffCollection);
      
      let teachersArray: Teacher[] = [];

      if (querySnapshot.empty) {
        console.log("Seeding staff collection...");
        // Seed database if empty
        const localTeachers = Object.entries(teachersData.staff).map(
          ([id, teacher], index) => ({
            id,
            ...teacher,
            color: colors[index % colors.length],
          })
        );

        for (const teacher of localTeachers) {
          // Use the ID from the JSON as the document ID
          await setDoc(doc(db, "staff", teacher.id), teacher);
          teachersArray.push(teacher);
        }
      } else {
        // Fetch from Firestore
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Teacher, 'id'>;
          teachersArray.push({ id: doc.id, ...data });
        });
        
        // Apply colors locally since we might not want to store UI state in DB
        teachersArray = teachersArray.map((teacher, index) => ({
          ...teacher,
          color: colors[index % colors.length]
        }));
      }

      setStaff(teachersArray);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTeachers();
    setRefreshing(false);
  }, []);

  // Group teachers by subject and count them
  const subjectCounts = staff.reduce((acc: { [key: string]: number }, teacher) => {
    acc[teacher.subject] = (acc[teacher.subject] || 0) + 1;
    return acc;
  }, {});

  // Create tabs with 'All' first, then subjects sorted by count
  const subjectTabs = ['All', ...Object.keys(subjectCounts).sort((a, b) => subjectCounts[b] - subjectCounts[a])];

  // Filter teachers based on selected tab
  const filteredStaff = activeTab === 'All' 
    ? staff 
    : staff.filter(teacher => teacher.subject === activeTab);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Our Teachers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs with teacher counts */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {subjectTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab, 
                { backgroundColor: isDark ? theme.card : '#F3F4F6' },
                activeTab === tab && { backgroundColor: theme.primary }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: theme.textSecondary },
                activeTab === tab && styles.tabTextActive
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading teachers...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && !refreshing && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={fetchTeachers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Teacher Cards Grid */}
      {(!loading || refreshing) && !error && (
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: theme.background }]} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          <View style={styles.cardsGrid}>
            {filteredStaff.map((teacher) => (
              <TouchableOpacity 
                key={teacher.id} 
                style={[
                  styles.card, 
                  { 
                    backgroundColor: isDark ? theme.card : teacher.color,
                    borderColor: theme.border
                  }
                ]}
                onPress={() => navigation.navigate('StaffInfoScreen', { teacher })}
                activeOpacity={0.8}
              >
                {/* Teacher Image */}
                <View style={[styles.imageContainer, { borderColor: isDark ? theme.border : 'rgba(255,255,255,0.8)' }]}>
                  <Image source={{ uri: teacher.image }} style={styles.teacherImage} />
                </View>

                {/* Subject */}
                <Text style={[styles.subject, { color: theme.text }]} numberOfLines={1}>{teacher.subject}</Text>
                
                {/* Qualification */}
                <Text style={[styles.qualification, { color: theme.textSecondary }]} numberOfLines={1}>{teacher.qualification}</Text>
                
                {/* Teacher Name */}
                <Text style={[styles.teacherName, { color: theme.textSecondary }]} numberOfLines={1}>By {teacher.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
  },
  teacherImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  qualification: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 12,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
