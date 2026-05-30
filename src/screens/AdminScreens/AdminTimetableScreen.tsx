import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppSelector } from '../../store/hooks';

// ──────────────────────────────────────────────
// Types — mirrors Dashboard TimetablePage
// ──────────────────────────────────────────────
export interface TimetableEntry {
  id: string;
  day: string;
  period: string;
  subject: string;
  class: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
}

const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = (): Partial<TimetableEntry> => ({
  day: '', period: '', subject: '', class: '', teacher: '', room: '', startTime: '', endTime: '',
});

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export const AdminTimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const teachers = useAppSelector(state => state.teachers.list);

  // ── Local state (flat entries, matches dashboard model) ──
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('All');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState<Partial<TimetableEntry>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Time-picker state
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Dropdown toggles
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  const SUBJECTS = [
    'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
    'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics', 'Ethics',
    'Chemistry', 'Biology',
  ];

  // ── Fetch flat timetable docs (same collection as Dashboard) ──
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'timetable'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TimetableEntry[];
      setEntries(data);
    } catch (e) {
      console.error('Failed to fetch timetable:', e);
    }
    setLoading(false);
  };

  // ── Filtering ──
  const filtered = entries.filter((e) => {
    const matchClass = filterClass === 'All' || e.class === filterClass;
    const q = search.toLowerCase();
    return matchClass && (!q || e.subject?.toLowerCase().includes(q) || e.teacher?.toLowerCase().includes(q) || e.day?.toLowerCase().includes(q));
  });

  const byDay = DAYS.map(day => ({
    day,
    entries: filtered.filter(e => e.day === day),
  })).filter(g => g.entries.length > 0);

  // ── Modal helpers ──
  const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalVisible(true); };
  const openEdit = (e: TimetableEntry) => {
    setEditing(e);
    setForm({ ...e });
    // Parse start/end time into Date objects for pickers
    if (e.startTime) {
      const [h, m] = e.startTime.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      setStartDate(d);
    }
    if (e.endTime) {
      const [h, m] = e.endTime.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      setEndDate(d);
    }
    setModalVisible(true);
  };

  const field = (key: keyof TimetableEntry, value: string) => setForm(p => ({ ...p, [key]: value }));

  // ── Save (same Firestore write as Dashboard) ──
  const save = async () => {
    if (!form.day || !form.subject) { Alert.alert('Error', 'Day and Subject are required.'); return; }
    setSaving(true);
    try {
      const id = editing?.id || Date.now().toString();
      const payload = { ...form, id } as TimetableEntry;

      // Optimistic UI update
      setEntries(prev => {
        const idx = prev.findIndex(e => e.id === id);
        if (idx !== -1) { const copy = [...prev]; copy[idx] = payload; return copy; }
        return [...prev, payload];
      });
      setModalVisible(false);

      await setDoc(doc(db, 'timetable', id), { ...form, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      Alert.alert('Error', 'Failed to save.');
    }
    setSaving(false);
  };

  // ── Delete (same as Dashboard) ──
  const remove = (id: string) => {
    Alert.alert('Delete Entry', 'Delete this timetable entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(id);
          setEntries(prev => prev.filter(e => e.id !== id));
          await deleteDoc(doc(db, 'timetable', id));
          setDeleting(null);
        },
      },
    ]);
  };

  // ── Time helpers ──
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const onStartTimeChange = (_: any, selected?: Date) => {
    setShowStartTimePicker(false);
    if (selected) {
      setStartDate(selected);
      setForm(p => ({ ...p, startTime: formatTime(selected) }));
    }
  };

  const onEndTimeChange = (_: any, selected?: Date) => {
    setShowEndTimePicker(false);
    if (selected) {
      setEndDate(selected);
      setForm(p => ({ ...p, endTime: formatTime(selected) }));
    }
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* ─── Header ─── */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Timetable</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{entries.length} periods scheduled</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Search + Filters ─── */}
      <View style={styles.filterBar}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search subject, teacher..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {['All', ...CLASS_OPTIONS].map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                { borderColor: theme.border },
                filterClass === c && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setFilterClass(c)}
            >
              <Text style={[
                styles.chipText,
                { color: theme.textSecondary },
                filterClass === c && { color: '#fff' },
              ]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Content ─── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={40} color={theme.border} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No timetable entries found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {byDay.map(({ day, entries: dayEntries }) => (
            <View key={day} style={styles.daySection}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayIcon}>📅</Text>
                <Text style={[styles.dayTitle, { color: theme.primary }]}>{day}</Text>
                <Text style={[styles.dayCount, { color: theme.textSecondary }]}>({dayEntries.length} periods)</Text>
              </View>

              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.thCell, styles.cellPeriod, { color: theme.textSecondary }]}>Period</Text>
                <Text style={[styles.thCell, styles.cellSubject, { color: theme.textSecondary }]}>Subject</Text>
                <Text style={[styles.thCell, styles.cellClass, { color: theme.textSecondary }]}>Class</Text>
                <Text style={[styles.thCell, styles.cellTeacher, { color: theme.textSecondary }]}>Teacher</Text>
                <Text style={[styles.thCell, styles.cellActions, { color: theme.textSecondary }]}>Actions</Text>
              </View>

              {/* Rows */}
              {dayEntries.map((e) => (
                <View key={e.id} style={[styles.tableRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.tdCell, styles.cellPeriod]}>
                    <View style={[styles.periodBadge, { backgroundColor: theme.primary + '18' }]}>
                      <Text style={[styles.periodText, { color: theme.primary }]}>{e.period || '—'}</Text>
                    </View>
                  </View>
                  <View style={[styles.tdCell, styles.cellSubject]}>
                    <Text style={[styles.subjectText, { color: theme.text }]}>{e.subject}</Text>
                    {(e.startTime || e.endTime) ? (
                      <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                        {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.tdCell, styles.cellClass, { color: theme.textSecondary }]}>{e.class || '—'}</Text>
                  <View style={[styles.tdCell, styles.cellTeacher]}>
                    <Text style={[styles.teacherText, { color: theme.textSecondary }]} numberOfLines={1}>{e.teacher || '—'}</Text>
                    {e.room ? <Text style={[styles.roomText, { color: theme.textSecondary }]}>📍 {e.room}</Text> : null}
                  </View>
                  <View style={[styles.tdCell, styles.cellActions, { flexDirection: 'row', gap: 4 }]}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => openEdit(e)}>
                      <Ionicons name="pencil" size={14} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#ef444433' }]}
                      disabled={deleting === e.id}
                      onPress={() => remove(e.id)}
                    >
                      <Ionicons name="trash" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ─── Add/Edit Modal ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Period' : 'Add Period'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Row: Day + Period */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Day *</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setShowDayPicker(!showDayPicker)}
                  >
                    <Text style={{ color: form.day ? theme.text : theme.textSecondary, flex: 1 }}>
                      {form.day || 'Select Day'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {showDayPicker && (
                    <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      {DAYS.map(d => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: form.day === d ? theme.primary + '20' : 'transparent' }]}
                          onPress={() => { field('day', d); setShowDayPicker(false); }}
                        >
                          <Text style={{ color: theme.text }}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Period No.</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. 1 or 1st"
                    placeholderTextColor={theme.textSecondary}
                    value={form.period || ''}
                    onChangeText={v => field('period', v)}
                  />
                </View>
              </View>

              {/* Row: Subject + Class */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Subject *</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                  >
                    <Text style={{ color: form.subject ? theme.text : theme.textSecondary, flex: 1 }}>
                      {form.subject || 'Select Subject'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {showSubjectDropdown && (
                    <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                        {SUBJECTS.map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: form.subject === s ? theme.primary + '20' : 'transparent' }]}
                            onPress={() => {
                              field('subject', s);
                              setShowSubjectDropdown(false);
                              // Auto-fill teacher
                              const matched = teachers.find(t => t.subject === s);
                              if (matched) field('teacher', matched.name);
                            }}
                          >
                            <Text style={{ color: theme.text }}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Class</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setShowClassPicker(!showClassPicker)}
                  >
                    <Text style={{ color: form.class ? theme.text : theme.textSecondary, flex: 1 }}>
                      {form.class || 'Select Class'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {showClassPicker && (
                    <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      {CLASS_OPTIONS.map(c => (
                        <TouchableOpacity
                          key={c}
                          style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: form.class === c ? theme.primary + '20' : 'transparent' }]}
                          onPress={() => { field('class', c); setShowClassPicker(false); }}
                        >
                          <Text style={{ color: theme.text }}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Row: Teacher + Room */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Teacher</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setShowTeacherDropdown(!showTeacherDropdown)}
                  >
                    <Text style={{ color: form.teacher ? theme.text : theme.textSecondary, flex: 1 }}>
                      {form.teacher || 'Select Teacher'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {showTeacherDropdown && (
                    <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                        {teachers.map(t => (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: form.teacher === t.name ? theme.primary + '20' : 'transparent' }]}
                            onPress={() => { field('teacher', t.name); setShowTeacherDropdown(false); }}
                          >
                            <Text style={{ color: theme.text, fontWeight: '600' }}>{t.name}</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>{t.subject}</Text>
                          </TouchableOpacity>
                        ))}
                        {teachers.length === 0 && (
                          <View style={styles.dropdownItem}>
                            <Text style={{ color: theme.textSecondary }}>No teachers found</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Room</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. Room A1"
                    placeholderTextColor={theme.textSecondary}
                    value={form.room || ''}
                    onChangeText={v => field('room', v)}
                  />
                </View>
              </View>

              {/* Row: Start Time + End Time */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>Start Time</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={{ color: theme.text, flex: 1 }}>{form.startTime || formatTime(startDate)}</Text>
                    <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.text }]}>End Time</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: theme.background, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={{ color: theme.text, flex: 1 }}>{form.endTime || formatTime(endDate)}</Text>
                    <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: theme.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: theme.primary }]}
                disabled={saving}
                onPress={save}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Native Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker value={startDate} mode="time" is24Hour={false} display="spinner" onChange={onStartTimeChange} />
      )}
      {showEndTimePicker && (
        <DateTimePicker value={endDate} mode="time" is24Hour={false} display="spinner" onChange={onEndTimeChange} />
      )}
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Filters
  filterBar: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Content
  content: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, marginTop: 4 },
  emptyText: { fontSize: 13, marginTop: 8 },

  // Day sections
  daySection: { marginBottom: 18 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  dayIcon: { fontSize: 14 },
  dayTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayCount: { fontSize: 11, fontWeight: '500' },

  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    marginBottom: 4,
  },
  thCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    marginBottom: 4,
  },
  tdCell: { justifyContent: 'center' },

  // Column widths
  cellPeriod: { width: '12%' },
  cellSubject: { width: '28%' },
  cellClass: { width: '14%', fontSize: 12 },
  cellTeacher: { width: '26%' },
  cellActions: { width: '20%', alignItems: 'flex-end' },

  periodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  periodText: { fontWeight: '700', fontSize: 11 },
  subjectText: { fontWeight: '600', fontSize: 13 },
  timeText: { fontSize: 10, marginTop: 2 },
  teacherText: { fontSize: 11 },
  roomText: { fontSize: 10, marginTop: 1 },

  // Action buttons
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 14,
    padding: 0,
    maxHeight: '88%',
    elevation: 6,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingVertical: 12 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  footerBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  // Form
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  formGroup: { flex: 1 },
  formLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 4,
  },

  // Dropdowns
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 0.5,
  },
});
