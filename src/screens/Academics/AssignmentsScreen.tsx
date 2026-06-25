import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../../store";
import { initAssignmentsListener, markAssignmentAsRead, persistReadAssignmentIds } from "../../store/slices/assignmentsSlice";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { scale } from "../../utils/responsive";

const { width } = Dimensions.get("window");

// ─── Subject icon + accent colour mapping ─────────────────────────────────────
const SUBJECT_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; accent: string; bg: string }
> = {
  Islamiyat:        { icon: "moon",                  accent: "#059669", bg: "#ecfdf5" },
  "Tarjuma Tul Quran": { icon: "book",               accent: "#b45309", bg: "#fef3c7" },
  Urdu:             { icon: "chatbubble-ellipses",   accent: "#dc2626", bg: "#fef2f2" },
  English:          { icon: "text",                  accent: "#2563eb", bg: "#eff6ff" },
  "Pak Study":      { icon: "flag",                  accent: "#16a34a", bg: "#f0fdf4" },
  Mathamatics:      { icon: "calculator",            accent: "#6366f1", bg: "#eef2ff" },
  Biology:          { icon: "leaf",                  accent: "#10b981", bg: "#ecfdf5" },
  Chemistry:        { icon: "flask",                 accent: "#8b5cf6", bg: "#f5f3ff" },
  "Computer Science":{ icon: "desktop",              accent: "#0ea5e9", bg: "#f0f9ff" },
  Physics:          { icon: "magnet",                accent: "#f59e0b", bg: "#fffbeb" },
  History:          { icon: "library",               accent: "#92400e", bg: "#fef3c7" },
  "P.Eduation":     { icon: "football",              accent: "#ef4444", bg: "#fef2f2" },
  Psychology:       { icon: "pulse",                 accent: "#ec4899", bg: "#fdf2f8" },
};

const getSubjectMeta = (subject: string) =>
  SUBJECT_META[subject] ?? { icon: "document-text" as keyof typeof Ionicons.glyphMap, accent: "#6b7280", bg: "#f9fafb" };

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending:   { color: "#d97706", bg: "#fef3c7", icon: "time-outline" },
  Submitted: { color: "#059669", bg: "#d1fae5", icon: "checkmark-circle-outline" },
  Late:      { color: "#dc2626", bg: "#fee2e2", icon: "alert-circle-outline" },
};


const FILTERS = ["All", ...Object.keys(SUBJECT_META)];

