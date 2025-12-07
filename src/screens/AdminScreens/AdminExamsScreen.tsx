import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  booktitle?: string;
  bookimage?: string;
}

interface ExamEntry {
  id: string;
  title: string;
  date: string;
  category: string; 
  bookName?: string;
  totalMarks?: string;
  obtainedMarks?: string;
  status?: string; 
  description: string;
}

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Year', 'Final'];
const STATUS_OPTIONS = ['Pending', 'Pass', 'Fail', 'Absent'];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

export const AdminExamsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [books, setBooks] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date()); // Date Object
  const [showDatePicker, setShowDatePicker] = useState(false); // Picker Visibility
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bookName, setBookName] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');

  const [description, setDescription] = useState('');

  useEffect(() => {
    // Fetch exams
    const unsubscribeExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const list: ExamEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ExamEntry);
      });
      setExams(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching exams:", error);
      setLoading(false);
    });

    // Fetch books from staff collection
    const unsubscribeBooks = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const booksList: Teacher[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Teacher;
        // Use booktitle or subject as the book name
        if (data.booktitle || data.subject) {
          booksList.push({ ...data, id: doc.id });
        }
      });
      setBooks(booksList);
    }, (error) => {
      console.error("Error fetching books:", error);
    });

    return () => {
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

    // Calculate Status Automatically
    let computedStatus = 'Absent';
    if (obtainedMarks && obtainedMarks.trim() !== '') {
        const marks = parseFloat(obtainedMarks);
        if (!isNaN(marks)) {
            computedStatus = marks >= 40 ? 'Pass' : 'Fail';
        }
    }

    const examData = {
      title,
      date: formattedDate,
      category,
      bookName: bookName || '',
      totalMarks: totalMarks || '',
      obtainedMarks: obtainedMarks || '',
      status: computedStatus,
      description: description || '',
      updatedAt: serverTimestamp(),
    };

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
      setBookName(exam.bookName || '');
      setTotalMarks(exam.totalMarks || '');
      setObtainedMarks(exam.obtainedMarks || '');
      // Status is derived, no need to set state for it
      setDescription(exam.description);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setTitle('');
    setDate(new Date());
    setCategory(CATEGORIES[0]);
    setBookName('');
    setTotalMarks('');
    setObtainedMarks('');
    // setStatus(STATUS_OPTIONS[0]); // Removed
    setDescription('');
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
                      <Text style={[styles.title, { color: theme.text, maxWidth: '70%' }]}>{item.title}</Text>
                      <Text style={[styles.date, { color: theme.textSecondary }]}>{item.date}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={[styles.categoryBadge, { color: theme.primary, borderColor: theme.primary }]}>
                      {item.category}
                    </Text>
                    {item.status && (
                        <Text style={{ 
                            fontSize: 12, fontWeight: '700',
                            color: item.status === 'Pass' ? 'green' : item.status === 'Fail' ? 'red' : 'orange' 
                        }}>
                           {item.status}
                        </Text>
                    )}
                  </View>

                  {item.bookName ? (
                      <Text style={[styles.details, { color: theme.textSecondary, marginTop: 4 }]}>
                         📖 {item.bookName}
                      </Text>
                  ) : null}

                  {(item.totalMarks || item.obtainedMarks) ? (
                      <Text style={[styles.details, { color: theme.text, fontWeight: '600' }]}>
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

              <Text style={[styles.label, { color: theme.text }]}>Book Name</Text>
              <TouchableOpacity
                onPress={() => setShowBookDropdown(!showBookDropdown)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                <Text style={{ color: bookName ? theme.text : theme.textSecondary }}>
                  {bookName || 'Select a book...'}
                </Text>
              </TouchableOpacity>
              
              {showBookDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    <TouchableOpacity
                      onPress={() => {
                        setBookName('');
                        setShowBookDropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    >
                      <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>None (Manual Entry)</Text>
                    </TouchableOpacity>
                    {books.map((book) => (
                      <TouchableOpacity
                        key={book.id}
                        onPress={() => {
                          setBookName(book.booktitle || book.subject || '');
                          setShowBookDropdown(false);
                        }}
                        style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                      >
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{book.booktitle || book.subject}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>by {book.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {books.length === 0 && (
                      <View style={styles.dropdownItem}>
                        <Text style={{ color: theme.textSecondary }}>No books available</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Total Marks</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                        placeholder="100" 
                        placeholderTextColor={theme.textSecondary}
                        value={totalMarks} 
                        onChangeText={setTotalMarks} 
                        keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.text }]}>Obtained</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                        placeholder="85" 
                        placeholderTextColor={theme.textSecondary}
                        value={obtainedMarks} 
                        onChangeText={setObtainedMarks} 
                        keyboardType="numeric"
                    />
                  </View>
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
    fontSize: 10,
    fontWeight: '700',
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
});
