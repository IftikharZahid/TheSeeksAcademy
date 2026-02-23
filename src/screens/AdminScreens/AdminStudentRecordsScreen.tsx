import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image, Pressable, Dimensions, Platform, StatusBar, Keyboard, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db, firebaseConfig } from '../../api/firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp, query, where, getDocs, updateDoc, getDoc, collection } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useAppSelector } from '../../store/hooks';
import type { AdminStudent } from '../../store/slices/adminSlice';

// Student interface imported from adminSlice (as AdminStudent)

export const AdminStudentRecordsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  // Read students from Redux (listener initialized in AdminDashboard)
  const students = useAppSelector(state => state.admin.students) as AdminStudent[];
  const loading = useAppSelector(state => state.admin.studentsLoading);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null);
  const [viewingStudent, setViewingStudent] = useState<AdminStudent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  // Form State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [gender, setGender] = useState('');
  const [section, setSection] = useState('');
  const [session, setSession] = useState('');
  const [phone, setPhone] = useState('');
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [filterClass, setFilterClass] = useState('All');

  const classOptions = ['9th', '10th', '1st Year', '2nd Year'];
  const genderOptions = ['Male', 'Female'];
  const filterOptions = ['All', ...classOptions];

  // No need for useEffect listener — adminSlice listener runs from AdminDashboard

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

  // Create Firebase Auth user + profile doc via secondary app (admin stays logged in)
  const createStudentAuthAccount = async (
    studentEmail: string,
    studentPassword: string,
    studentName: string,
    studentFatherName: string,
    studentGrade: string,
    studentImage: string,
    studentGender: string,
    studentSection: string,
    studentSession: string,
    studentPhone: string,
    studentRollNo: string,
  ): Promise<string | null> => {
    let secondaryApp;
    try {
      // Use a secondary Firebase app so admin is NOT signed out
      secondaryApp = initializeApp(firebaseConfig, `studentCreation_${Date.now()}`);
      const secondaryAuth = initializeAuth(secondaryApp);

      // Create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        studentEmail,
        studentPassword
      );
      const uid = userCredential.user.uid;
      console.log('✅ Student Auth account created, UID:', uid);

      // Create a profile document in studentsprofile collection
      await setDoc(doc(db, 'studentsprofile', uid), {
        fullname: studentName,
        fathername: studentFatherName,
        email: studentEmail,
        phone: studentPhone || '',
        rollno: studentRollNo || '',
        class: studentGrade || '',
        section: studentSection || '',
        session: studentSession || '',
        image: studentImage || '',
        gender: studentGender || '',
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Student profile doc created');

      return uid;
    } catch (error: any) {
      console.error('❌ Error creating student auth account:', error);
      throw error;
    } finally {
      // Always clean up the secondary app
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (_) { }
      }
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
        const studentData: Record<string, any> = {
          name,
          fatherName,
          studentId,
          email,
          grade: grade || 'N/A',
          profileImage: profileImage || '',
          gender: gender || '',
          section: section || '',
          session: session || '',
          phone: phone || '',
          updatedAt: serverTimestamp(),
        };
        // Only include password if it has a value (avoid undefined)
        if (password) studentData.password = password;
        await setDoc(doc(db, 'students', editingStudent.id), studentData, { merge: true });
        Alert.alert('Success', 'Student updated successfully');
      } else {
        // Adding new student - auto-generate ID, email, and password
        const newStudentId = await getNextStudentId();
        const newEmail = `${newStudentId}@theseeksacademy.edu.pk`;
        const newPassword = generatePassword();

        // 1. Create Firebase Auth user + profile doc (admin stays logged in)
        const uid = await createStudentAuthAccount(
          newEmail,
          newPassword,
          name,
          fatherName,
          grade,
          profileImage,
          gender,
          section,
          session,
          phone,
          newStudentId
        );

        // 2. Save to the students collection
        const studentData = {
          name,
          fatherName,
          studentId: newStudentId,
          email: newEmail,
          password: newPassword,
          grade: grade || 'N/A',
          profileImage: profileImage || '',
          gender: gender || '',
          section: section || '',
          session: session || '',
          phone: phone || '',
          uid: uid || '',
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'students', newStudentId), studentData);
        Alert.alert(
          'Success',
          `Student added successfully!\n\nStudent ID: ${newStudentId}\nEmail: ${newEmail}\nPassword: ${newPassword}\n\nThe student can now log in with these credentials.`
        );
      }

      setModalVisible(false);
      resetForm();
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'An account with this email already exists.');
      } else {
        Alert.alert('Error', 'Failed to save student. Please try again.');
      }
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

  const copyStudentRecord = async (student: AdminStudent) => {
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
        type: [
          'application/json',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      setUploading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      let fileUri = asset.uri;
      if (fileUri.startsWith('content://')) {
        const ext = asset.name.endsWith('.json') ? '.json' : '.xlsx';
        const tempUri = FileSystem.documentDirectory + 'temp_student_upload_' + Date.now() + ext;
        await FileSystem.copyAsync({ from: fileUri, to: tempUri });
        fileUri = tempUri;
      }

      let data: any[] = [];

      if (asset.name.endsWith('.json')) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        try {
          data = JSON.parse(fileContent);
        } catch (parseError) {
          Alert.alert('JSON Error', 'The file content is not valid JSON.');
          setUploading(false);
          return;
        }
      } else if (asset.name.endsWith('.xlsx') || asset.name.endsWith('.xls')) {
        try {
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          const workbook = XLSX.read(fileContent, { type: 'base64' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(sheet);
        } catch (excelError) {
          console.error('Excel parse error:', excelError);
          Alert.alert('Excel Error', 'Failed to parse Excel file.');
          setUploading(false);
          return;
        }
      } else {
        Alert.alert('Error', 'Unsupported file type. Please upload a JSON or Excel file.');
        setUploading(false);
        return;
      }

      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Invalid format. The root must be an array of student records.');
        setUploading(false);
        return;
      }

      let addedCount = 0;
      let errorCount = 0;
      setUploadProgress(0);
      setUploadTotal(data.length);

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.name && item.studentId && item.email) {
          try {
            const docId = item.studentId.toString();
            await setDoc(doc(db, 'students', docId), {
              name: item.name,
              fatherName: item.fatherName || '',
              studentId: item.studentId,
              email: item.email,
              grade: item.grade || item.class || 'N/A',
              gender: item.gender || '',
              section: item.section || '',
              session: item.session || '',
              phone: item.phone || '',
              rollno: item.rollno || '',
              profileImage: item.profileImage || '',
              updatedAt: serverTimestamp(),
            }, { merge: true });

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
            console.error('Error adding student:', item, err);
            errorCount++;
          }
        } else {
          errorCount++;
        }
        setUploadProgress(i + 1);
      }

      Alert.alert('Upload Complete', `Successfully added/updated ${addedCount} students.\nFailed/Skipped: ${errorCount}`);

    } catch (error: any) {
      console.error('File upload error:', error);
      Alert.alert('Error', `Failed to process the file: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadTotal(0);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const sampleData = [
        {
          name: 'Ahmed Ali',
          fatherName: 'Ali Khan',
          studentId: 'STD-001',
          email: 'ahmed@school.com',
          grade: '9th',
          gender: 'Male',
          section: 'A',
          session: '2024-2025',
          phone: '03001234567',
          rollno: '101',
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = FileSystem.documentDirectory + 'Student_Record_Template.xlsx';

      await FileSystem.writeAsStringAsync(filename, base64, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filename);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      console.error('Template download error:', error);
      Alert.alert('Error', 'Failed to generate template');
    }
  };

  const handleManualEntry = () => {
    setChoiceModalVisible(false);
    resetForm();
    setModalVisible(true);
  };

  const openViewModal = (student: AdminStudent) => {
    setEditingStudent(student);
    setName(student.name);
    setFatherName(student.fatherName);
    setStudentId(student.studentId);
    setEmail(student.email);
    setPassword(student.password);
    setGrade(student.grade);
    setProfileImage(student.profileImage || '');
    setGender(student.gender || '');
    setSection(student.section || '');
    setSession(student.session || '');
    setPhone(student.phone || '');
    setModalVisible(true);
  };

  const openModal = (student?: AdminStudent) => {
    if (student) {
      setEditingStudent(student);
      setName(student.name);
      setFatherName(student.fatherName);
      setStudentId(student.studentId);
      setEmail(student.email);
      setPassword(student.password);
      setGrade(student.grade);
      setProfileImage(student.profileImage || '');
      setGender(student.gender || '');
      setSection(student.section || '');
      setSession(student.session || '');
      setPhone(student.phone || '');
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
    setGender('');
    setSection('');
    setSession('');
    setPhone('');
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'All' || s.grade === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
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
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
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
        <View style={styles.skeletonContainer}>
          {/* Skeleton Header */}
          <View style={styles.skeletonHeaderRow}>
            <SkeletonBlock width={140} height={14} borderRadius={4} theme={theme} />
          </View>
          {/* Skeleton Cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.card }]}>
              {/* Serial Number */}
              <SkeletonBlock width={22} height={22} borderRadius={11} theme={theme} style={{ marginRight: 8 }} />
              {/* Avatar */}
              <SkeletonBlock width={44} height={44} borderRadius={22} theme={theme} style={{ marginRight: 10 }} />
              {/* Text Lines */}
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="70%" height={12} borderRadius={4} theme={theme} style={{ marginBottom: 6 }} />
                <SkeletonBlock width="50%" height={9} borderRadius={3} theme={theme} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="40%" height={9} borderRadius={3} theme={theme} />
              </View>
              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 8 }}>
                <SkeletonBlock width={28} height={28} borderRadius={6} theme={theme} />
                <SkeletonBlock width={28} height={28} borderRadius={6} theme={theme} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredStudents.slice(0, visibleCount)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <Text style={[styles.listTitle, { color: theme.text }]}>Students List ({filteredStudents.length})</Text>
          }
          ListEmptyComponent={
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No students found.</Text>
          }
          ListFooterComponent={
            visibleCount < filteredStudents.length ? (
              <TouchableOpacity
                onPress={() => setVisibleCount(prev => prev + 10)}
                style={{ alignItems: 'center', paddingVertical: 14, marginBottom: 10 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                  Load more ({filteredStudents.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            ) : null
          }
          onEndReached={() => {
            if (visibleCount < filteredStudents.length) {
              setVisibleCount(prev => prev + 10);
            }
          }}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) => (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
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
          )}
        />
      )}

      {/* Edit/Add Modal - Full Screen Modern Form */}
      <Modal visible={modalVisible} animationType="slide" statusBarTranslucent>
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.formHeader}
          >
            <TouchableOpacity
              onPress={() => { setModalVisible(false); resetForm(); }}
              style={styles.formHeaderBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.formHeaderCenter}>
              <Text style={styles.formHeaderTitle}>{editingStudent ? 'Edit Student' : 'Add Student'}</Text>
              <Text style={styles.formHeaderSubtitle}>
                {editingStudent ? 'Update student information' : 'Fill in the details below'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSaveStudent} style={styles.formHeaderSaveBtn}>
              <Ionicons name="checkmark" size={20} color="#667eea" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.formScrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Preview */}
            <View style={styles.formProfileSection}>
              <View style={[styles.formAvatar, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.formAvatarImage} />
                ) : (
                  <Ionicons name="person" size={36} color={theme.primary} />
                )}
              </View>
              <Text style={[styles.formAvatarHint, { color: theme.textSecondary }]}>Student Photo</Text>
            </View>

            {/* Student Info Section */}
            <Text style={[styles.formSectionTitle, { color: theme.text }]}>Student Information</Text>

            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              {/* Full Name */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="person" size={16} color="#667eea" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. Ahmed Ali"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Father Name */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="people" size={16} color="#f59e0b" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Father Name *</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. Ali Khan"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={fatherName}
                    onChangeText={setFatherName}
                  />
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Profile Image URL */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="image" size={16} color="#10b981" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Profile Image URL</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="https://example.com/photo.jpg"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={profileImage}
                    onChangeText={setProfileImage}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Grade/Class Picker */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#fce7f3' }]}>
                  <Ionicons name="school" size={16} color="#ec4899" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Grade / Class</Text>
                  <TouchableOpacity
                    onPress={() => setClassPickerVisible(true)}
                    style={[styles.formPickerBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: grade ? theme.text : theme.textSecondary + '80', fontSize: 14, flex: 1 }}>
                      {grade || 'Select class'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Gender Picker */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#e0f2fe' }]}>
                  <Ionicons name="male-female" size={16} color="#0284c7" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Gender</Text>
                  <TouchableOpacity
                    onPress={() => setGenderPickerVisible(true)}
                    style={[styles.formPickerBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: gender ? theme.text : theme.textSecondary + '80', fontSize: 14, flex: 1 }}>
                      {gender || 'Select gender'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Additional Details Section */}
            <Text style={[styles.formSectionTitle, { color: theme.text, marginTop: 20 }]}>Additional Details</Text>

            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              {/* Section */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="albums" size={16} color="#f59e0b" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Section</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. A"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={section}
                    onChangeText={setSection}
                  />
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Session */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="calendar" size={16} color="#8b5cf6" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Session</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. 2025-2026"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={session}
                    onChangeText={setSession}
                  />
                </View>
              </View>

              <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

              {/* Phone */}
              <View style={styles.formInputRow}>
                <View style={[styles.formInputIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="call" size={16} color="#3b82f6" />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. 03001234567"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* Auto-generated Fields (Editing Only) */}
            {editingStudent && (
              <>
                <Text style={[styles.formSectionTitle, { color: theme.text, marginTop: 20 }]}>System Information</Text>

                <View style={[styles.formCard, { backgroundColor: theme.card }]}>
                  <View style={styles.formInputRow}>
                    <View style={[styles.formInputIcon, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons name="id-card" size={16} color="#3b82f6" />
                    </View>
                    <View style={styles.formInputContainer}>
                      <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Student ID</Text>
                      <View style={[styles.formReadOnlyField, { backgroundColor: theme.background }]}>
                        <Text style={[styles.formReadOnlyText, { color: theme.textSecondary }]}>{studentId}</Text>
                        <Ionicons name="lock-closed" size={14} color={theme.textSecondary + '60'} />
                      </View>
                    </View>
                  </View>

                  <View style={[styles.formDivider, { backgroundColor: theme.border + '50' }]} />

                  <View style={styles.formInputRow}>
                    <View style={[styles.formInputIcon, { backgroundColor: '#dcfce7' }]}>
                      <Ionicons name="mail" size={16} color="#10b981" />
                    </View>
                    <View style={styles.formInputContainer}>
                      <Text style={[styles.formInputLabel, { color: theme.textSecondary }]}>Email</Text>
                      <View style={[styles.formReadOnlyField, { backgroundColor: theme.background }]}>
                        <Text style={[styles.formReadOnlyText, { color: theme.textSecondary }]} numberOfLines={1}>{email}</Text>
                        <Ionicons name="lock-closed" size={14} color={theme.textSecondary + '60'} />
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Auto-generated Note (New Student Only) */}
            {!editingStudent && (
              <View style={[styles.formInfoNote, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                <Ionicons name="information-circle" size={18} color="#667eea" />
                <Text style={styles.formInfoNoteText}>
                  Student ID, Email, and Password will be auto-generated upon saving.
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity onPress={handleSaveStudent} activeOpacity={0.85}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.formSaveButton}
              >
                <Ionicons name={editingStudent ? 'checkmark-circle' : 'person-add'} size={20} color="#fff" />
                <Text style={styles.formSaveButtonText}>
                  {editingStudent ? 'Update Student' : 'Save Student'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setModalVisible(false); resetForm(); }}
              style={styles.formCancelButton}
            >
              <Text style={[styles.formCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
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


      {/* Upload Progress Modal */}
      <Modal visible={uploading} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="cloud-upload" size={28} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 4 }}>Uploading Students</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 20 }}>
              {uploadTotal > 0 ? `${uploadProgress} / ${uploadTotal} students` : 'Parsing file...'}
            </Text>

            {/* Progress bar */}
            <View style={{ width: '100%', height: 8, backgroundColor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <View
                style={{
                  height: '100%',
                  width: uploadTotal > 0 ? `${Math.round((uploadProgress / uploadTotal) * 100)}%` : '0%',
                  backgroundColor: theme.primary,
                  borderRadius: 4,
                }}
              />
            </View>

            {/* Percentage */}
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.primary }}>
              {uploadTotal > 0 ? `${Math.round((uploadProgress / uploadTotal) * 100)}%` : '0%'}
            </Text>
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
              <Text style={[styles.modernChoiceBtnTitle, { color: theme.text }]}>Upload File (JSON/Excel)</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownloadTemplate}
              style={[styles.modernChoiceBtn, styles.secondaryChoiceBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <View style={[styles.choiceBtnIconContainer, { backgroundColor: '#16a34a15' }]}>
                <Ionicons name="download-outline" size={18} color="#16a34a" />
              </View>
              <Text style={[styles.modernChoiceBtnTitle, { color: theme.text }]}>Download Template</Text>
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

      {/* Gender Picker Modal */}
      <Modal
        visible={genderPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGenderPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setGenderPickerVisible(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Gender</Text>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.pickerOption, { backgroundColor: gender === option ? theme.primary + '15' : 'transparent' }]}
                onPress={() => {
                  setGender(option);
                  setGenderPickerVisible(false);
                }}
              >
                <Text style={[styles.pickerOptionText, {
                  color: gender === option ? theme.primary : theme.text
                }]}>
                  {option}
                </Text>
                {gender === option && (
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
  // Full-Screen Add/Edit Form Styles
  fullScreenModal: {
    flex: 1,
  },
  formHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 30) + 10,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  formHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  formHeaderSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  formScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formProfileSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  formAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  formAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  formAvatarHint: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  formCard: {
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  formInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formInputIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  formInputContainer: {
    flex: 1,
  },
  formInputLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formInput: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  formPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  formDivider: {
    height: 1,
    marginHorizontal: 12,
  },
  formReadOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  formReadOnlyText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  formInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  formInfoNoteText: {
    fontSize: 12,
    color: '#4338ca',
    flex: 1,
    fontWeight: '500',
    lineHeight: 17,
  },
  formSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  formSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  formCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  formCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  // Skeleton Loader Styles
  skeletonContainer: {
    padding: 12,
    paddingTop: 8,
  },
  skeletonHeaderRow: {
    marginBottom: 12,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});

// --- Skeleton Shimmer Block Component ---
const SkeletonBlock: React.FC<{
  width: number | string;
  height: number;
  borderRadius: number;
  theme: any;
  style?: any;
}> = ({ width, height, borderRadius, theme, style }) => {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.textSecondary || '#ccc',
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
};
