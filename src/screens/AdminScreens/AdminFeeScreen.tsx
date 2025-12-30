import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

interface Student {
  id: string;
  fullname: string;
  email: string;
  rollno: string;
  class: string;
  month?: string;
}

interface FeeRecord {
  studentId: string;
  studentName: string;
  rollno: string;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'paid' | 'pending' | 'partial';
}

export const AdminFeeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  
  // Form fields
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [feeMonth, setFeeMonth] = useState('');
  const [totalFee, setTotalFee] = useState('50000');
  const [paidAmount, setPaidAmount] = useState('0');
  const [filterClass, setFilterClass] = useState('All');

  const classOptions = ['9th', '10th', '1st Year', '2nd Year'];
  const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const filterOptions = ['All', ...classOptions];

  useEffect(() => {
    fetchStudentsAndFees();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Filter by class only
      const classFiltered = filterClass === 'All' 
        ? feeRecords 
        : feeRecords.filter(record => students.find(s => s.id === record.studentId)?.class === filterClass);
      setFilteredRecords(classFiltered);
    } else {
      // Filter by search AND class
      const filtered = feeRecords.filter(record => {
        const matchesSearch = record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             record.rollno.toLowerCase().includes(searchQuery.toLowerCase());
        const student = students.find(s => s.id === record.studentId);
        const matchesClass = filterClass === 'All' || student?.class === filterClass;
        return matchesSearch && matchesClass;
      });
      setFilteredRecords(filtered);
    }
  }, [searchQuery, feeRecords, filterClass, students]);

  const fetchStudentsAndFees = async () => {
    try {
      // Fetch all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData: Student[] = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        fullname: doc.data().fullname || 'Unknown',
        email: doc.data().email || '',
        rollno: doc.data().rollno || '',
        class: doc.data().class || '',
        month: doc.data().month || '',
      }));
      setStudents(studentsData);

      // Fetch fee records
      const feesSnapshot = await getDocs(collection(db, 'fees')

);
      const feesData: { [key: string]: any } = {};
      feesSnapshot.docs.forEach(doc => {
        feesData[doc.id] = doc.data();
      });

      // Combine student and fee data
      const records: FeeRecord[] = studentsData.map(student => {
        const feeData = feesData[student.id];
        if (feeData) {
          const pending = feeData.totalFee - feeData.paidAmount;
          return {
            studentId: student.id,
            studentName: student.fullname,
            rollno: student.rollno,
            totalFee: feeData.totalFee,
            paidAmount: feeData.paidAmount,
            pendingAmount: pending,
            status: pending === 0 ? 'paid' : pending === feeData.totalFee ? 'pending' : 'partial',
          };
        } else {
          return {
            studentId: student.id,
            studentName: student.fullname,
            rollno: student.rollno,
            totalFee: 50000,
            paidAmount: 0,
            pendingAmount: 50000,
            status: 'pending',
          };
        }
      });

      setFeeRecords(records);
      setFilteredRecords(records);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load fee records');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (student: Student, record: FeeRecord) => {
    setSelectedStudent(student);
    setStudentName(student.fullname);
    setRollNumber(student.rollno);
    setStudentClass(student.class);
    setFeeMonth(student.month || '');
    setTotalFee(record.totalFee.toString());
    setPaidAmount(record.paidAmount.toString());
    setEditModalVisible(true);
  };

  const saveFeeRecord = async () => {
    if (!selectedStudent) return;

    if (!studentName.trim() || !rollNumber.trim() || !studentClass.trim() || !feeMonth.trim()) {
      Alert.alert('Error', 'Please fill in all required fields: name, roll number, class, and month');
      return;
    }

    const total = parseInt(totalFee) || 0;
    const paid = parseInt(paidAmount) || 0;
    const pending = total - paid;

    try {
      // Update student details in students collection
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        fullname: studentName.trim(),
        rollno: rollNumber.trim(),
        class: studentClass.trim(),
        month: feeMonth.trim(),
      });

      // Update fee record
      const feeData = {
        studentName: studentName.trim(),
        totalFee: total,
        paidAmount: paid,
        pendingAmount: pending,
        breakdown: {
          tuition: Math.floor(total * 0.7),
          books: Math.floor(total * 0.1),
          labs: Math.floor(total * 0.15),
          exam: Math.floor(total *0.05),
        },
        payments: paid > 0 ? [
          {
            date: new Date().toISOString().split('T')[0],
            amount: paid,
            method: 'Admin Update',
          }
        ] : [],
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(doc(db, 'fees', selectedStudent.id), feeData);
      
      Alert.alert('Success', 'Student and fee details updated successfully');
      setEditModalVisible(false);
      fetchStudentsAndFees();
   } catch (error) {
      console.error('Error saving records:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#16a34a';
      case 'partial': return '#eab308';
      case 'pending': return '#dc2626';
      default: return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'partial': return 'alert-circle';
      case 'pending': return 'time-outline';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading fee records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Fee Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: theme.card, 
            color: theme.text, 
            borderColor: theme.border 
          }]}
          placeholder="Search by name or roll number..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
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

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: '#16a34a15' }]}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>
            {feeRecords.filter(r => r.status === 'paid').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Paid</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#eab30815' }]}>
          <Text style={[styles.statValue, { color: '#eab308' }]}>
            {feeRecords.filter(r => r.status === 'partial').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Partial</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#dc262615' }]}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>
            {feeRecords.filter(r => r.status === 'pending').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery ? 'No students found' : 'No fee records available'}
            </Text>
          </View>
        ) : (
          filteredRecords.map((record) => (
            <TouchableOpacity
              key={record.studentId}
              style={[styles.feeCard, { backgroundColor: theme.card }]}
              onPress={() => openEditModal(students.find(s => s.id === record.studentId)!, record)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, { backgroundColor: `${getStatusColor(record.status)}20` }]}>
                    <Text style={[styles.avatarText, { color: getStatusColor(record.status) }]}>
                      {record.studentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.studentDetails}>
                  <Text style={[styles.studentName, { color: theme.text }]}>{record.studentName}</Text>
                  <Text style={[styles.rollNumber, { color: theme.textSecondary }]}>
                    {record.rollno} • {students.find(s => s.id === record.studentId)?.class || 'N/A'}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(record.status)}15` }]}>
                  <Ionicons name={getStatusIcon(record.status) as any} size={14} color={getStatusColor(record.status)} />
                  <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.feeGrid}>
                <View style={styles.feeItem}>
                  <Text style={[styles.feeItemLabel, { color: theme.textSecondary }]}>Total</Text>
                  <Text style={[styles.feeItemValue, { color: theme.text }]}>
                    PKR {record.totalFee.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.feeItem}>
                  <Text style={[styles.feeItemLabel, { color: theme.textSecondary }]}>Paid</Text>
                  <Text style={[styles.feeItemValue, { color: '#16a34a' }]}>
                    PKR {record.paidAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.feeItem}>
                  <Text style={[styles.feeItemLabel, { color: theme.textSecondary }]}>Pending</Text>
                  <Text style={[styles.feeItemValue, { color: '#dc2626' }]}>
                    PKR {record.pendingAmount.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.editHint}>
                <Ionicons name="create-outline" size={16} color={theme.primary} />
                <Text style={[styles.editHintText, { color: theme.primary }]}>Tap to edit</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Enhanced Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Student & Fee Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Student Details Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Student Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Full Name</Text>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={studentName}
                      onChangeText={setStudentName}
                      placeholder="Enter student name"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Roll Number</Text>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Ionicons name="id-card-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={rollNumber}
                      onChangeText={setRollNumber}
                      placeholder="Enter roll number"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Class</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setClassPickerVisible(true)}
                  >
                    <Ionicons name="school-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <Text style={[styles.pickerText, { color: studentClass ? theme.text : theme.textSecondary }]}>
                      {studentClass || 'Select class'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Fee Month</Text>
                  <TouchableOpacity
                    style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setMonthPickerVisible(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <Text style={[styles.pickerText, { color: feeMonth ? theme.text : theme.textSecondary }]}>
                      {feeMonth || 'Select month'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fee Details Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Fee Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Total Fee (PKR)</Text>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Ionicons name="cash-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={totalFee}
                      onChangeText={setTotalFee}
                      keyboardType="numeric"
                      placeholder="50000"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Paid Amount (PKR)</Text>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Summary Box */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Pending Amount:</Text>
                  <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                    PKR {((parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0)).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Payment Status:</Text>
                  <Text style={[styles.summaryValue, { 
                    color: ((parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0)) === 0 ? '#16a34a' : '#dc2626' 
                  }]}>
                    {((parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0)) === 0 ? 'Fully Paid' : 'Payment Due'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Ionicons name="close-outline" size={20} color={theme.text} />
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveFeeRecord}
                >
                  <Ionicons name="checkmark-outline" size={20} color="white" />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
                style={[styles.pickerOption, { backgroundColor: studentClass === classOption ? theme.primary + '15' : 'transparent' }]}
                onPress={() => {
                  setStudentClass(classOption);
                  setClassPickerVisible(false);
                }}
              >
                <Text style={[styles.pickerOptionText, { 
                  color: studentClass === classOption ? theme.primary : theme.text 
                }]}>
                  {classOption}
                </Text>
                {studentClass === classOption && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Picker Modal */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Fee Month</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {monthOptions.map((monthOption) => (
                <TouchableOpacity
                  key={monthOption}
                  style={[styles.pickerOption, { backgroundColor: feeMonth === monthOption ? theme.primary + '15' : 'transparent' }]}
                  onPress={() => {
                    setFeeMonth(monthOption);
                    setMonthPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { 
                    color: feeMonth === monthOption ? theme.primary : theme.text 
                  }]}>
                    {monthOption}
                  </Text>
                  {feeMonth === monthOption && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    padding: 10,
    fontSize: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  statBox: {
    flex: 1,
    padding: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  feeCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rollNumber: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  feeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  feeItem: {
    flex: 1,
    alignItems: 'center',
  },
  feeItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  feeItemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  editHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  filterContainer: {
    paddingHorizontal: 20,
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
  input: {
    flex: 1,
    padding: 10,
    fontSize: 15,
  },
  summaryBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerText: {
    flex: 1,
    padding: 14,
    fontSize: 15,
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
});
