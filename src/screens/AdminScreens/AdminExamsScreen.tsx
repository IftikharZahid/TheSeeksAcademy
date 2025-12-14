import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  booktitle?: string;
  bookimage?: string;
}

interface BookEntry {
  name: string;
  totalMarks: string;
  obtainedMarks: string;
}

interface ExamEntry {
  id: string;
  title: string;
  date: string;
  category: string;
  rollNo?: string;
  studentName?: string;
  studentEmail?: string;
  studentClass?: string;
  books?: BookEntry[]; // Multiple books support
  bookName?: string; // LEGACY: backward compatibility
  totalMarks?: string; // LEGACY
  obtainedMarks?: string; // LEGACY
  status?: string; 
  description: string;
}

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Year', 'Final'];
const STATUS_OPTIONS = ['Pending', 'Pass', 'Fail', 'Absent'];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];

export const AdminExamsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [books, setBooks] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

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

  useEffect(() => {
    console.log('📊 AdminExamsScreen: Starting data fetch...');
    
    // Fetch exams
    const unsubscribeExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      console.log('📥 Exams snapshot received, size:', snapshot.size);
      const list: ExamEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ExamEntry);
      });
      console.log('✅ Exams loaded:', list.length, 'entries');
      setExams(list);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error fetching exams:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setLoading(false);
    });

    // Fetch books from staff collection
    const unsubscribeBooks = onSnapshot(collection(db, 'staff'), (snapshot) => {
      console.log('📚 Books snapshot received, size:', snapshot.size);
      const booksList: Teacher[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Teacher;
        // Use booktitle or subject as the book name
        if (data.booktitle || data.subject) {
          booksList.push({ ...data, id: doc.id });
        }
      });
      console.log('✅ Books loaded:', booksList.length, 'items');
      setBooks(booksList);
    }, (error) => {
      console.error('❌ Error fetching books:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    });

    return () => {
      console.log('🧹 Cleaning up subscriptions...');
      unsubscribeExams();
      unsubscribeBooks();
    };
  }, []);

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
      totalMarks: totalMarks || '', // Legacy
      obtainedMarks: obtainedMarks || '', // Legacy
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
        type: '*/*',
        copyToCacheDirectory: true 
      });
      
      if (result.canceled) return;

      setLoading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      let fileUri = asset.uri;

      if (fileUri.startsWith('content://')) {
        const tempUri = FileSystem.documentDirectory + 'temp_exam_upload.json';
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
        Alert.alert('Error', 'Invalid JSON format. The root must be an array of exam records.');
        setLoading(false);
        return;
      }

      let addedCount = 0;
      let errorCount = 0;

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

            // Calculate status automatically
            let computedStatus = 'Absent';
            if (item.obtainedMarks && item.obtainedMarks.toString().trim() !== '') {
              const marks = parseFloat(item.obtainedMarks);
              if (!isNaN(marks)) {
                computedStatus = marks >= 40 ? 'Pass' : 'Fail';
              }
            }

            const docId = Date.now().toString() + '_' + addedCount;
            await setDoc(doc(db, 'exams', docId), {
              title: item.title,
              date: formattedDate,
              category: item.category,
              rollNo: item.rollNo || '',
              studentName: item.studentName || '',
              studentEmail: item.studentEmail || '',
              studentClass: item.studentClass || '',
              bookName: item.bookName || '',
              totalMarks: item.totalMarks?.toString() || '',
              obtainedMarks: item.obtainedMarks?.toString() || '',
              status: computedStatus,
              description: item.description || '',
              updatedAt: serverTimestamp(),
            });

            addedCount++;
          } catch (err) {
            console.error("Error adding exam:", item, err);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      Alert.alert('Upload Complete', `Successfully added ${addedCount} exam records.\\nFailed/Skipped: ${errorCount}`);

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
  
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const filteredExams = exams.filter(e => 
    (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Exams & Results</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Search exams..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.listTitle, { color: theme.text }]}>All Entries ({exams.length})</Text>
          {filteredExams.length === 0 ? (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No entries found.</Text>
          ) : (
            filteredExams.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                   <Ionicons name="school" size={24} color={theme.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Left: Title */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.categoryBadge, { color: theme.primary, borderColor: theme.primary, marginTop: 4 }]}>
                          {item.category}
                        </Text>
                      </View>
                      
                      {/* Center: Date */}
                      <Text style={[styles.date, { color: theme.textSecondary, textAlign: 'center', flex: 1 }]}>{item.date}</Text>
                      
                      {/* Right: Class and Status */}
                      <View style={{ alignItems: 'flex-start', flex: 1 }}>
                        {item.studentClass && (
                          <Text style={[styles.className, { color: theme.primary }]}>Class {item.studentClass}</Text>
                        )}
                        {item.status && (
                          <Text style={{ 
                            fontSize: 12, fontWeight: '700', marginTop: 2, marginLeft: 4,
                            color: item.status === 'Pass' ? 'green' : item.status === 'Fail' ? 'red' : 'orange' 
                          }}>
                            {item.status}
                          </Text>
                        )}
                      </View>
                  </View>


                  {/* Student Info */}
                  {(item.rollNo || item.studentName || item.studentEmail) ? (
                    <View style={{ marginTop: 6, gap: 3 }}>
                      {/* Name and Roll No on same line */}
                      {(item.studentName || item.rollNo) && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          {item.studentName && (
                            <Text style={[styles.details, { color: theme.text, fontWeight: '600', flex: 1 }]}>
                              👤 {item.studentName}
                            </Text>
                          )}
                          {item.rollNo && (
                            <Text style={[styles.details, { color: theme.textSecondary }]}>
                              🎓 Roll: {item.rollNo}
                            </Text>
                          )}
                        </View>
                      )}
                      {/* Email on separate line */}
                      {item.studentEmail && (
                        <Text style={[styles.details, { color: theme.textSecondary, fontSize: 11 }]}>
                          ✉️ {item.studentEmail}
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Display Books */}
                  {item.books && item.books.length > 0 ? (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      {item.books.map((book, bookIndex) => (
                        <View key={bookIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.details, { color: theme.text, fontWeight: '600', flex: 1 }]}>
                            📖 {book.name}
                          </Text>
                          <Text style={[styles.details, { color: theme.textSecondary }]}>
                            {book.obtainedMarks}/{book.totalMarks}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : item.bookName ? (
                    <Text style={[styles.details, { color: theme.textSecondary, marginTop: 4 }]}>
                      📖 {item.bookName} - {item.obtainedMarks}/{item.totalMarks}
                    </Text>
                  ) : null}

                  {(item.totalMarks || item.obtainedMarks) ? (
                      <Text style={[styles.details, { color: theme.text, fontWeight: '600', marginTop: 4 }]}>
                         🏆 {item.obtainedMarks || '-'} / {item.totalMarks || '-'}
                      </Text>
                  ) : null}

                  {item.description ? (
                      <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={20} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExam(item.id)} style={styles.actionBtn}>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingExam ? 'Edit Entry' : 'Add Entry'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Title</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {TITLE_OPTIONS.map((t) => (
                      <TouchableOpacity 
                        key={t} 
                        onPress={() => setTitle(t)}
                        style={[
                            styles.categoryOption, 
                            title === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                      >
                          <Text style={{ color: title === t ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>{t}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
              
              <Text style={[styles.label, { color: theme.text }]}>Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                  <Text style={{ color: theme.text }}>
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
              </TouchableOpacity>
              
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
              
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => (
                      <TouchableOpacity 
                        key={cat} 
                        onPress={() => setCategory(cat)}
                        style={[
                            styles.categoryOption, 
                            category === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                      >
                          <Text style={{ color: category === cat ? '#fff' : theme.text, fontSize: 12 }}>{cat}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.text }]}>Roll Number</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. 2024001" 
                placeholderTextColor={theme.textSecondary}
                value={rollNo} 
                onChangeText={setRollNo}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.text }]}>Student Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. Zahid" 
                placeholderTextColor={theme.textSecondary}
                value={studentName} 
                onChangeText={setStudentName}
              />

              <Text style={[styles.label, { color: theme.text }]}>Student Email</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. student@example.com" 
                placeholderTextColor={theme.textSecondary}
                value={studentEmail} 
                onChangeText={setStudentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.label, { color: theme.text }]}>Class</Text>
              <TouchableOpacity
                onPress={() => setShowClassDropdown(!showClassDropdown)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                <Text style={{ color: studentClass ? theme.text : theme.textSecondary }}>
                  {studentClass || 'Select class...'}
                </Text>
              </TouchableOpacity>

              {showClassDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    <TouchableOpacity
                      onPress={() => {
                        setStudentClass('');
                        setShowClassDropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    >
                      <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>None</Text>
                    </TouchableOpacity>
                    {CLASS_OPTIONS.filter(cls => cls !== studentClass).map((cls) => (
                      <TouchableOpacity
                        key={cls}
                        onPress={() => {
                          setStudentClass(cls);
                          setShowClassDropdown(false);
                        }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                      >
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{cls}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Multi-Book Entry Section */}
              <Text style={[styles.label, { color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 8 }]}>Books & Marks</Text>
              
              {/* Added Books List */}
              {entryBooks.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  {entryBooks.map((book, index) => (
                    <View key={index} style={[styles.bookCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bookCardTitle, { color: theme.text }]}>📖 {book.name}</Text>
                        <Text style={[styles.bookCardMarks, { color: theme.textSecondary }]}>
                          Total: {book.totalMarks} | Obtained: {book.obtainedMarks}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveBook(index)} style={styles.bookCardDelete}>
                        <Ionicons name="close-circle" size={24} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Current Book Entry Form */}
              <View style={[styles.addBookContainer, { backgroundColor: theme.background + '50', borderColor: theme.border }]}>
                <Text style={[styles.addBookLabel, { color: theme.textSecondary }]}>Add New Book</Text>
                
                <TouchableOpacity
                  onPress={() => setShowBookDropdown(!showBookDropdown)}
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
                >
                  <Text style={{ color: currentBookName ? theme.text : theme.textSecondary }}>
                    {currentBookName || 'Select a book...'}
                  </Text>
                </TouchableOpacity>

                {showBookDropdown && (
                  <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentBookName('');
                          setShowBookDropdown(false);
                        }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                      >
                        <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>Manual Entry</Text>
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
                          <Text style={{ color: theme.text }}>{book.booktitle || book.subject}</Text>
                        </TouchableOpacity>
                      ))}
                      {books.length === 0 && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: theme.textSecondary }}>No books available. Type manually.</Text>
                        </View>
                      )}
                      {books.length > 0 && books.every(book => {
                        const bookTitle = (book.booktitle || book.subject || '').trim();
                        return entryBooks.some(addedBook => 
                          addedBook.name.trim().toLowerCase() === bookTitle.toLowerCase()
                        );
                      }) && (
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: theme.textSecondary }}>All books have been added. Use "Manual Entry" for more.</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Manual entry option if dropdown closed and no book selected */}
                {!showBookDropdown && !currentBookName && (
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                    placeholder="Or type book name manually" 
                    placeholderTextColor={theme.textSecondary}
                    value={currentBookName} 
                    onChangeText={setCurrentBookName} 
                  />
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                      placeholder="Total Marks" 
                      placeholderTextColor={theme.textSecondary}
                      value={currentTotalMarks} 
                      onChangeText={setCurrentTotalMarks} 
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                      placeholder="Obtained" 
                      placeholderTextColor={theme.textSecondary}
                      value={currentObtainedMarks} 
                      onChangeText={setCurrentObtainedMarks} 
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handleAddBook}
                  style={[styles.addBookButton, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBookButtonText}>Add Book</Text>
                </TouchableOpacity>
              </View>




              
              <Text style={[styles.label, { color: theme.text }]}>Description / Link</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, height: 60, textAlignVertical: 'top' }]} 
                placeholder="Additional details..." 
                placeholderTextColor={theme.textSecondary}
                value={description} 
                onChangeText={setDescription}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveExam} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
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
          <View style={[styles.modalContent, { backgroundColor: theme.card, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="add-circle" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text, marginTop: 12, marginBottom: 6 }]}>Add New Exam Record</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 20, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
              Choose how you want to add exam records.
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
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  categoryScroll: {
      flexDirection: 'row',
      marginBottom: 16,
      maxHeight: 40,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: '#ccc',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
  },
  typeOption: {
      flex: 1,
      minWidth: '22%',
      padding: 10,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: '#ccc',
      alignItems: 'center',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
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
  // Legacy styles kept for compatibility
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
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  bookCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bookCardMarks: {
    fontSize: 12,
  },
  bookCardDelete: {
    padding: 4,
  },
  addBookContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addBookLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  addBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addBookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  className: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
