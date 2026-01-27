import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../api/firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

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

const CATEGORIES = ['All', 'Weekly', 'Monthly', 'Quarterly', 'Final'];

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
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRollNo, setUserRollNo] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [fatherName, setFatherName] = useState<string | null>(null);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const viewShotRef = useRef<View>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();

  // Fetch student profile data
  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.email) return;
    const q = query(collection(db, "profile"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0].data();
        setUserRollNo(d.rollNo || d.roll || d.rollNumber || null);
        setStudentName(d.name || d.displayName || d.studentName || null);
        setFatherName(d.fatherName || d.father || d.parentName || null);
        setStudentClass(d.class || d.className || d.grade || d.studentClass || null);
      }
    });
    return () => unsubscribe();
  }, []);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeRollRef = useRef<(() => void) | null>(null);

  const fetchExams = useCallback(() => {
    const user = auth.currentUser;
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    let emailExams: ExamEntry[] = [];
    let rollNoExams: ExamEntry[] = [];
    const updateMerged = () => {
      const map = new Map();
      [...emailExams, ...rollNoExams].forEach(e => map.set(e.id, e));
      const merged = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(merged);

      // Fallback: Get student info from exam data if not in profile
      if (merged.length > 0) {
        const firstExam = merged[0];
        if (!studentName && firstExam.studentName) setStudentName(firstExam.studentName);
        if (!userRollNo && firstExam.rollNo) setUserRollNo(firstExam.rollNo);
        if (!studentClass && firstExam.studentClass) setStudentClass(firstExam.studentClass);
      }
      setLoading(false);
    };
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = onSnapshot(query(collection(db, 'exams'), where('studentEmail', '==', user.email)), (snap) => {
      emailExams = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamEntry));
      updateMerged();
    }, () => setLoading(false));
    if (userRollNo) {
      if (unsubscribeRollRef.current) unsubscribeRollRef.current();
      unsubscribeRollRef.current = onSnapshot(query(collection(db, 'exams'), where('rollNo', '==', userRollNo)), (snap) => {
        rollNoExams = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamEntry));
        updateMerged();
      });
    } else { updateMerged(); }
  }, [userRollNo, studentName, studentClass]);

  useEffect(() => { fetchExams(); }, [fetchExams]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchExams(); setRefreshing(false); }, [fetchExams]);

  // Process data for the result sheet - aggregate by subject
  const processedData = useMemo(() => {
    let filtered = activeTab === 'All' ? entries : entries.filter(e => e.category === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
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

    // Sort subjects alphabetically
    subjectsData.sort((a, b) => a.name.localeCompare(b.name));

    const overallPercentage = grandTotal > 0 ? (grandObtained / grandTotal) * 100 : 0;
    const testType = activeTab === 'All' ? 'Grand Test' : `${activeTab} Test`;

    return { subjects: subjectsData, grandTotal, grandObtained, overallPercentage, testType, examCount: filtered.length };
  }, [entries, activeTab, searchQuery]);

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
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={isDark ? '#e2e8f0' : '#1e293b'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a', fontSize: fontSize.header }]}>Result Detail</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>
        <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <Ionicons name="search-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
          <TextInput placeholder="Search exams..." placeholderTextColor={isDark ? '#64748b' : '#94a3b8'} style={[styles.searchInput, { color: isDark ? '#fff' : '#0f172a' }]} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.filterChip, activeTab === cat ? { backgroundColor: '#334155' } : { backgroundColor: isDark ? '#334155' : '#fff', borderWidth: 1, borderColor: isDark ? '#475569' : '#e2e8f0' }]}>
              <Text style={[styles.filterText, { color: activeTab === cat ? '#fff' : isDark ? '#cbd5e1' : '#64748b' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator color="#334155" style={{ marginTop: 20 }} /> :
          processedData.subjects.length === 0 ? <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>No results found.</Text> : (
            <View ref={viewShotRef} collapsable={false} style={styles.resultSheet}>

              <View style={styles.sheetHeader}>
                <Image source={require('../assets/the-seeks-logo.png')} style={[styles.sheetLogo, { width: isSmallScreen ? 40 : 50, height: isSmallScreen ? 40 : 50 }]} resizeMode="contain" />
                <View style={styles.sheetHeaderCenter}>
                  <Text style={[styles.sheetAcademyName, { fontSize: isSmallScreen ? 14 : 16 }]}>The Seeks Academy Fort Abbas</Text>
                  <Text style={[styles.sheetTitle, { fontSize: isSmallScreen ? 10 : 11 }]}>Result Sheet ({processedData.testType} Session 2025-26)</Text>
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
                  <Text style={[styles.totalCell, { flex: 2.5, fontSize: fontSize.cell }]}>Position: -</Text>
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
        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSaveResult}>
          <Ionicons name="download-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.saveButtonText}>Save Result</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, elevation: 2 },
  headerTitle: { fontWeight: '700' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 8, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, paddingVertical: 0 },
  filterRow: { marginBottom: 8 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 6 },
  filterText: { fontSize: 10, fontWeight: '600' },

  resultSheet: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sheetLogo: { marginRight: 8 },
  sheetHeaderCenter: { flex: 1, alignItems: 'center' },
  sheetAcademyName: { fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sheetTitle: { fontWeight: '600', color: '#475569', marginTop: 2, textAlign: 'center' },

  studentInfoSection: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  infoLabel: { fontWeight: '700', color: '#0f172a', width: 70 },
  infoValue: { color: '#334155', flex: 1 },

  table: { borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tableHeaderCell: { flex: 1, fontWeight: '700', color: '#0f172a', textAlign: 'center', paddingVertical: 5, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { flex: 1, color: '#334155', textAlign: 'center', paddingVertical: 5, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  subjectCell: { textAlign: 'left', fontWeight: '600', fontStyle: 'italic', paddingLeft: 4 },
  remarksCell: { textAlign: 'left', paddingLeft: 3 },
  totalRow: { flexDirection: 'row', backgroundColor: '#f1f5f9' },
  totalCell: { flex: 1, fontWeight: '600', color: '#0f172a', textAlign: 'center', paddingVertical: 5, borderRightWidth: 1, borderRightColor: '#cbd5e1' },

  sheetFooter: { marginTop: 6 },
  footerMessage: { fontWeight: '600', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  signatureSection: { marginBottom: 8 },
  signatureRow: { flexDirection: 'row', alignItems: 'center' },
  signatureLabel: { fontWeight: '600', color: '#0f172a', width: 100 },
  signatureLine: { flex: 1, height: 1, backgroundColor: '#94a3b8', marginLeft: 8, maxWidth: 120 },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  addressText: { color: '#64748b', marginLeft: 4, textAlign: 'center' },

  fabContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, elevation: 5 },
  saveButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' }
});
