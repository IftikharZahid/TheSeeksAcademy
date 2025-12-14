import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../api/firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  books?: BookEntry[]; // NEW: Multiple books support
  bookName?: string; // LEGACY
  totalMarks?: string; // LEGACY
  obtainedMarks?: string; // LEGACY
  status?: string; 
  description: string;
}

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Year', 'Final'];
const TITLE_FILTERS = ['All', ...Array.from({ length: 20 }, (_, i) => `T${i + 1}`)];

const ScoreCircle = ({ percentage, color }: { percentage: number, color: string }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const radius = 35;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const halfCircle = radius + strokeWidth;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();
    }, [percentage]);

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={{ width: halfCircle * 2, height: halfCircle * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={halfCircle * 2} height={halfCircle * 2} viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
                <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
                    {/* Background Circle */}
                    <Circle
                        cx={halfCircle}
                        cy={halfCircle}
                        r={radius}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {/* Progress Circle */}
                    <AnimatedCircle
                        cx={halfCircle}
                        cy={halfCircle}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </G>
            </Svg>
            <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{percentage}%</Text>
                <Text style={{ color: '#e0e7ff', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>Score</Text>
            </View>
        </View>
    );
};

export const ResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('Weekly');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Fetch Profile Image
  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.email) return;

    const q = query(collection(db, "profile"), where("email", "==", user.email));
    
    // Real-time listener for profile changes
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            if (docData.image) {
                setProfileImage(docData.image);
            }
        }
    });

    return () => unsubscribe();
  }, []);

  // Fetch Exams - Filter by Student Email
  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.email) {
      setLoading(false);
      return;
    }

    fetchExams();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Dedicated function to fetch/refresh exams data
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const fetchExams = useCallback(() => {
    const user = auth.currentUser;
    console.log('👤 ResultsScreen: Current user:', user?.email);
    
    if (!user?.email) {
      console.log('⚠️ No user email found, cannot fetch exams');
      setLoading(false);
      return;
    }

    // Unsubscribe from previous listener if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Query exams where studentEmail matches logged-in user's email
    console.log('🔍 Querying exams for studentEmail:', user.email);
    const q = query(
      collection(db, 'exams'),
      where('studentEmail', '==', user.email)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📥 ResultsScreen: Snapshot received, size:', snapshot.size);
      const list: ExamEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Exam found - Full data:', {
          id: doc.id,
          title: data.title,
          category: data.category,
          studentEmail: data.studentEmail,
          studentName: data.studentName,
          date: data.date
        });
        list.push({ id: doc.id, ...data } as ExamEntry);
      });
      console.log('✅ ResultsScreen: Total exams loaded:', list.length);
      console.log('📋 All exams:', list.map(e => ({ title: e.title, category: e.category })));
      setEntries(list);
      setLoading(false);
    }, (error) => {
      console.error('❌ ResultsScreen: Error fetching exams:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchExams();
    // Small delay to show refresh animation
    await new Promise(resolve => setTimeout(resolve, 300));
    setRefreshing(false);
  }, [fetchExams]);

  // Calculate Overall Percentage and Grade
  const { percentageVal } = useMemo(() => {
    let totalObtained = 0;
    let totalPossible = 0;

    entries.forEach(entry => {
      const obtained = parseFloat(entry.obtainedMarks || '0');
      const total = parseFloat(entry.totalMarks || '0');

      if (!isNaN(obtained) && !isNaN(total) && total > 0) {
        totalObtained += obtained;
        totalPossible += total;
      }
    });

    if (totalPossible === 0) return { percentageVal: 0 };
    const val = Math.round((totalObtained / totalPossible) * 100);
    return { percentageVal: val };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter(e => e.category === activeTab);
    console.log('🔍 Filtering - activeTab:', activeTab, '| Total entries:', entries.length, '| Filtered:', filtered.length);
    console.log('📊 Entries by category:', entries.map(e => ({ title: e.title, category: e.category })));
    return filtered;
  }, [entries, activeTab]);

  // Group entries by title (T1, T2, etc.)
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: ExamEntry[] } = {};
    filteredEntries.forEach(entry => {
      const title = entry.title || 'Other';
      if (!groups[title]) {
        groups[title] = [];
      }
      groups[title].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // Score Color
  const getScoreColor = () => {
      if (percentageVal >= 80) return '#4ade80'; // Green
      if (percentageVal >= 60) return '#facc15'; // Yellow
      if (percentageVal >= 40) return '#fb923c'; // Orange
      return '#f87171'; // Red
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Exams & Results</Text>
      </View>


        {/* Student Info Card */}
        <View style={[styles.studentCard, { backgroundColor: theme.primary }]}>
          <View style={styles.studentCardContent}>
            <View style={styles.profileSection}>
                <View style={[styles.studentAvatar, { borderColor: getScoreColor() }]}>
                  <Image 
                    source={profileImage ? { uri: profileImage } : (auth.currentUser?.photoURL ? { uri: auth.currentUser.photoURL } : require('../assets/default-profile.png'))} 
                    style={styles.avatarImage}
                  />
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{auth.currentUser?.displayName || 'Student'}</Text>
                  <Text style={styles.studentClass}>The Seeks Academy</Text>
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Text style={styles.statusText}>Active Student</Text>
                  </View>
                </View>
            </View>
            
            {/* Animated Score Circle */}
            <View style={styles.scoreContainer}>
               <ScoreCircle percentage={percentageVal} color={getScoreColor()} />
            </View>
          </View>
        </View>

        {/* Categories Tabs */}
        {/* Categories Tabs & Filter */}
        <View style={[styles.tabsContainer, { paddingRight: 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }} style={{ flex: 1 }}>
            {CATEGORIES.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab, 
                  { backgroundColor: isDark ? theme.card : '#f3f4f6' },
                  activeTab === tab && { backgroundColor: theme.primary }
                ]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: theme.textSecondary },
                  activeTab === tab && { color: '#ffffff' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.listContainer}>
             {filteredEntries.length === 0 ? (
               <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textSecondary }}>No entries found.</Text>
             ) : 
             Object.keys(groupedEntries).map((groupTitle) => {
                 const groupCards = groupedEntries[groupTitle];
                 const isGroupExpanded = expandedGroups.has(groupTitle);
                 
                 // Check if this is a T1-T20 format group
                 const titleRegex = /^T\d{1,2}$/i;
                 const isCollapsibleGroup = titleRegex.test(groupTitle.trim());

                 const toggleGroup = () => {
                     setExpandedGroups(prev => {
                         const newSet = new Set(prev);
                         if (newSet.has(groupTitle)) {
                             newSet.delete(groupTitle);
                         } else {
                             newSet.add(groupTitle);
                         }
                         return newSet;
                     });
                 };

                 return (
                   <View key={groupTitle} style={{ marginBottom: 16 }}>
                     {/* Group Header with Arrow - Modern Lite UI: Soft fill, no borders, tight spacing */}
                     {isCollapsibleGroup && (
                       <TouchableOpacity 
                         onPress={toggleGroup}
                         activeOpacity={0.7}
                         style={styles.groupHeader}
                       >
                         <View style={styles.groupTitleContainer}>
                           <View style={[styles.groupTitleBadge, { backgroundColor: theme.primary + '15' }]}>
                             <Text style={[styles.groupTitleText, { color: theme.primary }]}>{groupTitle}</Text>
                           </View>
                           <Text style={[styles.groupCountText, { color: theme.textSecondary }]}>
                             {groupCards.length} {groupCards.length === 1 ? 'Exam' : 'Exams'}
                           </Text>
                         </View>
                         <View style={styles.groupArrowButton}>
                           <Animated.View style={{ transform: [{ rotate: isGroupExpanded ? '180deg' : '0deg' }] }}>
                             <Ionicons 
                               name={isGroupExpanded ? 'chevron-up' : 'chevron-down'} 
                               size={16} 
                               color={theme.textSecondary}
                             />
                           </Animated.View>
                         </View>
                       </TouchableOpacity>
                     )}

                     {/* Group Cards - Show if not collapsible OR if expanded */}
                     {(!isCollapsibleGroup || isGroupExpanded) && groupCards.map((item, index) => {
                       //Calculate status based on marks if available
                       let displayStatus = item.status;
                       let statusColor = '#ca8a04'; // Default/Pending color

                       const obtained = parseFloat(item.obtainedMarks || '0');
                       const total = parseFloat(item.totalMarks || '0');

                       if (item.totalMarks && item.obtainedMarks && total > 0) {
                           const percentage = (obtained / total) * 100;
                           displayStatus = percentage >= 40 ? 'Pass' : 'Fail';
                       }

                       if (displayStatus === 'Pass') statusColor = '#16a34a';
                       else if (displayStatus === 'Fail') statusColor = '#dc2626';
                       else if (item.status === 'Pass') statusColor = '#16a34a';
                       else if (item.status === 'Fail') statusColor = '#dc2626';

                       return (
                         <View key={item.id} style={styles.resultRow}>
                           {/* Timeline Dot */}
                           <View style={styles.timelineContainer}>
                             <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                             {index < groupCards.length - 1 && (
                               <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                             )}
                           </View>

                           <View style={[styles.card, { flex: 1, backgroundColor: theme.card, borderColor: statusColor, borderWidth: 1 }]}>
                             {/* Row 1: Date | Book Name | Title */}
                             <View style={styles.tableRow}>
                               {/* Date */}
                               <View style={[styles.tableCell, { backgroundColor: theme.primary + '08' }]}>
                                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                   <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                                   <Text style={[styles.cellText, { color: theme.textSecondary }]}>{item.date || 'Date'}</Text>
                                 </View>
                               </View>

                               {/* Book Name (Middle, Flex) */}
                               <View style={[styles.tableCell, { flex: 1, backgroundColor: theme.background }]}>
                                 <Text style={[styles.cellText, { color: theme.textSecondary }]} numberOfLines={1}>{item.bookName || 'No Book'}</Text>
                               </View>

                               {/* Title Badge (Right) - Text Only */}
                               <View style={[styles.titleBadge, { backgroundColor: theme.primary + '10', paddingHorizontal: 10 }]}>
                                 <Text style={[styles.cellText, { color: theme.primary, fontWeight: '700', fontSize: 13 }]} numberOfLines={1}>{item.title}</Text>
                               </View>
                             </View>

                             {/* Row 2: Category | Status | Marks */}
                             <View style={[styles.tableRow, { alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }]}>
                               {/* Category (Left) */}
                               <View style={[styles.tableCell, { backgroundColor: theme.primary + '15' }]}>
                                 <Text style={[styles.cellText, { color: theme.primary }]}>{item.category || 'Exam'}</Text>
                               </View>

                               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                 {/* Status */}
                                 {displayStatus && (
                                   <View style={[styles.tableCell, { 
                                     backgroundColor: displayStatus === 'Pass' ? '#dcfce7' : displayStatus === 'Fail' ? '#fee2e2' : '#fef9c3',
                                   }]}>
                                     <Text style={[styles.cellText, { 
                                       color: displayStatus === 'Pass' ? '#166534' : displayStatus === 'Fail' ? '#991b1b' : '#854d0e' 
                                     }]}>{displayStatus}</Text>
                                   </View>
                                 )}

                                 {/* Marks */}
                                 {(item.totalMarks || item.obtainedMarks) ? (
                                   <View style={[styles.marksBox, { backgroundColor: theme.primary + '10' }]}>
                                     <Text style={[styles.marksObtained, { color: theme.primary }]}>
                                       {item.obtainedMarks || '-'}
                                     </Text>
                                     <Text style={[styles.marksTotal, { color: theme.primary + '80' }]}>
                                       /{item.totalMarks || '100'}
                                     </Text>
                                   </View>
                                 ) : null}
                               </View>
                             </View>

                             {/* Row 3: Remarks Content */}
                             {item.description ? (
                               <View style={[styles.remarksContainer, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, opacity: 0.98 }]}>
                                 <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
                               </View>
                             ) : null}
                           </View>
                         </View>
                       );
                     })}
                   </View>
                 );
             })
          }
           </View>
         )}
      </ScrollView>

    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 4 },
  studentCard: {
    margin: 8,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    backgroundColor: '#ccc'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  studentInfo: {
    marginLeft: 16,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  studentClass: {
    fontSize: 13,
    color: '#e0e7ff',
    marginBottom: 4,
  },
  statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      alignSelf: 'flex-start',
  },
  statusText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    marginLeft: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 6,
    borderRadius: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
    marginTop: 6,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    width: 2,
    bottom: -8,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
    gap: 6,
  },
  titleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cellTextLarge: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  marksBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marksObtained: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  marksTotal: {
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 12,
  },
  remarksContainer: {
    padding: 12,
    borderRadius: 12,
    // borderWidth: 2, // Removed
    marginTop: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0, // Minimized gap
    marginHorizontal: 0,
    paddingHorizontal: 0, // Flush with content 
    paddingVertical: 6,
    minHeight: 36,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  groupTitleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  groupTitleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  groupCountText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
  groupArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
