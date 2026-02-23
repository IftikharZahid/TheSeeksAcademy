import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db, firebaseConfig } from '../../api/firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp, getDocs, query, where, collection } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppSelector } from '../../store/hooks';
import type { AdminExam, AdminStudent } from '../../store/slices/adminSlice';
import type { Teacher } from '../../store/slices/teachersSlice';

// Teacher interface imported from teachersSlice
// AdminExam interface imported from adminSlice (aliased as ExamEntry locally if needed, but better to just use AdminExam)

interface BookEntry {
  name: string;
  totalMarks: string;
  obtainedMarks: string;
}

// We'll use AdminExam from slice, but map it if necessary or just use it directly. 
// AdminExam has slightly different optional fields but compatible.
type ExamEntry = AdminExam;

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Year', 'Final'];
const STATUS_OPTIONS = ['Pending', 'Pass', 'Fail', 'Absent'];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];

export const AdminExamsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  // Read exams from AdminSlice
  const exams = useAppSelector(state => state.admin.exams);
  const loading = useAppSelector(state => state.admin.examsLoading);

  // Read teachers (books) from TeachersSlice
  const teachers = useAppSelector(state => state.teachers.list);
  const books = teachers.filter(t => t.booktitle || t.subject).map(t => ({
    ...t,
    // Ensure compatibility if needed, though Teacher type should match
  })) as Teacher[];

  // Read students from AdminSlice for auto-fill
  const students = useAppSelector(state => state.admin.students) as AdminStudent[];

  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showUploadInstructions, setShowUploadInstructions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);

  // Options Modal State
  const [selectedExamForOptions, setSelectedExamForOptions] = useState<ExamEntry | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // When true, student info fields are locked (opened from T-navigation)
  const [studentInfoLocked, setStudentInfoLocked] = useState(false);

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSelected, setStudentSelected] = useState(false);

  // Filter State
  const [filterClass, setFilterClass] = useState('');
  const [filterTestNo, setFilterTestNo] = useState('');
  const [showFilterClassDropdown, setShowFilterClassDropdown] = useState(false);
  const [showFilterTestNoDropdown, setShowFilterTestNoDropdown] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date()); // Date Object
  const [showDatePicker, setShowDatePicker] = useState(false); // Picker Visibility
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Multi-book state
  const [entryBooks, setEntryBooks] = useState<BookEntry[]>([]);
  const [currentBookName, setCurrentBookName] = useState('');
  const [currentTotalMarks, setCurrentTotalMarks] = useState('');
  const [currentObtainedMarks, setCurrentObtainedMarks] = useState('');

  // Legacy single book state (for backward compatibility)
  const [bookName, setBookName] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [description, setDescription] = useState('');

  const handleSaveExam = async () => {
    // Format Date to String
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    if (!title || !category) {
      Alert.alert('Error', 'Please fill required fields (Title, Category)');
      return;
    }

    // Check for Duplicates
    const isDuplicate = exams.some(exam => {
      // Skip current item if editing
      if (editingExam && exam.id === editingExam.id) return false;

      return (
        exam.title === title &&
        exam.date === formattedDate &&
        (exam.bookName || '').trim() === (bookName || '').trim()
      );
    });

    if (isDuplicate) {
      Alert.alert('Duplicate Entry', 'An exam with this Title, Date, and Book Name already exists.');
      return;
    }

    // Calculate Status Automatically from books array or legacy fields
    let computedStatus = 'Absent';
    let totalObtained = 0;
    let totalPossible = 0;

    // Prefer entryBooks if available
    if (entryBooks.length > 0) {
      entryBooks.forEach(book => {
        const obtained = parseFloat(book.obtainedMarks);
        const total = parseFloat(book.totalMarks);
        if (!isNaN(obtained) && !isNaN(total)) {
          totalObtained += obtained;
          totalPossible += total;
        }
      });

      if (totalPossible > 0) {
        const percentage = (totalObtained / totalPossible) * 100;
        computedStatus = percentage >= 40 ? 'Pass' : 'Fail';
      }
    } else if (obtainedMarks && obtainedMarks.trim() !== '') {
      // Fallback to legacy single book
      const marks = parseFloat(obtainedMarks);
      if (!isNaN(marks)) {
        computedStatus = marks >= 40 ? 'Pass' : 'Fail';
      }
    }

    // Auto-calculate aggregated totals from books array
    const finalTotalMarks = entryBooks.length > 0 ? totalPossible.toString() : (totalMarks || '');
    const finalObtainedMarks = entryBooks.length > 0 ? totalObtained.toString() : (obtainedMarks || '');

    const examData = {
      title,
      date: formattedDate,
      category,
      rollNo: rollNo || '',
      studentName: studentName || '',
      studentEmail: studentEmail || '',
      studentClass: studentClass || '',
      books: entryBooks.length > 0 ? entryBooks : undefined, // Only save if not empty
      bookName: bookName || '', // Legacy
      totalMarks: finalTotalMarks,
      obtainedMarks: finalObtainedMarks,
      status: computedStatus,
      description: description || '',
      updatedAt: serverTimestamp(),
    };

    console.log('📧 Saving exam with studentEmail:', studentEmail || '(empty)');
    console.log('📝 Full exam data:', { title, studentEmail, studentName, category });

    try {
      if (editingExam) {
        await setDoc(doc(db, 'exams', editingExam.id), examData, { merge: true });
        Alert.alert('Success', 'Entry updated successfully');
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'exams', newId), examData);
        Alert.alert('Success', 'Entry added successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry');
      console.error(error);
    }
  };

  const handleDeleteExam = async (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'exams', id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete entry');
          }
        }
      }
    ]);
  };

  const openModal = (exam?: ExamEntry) => {
    if (exam) {
      setEditingExam(exam);
      setTitle(exam.title);
      // Parse Date String back to Date Object if possible, else current date
      const parsedDate = new Date(exam.date);
      setDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);

      setCategory(exam.category || CATEGORIES[0]);
      setRollNo(exam.rollNo || '');
      setStudentName(exam.studentName || '');
      setStudentEmail(exam.studentEmail || '');
      setStudentClass(exam.studentClass || '');

      // Load books if available, otherwise use legacy single book
      if (exam.books && exam.books.length > 0) {
        setEntryBooks(exam.books);
        setBookName('');
        setTotalMarks('');
        setObtainedMarks('');
      } else {
        setEntryBooks([]);
        setBookName(exam.bookName || '');
        setTotalMarks(exam.totalMarks || '');
        setObtainedMarks(exam.obtainedMarks || '');
      }

      // Status is derived, no need to set state for it
      setDescription(exam.description);
      setModalVisible(true);
    } else {
      resetForm();
      setChoiceModalVisible(true);
    }
  };

  const resetForm = () => {
    setEditingExam(null);
    setTitle('');
    setDate(new Date());
    setCategory(CATEGORIES[0]);
    setRollNo('');
    setStudentName('');
    setStudentEmail('');
    setStudentClass('');
    setEntryBooks([]); // Clear books array
    setCurrentBookName('');
    setCurrentTotalMarks('');
    setCurrentObtainedMarks('');
    setBookName('');
    setTotalMarks('');
    setObtainedMarks('');
    setDescription('');
    setStudentSearchTerm('');
    setStudentInfoLocked(false);
    setStudentSelected(false);
  };

  const handleAddBook = () => {
    if (!currentBookName.trim()) {
      Alert.alert('Error', 'Please enter book name');
      return;
    }
    if (!currentTotalMarks.trim() || !currentObtainedMarks.trim()) {
      Alert.alert('Error', 'Please enter total marks and obtained marks');
      return;
    }

    // Check for duplicate book names
    const isDuplicate = entryBooks.some(
      book => book.name.toLowerCase() === currentBookName.trim().toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Duplicate Book', 'This book has already been added. Each book can only be added once.');
      return;
    }

    const newBook: BookEntry = {
      name: currentBookName.trim(),
      totalMarks: currentTotalMarks.trim(),
      obtainedMarks: currentObtainedMarks.trim(),
    };

    setEntryBooks([...entryBooks, newBook]);
    setCurrentBookName('');
    setCurrentTotalMarks('');
    setCurrentObtainedMarks('');
  };

  const handleRemoveBook = (index: number) => {
    setEntryBooks(entryBooks.filter((_, i) => i !== index));
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      setUploading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      // Handle temporary file copy for 'content://' URIs (common on Android)
      let fileUri = asset.uri;
      if (fileUri.startsWith('content://')) {
        const tempUri = FileSystem.documentDirectory + 'temp_exam_upload_' + Date.now() + (asset.name.endsWith('.json') ? '.json' : '.xlsx');
        await FileSystem.copyAsync({ from: fileUri, to: tempUri });
        fileUri = tempUri;
      }

      let data: any[] = [];

      // Detect file type and parse
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
          console.error("Excel parse error:", excelError);
          Alert.alert('Excel Error', 'Failed to parse Excel file.');
          setUploading(false);
          return;
        }
      } else {
        Alert.alert('Error', 'Unsupported file type. Please upload JSON or Excel file.');
        setUploading(false);
        return;
      }

      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Invalid JSON format. The root must be an array of exam records.');
        setUploading(false);
        return;
      }

      let addedCount = 0;
      let errorCount = 0;
      let accountsCreated = 0;
      const createdEmails = new Set<string>(); // track emails we've already processed
      setUploadTotal(data.length);
      setUploadProgress(0);

      // Helper: generate random password
      const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
        let pass = '';
        for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
        return pass;
      };

      // Detect subject columns: find all *_Total / *_Obtained header pairs
      const sampleRow = data[0] || {};
      const allKeys = Object.keys(sampleRow);
      const subjectNames: string[] = [];
      const totalSuffix = '_Total';
      const obtainedSuffix = '_Obtained';

      for (const key of allKeys) {
        if (key.endsWith(totalSuffix)) {
          const subject = key.slice(0, -totalSuffix.length);
          if (allKeys.includes(subject + obtainedSuffix)) {
            subjectNames.push(subject);
          }
        }
      }
      const hasMultiSubject = subjectNames.length > 0;

      for (const item of data) {
        if (item.title && item.category) {
          try {
            // Parse and format date
            let formattedDate = item.date;
            if (item.date) {
              const parsedDate = new Date(item.date);
              if (!isNaN(parsedDate.getTime())) {
                formattedDate = parsedDate.toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                });
              }
            }

            let books: { name: string; totalMarks: string; obtainedMarks: string }[] = [];
            let aggTotal = 0;
            let aggObtained = 0;
            let computedStatus = 'Absent';

            if (hasMultiSubject) {
              // Build books array from subject columns
              for (const subj of subjectNames) {
                const total = item[subj + totalSuffix];
                const obtained = item[subj + obtainedSuffix];
                if (total !== undefined && total !== '' && total !== null) {
                  const t = parseFloat(total) || 0;
                  const o = parseFloat(obtained) || 0;
                  books.push({
                    name: subj.replace(/_/g, ' '),
                    totalMarks: t.toString(),
                    obtainedMarks: o.toString(),
                  });
                  aggTotal += t;
                  aggObtained += o;
                }
              }

              if (aggTotal > 0) {
                const percentage = (aggObtained / aggTotal) * 100;
                computedStatus = percentage >= 40 ? 'Pass' : 'Fail';
              }
            } else {
              // Fallback: old single-book format
              if (item.obtainedMarks && item.obtainedMarks.toString().trim() !== '') {
                const marks = parseFloat(item.obtainedMarks);
                if (!isNaN(marks)) {
                  computedStatus = marks >= 40 ? 'Pass' : 'Fail';
                }
              }
            }

            const docId = Date.now().toString() + '_' + addedCount;
            const examDoc: any = {
              title: item.title,
              date: formattedDate,
              category: item.category,
              rollNo: item.rollNo || '',
              studentName: item.studentName || '',
              studentEmail: item.studentEmail || '',
              studentClass: item.studentClass || '',
              status: computedStatus,
              description: item.description || '',
              updatedAt: serverTimestamp(),
            };

            if (hasMultiSubject && books.length > 0) {
              examDoc.books = books;
              examDoc.totalMarks = aggTotal.toString();
              examDoc.obtainedMarks = aggObtained.toString();
              examDoc.bookName = books.map(b => b.name).join(', ');
            } else {
              examDoc.bookName = item.bookName || '';
              examDoc.totalMarks = item.totalMarks?.toString() || '';
              examDoc.obtainedMarks = item.obtainedMarks?.toString() || '';
            }

            await setDoc(doc(db, 'exams', docId), examDoc);
            addedCount++;

            // Create Firebase Auth account if student has email and not already created
            const email = (item.studentEmail || '').trim().toLowerCase();
            if (email && !createdEmails.has(email)) {
              createdEmails.add(email);
              let secondaryApp;
              try {
                // Check if profile already exists
                const existingProfile = await getDocs(
                  query(collection(db, 'studentsprofile'), where('email', '==', email))
                );
                if (existingProfile.empty) {
                  const password = generatePassword();
                  secondaryApp = initializeApp(firebaseConfig, `examStudent_${Date.now()}_${addedCount}`);
                  const secondaryAuth = initializeAuth(secondaryApp);
                  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                  const uid = userCredential.user.uid;

                  // Create studentsprofile doc
                  await setDoc(doc(db, 'studentsprofile', uid), {
                    fullname: item.studentName || '',
                    fathername: '',
                    email: email,
                    phone: '',
                    rollno: item.rollNo || '',
                    class: item.studentClass || '',
                    section: '',
                    session: '',
                    image: '',
                    gender: '',
                    role: 'student',
                    password: password,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });

                  // Update the exam doc with the generated password
                  await setDoc(doc(db, 'exams', docId), { studentPassword: password }, { merge: true });
                  accountsCreated++;
                }
              } catch (authErr: any) {
                console.warn('Could not create auth for', email, authErr?.message);
              } finally {
                if (secondaryApp) {
                  try { await deleteApp(secondaryApp); } catch (_) { }
                }
              }
            }

            setUploadProgress(addedCount + errorCount);
          } catch (err) {
            console.error('Error adding exam:', item, err);
            errorCount++;
          }
        } else {
          errorCount++;
          setUploadProgress(addedCount + errorCount);
        }
      }

      const subjectInfo = hasMultiSubject ? ` (${subjectNames.length} subjects detected)` : '';
      const accountInfo = accountsCreated > 0 ? `\nNew student accounts created: ${accountsCreated}` : '';
      Alert.alert('Upload Complete', `Successfully added ${addedCount} exam records${subjectInfo}.\nFailed/Skipped: ${errorCount}${accountInfo}`);

    } catch (error: any) {
      console.error("File upload error:", error);
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
          studentName: 'Ahmed Ali',
          fatherName: 'Ali Khan',
          rollNo: '101',
          studentClass: '9th',
          title: 'T1',
          category: 'Monthly',
          date: '2024-03-20',
          Urdu_Total: 100,
          Urdu_Obtained: 85,
          English_Total: 100,
          English_Obtained: 72,
          Computer_Total: 50,
          Computer_Obtained: 40,
          Physics_Total: 75,
          Physics_Obtained: 60,
          Biology_Total: 75,
          Biology_Obtained: 55,
          Math_Total: 100,
          Math_Obtained: 90,
          description: 'First Monthly Test',
        },
        {
          studentName: 'Sara Fatima',
          fatherName: 'Muhammad Iqbal',
          rollNo: '102',
          studentClass: '9th',
          title: 'T1',
          category: 'Monthly',
          date: '2024-03-20',
          Urdu_Total: 100,
          Urdu_Obtained: 78,
          English_Total: 100,
          English_Obtained: 65,
          Computer_Total: 50,
          Computer_Obtained: 35,
          Physics_Total: 75,
          Physics_Obtained: 50,
          Biology_Total: 75,
          Biology_Obtained: 60,
          Math_Total: 100,
          Math_Obtained: 70,
          description: 'First Monthly Test',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Exam Template');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = FileSystem.documentDirectory + 'Exam_Record_Template.xlsx';

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

  // Bulk-create login accounts for existing exam students who don't have one
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [acctProgress, setAcctProgress] = useState(0);
  const [acctTotal, setAcctTotal] = useState(0);

  const handleCreateAccountsForExisting = () => {
    // Collect unique emails from all exams
    const emailMap = new Map<string, { studentName: string; rollNo: string; studentClass: string }>();
    for (const e of exams) {
      const email = (e.studentEmail || '').trim().toLowerCase();
      if (email && !emailMap.has(email)) {
        emailMap.set(email, {
          studentName: e.studentName || '',
          rollNo: e.rollNo || '',
          studentClass: e.studentClass || '',
        });
      }
    }

    if (emailMap.size === 0) {
      Alert.alert('No Emails', 'No student emails found in existing records.');
      return;
    }

    Alert.alert(
      'Create Accounts',
      `Found ${emailMap.size} unique student email(s). Create login accounts for those who don't have one yet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create', style: 'default', onPress: async () => {
            setCreatingAccounts(true);
            setAcctTotal(emailMap.size);
            setAcctProgress(0);

            let created = 0;
            let skipped = 0;
            let failed = 0;
            let processed = 0;

            const generatePassword = () => {
              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
              let pass = '';
              for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
              return pass;
            };

            for (const [email, info] of emailMap) {
              let secondaryApp;
              try {
                // Check if profile already exists
                const existing = await getDocs(
                  query(collection(db, 'studentsprofile'), where('email', '==', email))
                );
                if (!existing.empty) {
                  skipped++;
                } else {
                  const password = generatePassword();
                  secondaryApp = initializeApp(firebaseConfig, `bulkAcct_${Date.now()}_${processed}`);
                  const secondaryAuth = initializeAuth(secondaryApp);
                  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                  const uid = userCredential.user.uid;

                  await setDoc(doc(db, 'studentsprofile', uid), {
                    fullname: info.studentName,
                    fathername: '',
                    email: email,
                    phone: '',
                    rollno: info.rollNo,
                    class: info.studentClass,
                    section: '',
                    session: '',
                    image: '',
                    gender: '',
                    role: 'student',
                    password: password,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  created++;
                }
              } catch (err: any) {
                console.warn('Bulk account error for', email, err?.message);
                failed++;
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
            Alert.alert(
              'Accounts Created',
              `Created: ${created}\nAlready existed: ${skipped}\nFailed: ${failed}`
            );
          }
        },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const filteredExams = (() => {
    const matched = exams.filter(e => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        (e.studentName || '').toLowerCase().includes(term) ||
        (e.rollNo || '').toLowerCase().includes(term) ||
        (e.title || '').toLowerCase().includes(term) ||
        (e.category || '').toLowerCase().includes(term);
      const matchesClass = filterClass ? e.studentClass === filterClass : true;
      const matchesTestNo = filterTestNo ? e.title === filterTestNo : true;
      return matchesSearch && matchesClass && matchesTestNo;
    });
    return matched;
  })();

  // Aggregate overall progress per student
  const studentProgressList = (() => {
    const map = new Map<string, {
      studentName: string; rollNo: string; studentClass: string;
      totalMarks: number; obtainedMarks: number; testCount: number; tests: string[];
      latestExam: ExamEntry;
    }>();
    for (const e of filteredExams) {
      const key = (e.rollNo || e.studentName || '') + '|' + (e.studentClass || '');
      const total = parseFloat(e.totalMarks || '0') || 0;
      const obtained = parseFloat(e.obtainedMarks || '0') || 0;
      const existing = map.get(key);
      if (existing) {
        existing.totalMarks += total;
        existing.obtainedMarks += obtained;
        existing.testCount += 1;
        if (e.title && !existing.tests.includes(e.title)) existing.tests.push(e.title);
      } else {
        map.set(key, {
          studentName: e.studentName || 'Unknown',
          rollNo: e.rollNo || '',
          studentClass: e.studentClass || '',
          totalMarks: total, obtainedMarks: obtained,
          testCount: 1, tests: e.title ? [e.title] : [],
          latestExam: e,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const pA = a.totalMarks > 0 ? (a.obtainedMarks / a.totalMarks) * 100 : 0;
      const pB = b.totalMarks > 0 ? (b.obtainedMarks / b.totalMarks) * 100 : 0;
      return pB - pA;
    });
  })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Exams & Results</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity onPress={handleCreateAccountsForExisting} style={styles.addButton} disabled={creatingAccounts}>
            <Ionicons name="key" size={20} color={creatingAccounts ? theme.textSecondary : '#f59e0b'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + Filters Row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, zIndex: 100, alignItems: 'center' }}>
        {/* Compact Search */}
        <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: searchTerm ? theme.primary : theme.border, paddingHorizontal: 8, height: 38 }}>
          <Ionicons name="search" size={15} color={theme.textSecondary} />
          <TextInput
            style={{ flex: 1, marginLeft: 6, color: theme.text, fontSize: 13, paddingVertical: 0 }}
            placeholder="Search..."
            placeholderTextColor={theme.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Class Filter */}
        <View style={{ flex: 1, position: 'relative' }}>
          <TouchableOpacity
            onPress={() => {
              setShowFilterClassDropdown(!showFilterClassDropdown);
              setShowFilterTestNoDropdown(false);
            }}
            style={[styles.selectInput, { marginBottom: 0, height: 38, backgroundColor: theme.card, borderColor: filterClass ? theme.primary : theme.border }]}
          >
            <Text style={{ color: filterClass ? theme.text : theme.textSecondary, flex: 1, fontSize: 12 }} numberOfLines={1}>
              {filterClass || "Class"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
          </TouchableOpacity>

          {showFilterClassDropdown && (
            <View style={{
              position: 'absolute', top: 40, left: 0, right: 0,
              backgroundColor: theme.card, borderRadius: 8, borderWidth: 1,
              borderColor: theme.border, shadowColor: '#000',
              shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 1000
            }}>
              <ScrollView style={{ maxHeight: 200 }}>
                {['All', ...CLASS_OPTIONS].map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
                    onPress={() => {
                      setFilterClass(option === 'All' ? '' : option);
                      setShowFilterClassDropdown(false);
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 13 }}>{option === 'All' ? 'All Classes' : option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Test No Filter */}
        <View style={{ flex: 1, position: 'relative' }}>
          <TouchableOpacity
            onPress={() => {
              setShowFilterTestNoDropdown(!showFilterTestNoDropdown);
              setShowFilterClassDropdown(false);
            }}
            style={[styles.selectInput, { marginBottom: 0, height: 38, backgroundColor: theme.card, borderColor: filterTestNo ? theme.primary : theme.border }]}
          >
            <Text style={{ color: filterTestNo ? theme.text : theme.textSecondary, flex: 1, fontSize: 12 }} numberOfLines={1}>
              {filterTestNo || "Test"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
          </TouchableOpacity>

          {showFilterTestNoDropdown && (
            <View style={{
              position: 'absolute', top: 40, left: 0, right: 0,
              backgroundColor: theme.card, borderRadius: 8, borderWidth: 1,
              borderColor: theme.border, shadowColor: '#000',
              shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 1000
            }}>
              <ScrollView style={{ maxHeight: 200 }}>
                {['All', ...TITLE_OPTIONS].map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
                    onPress={() => {
                      setFilterTestNo(option === 'All' ? '' : option);
                      setShowFilterTestNoDropdown(false);
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 13 }}>{option === 'All' ? 'All Tests' : option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Clear Filters */}
        {(filterClass || filterTestNo || searchTerm) && (
          <TouchableOpacity
            onPress={() => {
              setFilterClass('');
              setFilterTestNo('');
              setSearchTerm('');
            }}
            style={{
              width: 38, height: 38, borderRadius: 8,
              backgroundColor: theme.error + '15',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.error + '30'
            }}
          >
            <Ionicons name="close" size={18} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>
      {/* Upload Progress Overlay */}
      {uploading && uploadTotal > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Uploading Records...</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
              {uploadProgress}/{uploadTotal} ({uploadTotal > 0 ? Math.round((uploadProgress / uploadTotal) * 100) : 0}%)
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border + '40', overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: theme.primary, width: `${uploadTotal > 0 ? Math.min((uploadProgress / uploadTotal) * 100, 100) : 0}%` }} />
          </View>
          <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
            Please wait while records are being uploaded...
          </Text>
        </View>
      )}

      {/* Account Creation Progress */}
      {creatingAccounts && acctTotal > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Creating Accounts...</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#f59e0b' }}>
              {acctProgress}/{acctTotal} ({acctTotal > 0 ? Math.round((acctProgress / acctTotal) * 100) : 0}%)
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border + '40', overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 3, backgroundColor: '#f59e0b', width: `${acctTotal > 0 ? Math.min((acctProgress / acctTotal) * 100, 100) : 0}%` }} />
          </View>
          <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
            Creating login credentials for students...
          </Text>
        </View>
      )}
      {
        loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={studentProgressList.slice(0, visibleCount)}
            keyExtractor={(_, idx) => idx.toString()}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <Text style={[styles.listTitle, { color: theme.text }]}>Students ({studentProgressList.length})</Text>
            }
            ListEmptyComponent={
              <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No entries found.</Text>
            }
            ListFooterComponent={
              visibleCount < studentProgressList.length ? (
                <TouchableOpacity
                  onPress={() => setVisibleCount(prev => prev + 10)}
                  style={{ alignItems: 'center', paddingVertical: 14, marginBottom: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                    Load more ({studentProgressList.length - visibleCount} remaining)
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            onEndReached={() => {
              if (visibleCount < studentProgressList.length) {
                setVisibleCount(prev => prev + 10);
              }
            }}
            onEndReachedThreshold={0.3}
            renderItem={({ item: student }) => {
              const pct = student.totalMarks > 0 ? (student.obtainedMarks / student.totalMarks) * 100 : 0;
              const status = pct >= 40 ? 'Pass' : 'Fail';
              const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedExamForOptions(student.latestExam);
                    setShowOptionsModal(true);
                  }}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12, padding: 12, marginBottom: 10,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: barColor + '15',
                      alignItems: 'center', justifyContent: 'center', marginRight: 10,
                    }}>
                      <Ionicons name="person" size={18} color={barColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }} numberOfLines={1}>{student.studentName}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {student.rollNo || 'No ID'}{student.studentClass ? ` · ${student.studentClass}` : ''}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: barColor + '12',
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderRadius: 8, alignItems: 'center',
                      borderWidth: 1, borderColor: barColor + '20',
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: barColor }}>{pct.toFixed(0)}%</Text>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: barColor, textTransform: 'uppercase', letterSpacing: 0.3 }}>{status}</Text>
                    </View>
                  </View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.border + '40', marginTop: 10, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 3, backgroundColor: barColor, width: `${Math.min(pct, 100)}%` }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="documents-outline" size={11} color={theme.textSecondary} />
                      <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>{student.testCount} test{student.testCount > 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                      {student.obtainedMarks}/{student.totalMarks} marks
                    </Text>
                    {student.tests.length > 0 && (
                      <Text style={{ fontSize: 10, color: theme.textSecondary }} numberOfLines={1}>
                        {student.tests.sort((a, b) => (parseInt(a.replace('T', ''), 10) || 0) - (parseInt(b.replace('T', ''), 10) || 0)).join(', ')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      }

      {/* Edit/Add Modal */}
      {/* Edit/Add Modal - Full Screen Modern Form */}
      <Modal visible={modalVisible} animationType="slide" statusBarTranslucent>
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fsFormHeader}
          >
            <TouchableOpacity
              onPress={() => { setModalVisible(false); resetForm(); }}
              style={styles.fsFormHeaderBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.fsFormHeaderCenter}>
              <Text style={styles.fsFormHeaderTitle}>{editingExam ? 'Edit Record' : 'New Record'}</Text>
              <Text style={styles.fsFormHeaderSubtitle}>
                {editingExam ? 'Update exam details' : 'Enter student exam details'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSaveExam} style={styles.fsFormHeaderSaveBtn}>
              <Ionicons name="checkmark" size={20} color="#667eea" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.fsFormScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ═══ Student Info Section ═══ */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={14} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>Student Info</Text>
                {studentInfoLocked && (
                  <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '12', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Ionicons name="lock-closed" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Locked</Text>
                  </View>
                )}
              </View>

              {studentInfoLocked ? (
                /* ── Locked: Compact read-only student info strip ── */
                <View style={{ backgroundColor: theme.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name="person" size={16} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{studentName || 'Unknown'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                        {rollNo ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="id-card-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                            <Text style={{ fontSize: 11, color: theme.textSecondary }}>{rollNo}</Text>
                          </View>
                        ) : null}
                        {studentClass ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="school-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                            <Text style={{ fontSize: 11, color: theme.textSecondary }}>{studentClass}</Text>
                          </View>
                        ) : null}
                        {studentEmail ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="mail-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                            <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>{studentEmail}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                /* ── Unlocked: Full editable student info ── */
                <>
                  {/* Row: Search Student + Test No */}
                  <View style={styles.row}>
                    <View style={[styles.col, { flex: 0.65 }]}>
                      <Text style={[styles.label, { color: theme.text }]}>Search Student</Text>
                      <View style={[styles.selectInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="search" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                        <TextInput
                          style={{ flex: 1, fontSize: 13, color: theme.text, padding: 0 }}
                          placeholder="Name or ID..."
                          placeholderTextColor={theme.textSecondary}
                          value={studentSearchTerm}
                          onChangeText={(text) => {
                            setStudentSearchTerm(text);
                            setShowStudentDropdown(true);
                          }}
                          onFocus={() => {
                            setShowStudentDropdown(true);
                            setShowClassDropdown(false);
                            setShowTitleDropdown(false);
                            setShowBookDropdown(false);
                            setShowCategoryDropdown(false);
                          }}
                        />
                        {studentSearchTerm.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setStudentSearchTerm('');
                              setShowStudentDropdown(false);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={[styles.col, { flex: 0.35 }]}>
                      <Text style={[styles.label, { color: theme.text }]}>Test No.</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowTitleDropdown(!showTitleDropdown);
                          setShowClassDropdown(false);
                          setShowBookDropdown(false);
                          setShowStudentDropdown(false);
                          setShowCategoryDropdown(false);
                        }}
                        style={[styles.selectInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Text style={{ color: title ? theme.text : theme.textSecondary, fontSize: 13, flex: 1 }}>
                          {title || 'Select'}
                        </Text>
                        <Ionicons name={showTitleDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Student Dropdown Results */}
                  {showStudentDropdown && (() => {
                    const term = studentSearchTerm.toLowerCase();
                    const filtered = term.length === 0 ? students : students.filter(s =>
                      (s.name || '').toLowerCase().includes(term) ||
                      (s.studentId || '').toLowerCase().includes(term) ||
                      (s.email || '').toLowerCase().includes(term)
                    );
                    return (
                      <View style={[styles.inlineDropdown, { backgroundColor: theme.card, borderColor: theme.border, maxHeight: 200 }]}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {filtered.length === 0 ? (
                            <View style={{ padding: 14, alignItems: 'center' }}>
                              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No students found</Text>
                            </View>
                          ) : (
                            filtered.map((s) => (
                              <TouchableOpacity
                                key={s.id}
                                onPress={() => {
                                  setRollNo(s.studentId || '');
                                  setStudentName(s.name || '');
                                  setStudentEmail(s.email || '');
                                  setStudentClass(s.grade || '');
                                  setStudentSearchTerm(s.name || '');
                                  setShowStudentDropdown(false);
                                  setStudentSelected(true);
                                }}
                                style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                              >
                                <View style={styles.studentDropdownRow}>
                                  <View style={[styles.studentDropdownAvatar, { backgroundColor: theme.primary + '15' }]}>
                                    <Ionicons name="person" size={14} color={theme.primary} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{s.name}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                                      {s.studentId} · {s.grade || 'N/A'}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    );
                  })()}

                  {/* Title Dropdown Grid */}
                  {showTitleDropdown && (
                    <View style={[styles.inlineDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        <View style={styles.dropdownGrid}>
                          {TITLE_OPTIONS.map((t) => (
                            <TouchableOpacity
                              key={t}
                              onPress={() => {
                                setTitle(t);
                                setShowTitleDropdown(false);
                              }}
                              style={[
                                styles.dropdownGridItem,
                                { borderColor: theme.border },
                                title === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                              ]}
                            >
                              <Text style={{ color: title === t ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Student Info: Read-only strip when selected, editable otherwise */}
                  {studentSelected ? (
                    <View style={{ backgroundColor: theme.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.border, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Ionicons name="person" size={16} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{studentName || 'Unknown'}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                            {rollNo ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="id-card-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{rollNo}</Text>
                              </View>
                            ) : null}
                            {studentClass ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="school-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{studentClass}</Text>
                              </View>
                            ) : null}
                            {studentEmail ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="mail-outline" size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>{studentEmail}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setStudentSelected(false);
                            setStudentSearchTerm('');
                            setRollNo('');
                            setStudentName('');
                            setStudentEmail('');
                            setStudentClass('');
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.error + '12', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="close" size={14} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      {/* Row: Class, Roll No, Name */}
                      <View style={styles.row}>
                        <View style={[styles.col, { flex: 0.28 }]}>
                          <Text style={[styles.label, { color: theme.text }]}>Class</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setShowClassDropdown(!showClassDropdown);
                              setShowTitleDropdown(false);
                              setShowBookDropdown(false);
                              setShowStudentDropdown(false);
                            }}
                            style={[styles.selectInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                          >
                            <Text style={{ color: studentClass ? theme.text : theme.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                              {studentClass || 'Select'}
                            </Text>
                            <Ionicons name={showClassDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.col, { flex: 0.28 }]}>
                          <Text style={[styles.label, { color: theme.text }]}>Roll No</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="STD-..."
                            placeholderTextColor={theme.textSecondary}
                            value={rollNo}
                            onChangeText={setRollNo}
                          />
                        </View>
                        <View style={[styles.col, { flex: 0.44 }]}>
                          <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="Student Name"
                            placeholderTextColor={theme.textSecondary}
                            value={studentName}
                            onChangeText={setStudentName}
                          />
                        </View>
                      </View>

                      {/* Class Dropdown */}
                      {showClassDropdown && (
                        <View style={[styles.inlineDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <TouchableOpacity
                            onPress={() => {
                              setStudentClass('');
                              setShowClassDropdown(false);
                            }}
                            style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                          >
                            <Text style={{ color: theme.textSecondary, fontStyle: 'italic', fontSize: 13 }}>None</Text>
                          </TouchableOpacity>
                          {CLASS_OPTIONS.map((cls) => (
                            <TouchableOpacity
                              key={cls}
                              onPress={() => {
                                setStudentClass(cls);
                                setShowClassDropdown(false);
                              }}
                              style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{cls}</Text>
                                {studentClass === cls && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Email */}
                      <Text style={[styles.label, { color: theme.text }]}>Email (Optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: 2 }]}
                        placeholder="student@example.com"
                        placeholderTextColor={theme.textSecondary}
                        value={studentEmail}
                        onChangeText={setStudentEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </>
                  )}
                </>
              )}
            </View>

            {/* ═══ Exam Info Section ═══ */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={14} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>Exam Info</Text>
              </View>

              {/* Duplicate Warning */}
              {title && rollNo && !editingExam && (() => {
                const duplicate = exams.find(e => e.title === title && e.rollNo === rollNo);
                if (duplicate) {
                  return (
                    <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="warning" size={16} color="#856404" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#856404', fontSize: 12, flex: 1 }}>
                        This student already has a record for {title}. Saving will create a duplicate.
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              {/* Row: Category, Date */}
              <View style={styles.row}>
                <View style={[styles.col, { flex: 0.55 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCategoryDropdown(!showCategoryDropdown);
                      setShowTitleDropdown(false);
                      setShowClassDropdown(false);
                      setShowBookDropdown(false);
                      setShowStudentDropdown(false);
                    }}
                    style={[styles.selectInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={{ color: category ? theme.text : theme.textSecondary, fontSize: 13, flex: 1 }}>
                      {category || 'Select'}
                    </Text>
                    <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.col, { flex: 0.45 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.selectInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category Dropdown */}
              {showCategoryDropdown && (
                <View style={[styles.inlineDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{cat}</Text>
                        {category === cat && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date(2030, 11, 31)}
                  minimumDate={new Date(2020, 0, 1)}
                />
              )}
            </View>

            {/* ═══ Marks & Books Section ═══ */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="library-outline" size={14} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>Marks & Books</Text>
              </View>

              {/* Added Books List */}
              {entryBooks.length > 0 && (
                <View style={{ marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {entryBooks.map((book, index) => (
                    <View key={index} style={[styles.compactBookBadge, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '25' }]}>
                      <View>
                        <Text style={[styles.compactBookTitle, { color: theme.text }]}>{book.name}</Text>
                        <Text style={[styles.compactBookMarks, { color: theme.textSecondary }]}>
                          {book.obtainedMarks}/{book.totalMarks}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveBook(index)} style={{ marginLeft: 6 }}>
                        <Ionicons name="close-circle" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Book Row */}
              <View style={[styles.addBookRow, { borderColor: theme.border }]}>
                <View style={{ flex: 2, marginRight: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowBookDropdown(!showBookDropdown);
                      setShowTitleDropdown(false);
                      setShowClassDropdown(false);
                    }}
                    style={[styles.compactInput, { borderColor: theme.border, backgroundColor: theme.card, justifyContent: 'center' }]}
                  >
                    <Text style={{ color: currentBookName ? theme.text : theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
                      {currentBookName || 'Select Book'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginRight: 4 }}>
                  <TextInput
                    style={[styles.compactInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                    placeholder="Total"
                    placeholderTextColor={theme.textSecondary}
                    value={currentTotalMarks}
                    onChangeText={setCurrentTotalMarks}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <TextInput
                    style={[styles.compactInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                    placeholder="Obt."
                    placeholderTextColor={theme.textSecondary}
                    value={currentObtainedMarks}
                    onChangeText={setCurrentObtainedMarks}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleAddBook}
                  style={[styles.compactAddBtn, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Book Dropdown */}
              {showBookDropdown && (
                <View style={[styles.inlineDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentBookName('');
                        setShowBookDropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    >
                      <Text style={{ color: theme.textSecondary, fontStyle: 'italic', fontSize: 12 }}>Manual Entry</Text>
                    </TouchableOpacity>
                    {books.filter(book => {
                      const bookTitle = (book.booktitle || book.subject || '').trim();
                      return !entryBooks.some(addedBook =>
                        addedBook.name.trim().toLowerCase() === bookTitle.toLowerCase()
                      );
                    }).map((book) => (
                      <TouchableOpacity
                        key={book.id}
                        onPress={() => {
                          setCurrentBookName(book.booktitle || book.subject || '');
                          setShowBookDropdown(false);
                        }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                      >
                        <Text style={{ color: theme.text, fontSize: 12 }}>{book.booktitle || book.subject}</Text>
                      </TouchableOpacity>
                    ))}
                    {!currentBookName && (
                      <TextInput
                        style={[styles.input, { margin: 8, height: 36, fontSize: 12, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder="Type custom name..."
                        placeholderTextColor={theme.textSecondary}
                        value={currentBookName}
                        onChangeText={setCurrentBookName}
                      />
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Note */}
            <Text style={[styles.label, { color: theme.text, marginTop: 2 }]}>Note (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, height: 50, textAlignVertical: 'top' }]}
              placeholder="Additional details..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Save Button */}
            <TouchableOpacity onPress={handleSaveExam} activeOpacity={0.85}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fsFormSaveButton}
              >
                <Ionicons name={editingExam ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                <Text style={styles.fsFormSaveButtonText}>{editingExam ? 'Update Record' : 'Save Record'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.fsFormCancelButton}>
              <Text style={[styles.fsFormCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </Modal>

      {/* Choice Modal (iOS-style Alert) */}
      <Modal visible={choiceModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setChoiceModalVisible(false)}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              width: 280,
              borderRadius: 14,
              backgroundColor: theme.card,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Title & Subtitle */}
            <View style={{ paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text, textAlign: 'center', marginBottom: 4 }}>
                Add New Record
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
                Choose how to add the record
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 0.5, backgroundColor: theme.border }} />

            {/* Manual Entry Button */}
            <TouchableOpacity
              onPress={handleManualEntry}
              style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 17, fontWeight: '600', color: theme.primary }}>Manual Entry</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 0.5, backgroundColor: theme.border }} />

            {/* Upload File Button */}
            <TouchableOpacity
              onPress={() => {
                setChoiceModalVisible(false);
                setShowUploadInstructions(true);
              }}
              style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 17, color: theme.primary }}>Upload File</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ height: 0.5, backgroundColor: theme.border }} />

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setChoiceModalVisible(false)}
              style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 17, fontWeight: '600', color: theme.error }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Upload Instructions Modal */}
      <Modal visible={showUploadInstructions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="document-text" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Upload Instructions</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Required .xlsx Format</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowUploadInstructions(false)}
                style={{ marginLeft: 'auto', padding: 4 }}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 16 }}>
              <Text style={{ color: theme.text, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
                Please upload an <Text style={{ fontWeight: 'bold' }}>Excel (.xlsx)</Text> file containing exam records.
              </Text>

              {/* Template Download */}
              <TouchableOpacity
                onPress={handleDownloadTemplate}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.primary + '15',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: theme.primary + '30'
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 16, backgroundColor: '#1D6F42',
                  alignItems: 'center', justifyContent: 'center', marginRight: 10
                }}>
                  <Ionicons name="download" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: theme.text }}>Download Excel Template</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>Use this file to add your records</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Excel Instructions */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Required Columns:</Text>
                <View style={{ backgroundColor: theme.background, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: theme.text }}>
                    title | category | date | rollNo | studentName | bookName | totalMarks | obtainedMarks | description
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowUploadInstructions(false)}
                style={[styles.modalBtnCancel, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadInstructions(false);
                  setTimeout(() => handlePickDocument(), 500);
                }}
                style={[styles.modalBtnSave, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="folder-open" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Select File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Detail Modal */}
      <Modal visible={showOptionsModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={[{ borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, elevation: 5, height: '85%' }, { backgroundColor: theme.card }]}>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowOptionsModal(false)}
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingRight: 40 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="person" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{selectedExamForOptions?.studentName || 'Student'}</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                  {selectedExamForOptions?.rollNo || 'N/A'} • {selectedExamForOptions?.studentClass || 'N/A'}
                </Text>
              </View>
            </View>

            {/* ═══ T-Navigation Buttons (TOP — Compact) ═══ */}
            {(() => {
              if (!selectedExamForOptions) return null;
              const studentKey = (selectedExamForOptions.rollNo || selectedExamForOptions.studentName || '');
              const studentClass = selectedExamForOptions.studentClass || '';
              const studentExams = exams.filter(e => {
                const k = (e.rollNo || e.studentName || '');
                return k === studentKey && (e.studentClass || '') === studentClass;
              });
              const existingTitles = new Set(studentExams.map(e => e.title));
              const existingTNumbers = studentExams
                .map(e => {
                  const match = e.title.match(/^T(\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                })
                .filter(n => n > 0);
              const maxExisting = existingTNumbers.length > 0 ? Math.max(...existingTNumbers) : 0;
              const showUpTo = Math.max(maxExisting + 1, 3); // Show at least T1-T3, plus one extra
              const visibleTitles = TITLE_OPTIONS.slice(0, Math.min(showUpTo, TITLE_OPTIONS.length));

              return (
                <View style={{ marginBottom: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {visibleTitles.map((t) => {
                        const hasRecord = existingTitles.has(t);
                        const isActive = selectedExamForOptions?.title === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => {
                              if (isActive) return;
                              if (hasRecord) {
                                const targetExam = studentExams.find(e => e.title === t);
                                if (targetExam) {
                                  setSelectedExamForOptions(targetExam);
                                }
                              } else {
                                setShowOptionsModal(false);
                                resetForm();
                                setStudentName(selectedExamForOptions.studentName || '');
                                setRollNo(selectedExamForOptions.rollNo || '');
                                setStudentClass(selectedExamForOptions.studentClass || '');
                                setStudentEmail(selectedExamForOptions.studentEmail || '');
                                setStudentSearchTerm(selectedExamForOptions.studentName || '');
                                setTitle(t);
                                setStudentInfoLocked(true);
                                setModalVisible(true);
                              }
                            }}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
                              backgroundColor: isActive
                                ? theme.primary
                                : hasRecord
                                  ? theme.primary + '12'
                                  : theme.background,
                              borderWidth: 1,
                              borderColor: isActive
                                ? theme.primary
                                : hasRecord
                                  ? theme.primary + '30'
                                  : theme.border,
                              minWidth: 40,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 12, fontWeight: '700',
                              color: isActive
                                ? '#fff'
                                : hasRecord
                                  ? theme.primary
                                  : theme.textSecondary,
                            }}>{t}</Text>
                            {!hasRecord && (
                              <Ionicons name="add" size={9} color={theme.textSecondary} style={{ marginTop: 1 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              );
            })()}

            {/* Test & Date Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                <Ionicons name="document-text-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{selectedExamForOptions?.title}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: theme.border }}>
                <Ionicons name="folder-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{selectedExamForOptions?.category}</Text>
              </View>
              {selectedExamForOptions?.date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: theme.border }}>
                  <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>{selectedExamForOptions?.date}</Text>
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Compact Stats Row */}
              {(() => {
                const sel = selectedExamForOptions;
                let displayTotal = sel?.totalMarks || '—';
                let displayObtained = sel?.obtainedMarks || '—';
                if (sel?.books && sel.books.length > 0) {
                  let sumTotal = 0;
                  let sumObtained = 0;
                  sel.books.forEach(b => {
                    const t = parseFloat(b.totalMarks);
                    const o = parseFloat(b.obtainedMarks);
                    if (!isNaN(t)) sumTotal += t;
                    if (!isNaN(o)) sumObtained += o;
                  });
                  displayTotal = sumTotal.toString();
                  displayObtained = sumObtained.toString();
                }
                const percentage = displayTotal !== '—' && displayObtained !== '—' && parseFloat(displayTotal) > 0
                  ? ((parseFloat(displayObtained) / parseFloat(displayTotal)) * 100).toFixed(1) + '%'
                  : null;

                return (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    {/* Status */}
                    <View style={{
                      flex: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1,
                      backgroundColor: sel?.status === 'Pass' ? '#E8F5E910' : sel?.status === 'Fail' ? '#FFEBEE10' : '#FFF3E010',
                      borderColor: sel?.status === 'Pass' ? '#2E7D3225' : sel?.status === 'Fail' ? '#C6282825' : '#EF6C0025',
                    }}>
                      <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Status</Text>
                      <Text style={{
                        fontSize: 12, fontWeight: '800',
                        color: sel?.status === 'Pass' ? '#2E7D32' : sel?.status === 'Fail' ? '#C62828' : '#EF6C00'
                      }}>{sel?.status || 'Active'}</Text>
                    </View>

                    {/* Total */}
                    <View style={{ flex: 1, backgroundColor: theme.background, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Total</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{displayTotal}</Text>
                    </View>

                    {/* Obtained */}
                    <View style={{ flex: 1, backgroundColor: theme.primary + '08', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: theme.primary + '20' }}>
                      <Text style={{ fontSize: 9, color: theme.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Obtained</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.primary }}>{displayObtained}</Text>
                      {percentage && (
                        <Text style={{ fontSize: 9, color: theme.primary, marginTop: 1 }}>({percentage})</Text>
                      )}
                    </View>

                    {/* Position */}
                    <View style={{ flex: 1, backgroundColor: theme.background, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Pos.</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: theme.text }}>
                        {(() => {
                          if (!sel) return '—';
                          const sameGroup = exams.filter(e =>
                            e.title === sel.title &&
                            e.studentClass === sel.studentClass
                          );
                          const sorted = [...sameGroup].sort((a, b) =>
                            (parseFloat(b.obtainedMarks || '0')) - (parseFloat(a.obtainedMarks || '0'))
                          );
                          const pos = sorted.findIndex(e => e.id === sel.id) + 1;
                          return pos > 0 ? `${pos}/${sorted.length}` : '—';
                        })()}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Subject Breakdown */}
              {selectedExamForOptions?.books && selectedExamForOptions.books.length > 0 && (
                <View style={{ marginBottom: 16, backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.primary + '08', borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Subject</Text>
                    <Text style={{ width: 60, fontSize: 11, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }}>Total</Text>
                    <Text style={{ width: 60, fontSize: 11, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }}>Obt.</Text>
                  </View>
                  {/* Table Rows */}
                  {selectedExamForOptions.books.map((book, idx) => (
                    <View key={idx} style={{
                      flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : theme.card + '60',
                      borderBottomWidth: idx < selectedExamForOptions.books!.length - 1 ? 0.5 : 0,
                      borderBottomColor: theme.border,
                    }}>
                      <Text style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: '500' }}>{book.name}</Text>
                      <Text style={{ width: 60, fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>{book.totalMarks}</Text>
                      <Text style={{ width: 60, fontSize: 13, fontWeight: '600', color: theme.text, textAlign: 'center' }}>{book.obtainedMarks}</Text>
                    </View>
                  ))}
                  {/* Auto-calculated total row */}
                  <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.primary + '10', borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' }}>Grand Total</Text>
                    <Text style={{ width: 60, fontSize: 13, fontWeight: '800', color: theme.text, textAlign: 'center' }}>
                      {selectedExamForOptions.books.reduce((s, b) => s + (parseFloat(b.totalMarks) || 0), 0)}
                    </Text>
                    <Text style={{ width: 60, fontSize: 13, fontWeight: '800', color: theme.primary, textAlign: 'center' }}>
                      {selectedExamForOptions.books.reduce((s, b) => s + (parseFloat(b.obtainedMarks) || 0), 0)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Description / Notes */}
              {selectedExamForOptions?.description && (
                <View style={{ marginBottom: 16, flexDirection: 'row', backgroundColor: theme.background, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                  <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: 'italic', flex: 1 }}>"{selectedExamForOptions.description}"</Text>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
              <TouchableOpacity
                onPress={() => {
                  setShowOptionsModal(false);
                  if (selectedExamForOptions) openModal(selectedExamForOptions);
                }}
                style={{ flex: 1, paddingVertical: 13, backgroundColor: theme.primary, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowOptionsModal(false);
                  if (selectedExamForOptions) handleDeleteExam(selectedExamForOptions.id);
                }}
                style={{ flex: 1, paddingVertical: 13, backgroundColor: theme.error + '12', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.error + '25' }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.error} style={{ marginRight: 6 }} />
                <Text style={{ color: theme.error, fontWeight: '700', fontSize: 14 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
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
  searchContainer: { padding: 16, paddingBottom: 0 },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: { padding: 16 },
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
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  categoryBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  date: { fontSize: 12 },
  details: { fontSize: 12 },
  description: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'column', gap: 12, paddingLeft: 8 },
  actionBtn: { padding: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    elevation: 5,
    height: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginTop: 1 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  // Compact Grid Styles
  row: { flexDirection: 'row', gap: 8, width: '100%' },
  col: {},
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScroll: { maxHeight: 36, marginBottom: 10 },
  categoryOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 6,
    backgroundColor: 'transparent',
  },

  // Inline dropdown (relative positioning, no absolute overlap issues)
  inlineDropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 6,
  },
  dropdownGridItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: { padding: 10, borderBottomWidth: 0.5 },

  // Modal Buttons
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSave: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Choice Modal
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryChoiceBtn: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryChoiceBtn: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  choiceBtnIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choiceBtnTextContainer: {
    flex: 1,
  },
  modernChoiceBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Book Entry Styles
  sectionDivider: { height: 1, marginVertical: 10, width: '100%', opacity: 0.4 },
  compactBookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactBookTitle: { fontSize: 11, fontWeight: '600' },
  compactBookMarks: { fontSize: 10 },
  addBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  compactInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
    fontSize: 12,
  },
  compactAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  className: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  studentDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentDropdownAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactChoiceBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },

  // Full-Screen Form Styles
  fullScreenModal: {
    flex: 1,
  },
  fsFormHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 30) + 10,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fsFormHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fsFormHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  fsFormHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  fsFormHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  fsFormHeaderSaveBtn: {
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
  fsFormScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fsFormSaveButton: {
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
  fsFormSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  fsFormCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  fsFormCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
