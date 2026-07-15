import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Platform, Image, Dimensions, Modal, Keyboard, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchResults, markResultAsRead, persistReadResultIds } from '../../store/slices/resultsSlice';
import * as Sharing from 'expo-sharing';
import { db, auth } from '../../api/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { scale } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 380;

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
  books?: BookEntry[];
  bookName?: string;
  totalMarks?: string;
  obtainedMarks?: string;
  status?: string;
  description: string;
}

// Dynamic tabs derived from exam entries (T1, T2, T3, etc.)

const getGradeAndRemarks = (percentage: number): { grade: string; remarks: string } => {
  if (percentage >= 90) return { grade: 'A+', remarks: 'Excellent' };
  if (percentage >= 80) return { grade: 'A', remarks: 'Very Good' };
  if (percentage >= 70) return { grade: 'B', remarks: 'Good' };
  if (percentage >= 60) return { grade: 'C', remarks: 'Satisfactory' };
  if (percentage >= 50) return { grade: 'D', remarks: 'Needs Improvement' };
  if (percentage >= 40) return { grade: 'E', remarks: 'Hard work required' };
  return { grade: 'Fail', remarks: 'Hard work required' };
};

export const ResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTabPicker, setShowTabPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.results.list);
  const loading = useAppSelector(state => state.results.isLoading);
  const readResultIds = useAppSelector(state => state.results.readIds);

  // Mark all fetched results as read
  useEffect(() => {
    let newlyRead = false;
    const newReadIds = [...readResultIds];

    entries.forEach(entry => {
      if (!newReadIds.includes(entry.id)) {
        newReadIds.push(entry.id);
        dispatch(markResultAsRead(entry.id));
        newlyRead = true;
      }
    });

    if (newlyRead) {
      persistReadResultIds(newReadIds);
    }
  }, [entries, dispatch, readResultIds]);



  // Derive dynamic T-tabs from actual exam data (sorted numerically: T1, T2, T3...)
  const dynamicTabs = useMemo(() => {
    const titles = new Set<string>();
    entries.forEach(e => {
      if (e.title && /^T\d+$/i.test(e.title)) {
        titles.add(e.title.toUpperCase());
      }
    });
    const sorted = Array.from(titles).sort((a, b) => {
      const numA = parseInt(a.replace('T', ''), 10);
      const numB = parseInt(b.replace('T', ''), 10);
      return numA - numB;
    });
    return ['All', ...sorted];
  }, [entries]);

  const dynamicCategories = useMemo(() => {
    const defaultCats = ['Weekly', 'Monthly', 'Quarterly', 'Half Book', 'Full Book'];
    const cats = new Set<string>(defaultCats);
    entries.forEach(e => {
      if (e.category) cats.add(e.category);
    });
    const extraCats = Array.from(cats).filter(c => !defaultCats.includes(c)).sort();
    return ['All', ...defaultCats, ...extraCats];
  }, [entries]);
  const [searchQuery, setSearchQuery] = useState('');

  const viewShotRef = useRef<View>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();

  // Get user profile accurately from Redux (handles both 'profile' and 'studentsprofile' securely)
  const profile = useAppSelector(state => state.auth.profile);
  const user = useAppSelector(state => state.auth.user);
  const allSystemExams = useAppSelector(state => state.admin.exams); // Used to calculate Class Position against peers

  // profile.rollno stores the student doc key (e.g. "STD-001") which matches
  // the rollNo field saved on exam records in Firestore
  const userRollNo = profile?.rollno || null;
  const studentName = profile?.fullname || null;
  const studentClass = profile?.class || null;
  const fatherName = profile?.fathername || null;

  const fetchExams = useCallback(async () => {
    if (!user) { return; }
    dispatch(fetchResults({
      userRollNo: userRollNo || null,
      userEmail: user?.email || null,
      studentName: studentName || null,
      studentClass: studentClass || null
    }));
  }, [userRollNo, studentName, studentClass, user?.email, dispatch]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExams();
    setTimeout(() => setRefreshing(false), 800);
  }, [fetchExams]);

  // Process data for the result sheet - aggregate by subject
  const processedData = useMemo(() => {
    let filtered = activeTab === 'All' ? entries : entries.filter(e => (e.title || '').toUpperCase() === activeTab.toUpperCase());

    if (activeCategory !== 'All') {
      filtered = filtered.filter(e => e.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q));
    }

    // Aggregate marks by subject (sum if same subject appears multiple times)
    const subjectMap: Map<string, { total: number; obtained: number }> = new Map();

    filtered.forEach(exam => {
      if (exam.books && exam.books.length > 0) {
        exam.books.forEach(book => {
          const total = parseFloat(book.totalMarks) || 0;
          const obtained = parseFloat(book.obtainedMarks) || 0;
          const existing = subjectMap.get(book.name) || { total: 0, obtained: 0 };
          subjectMap.set(book.name, { total: existing.total + total, obtained: existing.obtained + obtained });
        });
      } else if (exam.bookName) {
        const total = parseFloat(exam.totalMarks || '0');
        const obtained = parseFloat(exam.obtainedMarks || '0');
        const existing = subjectMap.get(exam.bookName) || { total: 0, obtained: 0 };
        subjectMap.set(exam.bookName, { total: existing.total + total, obtained: existing.obtained + obtained });
      }
    });

    const subjectsData: { name: string; total: number; obtained: number; percentage: number; grade: string; remarks: string }[] = [];
    let grandTotal = 0, grandObtained = 0;

    subjectMap.forEach((marks, name) => {
      const percentage = marks.total > 0 ? (marks.obtained / marks.total) * 100 : 0;
      const { grade, remarks } = getGradeAndRemarks(percentage);
      subjectsData.push({ name, total: marks.total, obtained: marks.obtained, percentage, grade, remarks });
      grandTotal += marks.total;
      grandObtained += marks.obtained;
    });

    // Sort subjects in standard predetermined sequence using keyword matching for robust recognition
    const getSubjectRank = (name: string) => {
      const n = name.toLowerCase().trim();
      if (n.includes('tarjuma') || n.includes('tajuma') || n.includes('quran')) return 1;
      if (n.includes('islam')) return 2;
      if (n.includes('urdu')) return 3;
      if (n.includes('pak')) return 4;
      if (n.includes('eng')) return 5;
      if (n.includes('math')) return 6;
      if (n.includes('physic')) return 7;
      if (n.includes('chemist')) return 8;
      if (n.includes('comput')) return 9;
      return 999;
    };

    subjectsData.sort((a, b) => {
      const rankA = getSubjectRank(a.name);
      const rankB = getSubjectRank(b.name);

      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.name.localeCompare(b.name);
    });

    const overallPercentage = grandTotal > 0 ? (grandObtained / grandTotal) * 100 : 0;
    const testType = activeTab === 'All' ? 'Grand Total' : `${activeTab} Test`;
    const examCategories = Array.from(new Set(filtered.map(e => e.category).filter(Boolean)));
    const testCategory = examCategories.length > 0 ? examCategories.join(' & ') : 'All Types';

    // Calculate Class Position dynamically based on peer exams
    let computedPosition = '-';
    // Use allSystemExams to rank against peers
    const sourceExams = allSystemExams;

    if (studentClass && activeTab !== 'All' && sourceExams.length > 0) {
      // Find all exams matching this class and this test (activeTab)
      const peerExams = sourceExams.filter(
        ex => ex.studentClass === studentClass &&
          (ex.title || '').toUpperCase() === activeTab.toUpperCase() &&
          (activeCategory !== 'All' ? ex.category === activeCategory : true)
      );

      const studentRankings = new Map<string, { total: number; obtained: number }>();

      peerExams.forEach(ex => {
        const id = ex.rollNo || ex.studentEmail || ex.studentName || 'unknown';
        const existing = studentRankings.get(id) || { total: 0, obtained: 0 };

        let exTotal = 0, exObt = 0;
        if (ex.books && ex.books.length > 0) {
          exTotal = ex.books.reduce((sum: number, b: any) => sum + (parseFloat(b.totalMarks) || 0), 0);
          exObt = ex.books.reduce((sum: number, b: any) => sum + (parseFloat(b.obtainedMarks) || 0), 0);
        } else {
          exTotal = parseFloat(ex.totalMarks || '0');
          exObt = parseFloat(ex.obtainedMarks || '0');
        }

        studentRankings.set(id, { total: existing.total + exTotal, obtained: existing.obtained + exObt });
      });

      // Convert to array of percentages and sort descending
      const rankingList = Array.from(studentRankings.entries()).map(([id, scores]) => {
        const perc = scores.total > 0 ? (scores.obtained / scores.total) * 100 : 0;
        return { id, percentage: perc };
      }).sort((a, b) => b.percentage - a.percentage);

      // Find this user's position
      const myId = userRollNo || user?.email || studentName;
      if (myId) {
        // Use loose matching to handle mixed-case emails or edge cases
        const myIndex = rankingList.findIndex(r => r.id.toLowerCase() === myId.toLowerCase());
        if (myIndex !== -1) {
          let posStr = (myIndex + 1).toString();
          // Add suffix logic (1st, 2nd, 3rd)
          if (posStr.endsWith('1') && posStr !== '11') posStr += 'st';
          else if (posStr.endsWith('2') && posStr !== '12') posStr += 'nd';
          else if (posStr.endsWith('3') && posStr !== '13') posStr += 'rd';
          else posStr += 'th';

          computedPosition = `${posStr} / ${rankingList.length}`;
        }
      }
    }

    return { subjects: subjectsData, grandTotal, grandObtained, overallPercentage, testType, testCategory, examCount: filtered.length, classPosition: computedPosition };
  }, [entries, activeTab, activeCategory, searchQuery, allSystemExams, studentClass, userRollNo, user?.email, studentName]);

  const handleSaveResult = async () => {
    try {
      if (status?.status !== 'granted') {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Need library access to save results.");
          return;
        }
      }
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, { format: "png", quality: 1, result: "tmpfile" });
        if (Platform.OS === 'android') {
          try {
            await MediaLibrary.createAssetAsync(uri);
            Alert.alert("Saved!", "Result card saved to gallery.");
          } catch (e) {
            await Sharing.shareAsync(uri);
          }
        } else {
          await Sharing.shareAsync(uri);
        }
      }
    } catch (error) {
      console.error("Snapshot error:", error);
      Alert.alert("Error", "Failed to save result.");
    }
  };

  const fontSize = {
    header: isSmallScreen ? 14 : 16,
    title: isSmallScreen ? 12 : 14,
    cell: isSmallScreen ? 8 : 10,
    label: isSmallScreen ? 9 : 11,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]} edges={['top', 'left', 'right']}>
      <StatusBar
        backgroundColor={theme.card}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.header, { borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, zIndex: 10, borderBottomWidth: 0,  backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={isDark ? '#e2e8f0' : '#1e293b'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a', fontSize: fontSize.header }]}>Result Detail</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { paddingHorizontal: scale(10), paddingVertical: scale(6), elevation: 0, backgroundColor: isDark ? '#475569' : '#334155' }]} 
          activeOpacity={0.8} 
          onPress={handleSaveResult}
        >
          <Ionicons name="download-outline" size={14} color="#fff" style={{ marginRight: scale(4) }} />
          <Text style={[styles.saveButtonText, { fontSize: scale(10) }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>
        <View style={[styles.filterSearchRow, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(true)}
            style={styles.inlineDropdown}
          >
            <Text style={[styles.dropdownLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>Test Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text numberOfLines={1} style={[styles.dropdownText, { color: isDark ? '#cbd5e1' : '#334155' }]}>{activeCategory === 'All' ? 'All Types' : activeCategory}</Text>
              <Ionicons name="chevron-down" size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginLeft: scale(6) }} />
            </View>
          </TouchableOpacity>

          <View style={[styles.verticalDivider, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />

          <TouchableOpacity
            onPress={() => setShowTabPicker(true)}
            style={styles.inlineDropdown}
          >
            <Text style={[styles.dropdownLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>Test No.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text numberOfLines={1} style={[styles.dropdownText, { color: isDark ? '#cbd5e1' : '#334155' }]}>{activeTab === 'All' ? 'All Tests' : activeTab}</Text>
              <Ionicons name="chevron-down" size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginLeft: scale(6) }} />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#334155" style={{ marginTop: scale(20) }} /> :
          processedData.subjects.length === 0 ? <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: scale(20) }}>No results found.</Text> : (
            <View ref={viewShotRef} collapsable={false} style={styles.resultSheet}>

              <View style={styles.sheetHeader}>
                <Image source={require('../../assets/the-seeks-logo.png')} style={[styles.sheetLogo, { width: isSmallScreen ? 60 : 75, height: isSmallScreen ? 60 : 75 }]} resizeMode="contain" />
                <View style={styles.sheetHeaderLeft}>
                  <Text style={[styles.sheetAcademyName, { fontSize: isSmallScreen ? 14 : 16 }]}>The Seeks Academy Fort Abbas</Text>
                  <Text style={[styles.sheetTitle, { fontSize: isSmallScreen ? 10 : 11 }]}>Result Sheet ({activeTab === 'All' ? 'Grand Test' : `${processedData.testCategory} ${activeTab}`} Session {new Date().getFullYear()}-{new Date().getFullYear() + 1})</Text>
                </View>
              </View>

              <View style={styles.studentInfoSection}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { fontSize: fontSize.label }]}>Name:</Text>
                  <Text style={[styles.infoValue, { fontSize: fontSize.label }]}>{studentName || auth.currentUser?.displayName || 'N/A'}</Text>
                  <Text style={[styles.infoLabel, { fontSize: fontSize.label }]}>Roll No.</Text>
                  <Text style={[styles.infoValue, { fontSize: fontSize.label }]}>{userRollNo || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { fontSize: fontSize.label }]}>Father Name:</Text>
                  <Text style={[styles.infoValue, { fontSize: fontSize.label }]}>{fatherName || 'N/A'}</Text>
                  <Text style={[styles.infoLabel, { fontSize: fontSize.label }]}>Class:</Text>
                  <Text style={[styles.infoValue, { fontSize: fontSize.label }]}>{studentClass || 'N/A'}</Text>
                </View>

              </View>

              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 2, fontSize: fontSize.cell }]}>Subjects</Text>
                  <Text style={[styles.tableHeaderCell, { fontSize: fontSize.cell }]}>Total</Text>
                  <Text style={[styles.tableHeaderCell, { fontSize: fontSize.cell }]}>Obtained</Text>
                  <Text style={[styles.tableHeaderCell, { fontSize: fontSize.cell }]}>%</Text>
                  <Text style={[styles.tableHeaderCell, { fontSize: fontSize.cell }]}>Grade</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5, fontSize: fontSize.cell }]}>Remarks</Text>
                </View>

                {processedData.subjects.map((sub, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, styles.subjectCell, { flex: 2, fontSize: fontSize.cell }]}>{sub.name}</Text>
                    <Text style={[styles.tableCell, { fontSize: fontSize.cell }]}>{sub.total}</Text>
                    <Text style={[styles.tableCell, { fontSize: fontSize.cell }]}>{sub.obtained}</Text>
                    <Text style={[styles.tableCell, { fontSize: fontSize.cell }]}>{sub.percentage.toFixed(1)}</Text>
                    <Text style={[styles.tableCell, { fontSize: fontSize.cell }, sub.grade === 'Fail' && { color: '#dc2626' }]}>{sub.grade}</Text>
                    <Text style={[styles.tableCell, styles.remarksCell, { flex: 1.5, fontSize: isSmallScreen ? 6 : 8 }]} numberOfLines={1}>{sub.remarks}</Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={[styles.totalCell, { flex: 2, fontWeight: '700', fontSize: fontSize.cell }]}>Total</Text>
                  <Text style={[styles.totalCell, { fontSize: fontSize.cell }]}>{processedData.grandTotal}</Text>
                  <Text style={[styles.totalCell, { fontSize: fontSize.cell }]}>{processedData.grandObtained}</Text>
                  <Text style={[styles.totalCell, { fontSize: fontSize.cell }]}>{processedData.overallPercentage.toFixed(1)}</Text>
                  <Text style={[styles.totalCell, { flex: 2.5, fontSize: fontSize.cell }]}>Position: {processedData.classPosition}</Text>
                </View>
              </View>

              <View style={styles.sheetFooter}>
                <Text style={[styles.footerMessage, { fontSize: isSmallScreen ? 8 : 10 }]}>Please contact the Principal for further support with your child's progress.</Text>
                <View style={styles.signatureSection}>
                  <View style={styles.signatureRow}>
                    <Text style={[styles.signatureLabel, { fontSize: isSmallScreen ? 8 : 10 }]}>Parent's Signature:</Text>
                    <View style={styles.signatureLine} />
                  </View>
                </View>
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={12} color="#64748b" />
                  <Text style={[styles.addressText, { fontSize: isSmallScreen ? 7 : 9 }]}>Near Mudrassa Mazhar Aloom Fort Abbas. 0348-7000302</Text>
                </View>
              </View>
            </View>
          )}
        <View style={{ height: scale(80) }} />
      </ScrollView>

      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>Select Test Type</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {dynamicCategories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalOption, activeCategory === cat && { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                  onPress={() => {
                    setActiveCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: activeCategory === cat ? '#3b82f6' : isDark ? '#cbd5e1' : '#475569', fontWeight: activeCategory === cat ? '700' : '500' }]}>{cat}</Text>
                  {activeCategory === cat && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showTabPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTabPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>Select Test Number</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {dynamicTabs.map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.modalOption, activeTab === tab && { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                  onPress={() => {
                    setActiveTab(tab);
                    setShowTabPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: activeTab === tab ? '#3b82f6' : isDark ? '#cbd5e1' : '#475569', fontWeight: activeTab === tab ? '700' : '500' }]}>{tab}</Text>
                  {activeTab === tab && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12), elevation: 2 },
  headerTitle: { fontWeight: '700' },
  iconBtn: { padding: scale(4) },
  scrollContent: { padding: scale(10) },
  filterSearchRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: scale(12), marginBottom: scale(12),
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    borderWidth: 1, height: scale(50), paddingHorizontal: scale(4)
  },
  verticalDivider: { width: 1, height: '60%', marginHorizontal: scale(8) },
  inlineDropdown: { flex: 1, paddingHorizontal: scale(10), height: '100%', justifyContent: 'center' },
  dropdownLabel: { fontSize: scale(10), fontWeight: '600', marginBottom: 2 },
  dropdownText: { fontSize: scale(13), fontWeight: '700' },

  resultSheet: { backgroundColor: '#fff', borderRadius: scale(8), padding: scale(12), marginBottom: scale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(8) },
  sheetLogo: { marginRight: scale(8) },
  sheetHeaderLeft: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  sheetAcademyName: { fontWeight: '800', color: '#0f172a', textAlign: 'left' },
  sheetTitle: { fontWeight: '600', color: '#475569', marginTop: 2, textAlign: 'left' },

  studentInfoSection: { marginBottom: scale(12), borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: scale(10) },
  infoRow: { flexDirection: 'row', marginBottom: scale(4), alignItems: 'center' },
  infoLabel: { fontWeight: '700', color: '#0f172a', width: scale(70) },
  infoValue: { color: '#334155', flex: 1 },

  table: { borderWidth: 1, borderColor: '#1e293b', marginBottom: scale(12) },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tableHeaderCell: { flex: 1, fontWeight: '700', color: '#0f172a', textAlign: 'center', paddingVertical: scale(5), paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { flex: 1, color: '#334155', textAlign: 'center', paddingVertical: scale(5), paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  subjectCell: { textAlign: 'left', fontWeight: '600', fontStyle: 'italic', paddingLeft: scale(4) },
  remarksCell: { textAlign: 'left', paddingLeft: 3 },
  totalRow: { flexDirection: 'row', backgroundColor: '#f1f5f9' },
  totalCell: { flex: 1, fontWeight: '600', color: '#0f172a', textAlign: 'center', paddingVertical: scale(5), borderRightWidth: 1, borderRightColor: '#cbd5e1' },

  sheetFooter: { marginTop: scale(6) },
  footerMessage: { fontWeight: '600', color: '#0f172a', textAlign: 'center', marginBottom: scale(8) },
  signatureSection: { marginBottom: scale(8) },
  signatureRow: { flexDirection: 'row', alignItems: 'center' },
  signatureLabel: { fontWeight: '600', color: '#0f172a', width: scale(100) },
  signatureLine: { flex: 1, height: 1, backgroundColor: '#94a3b8', marginLeft: scale(8), maxWidth: 120 },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: scale(6) },
  addressText: { color: '#64748b', marginLeft: scale(4), textAlign: 'center' },

  fabContainer: { position: 'absolute', bottom: scale(40), left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(30), elevation: 5 },
  saveButtonText: { color: '#fff', fontSize: scale(13), fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  modalContent: { width: '75%', borderRadius: scale(12), padding: scale(12), elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitle: { fontSize: scale(14), fontWeight: '700', marginBottom: scale(8), textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(10), paddingHorizontal: scale(12), borderRadius: scale(6), marginBottom: 2 },
  modalOptionText: { fontSize: scale(12) }
});
