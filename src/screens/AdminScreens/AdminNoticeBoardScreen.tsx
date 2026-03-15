import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { db } from '../../api/firebaseConfig';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { useAppSelector } from '../../store/hooks';
import type { Notice } from '../../store/slices/notificationsSlice';

export const AdminNoticeBoardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const notices = useAppSelector(state => state.notifications.notices) as Notice[];
  const loading = useAppSelector(state => state.notifications.loading);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notice', 'Are you sure you want to delete this notice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'notices', id));
          } catch {
            Alert.alert('Error', 'Failed to delete notice');
          }
        },
      },
    ]);
  };

  const handleEdit = (notice: Notice) => {
    setTitle(notice.title);
    setMessage(notice.message);
    setEditingId(notice.id);
    setModalVisible(true);
  };

  const handleAddNew = () => {
    setTitle('');
    setMessage('');
    setEditingId(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'notices', editingId), { title, message });
      } else {
        await addDoc(collection(db, 'notices'), {
          title, message,
          type: 'icon',
          iconName: 'notifications',
          iconColor: theme.primary,
          iconBgColor: isDark ? '#1e293b' : '#e0e7ff',
          createdAt: serverTimestamp(),
        });
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const renderNotice = ({ item, index }: { item: Notice; index: number }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.noticeRow, {
        backgroundColor: isEven ? theme.card : theme.card + 'CC',
        borderBottomColor: theme.border + '50',
      }]}>
        <View style={[styles.noticeIcon, { backgroundColor: item.iconBgColor || theme.primary + '18' }]}>
          <Ionicons name={(item.iconName as any) || 'notifications'} size={13} color={item.iconColor || theme.primary} />
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.timeAgo, { color: theme.textSecondary }]} numberOfLines={1}>{item.timeAgo}</Text>
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.rowActionBtn}>
            <Ionicons name="pencil" size={14} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.rowActionBtn}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notice Board</Text>
        <TouchableOpacity onPress={handleAddNew} style={styles.addButton}>
          <Ionicons name="add" size={scale(22)} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={item => item.id}
          renderItem={renderNotice}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.tableHeader, { backgroundColor: isDark ? theme.card : '#f8fafc', borderBottomColor: theme.border }]}>
              <View style={{ width: 26 }} />
              <Text style={[styles.thCell, { color: theme.textSecondary, flex: 1, marginLeft: 8 }]}>NOTICE</Text>
              <Text style={[styles.thCell, { color: theme.textSecondary, width: 64, textAlign: 'right' }]}>ACTIONS</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={scale(48)} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No notices found</Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalFull, { backgroundColor: theme.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackBtn}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit Notice' : 'New Notice'}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.modalSaveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.formContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>TITLE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter notice title"
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                editable={!saving}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>MESSAGE</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter description..."
                placeholderTextColor={theme.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14), paddingVertical: scale(10),
    borderBottomWidth: 0.5,
  },
  backButton: { padding: scale(4) },
  addButton: { padding: scale(4) },
  headerTitle: { fontSize: scale(16), fontWeight: '700' },

  listContent: { paddingBottom: scale(24), paddingTop: scale(4) },

  /* compact table */
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1,
  },
  thCell: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  noticeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  noticeIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  noticeTitle: { fontSize: scale(12), fontWeight: '600' },
  timeAgo: { fontSize: scale(10), marginTop: scale(1), fontStyle: 'italic' },
  rowActions: { flexDirection: 'row', gap: 4, width: 64, justifyContent: 'flex-end' },
  rowActionBtn: { padding: 8, borderRadius: 6 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: scale(60), opacity: 0.7 },
  emptyText: { marginTop: scale(12), fontSize: scale(14) },

  /* Modal */
  modalFull: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  modalBackBtn: { padding: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSaveBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 8, minWidth: 60, alignItems: 'center',
  },
  formContainer: { padding: 16, gap: 4 },
  label: {
    fontSize: scale(10), fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4, marginTop: 10,
  },
  input: {
    borderRadius: scale(10), padding: scale(12),
    fontSize: scale(14), borderWidth: 1,
  },
  textArea: { height: scale(120), textAlignVertical: 'top' },
});
