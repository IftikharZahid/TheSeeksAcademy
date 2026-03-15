import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, StatusBar, Animated, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminFeeRecords, updateFeeRecord } from '../../store/slices/adminSlice';
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
  const [visibleCount, setVisibleCount] = useState(20);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);
  const [classPickerVisible, setClassPickerVisible] = useState(false);

  // Form fields — student info is read-only from Redux, only fee fields are editable
  const [feeMonth, setFeeMonth] = useState<string[]>([]);
  const [totalFee, setTotalFee] = useState('2500');
  const [paidAmount, setPaidAmount] = useState('0');
  const [filterClass, setFilterClass] = useState('All');
  // Resolved student from Redux store
  const [resolvedStudent, setResolvedStudent] = useState<any>(null);
  // Fee payment history fetched from Firestore
  const [feeHistory, setFeeHistory] = useState<{ date: string; amount: number; method: string; months?: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
        // Filter by Class — check fee record AND matched student's class/grade
        result = result.filter(record => {
          const student = students.find(s => s.id === record.studentId);
          const cls = record.class || student?.class || (student as any)?.grade || '';
          return cls === filterClass;
        });
      }
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(record => {
        const student = students.find(s => s.id === record.studentId);
        return (
          (record.studentName || '').toLowerCase().includes(q) ||
          (record.rollno || '').toLowerCase().includes(q) ||
          (student?.fullname || '').toLowerCase().includes(q)
        );
      });
    }

    setFilteredRecords(result);
  }, [searchQuery, feeRecords, filterClass, students]);

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
  //           totalFee: 2500,
  //           paidAmount: 0,
  //           pendingAmount: 2500,
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

  const openEditModal = async (record: FeeRecord) => {
    setSelectedRecord(record);
    const student = students.find(s => s.id === record.studentId);
    setResolvedStudent(student || null);
    const existingMonths = (record.month || student?.month || '').split(',').map((m: string) => m.trim()).filter(Boolean);
    setFeeMonth(existingMonths);
    setTotalFee(record.totalFee.toString());
    setPaidAmount(record.paidAmount.toString());
    setFeeHistory([]);
    setEditModalVisible(true);

    // Fetch payment history from Firestore in background
    setHistoryLoading(true);
    try {
      const snap = await getDoc(doc(db, 'fees', record.studentId));
      if (snap.exists()) {
        const data = snap.data();
        const payments = (data.payments || []) as { date: string; amount: number; method: string; months?: string }[];
        setFeeHistory([...payments].reverse()); // newest first
      }
    } catch (e) {
      // silently ignore — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveFeeRecord = () => {
    if (!selectedRecord) return;

    const name = resolvedStudent?.fullname || resolvedStudent?.name || selectedRecord.studentName;
    const monthString = feeMonth.join(', ');
    const total = parseInt(totalFee) || 0;
    const paid = Math.min(parseInt(paidAmount) || 0, total); // never exceed total

    if (feeMonth.length === 0) {
      Alert.alert('Error', 'Please select at least one fee month');
      return;
    }

    // ── 1. Optimistic update — instant UI, no waiting ──
    dispatch(updateFeeRecord({
      studentId: selectedRecord.studentId,
      totalFee: total,
      paidAmount: paid,
      month: monthString,
    }));
    setEditModalVisible(false); // close immediately

    // ── 2. Firestore writes in background ──
    const newPayment = paid > 0
      ? { date: new Date().toISOString().split('T')[0], amount: paid, method: 'Admin Update', months: monthString }
      : null;

    // Fetch existing payments, append new one
    getDoc(doc(db, 'fees', selectedRecord.studentId)).then((snap: any) => {
      const existing: any[] = snap.exists() ? (snap.data().payments || []) : [];
      const updatedPayments = newPayment ? [...existing, newPayment] : existing;

      const feeData = {
        studentName: name,
        totalFee: total,
        paidAmount: paid,
        pendingAmount: total - paid,
        breakdown: {
          tuition: Math.floor(total * 0.7),
          books: Math.floor(total * 0.1),
          labs: Math.floor(total * 0.15),
          exam: Math.floor(total * 0.05),
        },
        payments: updatedPayments,
        lastUpdated: new Date().toISOString(),
      };

      return Promise.all([
        updateDoc(doc(db, 'students', selectedRecord.studentId), { month: monthString }),
        setDoc(doc(db, 'fees', selectedRecord.studentId), feeData),
      ]);
    }).catch((error: any) => {
      console.error('Error saving fee record:', error);
      dispatch(fetchAdminFeeRecords());
      Alert.alert('Sync Error', 'Changes shown locally but failed to save to server.');
    });
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
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
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
            setVisibleCount(prev => prev + 20);
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          visibleCount < filteredRecords.length ? (
            <TouchableOpacity
              onPress={() => setVisibleCount(prev => prev + 20)}
              style={{ alignItems: 'center', paddingVertical: 14, marginBottom: 10 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                Load more ({filteredRecords.length - visibleCount} remaining)
              </Text>
            </TouchableOpacity>
          ) : filteredRecords.length > 0 ? (
            <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textSecondary, paddingVertical: 10 }}>
              Showing {Math.min(visibleCount, filteredRecords.length)} of {filteredRecords.length} records
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const matchedStudent = students.find(st => st.id === item.studentId);
          const displayClass = item.class || matchedStudent?.class || (matchedStudent as any)?.grade || 'N/A';
          const initial = (item.studentName || '?')[0].toUpperCase();
          const statusColor = getStatusColor(item.status);
          const isEven = index % 2 === 0;
          return (
            <TouchableOpacity
              style={[styles.tableRow, {
                backgroundColor: isEven
                  ? (isDark ? theme.card : '#fff')
                  : (isDark ? theme.card + 'CC' : '#f9fafb'),
                borderBottomColor: theme.border + '50',
              }]}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}
            >
              {/* # */}
              <Text style={[styles.trCol, styles.trSerial, { color: theme.textSecondary }]}>{index + 1}</Text>

              {/* Avatar initial */}
              <View style={[styles.trAvatar, { backgroundColor: statusColor + '18' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{initial}</Text>
              </View>

              {/* Name + roll + class */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }} numberOfLines={1}>{item.studentName}</Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary }} numberOfLines={1}>{item.rollno} · {displayClass}</Text>
              </View>

              {/* Status badge */}
              <View style={[styles.trStatusBadge, { backgroundColor: statusColor + '15' }]}>
                <View style={[styles.trDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.trStatusText, { color: statusColor }]}>{item.status}</Text>
              </View>

              {/* Amount */}
              <Text style={[styles.trAmount, { color: theme.text }]}>{item.totalFee.toLocaleString()}</Text>

              {/* Edit */}
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.trEditBtn}>
                <Ionicons name="pencil" size={13} color={theme.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={[styles.tableHeader, { backgroundColor: isDark ? theme.card : '#f8fafc', borderBottomColor: theme.border }]}>
            <Text style={[styles.trCol, styles.trSerial, styles.thCell, { color: theme.textSecondary }]}>#</Text>
            <View style={{ width: 26 }} />
            <Text style={[styles.thCell, { color: theme.textSecondary, flex: 1, marginLeft: 8 }]}>STUDENT</Text>
            <Text style={[styles.thCell, { color: theme.textSecondary, width: 58 }]}>STATUS</Text>
            <Text style={[styles.thCell, styles.trAmount, { color: theme.textSecondary }]}>TOTAL</Text>
            <View style={{ width: 28 }} />
          </View>
        }
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
              contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Student Info — compact 2-column read-only grid */}
              <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, marginLeft: 2 }}>STUDENT INFO</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {/* Name + Father */}
                <View style={{ flex: 1 }}>
                  <View style={[feeStyles.roCell, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[feeStyles.roCellLabel, { color: theme.textSecondary }]}>Name</Text>
                    <Text style={[feeStyles.roCellValue, { color: theme.text }]} numberOfLines={1}>
                      {resolvedStudent?.fullname || resolvedStudent?.name || selectedRecord?.studentName || '—'}
                    </Text>
                  </View>
                  <View style={[feeStyles.roCell, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 6 }]}>
                    <Text style={[feeStyles.roCellLabel, { color: theme.textSecondary }]}>Father</Text>
                    <Text style={[feeStyles.roCellValue, { color: theme.text }]} numberOfLines={1}>
                      {resolvedStudent?.fatherName || 'N/A'}
                    </Text>
                  </View>
                </View>
                {/* Roll + Class */}
                <View style={{ flex: 1 }}>
                  <View style={[feeStyles.roCell, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[feeStyles.roCellLabel, { color: theme.textSecondary }]}>Roll No</Text>
                    <Text style={[feeStyles.roCellValue, { color: theme.text }]} numberOfLines={1}>
                      {resolvedStudent?.rollno || selectedRecord?.rollno || '—'}
                    </Text>
                  </View>
                  <View style={[feeStyles.roCell, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 6 }]}>
                    <Text style={[feeStyles.roCellLabel, { color: theme.textSecondary }]}>Class</Text>
                    <Text style={[feeStyles.roCellValue, { color: theme.text }]} numberOfLines={1}>
                      {resolvedStudent?.grade || resolvedStudent?.class || selectedRecord?.class || '—'}
                    </Text>
                  </View>
                </View>
              </View>


              {/* Fee Details — 2-column input grid */}
              <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, marginLeft: 2 }}>FEE DETAILS</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 10 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Total Fee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981', marginRight: 3 }}>PKR</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontWeight: '800', color: theme.text, padding: 0 }}
                      value={totalFee}
                      onChangeText={setTotalFee}
                      keyboardType="numeric"
                      placeholder="4500"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 10 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Paid Amount</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a', marginRight: 3 }}>PKR</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontWeight: '800', color: theme.text, padding: 0 }}
                      value={paidAmount}
                      onChangeText={(v) => {
                        const p = parseInt(v) || 0;
                        const t = parseInt(totalFee) || 0;
                        setPaidAmount(t > 0 && p > t ? t.toString() : v);
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Inline Month Chips — after fee details */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, marginTop: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: 2 }}>
                  PAID MONTHS {new Date().getFullYear()}
                </Text>
                {feeMonth.length > 0 && (
                  <TouchableOpacity onPress={() => setFeeMonth([])}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#ef4444' }}>CLEAR</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {monthOptions.map((month) => {
                  const sel = feeMonth.includes(month);
                  return (
                    <TouchableOpacity
                      key={month}
                      onPress={() =>
                        setFeeMonth(prev =>
                          prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
                        )
                      }
                      activeOpacity={0.7}
                      style={[
                        feeStyles.inlineChip,
                        sel
                          ? { backgroundColor: '#10b981', borderColor: '#10b981' }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: sel ? '#fff' : theme.text }}>
                        {month.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live Summary */}
              {(() => {
                const pending = (parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0);
                const isPaid = pending === 0;
                const clr = isPaid ? '#16a34a' : '#dc2626';
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${clr}08`, borderWidth: 1, borderColor: `${clr}20`, borderRadius: 10, padding: 10, marginBottom: 14 }}>
                    <Ionicons name={isPaid ? 'checkmark-circle' : 'alert-circle'} size={18} color={clr} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: clr }}>
                        {isPaid ? 'Fully Paid' : 'Payment Due'}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        Pending: PKR {pending.toLocaleString()}
                        {feeMonth.length > 0 ? `  ·  ${feeMonth.length} month${feeMonth.length > 1 ? 's' : ''} selected` : ''}
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
                style={{ borderRadius: 10 }}
              >
                <TouchableOpacity
                  onPress={saveFeeRecord}
                  style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="checkmark-circle" size={17} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 7 }}>Save Changes</Text>
                </TouchableOpacity>
              </LinearGradient>

              {/* Fee History */}
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 }}>
                  FEE HISTORY
                </Text>
                {historyLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : feeHistory.length === 0 ? (
                  <View style={[feeStyles.historyEmpty, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="receipt-outline" size={20} color={theme.textSecondary} />
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 8 }}>No previous payments</Text>
                  </View>
                ) : (
                  feeHistory.map((entry, idx) => (
                    <View key={idx} style={[feeStyles.historyRow, {
                      backgroundColor: idx % 2 === 0 ? theme.card : theme.card + 'AA',
                      borderColor: theme.border,
                    }]}>
                      {/* Left: date + method */}
                      <View style={[feeStyles.historyDot, { backgroundColor: '#10b98120' }]}>
                        <Ionicons name="checkmark" size={10} color="#10b981" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text }}>
                          {entry.date}
                        </Text>
                        {entry.months ? (
                          <Text style={{ fontSize: 9, color: theme.textSecondary }} numberOfLines={1}>
                            {entry.months}
                          </Text>
                        ) : null}
                      </View>
                      {/* Right: amount */}
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#10b981' }}>
                        PKR {(entry.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>


    </SafeAreaView>

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

  /* ── Compact Table ── */
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 9, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  trCol: {},
  trSerial: { width: 22, fontSize: 10, textAlign: 'center', marginRight: 4 },
  trAvatar: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  trStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, marginRight: 8, width: 58,
  },
  trDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 3 },
  trStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  trAmount: { fontSize: 11, fontWeight: '700', width: 60, textAlign: 'right' },
  trEditBtn: { padding: 6, borderRadius: 6, marginLeft: 4 },


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

  /* ── Picker Modal (month bottom sheet) ── */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  sheetBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, minWidth: 52, alignItems: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthChip: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

// Compact read-only cell styles for the Edit Fee modal
const feeStyles = StyleSheet.create({
  roCell: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roCellLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  roCellValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  historyEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  historyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

