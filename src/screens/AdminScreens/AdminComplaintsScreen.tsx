import React, { useRef, useEffect } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { resolveComplaint, deleteComplaint } from '../../store/slices/adminSlice';
import type { AdminComplaint } from '../../store/slices/adminSlice';

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Academic: { icon: 'school', color: '#6366f1' },
  Infrastructure: { icon: 'business', color: '#0ea5e9' },
  Discipline: { icon: 'shield-checkmark', color: '#f59e0b' },
  Transport: { icon: 'bus', color: '#10b981' },
  Other: { icon: 'ellipsis-horizontal-circle', color: '#8b5cf6' },
};

export const AdminComplaintsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();

  const complaints = useAppSelector(s => s.admin.complaints) as AdminComplaint[];
  const loading = useAppSelector(s => s.admin.complaintsLoading);

  const pendingCount = complaints.filter(c => c.status !== 'Resolved').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResolve = (id: string) => {
    Alert.alert('Resolve', 'Mark this complaint as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: () =>
          dispatch(resolveComplaint(id))
            .unwrap()
            .then(() => Alert.alert('Done', 'Complaint resolved'))
            .catch(() => Alert.alert('Error', 'Failed to update')),
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Permanently remove this complaint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          dispatch(deleteComplaint(id))
            .unwrap()
            .then(() => Alert.alert('Deleted', 'Complaint removed'))
            .catch(() => Alert.alert('Error', 'Failed to delete')),
      },
    ]);
  };

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return '';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item, index }: { item: AdminComplaint; index: number }) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.Other;
    const resolved = item.status === 'Resolved';
    const statusClr = resolved ? '#10b981' : '#f59e0b';

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
        <View style={[styles.card, {
          backgroundColor: isDark ? theme.card : '#fff',
          borderColor: theme.border,
        }]}>
          {/* Row 1: Category icon + subject + status badge */}
          <View style={styles.row1}>
            <View style={[styles.catIcon, { backgroundColor: `${meta.color}15` }]}>
              <Ionicons name={meta.icon as any} size={scale(14)} color={meta.color} />
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.subject, { color: theme.text }]} numberOfLines={1}>
                {item.subject}
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {item.category} · {formatDate(item.createdAt)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${statusClr}15` }]}>
              <View style={[styles.dot, { backgroundColor: statusClr }]} />
              <Text style={[styles.badgeText, { color: statusClr }]}>{item.status}</Text>
            </View>
          </View>

          {/* Row 2: Description (compact) */}
          <Text
            style={[styles.desc, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          {/* Row 3: Sender + actions */}
          <View style={styles.footer}>
            <View style={styles.senderRow}>
              <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
              <Text style={[styles.sender, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.userName || 'Anonymous'} · {item.userEmail}
              </Text>
            </View>

            <View style={styles.actions}>
              {!resolved && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => handleResolve(item.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="checkmark-circle" size={scale(13)} color="#fff" />
                  <Text style={styles.actionText}>Resolve</Text>
                </TouchableOpacity>
              )}
              {resolved && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef4444' }]}
                  onPress={() => handleDelete(item.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={scale(13)} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
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
          <Ionicons name="arrow-back" size={scale(20)} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Complaints</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {complaints.length} total
          </Text>
        </View>

        <View style={[styles.headerBadge, { backgroundColor: '#dc262615' }]}>
          <Ionicons name="alert-circle" size={scale(18)} color="#dc2626" />
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
            <Text style={styles.summaryCount}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>{resolvedCount}</Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>{complaints.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ── List ── */}
      <FlatList
        data={complaints}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, {
            backgroundColor: isDark ? theme.card : '#fff',
            borderColor: theme.border,
          }]}>
            <Ionicons name="chatbubbles-outline" size={scale(28)} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No complaints yet</Text>
          </View>
        }
      />
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
  summaryCount: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '800',
  },
  summaryLabel: {
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
  catIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(8),
  },
  titleBlock: { flex: 1 },
  subject: {
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
  desc: {
    fontSize: scale(11),
    lineHeight: scale(16),
    marginLeft: scale(36),
    marginBottom: scale(8),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: scale(36),
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(7),
  },
  actionText: {
    color: '#fff',
    fontSize: scale(11),
    fontWeight: '600',
  },

  /* ── Empty ── */
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
});
