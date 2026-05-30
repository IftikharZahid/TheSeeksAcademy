import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image, Pressable, Dimensions, Platform, StatusBar, Keyboard, Animated, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db, firebaseConfig } from '../../api/firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, createUserWithEmailAndPassword } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [refreshing, setRefreshing] = useState(false);

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

  // Bulk account creation state
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [acctProgress, setAcctProgress] = useState(0);
  const [acctTotal, setAcctTotal] = useState(0);

  const classOptions = ['9th', '10th', '1st Year', '2nd Year'];
  const genderOptions = ['Male', 'Female'];
  const filterOptions = ['All', ...classOptions];

  // No need for useEffect listener — adminSlice listener runs from AdminDashboard

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Since students are managed by Redux listener,
    // a refresh here would typically re-fetch or trigger the listener.
    // For now, we just simulate a delay or rely on the listener to update.
    // If you had a direct fetch function, you'd call it here.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    setRefreshing(false);
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
      const secondaryAuth = initializeAuth(secondaryApp, {
        persistence: getReactNativePersistence(AsyncStorage)
      });

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

  const cancelAccountCreation = useRef(false);

  // Bulk-create login accounts for existing students who don't have one
  const handleCreateAccountsForExisting = () => {
    // Collect students with email
    const studentsWithEmail = students.filter(s => (s.email || '').trim().length > 0);
    const studentsMissingPassword = studentsWithEmail.filter(s => !(s.password || '').trim());
    const studentsWithPassword = studentsWithEmail.length - studentsMissingPassword.length;

    if (studentsWithEmail.length === 0) {
      Alert.alert('No Emails', 'No student emails found in existing records.');
      return;
    }

    if (studentsMissingPassword.length === 0) {
      Alert.alert('All Accounts Setup', `All ${studentsWithEmail.length} students with emails already have login credentials set up.`);
      return;
    }

    Alert.alert(
      'Create Accounts',
      `Found ${studentsWithEmail.length} total students with emails.\n\n` +
      `Already setup: ${studentsWithPassword}\n` +
      `Need accounts: ${studentsMissingPassword.length}\n\n` +
      `Generate new login credentials for the ${studentsMissingPassword.length} missing accounts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create', style: 'default', onPress: async () => {
            setCreatingAccounts(true);
            setAcctTotal(studentsWithEmail.length);
            setAcctProgress(0);
            cancelAccountCreation.current = false;

            let created = 0;
            let skipped = 0;
            let failed = 0;
            let processed = 0;
            let credentialsText = "Student Credentials Report:\n\n";
            let newlyCreatedText = "--- New Accounts Created ---\n";
            let existingAccountsText = "\n--- Already Existing Accounts ---\n";
            let failedAccountsText = "\n--- Failed to Create ---\n";

            for (const s of studentsMissingPassword) {
              if (cancelAccountCreation.current) {
                break;
              }

              const email = (s.email || '').trim().toLowerCase();
              let secondaryApp;
              try {
                // Check if profile already exists
                const existing = await getDocs(
                  query(collection(db, 'studentsprofile'), where('email', '==', email))
                );
                if (!existing.empty) {
                  skipped++;
                  existingAccountsText += `Name: ${s.name}\nEmail: ${email}\nPassword: ${s.password || 'Unknown (Check DB)'}\n\n`;
                } else {
                  const pwd = generatePassword();
                  secondaryApp = initializeApp(firebaseConfig, `bulkAcct_${Date.now()}_${processed}`);
                  const secondaryAuth = initializeAuth(secondaryApp, {
                    persistence: getReactNativePersistence(AsyncStorage)
                  });
                  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pwd);
                  const uid = userCredential.user.uid;

                  await setDoc(doc(db, 'studentsprofile', uid), {
                    fullname: s.name || '',
                    fathername: s.fatherName || '',
                    email: email,
                    phone: s.phone || '',
                    rollno: s.studentId || '',
                    class: s.grade || '',
                    section: s.section || '',
                    session: s.session || '',
                    image: s.profileImage || '',
                    gender: s.gender || '',
                    role: 'student',
                    password: pwd,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });

                  // Also update the student doc with the generated password
                  await setDoc(doc(db, 'students', s.id), { password: pwd, uid: uid }, { merge: true });

                  newlyCreatedText += `Name: ${s.name}\nEmail: ${email}\nPassword: ${pwd}\n\n`;
                  created++;
                }
              } catch (err: any) {
                if (err?.code === 'auth/email-already-in-use') {
                  skipped++;
                  existingAccountsText += `Name: ${s.name}\nEmail: ${email}\nReason: Already exists in Authentication (Password unknown)\n\n`;
                } else {
                  console.warn('Bulk account error for', email, err?.message);
                  failed++;
                  failedAccountsText += `Name: ${s.name}\nEmail: ${email}\nReason: ${err?.message || 'Unknown Error'}\n\n`;
                }
              } finally {
                if (secondaryApp) {
                  try { await deleteApp(secondaryApp); } catch (_) { }
                }
              }
              processed++;
              setAcctProgress(processed);
            }

            setCreatingAccounts(false);
            setAcctProgress(0);
            setAcctTotal(0);

            if (created > 0) credentialsText += newlyCreatedText;
            if (skipped > 0) credentialsText += existingAccountsText;
            if (failed > 0) credentialsText += failedAccountsText;

            const buttons: any[] = [{ text: 'OK', style: 'default' }];
            if (created > 0 || skipped > 0 || failed > 0) {
              buttons.push({
                text: 'Copy Report',
                onPress: async () => {
                  try {
                    await Clipboard.setStringAsync(credentialsText);
                    Alert.alert('Copied!', 'Credentials report copied to clipboard');
                  } catch (err) {
                    Alert.alert('Error', 'Failed to copy credentials');
                  }
                }
              });
            }

            Alert.alert(
              cancelAccountCreation.current ? 'Creation Cancelled' : 'Accounts Created',
              `Processed: ${processed}/${studentsMissingPassword.length}\nCreated: ${created}\nAlready existed: ${skipped}\nFailed: ${failed}`,
              buttons
            );
          }
        },
      ]
    );
  };

  const handleCopyExistingCredentials = async () => {
    const studentsWithCredentials = students.filter(s => s.email && s.password);

    if (studentsWithCredentials.length === 0) {
      Alert.alert('No Credentials', 'No existing student credentials found.');
      return;
    }

    let credentialsText = "All Existing Student Credentials:\n\n";
    studentsWithCredentials.forEach(s => {
      credentialsText += `Name: ${s.name}\nEmail: ${s.email}\nPassword: ${s.password}\n\n`;
    });

    try {
      await Clipboard.setStringAsync(credentialsText);
      Alert.alert('Copied!', `Copied credentials for ${studentsWithCredentials.length} students to clipboard.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy credentials.');
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity onPress={handleCopyExistingCredentials} style={styles.addButton}>
            <Ionicons name="copy-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateAccountsForExisting} style={styles.addButton} disabled={creatingAccounts}>
            <Ionicons name="key" size={20} color={creatingAccounts ? theme.textSecondary : '#f59e0b'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
            <Ionicons name="add" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search students..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={15} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
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

      {/* Account Creation Progress */}
      {creatingAccounts && acctTotal > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Creating Accounts...</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#f59e0b' }}>
                {acctProgress}/{acctTotal} ({acctTotal > 0 ? Math.round((acctProgress / acctTotal) * 100) : 0}%)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  cancelAccountCreation.current = true;
                }}
                style={{
                  backgroundColor: theme.error + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.error }}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border + '40', overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: '#f59e0b', width: `${acctTotal > 0 ? Math.min((acctProgress / acctTotal) * 100, 100) : 0}%` }} />
          </View>
          <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
            Creating login credentials for students...
          </Text>
        </View>
      )}

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
        <>
          {/* Compact Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.tableHeaderCell, { width: 26, color: theme.textSecondary }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2.2, color: theme.textSecondary }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center', color: theme.textSecondary }]}>CLASS</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'center', color: theme.textSecondary }]}>STUDENT ID</Text>
            <Text style={[styles.tableHeaderCell, { width: 56, textAlign: 'right', color: theme.textSecondary }]}>ACTIONS</Text>
          </View>
          <FlatList
            data={filteredStudents.slice(0, visibleCount)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tableContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={
              <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No students found.</Text>
            }
            ListFooterComponent={
              visibleCount < filteredStudents.length ? (
                <TouchableOpacity
                  onPress={() => setVisibleCount(prev => prev + 20)}
                  style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
                    Load {Math.min(20, filteredStudents.length - visibleCount)} more  ({filteredStudents.length - visibleCount} remaining)
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            onEndReached={() => {
              if (visibleCount < filteredStudents.length) {
                setVisibleCount(prev => prev + 20);
              }
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item, index }) => {
              const isEven = index % 2 === 0;
              const initials = (item.name || '?').charAt(0).toUpperCase();
              return (
                <Pressable
                  onPress={() => openModal(item)}
                  onLongPress={() => copyStudentRecord(item)}
                  delayLongPress={500}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: isEven ? theme.card : theme.background,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  {/* Serial */}
                  <Text style={{ width: 26, fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                    {index + 1}
                  </Text>
                  {/* Avatar + Name/Father */}
                  <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={[styles.tableAvatar, { backgroundColor: theme.primary + '18' }]}>
                      {item.profileImage ? (
                        <Image source={{ uri: item.profileImage }} style={{ width: 26, height: 26, borderRadius: 13 }} />
                      ) : (
                        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary }}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary }} numberOfLines={1}>
                        {item.fatherName || '—'}
                      </Text>
                    </View>
                  </View>
                  {/* Class */}
                  <Text style={{ flex: 1, fontSize: 11, color: theme.textSecondary, textAlign: 'center' }} numberOfLines={1}>
                    {item.grade || '—'}
                  </Text>
                  {/* Student ID */}
                  <Text style={{ flex: 1.4, fontSize: 10, color: theme.textSecondary, textAlign: 'center', fontFamily: 'monospace' }} numberOfLines={1}>
                    {item.studentId || '—'}
                  </Text>
                  {/* Actions */}
                  <View style={{ width: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => openModal(item)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil" size={14} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteStudent(item.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash" size={14} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            }}
          />
          {/* Count footer */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 10, color: theme.textSecondary, textAlign: 'center' }}>
              Showing {Math.min(visibleCount, filteredStudents.length)} of {filteredStudents.length} students
            </Text>
          </View>
        </>
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
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Student Info ─── */}
            <View style={[styles.cFormSection, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.cFormSectionHeader}>
                <Ionicons name="person-outline" size={13} color={theme.primary} />
                <Text style={[styles.cFormSectionTitle, { color: theme.primary }]}>Student Info</Text>
              </View>

              {/* Row 1: Full Name | Father Name */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="Ahmed Ali"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Father Name *</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="Ali Khan"
                    placeholderTextColor={theme.textSecondary}
                    value={fatherName}
                    onChangeText={setFatherName}
                  />
                </View>
              </View>

              {/* Row 2: Class | Gender */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Class</Text>
                  <TouchableOpacity
                    onPress={() => setClassPickerVisible(true)}
                    style={[styles.cFormInput, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: grade ? theme.text : theme.textSecondary }} numberOfLines={1}>
                      {grade || 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Gender</Text>
                  <TouchableOpacity
                    onPress={() => setGenderPickerVisible(true)}
                    style={[styles.cFormInput, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: gender ? theme.text : theme.textSecondary }} numberOfLines={1}>
                      {gender || 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 3: Section | Session */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Section</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="A"
                    placeholderTextColor={theme.textSecondary}
                    value={section}
                    onChangeText={setSection}
                  />
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Session</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="2025-2026"
                    placeholderTextColor={theme.textSecondary}
                    value={session}
                    onChangeText={setSession}
                  />
                </View>
              </View>

              {/* Row 4: Phone | Photo URL */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Phone</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="03001234567"
                    placeholderTextColor={theme.textSecondary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Photo URL</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="https://..."
                    placeholderTextColor={theme.textSecondary}
                    value={profileImage}
                    onChangeText={setProfileImage}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>


            {editingStudent && (
              <View style={[styles.cFormSection, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={styles.cFormSectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={theme.primary} />
                  <Text style={[styles.cFormSectionTitle, { color: theme.primary }]}>System Info</Text>
                  <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '12', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Ionicons name="lock-closed" size={9} color={theme.primary} style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.primary, textTransform: 'uppercase' }}>Read Only</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
                  {/* ID */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Ionicons name="id-card-outline" size={18} color="#6366f1" style={{ width: 28 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, width: 75, fontWeight: '500' }}>Student ID</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.text, fontFamily: 'monospace', fontWeight: '600' }} numberOfLines={1}>{studentId}</Text>
                    <TouchableOpacity 
                      onPress={async () => { await Clipboard.setStringAsync(studentId); Alert.alert('Copied', 'Student ID copied to clipboard'); }} 
                      style={{ padding: 6, backgroundColor: theme.primary + '10', borderRadius: 6 }}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                  {/* Email */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Ionicons name="mail-outline" size={18} color="#10b981" style={{ width: 28 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, width: 75, fontWeight: '500' }}>Email</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: '500' }} numberOfLines={1}>{email}</Text>
                    <TouchableOpacity 
                      onPress={async () => { await Clipboard.setStringAsync(email); Alert.alert('Copied', 'Email copied to clipboard'); }} 
                      style={{ padding: 6, backgroundColor: theme.primary + '10', borderRadius: 6 }}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                  {/* Password */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
                    <Ionicons name="key-outline" size={18} color="#f59e0b" style={{ width: 28 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, width: 75, fontWeight: '500' }}>Password</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.text, fontFamily: 'monospace', fontWeight: '600' }} numberOfLines={1}>{password || 'Not Set'}</Text>
                    <TouchableOpacity 
                      onPress={async () => { if(password){ await Clipboard.setStringAsync(password); Alert.alert('Copied', 'Password copied to clipboard'); } }} 
                      style={{ padding: 6, backgroundColor: theme.primary + '10', borderRadius: 6 }}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Bulk Copy Action */}
                <TouchableOpacity 
                  onPress={async () => {
                    const text = `Student ID: ${studentId}\nEmail: ${email}\nPassword: ${password || 'Not Set'}`;
                    await Clipboard.setStringAsync(text);
                    Alert.alert('Copied!', 'All credentials copied to clipboard');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary + '15', borderRadius: 8, paddingVertical: 10, marginTop: 12 }}
                >
                  <Ionicons name="copy" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>Copy All Credentials</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-generated Note (New Student Only) */}
            {!editingStudent && (
              <View style={[styles.formInfoNote, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                <Ionicons name="information-circle" size={16} color="#667eea" />
                <Text style={styles.formInfoNoteText}>
                  Student ID, Email &amp; Password will be auto-generated on save.
                </Text>
              </View>
            )}


            {/* Save Button */}
            <TouchableOpacity onPress={handleSaveStudent} activeOpacity={0.85} style={{ marginTop: 12 }}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.formSaveButton}
              >
                <Ionicons name={editingStudent ? 'checkmark-circle' : 'person-add'} size={18} color="#fff" />
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

                <View style={[styles.profileImageContainer, { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#ffffff', backgroundColor: theme.card, marginTop: -35, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 }]}>
                  {viewingStudent?.profileImage ? (
                    <Image
                      source={{ uri: viewingStudent.profileImage }}
                      style={{ width: '100%', height: '100%', borderRadius: 45 }}
                    />
                  ) : (
                    <Ionicons name="person" size={45} color={theme.primary} />
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
                    const credentials = `Email: ${viewingStudent?.email}\nPassword: ${viewingStudent?.password || 'N/A'}`;
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
                    if (viewingStudent?.password) {
                      await Clipboard.setStringAsync(viewingStudent.password);
                      Alert.alert('Copied!', 'Password copied to clipboard');
                    }
                  }}
                  delayLongPress={500}
                >
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Password</Text>
                  <Text style={[styles.compactValue, { color: theme.text }]}>{viewingStudent?.password || 'No Password Set'}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
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
  // Compact Form Styles (2-column grid)
  cFormSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cFormSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  cFormSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cFormRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cFormCol: {
    flex: 1,
  },
  cFormLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cFormInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  // Table Styles
  tableContent: { paddingBottom: 4 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  tableAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