// ─── Component ──────────────────────────────────────────────────────────────────
export const AssignmentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const assignmentsData = useAppSelector((state) => state.assignments.data);
  const assignmentsStatus = useAppSelector((state) => state.assignments.status);
  const readAssignmentIds = useAppSelector((state) => state.assignments.readIds);
  const userProfile = useAppSelector((state) => state.auth.profile);
  
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = initAssignmentsListener(dispatch);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

  React.useEffect(() => {
    const newIds: string[] = [];
    assignmentsData.forEach((a) => {
      // Only mark as read if it's relevant to the student
      const target = a.targetClass || 'All';
      const isRelevant = target === 'All' || (userProfile && userProfile.class === target);
      
      if (isRelevant && !readAssignmentIds.includes(a.id)) {
        dispatch(markAssignmentAsRead(a.id));
        newIds.push(a.id);
      }
    });
    if (newIds.length > 0) {
      persistReadAssignmentIds([...readAssignmentIds, ...newIds]).catch(() => {});
    }
  }, [assignmentsData, readAssignmentIds, dispatch, userProfile]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "none" },
        headerShown: false,
      });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: undefined,
          headerShown: true,
        });
      };
    }, [navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const assignments = assignmentsData
    .filter(a => {
      // Filter out assignments not directed to the student's class
      const target = a.targetClass || 'All';
      if (target === 'All') return true;
      if (userProfile && userProfile.class) {
         return target === userProfile.class;
      }
      return true; // if we don't know the user's class, show all
    })
    .map(a => ({ ...a, status: "Pending" })); // For now, all are Pending until submission feature

  const filtered = assignments.filter((a) => {
    const matchesFilter = activeFilter === "All" || a.subject === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      a.subject.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.teacherName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // summary counts
  const pendingCount   = assignments.filter((a) => a.status === "Pending").length;
  const submittedCount = assignments.filter((a) => a.status === "Submitted").length;
  const lateCount      = assignments.filter((a) => a.status === "Late").length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        backgroundColor={theme.card} 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Assignments</Text>
        <View style={{ width: scale(24) }} />
      </View>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <View style={styles.contentContainer}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#f3f4f6",
              },
            ]}
          >
            <Ionicons name="search" size={scale(16)} color={theme.textTertiary} style={{ marginRight: scale(8) }} />
            <TextInput
              placeholder="Search assignments..."
              placeholderTextColor={theme.textTertiary}
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={scale(16)} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter tabs */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.primary : isDark ? theme.backgroundSecondary : "#f3f4f6",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scale(100) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {/* Results count & Summary */}
          <View style={styles.summaryRow}>
            <Text style={[styles.resultsLabel, { color: theme.textSecondary }]}>
              {filtered.length} assignment{filtered.length !== 1 ? "s" : ""}
            </Text>
            <View style={styles.miniSummary}>
              <View style={[styles.miniDot, { backgroundColor: "#fbbf24" }]} />
              <Text style={[styles.miniText, { color: theme.textSecondary }]}>{pendingCount} Pen.</Text>
              <View style={[styles.miniDot, { backgroundColor: "#34d399", marginLeft: scale(8) }]} />
              <Text style={[styles.miniText, { color: theme.textSecondary }]}>{submittedCount} Sub.</Text>
              <View style={[styles.miniDot, { backgroundColor: "#f87171", marginLeft: scale(8) }]} />
              <Text style={[styles.miniText, { color: theme.textSecondary }]}>{lateCount} Late</Text>
            </View>
          </View>

          {/* Cards */}
          {filtered.map((a) => {
            const meta   = getSubjectMeta(a.subject);
            const status = STATUS_CONFIG[a.status];
            return (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.85}
                onPress={() => setSelectedAssignment(a)}
                style={[
                  styles.compactCard,
                  {
                    backgroundColor: theme.card,
                    shadowColor: theme.shadow,
                    borderLeftColor: meta.accent,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.assignmentTitle, { color: theme.text }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? `${status.color}22` : status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{a.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBodyCompact}>
                  <View style={styles.subjectRow}>
                    <Ionicons name={meta.icon} size={scale(12)} color={meta.accent} />
                    <Text style={[styles.subjectName, { color: meta.accent }]} numberOfLines={1}>
                      {" "}{a.subject}
                    </Text>
                  </View>
                  <View style={styles.teacherRow}>
                    <Ionicons name="person-outline" size={scale(11)} color={theme.textSecondary} />
                    <Text style={[styles.teacherName, { color: theme.textSecondary }]} numberOfLines={1}>
                      {" "}{a.teacherName}
                    </Text>
                  </View>
                </View>

                <View style={styles.deadlineRow}>
                  <Ionicons name="calendar-outline" size={scale(11)} color={theme.textSecondary} />
                  <Text style={[styles.deadlineText, { color: theme.textSecondary }]}>{" "}Due: {a.deadline}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

        {filtered.length === 0 && (
          assignmentsStatus === 'loading' ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={scale(52)} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                No Assignments Found
              </Text>
              <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
                {searchQuery
                  ? "Try adjusting your search or filters."
                  : "You're all caught up! Enjoy your free time."}
              </Text>
            </View>
          )
        )}
      </ScrollView>
      </View>

      {/* Assignment Details Modal */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View style={{ flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: scale(20), paddingTop: scale(12), maxHeight: "85%", shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 }}>
            <View style={{ width: scale(40), height: scale(4), backgroundColor: theme.border, borderRadius: 2, alignSelf: "center", marginBottom: scale(16) }} />
            
            {selectedAssignment && (() => {
                const meta = getSubjectMeta(selectedAssignment.subject);
                const status = STATUS_CONFIG[selectedAssignment.status];
                return (
                  <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(16) }}>
                          <View style={[{ justifyContent: "center", alignItems: "center", backgroundColor: isDark ? `${meta.accent}22` : meta.bg, width: scale(36), height: scale(36), borderRadius: scale(10), marginRight: scale(12), marginTop: 2 }]}>
                              <Ionicons name={meta.icon} size={18} color={meta.accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: scale(11), color: meta.accent, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{selectedAssignment.subject}</Text>
                              <Text style={{ fontSize: scale(16), fontWeight: "700", color: theme.text, lineHeight: 22 }}>{selectedAssignment.title}</Text>
                          </View>
                      </View>

                      <View style={{ backgroundColor: isDark ? theme.card : "#f9fafb", borderRadius: scale(12), padding: scale(12), marginBottom: scale(16) }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) }}>
                              <Ionicons name={status.icon} size={14} color={status.color} style={{ width: scale(20) }} />
                              <Text style={{ fontSize: scale(13), color: theme.textSecondary, flex: 1 }}>Status</Text>
                              <View style={{ backgroundColor: isDark ? `${status.color}22` : status.bg, paddingHorizontal: scale(8), paddingVertical: 2, borderRadius: scale(6) }}>
                                <Text style={{ color: status.color, fontWeight: "700", fontSize: scale(11) }}>{selectedAssignment.status}</Text>
                              </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) }}>
                              <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} style={{ width: scale(20) }} />
                              <Text style={{ fontSize: scale(13), color: theme.textSecondary, flex: 1 }}>Deadline</Text>
                              <Text style={{ fontSize: scale(13), color: theme.text, fontWeight: "600" }}>{selectedAssignment.deadline}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="person-outline" size={14} color={theme.textSecondary} style={{ width: scale(20) }} />
                              <Text style={{ fontSize: scale(13), color: theme.textSecondary, flex: 1 }}>Teacher</Text>
                              <Text style={{ fontSize: scale(13), color: theme.text, fontWeight: "600" }}>{selectedAssignment.teacherName}</Text>
                          </View>
                      </View>

                      <Text style={{ fontSize: scale(13), fontWeight: "700", color: theme.text, marginBottom: scale(8), marginLeft: 2 }}>Description</Text>
                      <View style={{ backgroundColor: isDark ? `${meta.accent}11` : meta.bg, borderRadius: scale(12), padding: scale(14), marginBottom: scale(20), borderLeftWidth: 3, borderLeftColor: meta.accent }}>
                        <Text style={{ fontSize: scale(13), color: theme.text, lineHeight: 20 }}>
                            {selectedAssignment.description || 'No additional instructions provided for this assignment.'}
                        </Text>
                      </View>
                  </ScrollView>
                )
            })()}

            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setSelectedAssignment(null)}
                style={{ backgroundColor: theme.primary, padding: scale(12), borderRadius: scale(10), alignItems: 'center' }}
            >
                <Text style={{ color: '#fff', fontSize: scale(14), fontWeight: '700' }}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(8),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    height: scale(38),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(13),
    paddingVertical: 0,
  },
  filtersContainer: {
    paddingHorizontal: scale(16),
    gap: scale(8),
    paddingBottom: scale(12),
  },
  filterChip: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
  },
  filterChipText: {
    fontSize: scale(12),
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(12),
  },
  resultsLabel: {
    fontSize: scale(12),
    fontWeight: "600",
  },
  miniSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(4),
  },
  miniText: {
    fontSize: scale(11),
    fontWeight: "600",
  },

  // compact cards
  compactCard: {
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(10),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(6),
  },
  assignmentTitle: {
    fontSize: scale(13.5),
    fontWeight: "700",
    flex: 1,
    marginRight: scale(8),
  },
  statusBadge: {
    paddingVertical: scale(2),
    paddingHorizontal: scale(6),
    borderRadius: scale(6),
  },
  statusText: {
    fontSize: scale(9.5),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardBodyCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(6),
    gap: scale(12),
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectName: {
    fontSize: scale(12),
    fontWeight: "600",
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  teacherName: {
    fontSize: scale(11.5),
    fontWeight: "500",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scale(2),
  },
  deadlineText: {
    fontSize: scale(11),
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: scale(50),
    gap: scale(8),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: "700",
  },
  emptySub: {
    fontSize: scale(12),
  }
});
