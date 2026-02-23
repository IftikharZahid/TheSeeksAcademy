import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, StatusBar, Animated, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminFeeRecords } from '../../store/slices/adminSlice';
import type { AdminFeeRecord } from '../../store/slices/adminSlice';
import { scale } from '../../utils/responsive';

interface Student {
  id: string;
  fullname: string;
  email: string;
  rollno: string;
  class: string;
  month?: string;
}

// AdminFeeRecord is imported from slice
type FeeRecord = AdminFeeRecord;

export const AdminFeeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const feeRecords = useAppSelector(state => state.admin.feeRecords);
  const loading = useAppSelector(state => state.admin.feeLoading);
  const students = useAppSelector(state => state.admin.students);

  const [filteredRecords, setFilteredRecords] = useState<FeeRecord[]>([]);
  // const [loading, setLoading] = useState(true); // managed by redux
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  // Form fields — student info is read-only from Redux, only fee fields are editable
  const [feeMonth, setFeeMonth] = useState<string[]>([]);
  const [totalFee, setTotalFee] = useState('50000');
  const [paidAmount, setPaidAmount] = useState('0');
  const [filterClass, setFilterClass] = useState('All');
  // Resolved student from Redux store
  const [resolvedStudent, setResolvedStudent] = useState<any>(null);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const classOptions = ['9th', '10th', '1st Year', '2nd Year'];
  const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const filterOptions = ['All', 'Paid', 'Pending', 'Partial', ...classOptions];

  // Fee data is pre-loaded via initFeeListener in AdminDashboard.
  // Fallback fetch in case the listener hasn't fired yet when navigating here.
  useEffect(() => {
    if (loading && feeRecords.length === 0) {
      dispatch(fetchAdminFeeRecords());
    }
  }, [dispatch, loading, feeRecords.length]);

  useEffect(() => {
    let result = feeRecords;

    // Apply strict filters based on what's selected
    if (filterClass !== 'All') {
      if (['Paid', 'Pending', 'Partial'].includes(filterClass)) {
        // Filter by Status
        result = result.filter(record => record.status.toLowerCase() === filterClass.toLowerCase());
      } else {
        // Filter by Class
        result = result.filter(record => record.class === filterClass);
      }
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      result = result.filter(record =>
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.rollno.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRecords(result);
  }, [searchQuery, feeRecords, filterClass]);

  // Fetch logic moved to Redux thunk
  // const fetchStudentsAndFees = async () => {
  //   try {
  //     // Fetch all students
  //     const studentsSnapshot = await getDocs(collection(db, 'students'));
  //     const studentsData: Student[] = studentsSnapshot.docs.map(doc => ({
  //       id: doc.id,
  //       fullname: doc.data().fullname || 'Unknown',
  //       email: doc.data().email || '',
  //       rollno: doc.data().rollno || '',
  //       class: doc.data().class || '',
  //       month: doc.data().month || '',
  //     }));
  //     setStudents(studentsData);

  //     // Fetch fee records
  //     const feesSnapshot = await getDocs(collection(db, 'fees')

  // );
  //     const feesData: { [key: string]: any } = {};
  //     feesSnapshot.docs.forEach(doc => {
  //       feesData[doc.id] = doc.data();
  //     });

  //     // Combine student and fee data
  //     const records: FeeRecord[] = studentsData.map(student => {
  //       const feeData = feesData[student.id];
  //       if (feeData) {
  //         const pending = feeData.totalFee - feeData.paidAmount;
  //         return {
  //           studentId: student.id,
  //           studentName: student.fullname,
  //           rollno: student.rollno,
  //           totalFee: feeData.totalFee,
  //           paidAmount: feeData.paidAmount,
  //           pendingAmount: pending,
  //           status: pending === 0 ? 'paid' : pending === feeData.totalFee ? 'pending' : 'partial',
  //         };
  //       } else {
  //         return {
  //           studentId: student.id,
  //           studentName: student.fullname,
  //           rollno: student.rollno,
  //           totalFee: 50000,
  //           paidAmount: 0,
  //           pendingAmount: 50000,
  //           status: 'pending',
  //         };
  //       }
  //     });

  //     setFeeRecords(records);
  //     setFilteredRecords(records);
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //     Alert.alert('Error', 'Failed to load fee records');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const openEditModal = (record: FeeRecord) => {
    setSelectedRecord(record);
    // Look up live student data from Redux store
    const student = students.find(s => s.id === record.studentId);
    setResolvedStudent(student || null);
    const existingMonths = (record.month || student?.month || '').split(',').map((m: string) => m.trim()).filter(Boolean);
    setFeeMonth(existingMonths);
    setTotalFee(record.totalFee.toString());
    setPaidAmount(record.paidAmount.toString());
    setEditModalVisible(true);
  };

  const saveFeeRecord = async () => {
    if (!selectedRecord) return;

    const name = resolvedStudent?.fullname || resolvedStudent?.name || selectedRecord.studentName;
    const roll = resolvedStudent?.rollno || selectedRecord.rollno;
    const cls = resolvedStudent?.class || selectedRecord.class;

    if (feeMonth.length === 0) {
      Alert.alert('Error', 'Please select at least one fee month');
      return;
    }

    const monthString = feeMonth.join(', ');

    const total = parseInt(totalFee) || 0;
    const paid = parseInt(paidAmount) || 0;
    const pending = total - paid;

    try {
      // Update fee month in student record
      await updateDoc(doc(db, 'students', selectedRecord.studentId), {
        month: monthString,
      });

      // Update fee record
      const feeData = {
        studentName: name,
        totalFee: total,
        paidAmount: paid,
        pendingAmount: pending,
        breakdown: {
          tuition: Math.floor(total * 0.7),
          books: Math.floor(total * 0.1),
          labs: Math.floor(total * 0.15),
          exam: Math.floor(total * 0.05),
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

      await setDoc(doc(db, 'fees', selectedRecord.studentId), feeData);

      Alert.alert('Success', 'Fee record updated successfully');
      setEditModalVisible(false);
      dispatch(fetchAdminFeeRecords());
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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading fee records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.headerBar,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? theme.card : '#f1f5f9' }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fee Management</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {feeRecords.length} records
          </Text>
        </View>

        <View style={[styles.headerBadge, { backgroundColor: '#10b98115' }]}>
          <Ionicons name="wallet-outline" size={18} color="#10b981" />
        </View>
      </Animated.View>

      {/* ── Summary strip ── */}
      <Animated.View style={{ opacity: headerAnim }}>
        <LinearGradient
          colors={isDark ? ['#1e293b', '#334155'] : ['#6366f1', '#818cf8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.summaryStrip}
        >
          <View style={styles.summaryItem}>
            <Text style={styles.stripCount}>{feeRecords.filter(r => r.status === 'paid').length}</Text>
            <Text style={styles.stripLabel}>Paid</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={styles.summaryItem}>
            <Text style={styles.stripCount}>{feeRecords.filter(r => r.status === 'pending').length}</Text>
            <Text style={styles.stripLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={styles.summaryItem}>
            <Text style={styles.stripCount}>{feeRecords.length}</Text>
            <Text style={styles.stripLabel}>Total</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: headerAnim }}>
        {/* Search & Filter Row */}
        <View style={styles.controlsRow}>
          <View style={[styles.compactSearchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.compactSearchInput, { color: theme.text }]}
              placeholder="Search student..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactFilterScroll}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.compactFilterChip,
                  {
                    backgroundColor: filterClass === option ? theme.primary : theme.background,
                    borderColor: filterClass === option ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => setFilterClass(option)}
              >
                <Text style={[
                  styles.compactFilterText,
                  { color: filterClass === option ? '#fff' : theme.text }
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* ── List ── */}
      <FlatList
        data={filteredRecords.slice(0, visibleCount)}
        keyExtractor={item => item.studentId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (visibleCount < filteredRecords.length) {
            setVisibleCount(prev => prev + 10);
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          visibleCount < filteredRecords.length ? (
            <TouchableOpacity
              onPress={() => setVisibleCount(prev => prev + 10)}
              style={{ alignItems: 'center', paddingVertical: 14, marginBottom: 10 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                Load more ({filteredRecords.length - visibleCount} remaining)
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item, index }) => {
          const matchedStudent = students.find(st => st.id === item.studentId);
          const displayClass = item.class || matchedStudent?.class || 'N/A';
          const displayFather = matchedStudent?.fatherName || 'N/A';
          return (
            <Animated.View
              style={{
                opacity: listAnim,
                transform: [{
                  translateY: listAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                }],
              }}
            >
              <TouchableOpacity
                style={[styles.card, {
                  backgroundColor: isDark ? theme.card : '#fff',
                  borderColor: theme.border,
                }]}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <View style={styles.row1}>
                  <View style={[styles.avatarSmall, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <Text style={[styles.avatarTextSmall, { color: getStatusColor(item.status) }]}>
                      {item.studentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.titleBlock}>
                    <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>
                      {item.studentName}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.rollno} · {displayClass} · F: {displayFather}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <View style={[styles.dot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <View style={styles.senderRow}>
                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.sender, { color: theme.textSecondary }]}>
                      {item.month || 'Current'}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <Text style={[styles.listAmountTotal, { color: theme.text }]}>
                      PKR {item.totalFee.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.emptyCard, {
            backgroundColor: isDark ? theme.card : '#fff',
            borderColor: theme.border,
          }]}>
            <Ionicons name="document-text-outline" size={28} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery ? 'No students found' : 'No fee records available'}
            </Text>
          </View>
        }
      />

      {/* Full-Screen Professional Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: StatusBar.currentHeight || 0 }}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>Edit Fee Record</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                {selectedRecord?.studentName || 'Student'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={saveFeeRecord}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="checkmark" size={20} color="#10b981" />
            </TouchableOpacity>
          </LinearGradient>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Student Info Card */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 2 }}>STUDENT INFO</Text>
              <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', marginBottom: 16 }}>
                {/* Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b98115', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="person" size={16} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Student Name</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 1 }} numberOfLines={1}>
                      {resolvedStudent?.fullname || resolvedStudent?.name || selectedRecord?.studentName || '—'}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#10b98115', borderRadius: 4 }}>
                    <Text style={{ fontSize: 8, color: '#10b981', fontWeight: '700' }}>LOCKED</Text>
                  </View>
                </View>
                {/* Father Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f115', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="people" size={16} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Father Name</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 1 }} numberOfLines={1}>
                      {resolvedStudent?.fatherName || 'N/A'}
                    </Text>
                  </View>
                </View>
                {/* Roll & Class */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="id-card" size={16} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Roll No & Class</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 1 }}>
                      {resolvedStudent?.rollno || selectedRecord?.rollno || '—'}  ·  {resolvedStudent?.class || selectedRecord?.class || '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Fee Month Picker */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 2 }}>FEE MONTHS</Text>
              <TouchableOpacity
                style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                onPress={() => setMonthPickerVisible(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#10b981" />
                <Text style={{ flex: 1, fontSize: 13, color: feeMonth.length > 0 ? theme.text : theme.textSecondary, marginLeft: 10, fontWeight: '500' }} numberOfLines={1}>
                  {feeMonth.length > 0 ? feeMonth.join(', ') : 'Tap to select month(s)'}
                </Text>
                {feeMonth.length > 0 && (
                  <View style={{ backgroundColor: '#10b98115', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>{feeMonth.length}</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Fee Details */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginLeft: 2 }}>FEE DETAILS</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total Fee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#10b981', marginRight: 4 }}>PKR</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: 18, fontWeight: '800', color: theme.text, padding: 0 }}
                      value={totalFee}
                      onChangeText={setTotalFee}
                      keyboardType="numeric"
                      placeholder="50000"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Paid Amount</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a', marginRight: 4 }}>PKR</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: 18, fontWeight: '800', color: theme.text, padding: 0 }}
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Live Summary */}
              {(() => {
                const pending = (parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0);
                const isPaid = pending === 0;
                const clr = isPaid ? '#16a34a' : '#dc2626';
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${clr}08`, borderWidth: 1, borderColor: `${clr}20`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                    <Ionicons name={isPaid ? 'checkmark-circle' : 'alert-circle'} size={22} color={clr} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: clr }}>
                        {isPaid ? 'Fully Paid' : 'Payment Due'}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        Pending: PKR {pending.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Save Button */}
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, marginBottom: 8 }}
              >
                <TouchableOpacity
                  onPress={saveFeeRecord}
                  style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 8 }}>Save Changes</Text>
                </TouchableOpacity>
              </LinearGradient>

              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{ alignItems: 'center', paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(10) }}>
              <Text style={[styles.pickerTitle, { color: theme.text, marginBottom: 0 }]}>Select Months</Text>
              <TouchableOpacity
                onPress={() => setMonthPickerVisible(false)}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: scale(12), fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            </View>
            {feeMonth.length > 0 && (
              <Text style={{ fontSize: scale(10), color: theme.textSecondary, marginBottom: 8 }}>
                {feeMonth.length} month{feeMonth.length > 1 ? 's' : ''} selected
              </Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {monthOptions.map((monthOption) => {
                const isSelected = feeMonth.includes(monthOption);
                return (
                  <TouchableOpacity
                    key={monthOption}
                    style={[styles.pickerOption, { backgroundColor: isSelected ? theme.primary + '15' : 'transparent' }]}
                    onPress={() => {
                      setFeeMonth(prev =>
                        prev.includes(monthOption)
                          ? prev.filter(m => m !== monthOption)
                          : [...prev, monthOption]
                      );
                    }}
                  >
                    <Text style={[styles.pickerOptionText, {
                      color: isSelected ? theme.primary : theme.text
                    }]}>
                      {monthOption}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? theme.primary : theme.border}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ── Header ── */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: scale(10),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: scale(10),
    marginTop: scale(1),
  },
  headerBadge: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Summary strip ── */
  summaryStrip: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginBottom: scale(10),
    borderRadius: scale(12),
    paddingVertical: scale(10),
    paddingHorizontal: scale(8),
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  stripCount: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '800',
  },
  stripLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scale(9),
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: scale(1),
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: scale(24),
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(24),
    paddingTop: scale(4),
  },

  /* ── Card ── */
  card: {
    borderRadius: scale(12),
    borderWidth: 1,
    padding: scale(12),
    marginBottom: scale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  titleBlock: { flex: 1, marginLeft: scale(10) },
  listName: {
    fontSize: scale(13),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: scale(10),
    marginTop: scale(1),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(7),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    marginLeft: scale(6),
  },
  dot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(3),
  },
  badgeText: {
    fontSize: scale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: scale(46),
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    flex: 1,
    marginRight: scale(8),
  },
  sender: {
    fontSize: scale(10),
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: scale(6),
  },
  listAmountTotal: {
    fontSize: scale(12),
    fontWeight: '800',
  },

  /* ── Search & Filter ── */
  controlsRow: {
    gap: scale(10),
    paddingHorizontal: scale(16),
    marginBottom: scale(10),
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    height: scale(38),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  compactSearchInput: {
    flex: 1,
    fontSize: scale(13),
    paddingVertical: scale(6),
  },
  compactFilterScroll: {
    gap: scale(8),
  },
  compactFilterChip: {
    paddingHorizontal: scale(14),
    height: scale(30),
    justifyContent: 'center',
    borderRadius: scale(15),
    borderWidth: 1,
  },
  compactFilterText: {
    fontSize: scale(11),
    fontWeight: '600',
  },


  /* ── Modern Edit Modal ── */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
  },
  modalBackBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: scale(9),
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: scale(6),
    marginLeft: scale(2),
  },
  formCard: {
    borderRadius: scale(10),
    borderWidth: 1,
    overflow: 'hidden' as const,
    marginBottom: scale(10),
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
  },
  formInput: {
    flex: 1,
    marginLeft: scale(10),
    fontSize: scale(13),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
  },
  formRowDual: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(10),
  },
  dualPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
  },
  feeInputBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: scale(10),
    padding: scale(10),
  },
  liveSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(10),
    padding: scale(12),
    marginTop: scale(4),
    marginBottom: scale(8),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? scale(24) : scale(14),
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(11),
    borderRadius: scale(10),
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    fontSize: scale(13),
    fontWeight: '700',
  },
  pickerText: {
    flex: 1,
    padding: scale(10),
    fontSize: scale(13),
  },

  /* ── Misc ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: scale(14),
  },
  avatarSmall: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: scale(16),
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: scale(12),
    borderWidth: 1,
    paddingVertical: scale(32),
    alignItems: 'center',
    gap: scale(8),
  },
  emptyText: {
    fontSize: scale(12),
    fontWeight: '500',
  },

  /* ── Picker Modal ── */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  pickerContainer: {
    width: '100%',
    maxWidth: scale(300),
    borderRadius: scale(16),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(16),
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(8),
  },
  pickerOptionText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
});
