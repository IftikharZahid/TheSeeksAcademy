import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface Student {
  id: string;
  name: string;
  fatherName: string;
  studentId: string;
  email: string;
  password: string;
  authUid?: string;
  authError?: string;
  grade: string;
  profileImage?: string;
}

export const AdminStudentRecordsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getNextStudentId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', 'studentId');

    try {
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        // If same year, use next number; if new year, reset to 1
        if (data.year === currentYear) {
          nextNumber = data.nextNumber;
        }
      }

      // Generate ID: STD-2025-001
      const studentId = `STD-${currentYear}-${String(nextNumber).padStart(3, '0')}`;

      // Increment counter for next student
      await setDoc(counterRef, {
        year: currentYear,
        nextNumber: nextNumber + 1
      });

      return studentId;
    } catch (error) {
      console.error('Error generating student ID:', error);
      throw error;
    }
  };

  const handleSaveStudent = async () => {
    // Only validate name and father name (ID and email are auto-generated)
    if (!name || !fatherName) {
      Alert.alert('Error', 'Please fill in Full Name and Father Name');
      return;
    }

    try {
      if (editingStudent) {
        // Editing existing student - keep existing IDs and password
        const studentData = {
          name,
          fatherName,
          studentId,
          email,
          password,
          grade: grade || 'N/A',
          profileImage,
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'students', editingStudent.id), studentData, { merge: true });
        Alert.alert('Success', 'Student updated successfully');
      } else {
        // Adding new student - auto-generate ID, email, and password
        const newStudentId = await getNextStudentId();
        const newEmail = `${newStudentId}@theseeksacademy.edu.pk`;
        const newPassword = generatePassword();

        const studentData = {
          name,
          fatherName,
          studentId: newStudentId,
          email: newEmail,
          password: newPassword,
          grade: grade || 'N/A',
          profileImage,
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'students', newStudentId), studentData);
        Alert.alert('Success', `Student added successfully!\n\nStudent ID: ${newStudentId}\nEmail: ${newEmail}\nPassword: ${newPassword}`);
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

  const copyStudentRecord = async (student: Student) => {
    try {
      const recordText = `Student Record
━━━━━━━━━━━━━━━━━━━━
Name: ${student.name}
Father Name: ${student.fatherName}
Student ID: ${student.studentId}
Email: ${student.email}
Password: ${student.password}
Grade/Class: ${student.grade}
${student.profileImage ? `Profile: ${student.profileImage}` : ''}

Made with ❤ by The Seeks Academy`;

      await Clipboard.setStringAsync(recordText);
      Alert.alert('Copied!', 'Student record copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy record');
    }
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
      setFatherName(student.fatherName);
      setStudentId(student.studentId);
      setEmail(student.email);
      setPassword(student.password);
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
    setFatherName('');
    setStudentId('');
    setEmail('');
    setPassword('');
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
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Students</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={20} color={theme.primary} />
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
        <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Students List ({filteredStudents.length})</Text>
          {filteredStudents.length === 0 ? (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No students found.</Text>
          ) : (
            filteredStudents.map((item, index) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.serialNo, { backgroundColor: theme.primary + '12' }]}>
                  <Text style={[styles.serialNoText, { color: theme.primary }]}>{index + 1}</Text>
                </View>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => {
                    setViewingStudent(item);
                    setViewModalVisible(true);
                  }}
                  onLongPress={() => copyStudentRecord(item)}
                  delayLongPress={500}
                >
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '15', overflow: 'hidden' }]}>
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
                    ) : (
                      <Ionicons name="person" size={20} color={theme.primary} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.details, { color: theme.textSecondary }]}>Father: {item.fatherName || 'N/A'}</Text>
                    <Text style={[styles.details, { color: theme.textSecondary }]}>ID: {item.studentId}</Text>
                    <Text style={[styles.details, { color: theme.textSecondary }]}>{item.email}</Text>
                  </View>
                </Pressable>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteStudent(item.id)} style={styles.actionBtn}>
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

              <Text style={[styles.label, { color: theme.text }]}>Father Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. John Smith Sr."
                placeholderTextColor={theme.textSecondary}
                value={fatherName}
                onChangeText={setFatherName}
              />

              {/* Show Student ID and Email only when editing (read-only) */}
              {editingStudent && (
                <>
                  <Text style={[styles.label, { color: theme.text }]}>Student ID (Auto-generated)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.border, color: theme.textSecondary, borderColor: theme.border }]}
                    value={studentId}
                    editable={false}
                  />

                  <Text style={[styles.label, { color: theme.text }]}>Email (Auto-generated)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.border, color: theme.textSecondary, borderColor: theme.border }]}
                    value={email}
                    editable={false}
                    autoCapitalize="none"
                  />
                </>
              )}

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

      {/* View Student Details Modal - Modern & Compact */}
      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.viewModalContent, { backgroundColor: theme.card }]}>
            {/* Extended Gradient Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.viewModalHeader}
            >
              <TouchableOpacity
                onPress={() => setViewModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Floating Profile Section */}
            <View style={styles.floatingProfileSection}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIdBadge}>
                  <Text style={styles.modalIdText}>{viewingStudent?.studentId}</Text>
                </View>

                <View style={styles.profileImageContainer}>
                  {viewingStudent?.profileImage ? (
                    <Image
                      source={{ uri: viewingStudent.profileImage }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <Ionicons name="person" size={40} color="#fff" />
                  )}
                </View>

                <View style={styles.modalGradeBadge}>
                  <Text style={styles.modalGradeText}>{viewingStudent?.grade}</Text>
                </View>
              </View>
            </View>

            {/* Compact Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.compactInfoRow}>
                <View style={[styles.iconBadge, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="person" size={18} color="#667eea" />
                </View>
                <Pressable
                  style={styles.infoTextContainer}
                  onLongPress={async () => {
                    await Clipboard.setStringAsync(viewingStudent?.name || '');
                    Alert.alert('Copied!', 'Name copied to clipboard');
                  }}
                  delayLongPress={500}
                >
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Student Name</Text>
                  <Text style={[styles.compactValue, { color: theme.text }]}>{viewingStudent?.name}</Text>
                </Pressable>
              </View>

              <View style={styles.compactInfoRow}>
                <View style={[styles.iconBadge, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="person-outline" size={18} color="#f59e0b" />
                </View>
                <Pressable
                  style={styles.infoTextContainer}
                  onLongPress={async () => {
                    await Clipboard.setStringAsync(viewingStudent?.fatherName || '');
                    Alert.alert('Copied!', 'Father Name copied to clipboard');
                  }}
                  delayLongPress={500}
                >
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Father Name</Text>
                  <Text style={[styles.compactValue, { color: theme.text }]}>{viewingStudent?.fatherName || 'N/A'}</Text>
                </Pressable>
              </View>

              <View style={styles.compactInfoRow}>
                <View style={[styles.iconBadge, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="mail-outline" size={18} color="#10b981" />
                </View>
                <Pressable
                  style={styles.infoTextContainer}
                  onLongPress={async () => {
                    const credentials = `Email: ${viewingStudent?.email}\nPassword: ${viewingStudent?.password}`;
                    await Clipboard.setStringAsync(credentials);
                    Alert.alert('Copied!', 'Email and Password copied to clipboard');
                  }}
                  delayLongPress={500}
                >
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Email</Text>
                  <Text style={[styles.compactValue, { color: theme.text }]}>{viewingStudent?.email}</Text>
                </Pressable>
              </View>

              <View style={styles.compactInfoRow}>
                <View style={[styles.iconBadge, { backgroundColor: '#fed7aa' }]}>
                  <Ionicons name="key-outline" size={18} color="#ea580c" />
                </View>
                <Pressable
                  style={styles.infoTextContainer}
                  onLongPress={async () => {
                    const credentials = `Email: ${viewingStudent?.email}\nPassword: ${viewingStudent?.password}`;
                    await Clipboard.setStringAsync(credentials);
                    Alert.alert('Copied!', 'Email and Password copied to clipboard');
                  }}
                  delayLongPress={500}
                >
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Password</Text>
                  <Text style={[styles.compactValue, { color: theme.text }]}>{viewingStudent?.password}</Text>
                </Pressable>
              </View>
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
          <View style={[styles.modalContent, { backgroundColor: theme.card, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="person-add" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text, marginTop: 12, marginBottom: 6 }]}>Add New Student</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 20, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
              Choose how you want to add students.
            </Text>

            <TouchableOpacity
              onPress={handleManualEntry}
              style={[styles.modernChoiceBtn, styles.primaryChoiceBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            >
              <View style={styles.choiceBtnIconContainer}>
                <Ionicons name="create-outline" size={18} color="#fff" />
              </View>
              <Text style={styles.modernChoiceBtnTitle}>Manual Entry</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickDocument}
              style={[styles.modernChoiceBtn, styles.secondaryChoiceBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <View style={[styles.choiceBtnIconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.modernChoiceBtnTitle, { color: theme.text }]}>Upload JSON File</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setChoiceModalVisible(false)}
              style={{ marginTop: 12, padding: 8 }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  backButton: { padding: 2 },
  addButton: { padding: 2 },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInput: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
  },
  content: { padding: 12, paddingTop: 8 },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 70,
  },
  idBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1e40af',
    textAlign: 'center',
  },
  gradeBadge: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 50,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9f1239',
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  details: { fontSize: 10, marginBottom: 1 },
  cardActions: { flexDirection: 'row', gap: 12, paddingLeft: 8, alignItems: 'center' },
  actionBtn: { padding: 6, borderRadius: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  filterScroll: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  choiceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  primaryChoiceBtn: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryChoiceBtn: {
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  choiceBtnIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  choiceBtnTextContainer: {
    flex: 1,
  },
  modernChoiceBtnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  // Modern Compact View Modal
  viewModalContent: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    maxWidth: 340,
    width: '90%',
  },
  viewModalHeader: {
    height: 60,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingProfileSection: {
    alignItems: 'center',
    marginTop: -30,
    paddingBottom: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  modalIdBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e40af',
    textAlign: 'center',
  },
  modalGradeBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalGradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9f1239',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  studentGrade: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  infoSection: {
    padding: 12,
    paddingTop: 0,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoTextContainer: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  compactValue: {
    fontSize: 13,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
});
