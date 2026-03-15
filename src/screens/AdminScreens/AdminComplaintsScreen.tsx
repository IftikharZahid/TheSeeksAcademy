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
  StatusBar,
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

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
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
    const isEven = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[styles.tableRow, {
          backgroundColor: isEven ? (isDark ? theme.card : '#fff') : (isDark ? theme.card + 'CC' : '#f9fafb'),
          borderBottomColor: theme.border + '50',
        }]}
        activeOpacity={0.75}
      >
        {/* Category icon */}
        <View style={[styles.trCatIcon, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon as any} size={13} color={meta.color} />
        </View>

        {/* Subject + meta */}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }} numberOfLines={1}>{item.subject}</Text>
          <Text style={{ fontSize: 10, color: theme.textSecondary }} numberOfLines={1}>
            {item.category} · {formatDate(item.createdAt)} · {item.userName || 'Anon'}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.trStatusBadge, { backgroundColor: statusClr + '15' }]}>
          <View style={[styles.trDot, { backgroundColor: statusClr }]} />
          <Text style={[styles.trStatusText, { color: statusClr }]}>{resolved ? 'Done' : 'Open'}</Text>
        </View>

        {/* Actions */}
        <View style={styles.trActions}>
          {!resolved && (
            <TouchableOpacity
              style={[styles.trActionBtn, { backgroundColor: '#3b82f615' }]}
              onPress={() => handleResolve(item.id)}
            >
              <Ionicons name="checkmark" size={13} color="#3b82f6" />
            </TouchableOpacity>
          )}
          {resolved && (
            <TouchableOpacity
              style={[styles.trActionBtn, { backgroundColor: '#ef444415' }]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={13} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
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
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
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
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{complaints.length} total</Text>
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
        ListHeaderComponent={
          <View style={[styles.tableHeader, { backgroundColor: isDark ? theme.card : '#f8fafc', borderBottomColor: theme.border }]}>
            <View style={{ width: 26 }} />
            <Text style={[styles.thCell, { color: theme.textSecondary, flex: 1, marginLeft: 8 }]}>COMPLAINT</Text>
            <Text style={[styles.thCell, { color: theme.textSecondary, width: 50 }]}>STATUS</Text>
            <Text style={[styles.thCell, { color: theme.textSecondary, width: 36 }]}>ACT</Text>
          </View>
        }
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

  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingVertical: scale(10),
  },
  backBtn: {
    width: scale(36), height: scale(36), borderRadius: scale(10),
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, marginLeft: scale(10) },
  headerTitle: { fontSize: scale(16), fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: scale(10), marginTop: scale(1) },
  headerBadge: {
    width: scale(36), height: scale(36), borderRadius: scale(10),
    justifyContent: 'center', alignItems: 'center',
  },

  summaryStrip: {
    flexDirection: 'row',
    marginHorizontal: scale(16), marginBottom: scale(10),
    borderRadius: scale(12), paddingVertical: scale(10),
    paddingHorizontal: scale(8), alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryCount: { color: '#fff', fontSize: scale(16), fontWeight: '800' },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)', fontSize: scale(9),
    fontWeight: '600', textTransform: 'uppercase',
    marginTop: scale(1), letterSpacing: 0.5,
  },
  summaryDivider: { width: 1, height: scale(24) },

  listContent: { paddingBottom: scale(24), paddingTop: scale(4) },

  /* compact table */
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1,
  },
  thCell: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  trCatIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  trStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 6, marginRight: 6, width: 50,
  },
  trDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 3 },
  trStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  trActions: { flexDirection: 'row', gap: 4, width: 36, justifyContent: 'flex-end' },
  trActionBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  emptyCard: {
    borderRadius: scale(12), borderWidth: 1,
    paddingVertical: scale(32), alignItems: 'center', gap: scale(8),
    margin: scale(16),
  },
  emptyText: { fontSize: scale(12), fontWeight: '500' },
});
