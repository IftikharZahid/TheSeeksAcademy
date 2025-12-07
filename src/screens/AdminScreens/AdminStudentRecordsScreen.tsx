import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface Student {
  id: string;
  name: string;
  studentId: string;
  email: string;
  grade: string;
  profileImage?: string;
}

export const AdminStudentRecordsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [filterClass, setFilterClass] = useState('All');

  const classOptions = ['9th', '10th', '1st Year', '2nd Year'];
  const filterOptions = ['All', ...classOptions];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsList: Student[] = [];
      snapshot.forEach((doc) => {
        studentsList.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studentsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveStudent = async () => {
    if (!name || !studentId || !email) {
      Alert.alert('Error', 'Please fill all required fields (Name, ID, Email)');
      return;
    }

    const studentData = {
      name,
      studentId,
      email,
      grade: grade || 'N/A',
      profileImage,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingStudent) {
        await setDoc(doc(db, 'students', editingStudent.id), studentData, { merge: true });
        Alert.alert('Success', 'Student updated successfully');
      } else {
        // Use studentId as doc ID if valid, else auto-gen
        const docId = studentId || Date.now().toString(); 
        await setDoc(doc(db, 'students', docId), studentData);
        Alert.alert('Success', 'Student added successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save student');
      console.error(error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    Alert.alert('Delete Student', 'Are you sure you want to remove this student?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'students', id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete student');
          }
        }
      }
    ]);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
          type: '*/*',
          copyToCacheDirectory: true 
      });
      
      if (result.canceled) return;

      setLoading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      // Use the URI directly provided by copyToCacheDirectory if available, or copy manually
      let fileUri = asset.uri;

      // On Android, explicitly reading content:// URIs can fail with readAsStringAsync
      // Best practice: Copy the file to a known local path if likely external
      if (fileUri.startsWith('content://')) {
          const tempUri = FileSystem.documentDirectory + 'temp_upload.json';
          await FileSystem.copyAsync({
              from: fileUri,
              to: tempUri
          });
          fileUri = tempUri;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      let data;
      try {
          data = JSON.parse(fileContent);
      } catch (parseError) {
          Alert.alert('JSON Error', 'The file content is not valid JSON.');
          setLoading(false);
          return;
      }

      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Invalid JSON format. The root must be an array of students.');
        setLoading(false);
        return;
      }

      let addedCount = 0;
      let errorCount = 0;

      for (const item of data) {
        if (item.name && item.studentId && item.email) {
            try {
                // 1. Update/Add to 'students' collection
                const docId = item.studentId.toString();
                await setDoc(doc(db, 'students', docId), {
                    name: item.name,
                    studentId: item.studentId,
                    email: item.email,
                    grade: item.grade || 'N/A',
                    profileImage: item.profileImage || '',
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                // 2. Sync profileImage to 'profile' collection if exists
                if (item.profileImage && item.email) {
                    const q = query(collection(db, 'profile'), where('email', '==', item.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const profileDoc = querySnapshot.docs[0];
                        await updateDoc(doc(db, 'profile', profileDoc.id), {
                            image: item.profileImage
                        });
                    }
                }

                addedCount++;
            } catch (err) {
                console.error("Error adding student:", item, err);
                errorCount++;
            }
        } else {
            errorCount++;
        }
      }

      Alert.alert('Upload Complete', `Successfully added/updated ${addedCount} students.\nFailed/Skipped: ${errorCount}`);

    } catch (error: any) {
      console.error("File upload error:", error);
      Alert.alert('Error', `Failed to process the file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setChoiceModalVisible(false);
    resetForm();
    setModalVisible(true);
  };

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setName(student.name);
      setStudentId(student.studentId);
      setEmail(student.email);
      setGrade(student.grade);
      setProfileImage(student.profileImage || '');
      setModalVisible(true);
    } else {
      setChoiceModalVisible(true);
    }
  };

  const resetForm = () => {
    setEditingStudent(null);
    setName('');
    setStudentId('');
    setEmail('');
    setGrade('');
    setProfileImage('');
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'All' || s.grade === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Student Records</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Search students..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Class Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: filterClass === option ? theme.primary : theme.card,
                  borderColor: filterClass === option ? theme.primary : theme.border,
                }
              ]}
              onPress={() => setFilterClass(option)}
            >
              <Text style={[
                styles.filterChipText,
                { color: filterClass === option ? '#fff' : theme.text }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Students List ({filteredStudents.length})</Text>
          {filteredStudents.length === 0 ? (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No students found.</Text>
          ) : (
            filteredStudents.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '20', overflow: 'hidden' }]}>
                   {item.profileImage ? (
                       <Image source={{ uri: item.profileImage }} style={{ width: '100%', height: '100%' }} />
                   ) : (
                       <Ionicons name="person" size={24} color={theme.primary} />
                   )}
                </View>
                <View style={styles.cardInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={[styles.name, { color: theme.text, marginBottom: 0 }]}>{item.name}</Text>
                    <Text style={[styles.name, { color: theme.text, textDecorationLine: 'underline', marginBottom: 0 }]}>{item.grade}</Text>
                  </View>
                  <Text style={[styles.details, { color: theme.textSecondary }]}>ID: {item.studentId}</Text>
                  <Text style={[styles.details, { color: theme.textSecondary }]}>{item.email}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={20} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteStudent(item.id)} style={styles.actionBtn}>
                    <Ionicons name="trash" size={20} color={theme.error} />
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingStudent ? 'Edit Student' : 'Add Student'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. John Doe" 
                placeholderTextColor={theme.textSecondary}
                value={name} 
                onChangeText={setName} 
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Student ID</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. STU-2024-001" 
                placeholderTextColor={theme.textSecondary}
                value={studentId} 
                onChangeText={setStudentId} 
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. john@example.com" 
                placeholderTextColor={theme.textSecondary}
                value={email} 
                onChangeText={setEmail}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.text }]}>Profile Image URL</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="https://example.com/image.jpg" 
                placeholderTextColor={theme.textSecondary}
                value={profileImage} 
                onChangeText={setProfileImage}
                autoCapitalize="none"
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Grade/Class</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setClassPickerVisible(true)}
              >
                <Text style={{ color: grade ? theme.text : theme.textSecondary, flex: 1 }}>
                  {grade || 'Select class'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveStudent} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Choice Modal (Manual vs Upload) */}
      <Modal visible={choiceModalVisible} animationType="fade" transparent>
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setChoiceModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, alignItems: 'center' }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Student</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                Choose how you want to add students to the database.
            </Text>
            
            <TouchableOpacity 
                onPress={handleManualEntry} 
                style={[styles.choiceBtn, { backgroundColor: theme.primary }]}
            >
                <Ionicons name="create-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.choiceBtnText}>Manual Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={handlePickDocument} 
                style={[styles.choiceBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary }]}
            >
                <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.choiceBtnText, { color: theme.primary }]}>Upload JSON File</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setChoiceModalVisible(false)} 
                style={{ marginTop: 10, padding: 10 }}
            >
                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Class Picker Modal */}
      <Modal
        visible={classPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClassPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setClassPickerVisible(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Class</Text>
            {classOptions.map((classOption) => (
              <TouchableOpacity
                key={classOption}
                style={[styles.pickerOption, { backgroundColor: grade === classOption ? theme.primary + '15' : 'transparent' }]}
                onPress={() => {
                  setGrade(classOption);
                  setClassPickerVisible(false);
                }}
              >
                <Text style={[styles.pickerOptionText, { 
                  color: grade === classOption ? theme.primary : theme.text 
                }]}>
                  {classOption}
                </Text>
                {grade === classOption && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 4 },
  addButton: { padding: 4 },
  searchContainer: { 
    paddingHorizontal: 16, 
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: { padding: 16, paddingTop: 12 },
  listTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  details: { fontSize: 12, marginBottom: 1 },
  cardActions: { flexDirection: 'column', gap: 12, paddingLeft: 8 },
  actionBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  choiceBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
