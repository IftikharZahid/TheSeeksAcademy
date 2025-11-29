import React, { useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export const TeachersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');

  const staff = [
    {
      id: 1,
      name: "Sir Abdullah",
      subject: "Mathematics",
      qualification: "MS Mathematics",
      experience: "10 Years",
      image: "https://i.pravatar.cc/150?img=5",
      color: "#FEF3C7",
    },
    {
      id: 2,
      name: "Ms. Aisha",
      subject: "English",
      qualification: "MA English Lit",
      experience: "7 Years",
      image: "https://i.pravatar.cc/150?img=48",
      color: "#DBEAFE",
    },
    {
      id: 3,
      name: "Sir Hamza",
      subject: "Physics",
      qualification: "PhD Physics",
      experience: "5 Years",
      image: "https://i.pravatar.cc/150?img=12",
      color: "#E0E7FF",
    },
    {
      id: 4,
      name: "Miss Zainab",
      subject: "Computer Science",
      qualification: "MS CS",
      experience: "8 Years",
      image: "https://i.pravatar.cc/150?img=32",
      color: "#FCE7F3",
    },
    {
      id: 5,
      name: "Dr. Khan",
      subject: "Chemistry",
      qualification: "PhD Chemistry",
      experience: "12 Years",
      image: "https://i.pravatar.cc/150?img=13",
      color: "#D1FAE5",
    },
    {
      id: 6,
      name: "Ms. Fatima",
      subject: "Biology",
      qualification: "MS Biology",
      experience: "6 Years",
      image: "https://i.pravatar.cc/150?img=44",
      color: "#FEF3C7",
    },
    {
      id: 7,
      name: "Sir Usman",
      subject: "History",
      qualification: "MA History",
      experience: "9 Years",
      image: "https://i.pravatar.cc/150?img=15",
      color: "#DBEAFE",
    },
    {
      id: 8,
      name: "Ms. Sarah",
      subject: "Web Development",
      qualification: "BS Software Eng",
      experience: "4 Years",
      image: "https://i.pravatar.cc/150?img=47",
      color: "#E0E7FF",
    },
    {
      id: 9,
      name: "Dr. Hassan",
      subject: "Networking",
      qualification: "PhD Networks",
      experience: "11 Years",
      image: "https://i.pravatar.cc/150?img=8",
      color: "#FCE7F3",
    },
    {
      id: 10,
      name: "Miss Nida",
      subject: "Artificial Intelligence",
      qualification: "MS AI",
      experience: "5 Years",
      image: "https://i.pravatar.cc/150?img=45",
      color: "#D1FAE5",
    },
  ];

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Teachers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs with teacher counts */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {subjectTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Teacher Cards Grid */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.cardsGrid}>
          {filteredStaff.map((teacher) => (
            <View key={teacher.id} style={[styles.card, { backgroundColor: teacher.color }]}>
              {/* Teacher Image */}
              <View style={styles.imageContainer}>
                <Image source={{ uri: teacher.image }} style={styles.teacherImage} />
              </View>

              {/* Subject */}
              <Text style={styles.subject} numberOfLines={1}>{teacher.subject}</Text>
              
              {/* Qualification */}
              <Text style={styles.qualification} numberOfLines={1}>{teacher.qualification}</Text>
              
              {/* Teacher Name */}
              <Text style={styles.teacherName} numberOfLines={1}>By {teacher.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1f2937',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#ffffff",
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
    borderColor: '#f3f4f6',
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
    borderColor: 'rgba(255,255,255,0.8)',
  },
  teacherImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  qualification: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
