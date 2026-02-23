import React, { useState } from 'react';
import {  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image , StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppSelector } from '../../store/hooks';

interface Course {
  id: string;
  name: string;
  teacher: string;
  image: string;
}

export const AdminCoursesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  // Read courses from Redux (shared listener in coursesSlice)
  const courses = useAppSelector(state => state.courses.list) as Course[];
  const loading = useAppSelector(state => state.courses.isLoading);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [image, setImage] = useState('');

  // No need for useEffect listener — coursesSlice listener runs globally in App.tsx

  const handleSaveCourse = async () => {
    if (!name || !teacher) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const courseData = {
      name,
      teacher,
      image: image || 'https://via.placeholder.com/150',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingCourse) {
        await setDoc(doc(db, 'courses', editingCourse.id), courseData, { merge: true });
        Alert.alert('Success', 'Course updated successfully');
      } else {
        const newId = Date.now().toString(); // Simple ID generation
        await setDoc(doc(db, 'courses', newId), courseData);
        Alert.alert('Success', 'Course added successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save course');
      console.error(error);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    Alert.alert('Delete Course', 'Are you sure you want to remove this course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'courses', id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete course');
          }
        }
      }
    ]);
  };

  const openModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setName(course.name);
      setTeacher(course.teacher);
      setImage(course.image);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCourse(null);
    setName('');
    setTeacher('');
    setImage('');
  };

  const filteredCourses = courses.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.teacher || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Courses</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Search courses..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Courses List ({courses.length})</Text>
          {filteredCourses.length === 0 ? (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No courses found.</Text>
          ) : (
            filteredCourses.map((item, index) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.serialNo, { backgroundColor: theme.primary + '12' }]}>
                  <Text style={[styles.serialNoText, { color: theme.primary }]}>{index + 1}</Text>
                </View>
                <Image source={{ uri: item.image }} style={styles.courseImage} />
                <View style={styles.cardInfo}>
                  <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.teacher, { color: theme.primary }]}>By {item.teacher}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCourse(item.id)} style={styles.actionBtn}>
                    <Ionicons name="trash" size={16} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Edit/Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingCourse ? 'Edit Course' : 'Add Course'}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Course Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Advanced React Native"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: theme.text }]}>Teacher Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Prof. Smith"
                placeholderTextColor={theme.textSecondary}
                value={teacher}
                onChangeText={setTeacher}
              />

              <Text style={[styles.label, { color: theme.text }]}>Image URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="https://..."
                placeholderTextColor={theme.textSecondary}
                value={image}
                onChangeText={setImage}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveCourse} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  backButton: { padding: 2 },
  addButton: { padding: 2 },
  searchContainer: { padding: 12, paddingBottom: 0 },
  searchInput: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
  },
  content: { padding: 12 },
  listTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  noDataText: { textAlign: 'center', marginTop: 16, fontSize: 13 },
  card: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  serialNo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  serialNoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  courseImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#e5e5e5',
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  teacher: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  cardActions: { flexDirection: 'row', gap: 12, paddingLeft: 8, alignItems: 'center' },
  actionBtn: { padding: 6, borderRadius: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 14,
    elevation: 4,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
});
