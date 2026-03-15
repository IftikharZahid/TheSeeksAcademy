import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, Image, StatusBar, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppSelector } from '../../store/hooks';
import type { Teacher } from '../../store/slices/teachersSlice';

const SUBJECTS = [
  'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
  'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics',
  'Ethics', 'Chemistry', 'Biology'
];

export const AdminTeachersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const teachers = useAppSelector(state => state.teachers.list) as Teacher[];
  const loading  = useAppSelector(state => state.teachers.isLoading);

  const [modalVisible,       setModalVisible]       = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [uploading,          setUploading]          = useState(false);
  const [editingTeacher,     setEditingTeacher]     = useState<Teacher | null>(null);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [visibleCount,       setVisibleCount]       = useState(20);

  // Form state
  const [name,          setName]          = useState('');
  const [subject,       setSubject]       = useState('');
  const [qualification, setQualification] = useState('');
  const [experience,    setExperience]    = useState('');
  const [image,         setImage]         = useState('');

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveTeacher = async () => {
    if (!name || !subject || !qualification || !experience) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    const teacherData = {
      name, subject, qualification, experience,
      image: image || '',
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingTeacher) {
        await setDoc(doc(db, 'staff', editingTeacher.id), teacherData, { merge: true });
        Alert.alert('Success', 'Teacher updated successfully');
      } else {
        await setDoc(doc(db, 'staff', Date.now().toString()), teacherData);
        Alert.alert('Success', 'Teacher added successfully');
      }
      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save teacher');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    Alert.alert('Delete Teacher', 'Are you sure you want to remove this teacher?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'staff', id)); }
          catch { Alert.alert('Error', 'Failed to delete teacher'); }
        }
      }
    ]);
  };

  const openModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setName(teacher.name);
      setSubject(teacher.subject);
      setQualification(teacher.qualification);
      setExperience(teacher.experience);
      setImage(teacher.image || '');
      setModalVisible(true);
    } else {
      resetForm();
      setChoiceModalVisible(true);
    }
  };

  const handleManualEntry = () => {
    setChoiceModalVisible(false);
    resetForm();
    setModalVisible(true);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;

      setUploading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      let fileUri = asset.uri;

      if (fileUri.startsWith('content://')) {
        const tempUri = FileSystem.documentDirectory + 'temp_teacher_upload.json';
        await FileSystem.copyAsync({ from: fileUri, to: tempUri });
        fileUri = tempUri;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      let data: any;
      try { data = JSON.parse(fileContent); }
      catch { Alert.alert('JSON Error', 'The file content is not valid JSON.'); setUploading(false); return; }

      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Root must be an array of teacher records.');
        setUploading(false); return;
      }

      let added = 0, errors = 0;
      for (const item of data) {
        if (item.name && item.subject && item.qualification && item.experience) {
          try {
            await setDoc(doc(db, 'staff', `${Date.now()}_${added}`), {
              name: item.name, subject: item.subject,
              qualification: item.qualification, experience: item.experience,
              image: item.image || '',
              updatedAt: serverTimestamp(),
            });
            added++;
          } catch { errors++; }
        } else { errors++; }
      }
      Alert.alert('Upload Complete', `Added: ${added}\nFailed/Skipped: ${errors}`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to process file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setName(''); setSubject(''); setQualification(''); setExperience(''); setImage('');
  };

  const filteredTeachers = teachers.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visible = filteredTeachers.slice(0, visibleCount);

  // ─── Render Row ──────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Teacher; index: number }) => {
    const initial = (item.name || '?')[0].toUpperCase();
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.tableRow, {
        backgroundColor: isEven ? theme.card : theme.card + 'CC',
        borderBottomColor: theme.border + '50',
      }]}>
        {/* # */}
        <Text style={[styles.colSerial, { color: theme.textSecondary }]}>{index + 1}</Text>

        {/* Avatar */}
        <View style={[styles.tableAvatar, { backgroundColor: theme.primary + '18' }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={{ width: 26, height: 26, borderRadius: 13 }} />
          ) : (
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>{initial}</Text>
          )}
        </View>

        {/* Name + Subject */}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '500' }} numberOfLines={1}>{item.subject}</Text>
        </View>

        {/* Qualification */}
        <Text style={[styles.colQual, { color: theme.textSecondary }]} numberOfLines={1}>{item.qualification}</Text>

        {/* Actions */}
        <View style={styles.tableActions}>
          <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
            <Ionicons name="pencil" size={14} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteTeacher(item.id)} style={styles.actionBtn}>
            <Ionicons name="trash" size={14} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Teachers</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.headerBtn}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.compactSearchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.compactSearchInput, { color: theme.text }]}
          placeholder="Search by name or subject..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Uploading overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color="#f59e0b" />
          <Text style={{ color: '#f59e0b', fontSize: 12, marginTop: 6, fontWeight: '600' }}>Uploading teachers…</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Text style={[styles.colSerial, styles.tableHeaderCell, { color: theme.textSecondary }]}>#</Text>
            <View style={{ width: 26 }} />
            <Text style={[styles.tableHeaderCell, { color: theme.textSecondary, flex: 1, marginLeft: 8 }]}>TEACHER</Text>
            <Text style={[styles.colQual, styles.tableHeaderCell, { color: theme.textSecondary }]}>QUALIFICATION</Text>
            <Text style={[styles.tableHeaderCell, { color: theme.textSecondary, width: 64, textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          <FlatList
            data={visible}
            keyExtractor={(item, i) => item.id ? `${item.id}-${i}` : i.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={
              <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No teachers found.</Text>
            }
            ListFooterComponent={
              visibleCount < filteredTeachers.length ? (
                <TouchableOpacity onPress={() => setVisibleCount(v => v + 20)} style={styles.loadMoreBtn}>
                  <Text style={[styles.loadMoreText, { color: theme.primary }]}>Load more</Text>
                </TouchableOpacity>
              ) : filteredTeachers.length > 0 ? (
                <Text style={[styles.countFooter, { color: theme.textSecondary }]}>
                  Showing {visible.length} of {filteredTeachers.length} teachers
                </Text>
              ) : null
            }
          />
        </View>
      )}

      {/* ─── Edit / Add Modal ─── */}
      <Modal visible={modalVisible} animationType="slide" statusBarTranslucent>
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.formHeader}
          >
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.formHeaderBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.formHeaderCenter}>
              <Text style={styles.formHeaderTitle}>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</Text>
              <Text style={styles.formHeaderSubtitle}>{editingTeacher ? 'Update teacher info' : 'Fill in the details below'}</Text>
            </View>
            <TouchableOpacity onPress={handleSaveTeacher} style={styles.formHeaderSaveBtn}>
              <Ionicons name="checkmark" size={20} color="#667eea" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ─── Teacher Info ─── */}
            <View style={[styles.cFormSection, { borderColor: theme.border }]}>
              <View style={styles.cFormSectionHeader}>
                <Ionicons name="person-outline" size={13} color={theme.primary} />
                <Text style={[styles.cFormSectionTitle, { color: theme.primary }]}>Teacher Info</Text>
              </View>

              {/* Row 1: Name | Subject */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="Dr. Sarah Smith"
                    placeholderTextColor={theme.textSecondary}
                    value={name} onChangeText={setName}
                  />
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Subject *</Text>
                  <TouchableOpacity
                    onPress={() => setSubjectPickerVisible(true)}
                    style={[styles.cFormInput, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: subject ? theme.text : theme.textSecondary }} numberOfLines={1}>
                      {subject || 'Select'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Qualification | Experience */}
              <View style={styles.cFormRow}>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Qualification *</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="PhD in Mathematics"
                    placeholderTextColor={theme.textSecondary}
                    value={qualification} onChangeText={setQualification}
                  />
                </View>
                <View style={styles.cFormCol}>
                  <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Experience *</Text>
                  <TextInput
                    style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    placeholder="10 Years"
                    placeholderTextColor={theme.textSecondary}
                    value={experience} onChangeText={setExperience}
                  />
                </View>
              </View>

              {/* Row 3: Photo URL (full width) */}
              <View>
                <Text style={[styles.cFormLabel, { color: theme.textSecondary }]}>Photo URL</Text>
                <TextInput
                  style={[styles.cFormInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder="https://..."
                  placeholderTextColor={theme.textSecondary}
                  value={image} onChangeText={setImage}
                  autoCapitalize="none" keyboardType="url"
                />
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity onPress={handleSaveTeacher} activeOpacity={0.85} style={{ marginTop: 12 }}>
              <LinearGradient
                colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.formSaveButton}
              >
                <Ionicons name={editingTeacher ? 'checkmark-circle' : 'person-add'} size={18} color="#fff" />
                <Text style={styles.formSaveButtonText}>{editingTeacher ? 'Update Teacher' : 'Save Teacher'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.formCancelButton}>
              <Text style={[styles.formCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Subject Picker Modal ─── */}
      <Modal visible={subjectPickerVisible} animationType="fade" transparent
        onRequestClose={() => setSubjectPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setSubjectPickerVisible(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Subject</Text>
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {SUBJECTS.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  onPress={() => { setSubject(sub); setSubjectPickerVisible(false); }}
                  style={[styles.pickerOption, {
                    backgroundColor: subject === sub ? theme.primary + '18' : 'transparent',
                  }]}
                >
                  <Text style={[styles.pickerOptionText, { color: subject === sub ? theme.primary : theme.text }]}>{sub}</Text>
                  {subject === sub && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Choice Modal (Manual vs Upload) ─── */}
      <Modal visible={choiceModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setChoiceModalVisible(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, alignItems: 'center' }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '12' }]}>
              <Ionicons name="people" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.pickerTitle, { color: theme.text, marginTop: 10, marginBottom: 4 }]}>Add Teacher</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 14, textAlign: 'center', fontSize: 12, lineHeight: 16 }}>
              Choose how you want to add teachers.
            </Text>

            <TouchableOpacity
              onPress={handleManualEntry}
              style={[styles.modernChoiceBtn, styles.primaryChoiceBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            >
              <View style={styles.choiceBtnIconContainer}>
                <Ionicons name="create-outline" size={16} color="#fff" />
              </View>
              <Text style={styles.modernChoiceBtnTitle}>Manual Entry</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickDocument}
              style={[styles.modernChoiceBtn, styles.secondaryChoiceBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <View style={[styles.choiceBtnIconContainer, { backgroundColor: theme.primary + '12' }]}>
                <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.modernChoiceBtnTitle, { color: theme.text }]}>Upload JSON</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setChoiceModalVisible(false)} style={{ marginTop: 8, padding: 6 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerBtn: { padding: 4 },

  // Search
  compactSearchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 8,
    paddingHorizontal: 10, height: 38,
    borderRadius: 10, borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },

  // Uploading
  uploadingOverlay: {
    alignItems: 'center', paddingVertical: 8,
    backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a',
  },

  // Table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 0.5,
  },
  colSerial: { width: 22, fontSize: 10, textAlign: 'center', marginRight: 4 },
  colQual:   { width: 90, fontSize: 10, color: '#6b7280' },
  tableAvatar: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  tableActions: { flexDirection: 'row', gap: 2, width: 64, justifyContent: 'flex-end' },
  actionBtn: { padding: 6, borderRadius: 6 },

  // Load more / footer
  loadMoreBtn: { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { fontSize: 12, fontWeight: '600' },
  countFooter: { textAlign: 'center', fontSize: 11, paddingVertical: 10 },
  noDataText: { textAlign: 'center', marginTop: 20, fontSize: 14 },

  // Full-screen form modal
  fullScreenModal: { flex: 1 },
  formHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    paddingTop: 48,
  },
  formHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  formHeaderCenter: { flex: 1, alignItems: 'center' },
  formHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  formHeaderSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  formHeaderSaveBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  formScrollContent: { padding: 14, paddingBottom: 40 },

  // Compact 2-column form
  cFormSection: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10,
  },
  cFormSectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6,
  },
  cFormSectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  cFormRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cFormCol: { flex: 1 },
  cFormLabel: {
    fontSize: 10, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.4, marginBottom: 4,
  },
  cFormInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13,
  },

  // Save / Cancel
  formSaveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
    shadowColor: '#667eea', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, gap: 8,
  },
  formSaveButtonText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  formCancelButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  formCancelText: { fontSize: 14, fontWeight: '600' },

  // Subject & Choice pickers
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  pickerContainer: {
    width: '100%', maxWidth: 320, borderRadius: 14,
    padding: 16, elevation: 6,
  },
  pickerTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, borderRadius: 8, marginBottom: 4,
  },
  pickerOptionText: { fontSize: 13, fontWeight: '500' },

  // Choice modal buttons
  modalIconContainer: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  modernChoiceBtn: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    padding: 12, borderRadius: 10, marginBottom: 8,
  },
  primaryChoiceBtn: {
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  secondaryChoiceBtn: {
    borderWidth: 1.5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  choiceBtnIconContainer: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  modernChoiceBtnTitle: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
});
