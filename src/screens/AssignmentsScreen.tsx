import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export const AssignmentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('All');

  const assignments = [
    {
      id: 1,
      subject: "Mathematics",
      icon: "📘",
      teacher: "Sir Abdullah",
      title: "Algebra Exercise 4.3",
      deadline: "Nov 25, 2025",
      status: "Pending",
      color: "#FBBF24",
    },
    {
      id: 2,
      subject: "English",
      icon: "📗",
      teacher: "Ms. Aisha",
      title: "Essay on Technology",
      deadline: "Nov 20, 2025",
      status: "Submitted",
      color: "#10B981",
    },
    {
      id: 3,
      subject: "Physics",
      icon: "📕",
      teacher: "Sir Hamza",
      title: "Chapter 5 Numericals",
      deadline: "Nov 18, 2025",
      status: "Late",
      color: "#EF4444",
    },
    {
      id: 4,
      subject: "Computer Science",
      icon: "💻",
      teacher: "Dr. Khan",
      title: "Data Structures Lab Report",
      deadline: "Nov 28, 2025",
      status: "Pending",
      color: "#FBBF24",
    },
    {
      id: 5,
      subject: "Web Development",
      icon: "🌐",
      teacher: "Ms. Sarah",
      title: "React Portfolio Project",
      deadline: "Dec 5, 2025",
      status: "Submitted",
      color: "#10B981",
    },
    {
      id: 6,
      subject: "Database Systems",
      icon: "🗄️",
      teacher: "Sir Ahmed",
      title: "SQL Query Assignment",
      deadline: "Nov 15, 2025",
      status: "Late",
      color: "#EF4444",
    },
    {
      id: 7,
      subject: "Biology",
      icon: "🧬",
      teacher: "Ms. Fatima",
      title: "Cell Biology Presentation",
      deadline: "Nov 30, 2025",
      status: "Pending",
      color: "#FBBF24",
    },
    {
      id: 8,
      subject: "Chemistry",
      icon: "⚗️",
      teacher: "Dr. Ali",
      title: "Organic Chemistry Lab",
      deadline: "Nov 22, 2025",
      status: "Submitted",
      color: "#10B981",
    },
    {
      id: 9,
      subject: "History",
      icon: "📜",
      teacher: "Sir Usman",
      title: "World War II Essay",
      deadline: "Nov 19, 2025",
      status: "Late",
      color: "#EF4444",
    },
    {
      id: 10,
      subject: "Programming",
      icon: "⌨️",
      teacher: "Ms. Zara",
      title: "Python Game Development",
      deadline: "Dec 1, 2025",
      status: "Pending",
      color: "#FBBF24",
    },
    {
      id: 11,
      subject: "Networking",
      icon: "📡",
      teacher: "Dr. Hassan",
      title: "Network Security Analysis",
      deadline: "Nov 27, 2025",
      status: "Submitted",
      color: "#10B981",
    },
    {
      id: 12,
      subject: "Mobile Apps",
      icon: "📱",
      teacher: "Sir Bilal",
      title: "Android App Development",
      deadline: "Dec 10, 2025",
      status: "Pending",
      color: "#FBBF24",
    },
    {
      id: 13,
      subject: "Artificial Intelligence",
      icon: "🤖",
      teacher: "Dr. Nida",
      title: "Machine Learning Model",
      deadline: "Nov 16, 2025",
      status: "Late",
      color: "#EF4444",
    },
  ];

  // Filter assignments based on search query and active filter
  const filteredAssignments = assignments.filter((assignment) => {
    // Filter by status
    const matchesFilter = activeFilter === 'All' || assignment.status === activeFilter;
    
    // Filter by search query (search in subject, title, or teacher)
    const matchesSearch = 
      assignment.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Search Bar */}
        <TextInput
          placeholder="Search assignment..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

      {/* Filters */}
      <View style={styles.filterRow}>
        {["All", "Pending", "Submitted", "Late"].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assignments */}
      <View style={{ marginTop: 10 }}>
        {filteredAssignments.map((a) => (
          <View key={a.id} style={styles.card}>

            {/* Subject Row */}
            <View style={styles.subjectRow}>
              <Text style={styles.subjectIcon}>{a.icon}</Text>
              <View>
                <Text style={styles.subjectText}>{a.subject}</Text>
                <Text style={styles.teacherText}>{a.teacher}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.assignmentTitle}>{a.title}</Text>

            {/* Deadline + Status */}
            <View style={styles.deadlineRow}>
              <Text style={styles.deadline}>Due: {a.deadline}</Text>

              <View style={[styles.statusBadge, { backgroundColor: a.color }]}>
                <Text style={styles.statusText}>{a.status}</Text>
              </View>
            </View>

          </View>
        ))}
      </View>

      </ScrollView>

      {/* Floating Button (Outside ScrollView) */}
      <TouchableOpacity style={styles.fab}>
        <Text style={{ color: "#fff", fontSize: 24 }}>＋</Text>
      </TouchableOpacity>

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
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },

  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    elevation: 2,
  },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    elevation: 2,
  },

  filterBtnActive: {
    backgroundColor: "#3b82f6",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },

  filterTextActive: {
    color: "#ffffff",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 3,
  },

  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  subjectIcon: {
    fontSize: 32,
    marginRight: 12,
  },

  subjectText: {
    fontSize: 15,
    fontWeight: "700",
  },

  teacherText: {
    fontSize: 12,
    color: "#6B7280",
  },

  assignmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 15,
  },

  deadlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  deadline: {
    fontSize: 13,
    color: "#4B5563",
  },

  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  fab: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#1E66FF",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 40,
    right: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});
