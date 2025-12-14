import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const SUBJECTS = [
  'TarjumaTul Quran', 
  'Urdu', 
  'Pak Study', 
  'English', 
  'Computer Science', 
  'Mathematics', 
  'Physics', 
  'Sociology', 
  'Psychology', 
  'Economics', 
  'Ethics',
  'Chemistry',
  'Biology'
];

interface Teacher {
  id: string;
  name: string;
  subject: string;
  qualification: string;
  experience: string;
  image: string;
}

export const AdminTeachersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [image, setImage] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const teachersList: Teacher[] = [];
      snapshot.forEach((doc) => {
        teachersList.push({ id: doc.id, ...doc.data() } as Teacher);
      });
      setTeachers(teachersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teachers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveTeacher = async () => {
    if (!name || !subject || !qualification || !experience) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const teacherData = {
      name,
      subject,
      qualification,
      experience,
      image: image || 'https://via.placeholder.com/150', // Default image if empty
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingTeacher) {
        await setDoc(doc(db, 'staff', editingTeacher.id), teacherData, { merge: true });
        Alert.alert('Success', 'Teacher updated successfully');
      } else {
        const newId = Date.now().toString(); // Simple ID generation
        await setDoc(doc(db, 'staff', newId), teacherData);
        Alert.alert('Success', 'Teacher added successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save teacher');
      console.error(error);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    Alert.alert('Delete Teacher', 'Are you sure you want to remove this teacher?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'staff', id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete teacher');
          }
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
      setImage(teacher.image);
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
      const result = await DocumentPicker.getDocumentAsync({ 
        type: '*/*',
        copyToCacheDirectory: true 
      });
      
      if (result.canceled) return;

      setLoading(true);
      setChoiceModalVisible(false);

      const asset = result.assets[0];
      let fileUri = asset.uri;

      if (fileUri.startsWith('content://')) {
        const tempUri = FileSystem.documentDirectory + 'temp_teacher_upload.json';
        await FileSystem.copyAsync({
          from: fileUri,
          to: tempUri
        });
        fileUri = tempUri;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        Alert.alert('JSON Error', 'The file content is not valid JSON.');
        setLoading(false);
        return;
      }

      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Invalid JSON format. The root must be an array of teacher records.');
        setLoading(false);
        return;
      }

      let addedCount = 0;
      let errorCount = 0;

      for (const item of data) {
        if (item.name && item.subject && item.qualification && item.experience) {
          try {
            const docId = Date.now().toString() + '_' + addedCount;
            await setDoc(doc(db, 'staff', docId), {
              name: item.name,
              subject: item.subject,
              qualification: item.qualification,
              experience: item.experience,
              image: item.image || 'https://via.placeholder.com/150',
              updatedAt: serverTimestamp(),
            });

            addedCount++;
          } catch (err) {
            console.error("Error adding teacher:", item, err);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      Alert.alert('Upload Complete', `Successfully added ${addedCount} teacher records.\nFailed/Skipped: ${errorCount}`);

    } catch (error: any) {
      console.error("File upload error:", error);
      Alert.alert('Error', `Failed to process the file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setName('');
    setSubject('');
    setQualification('');
    setExperience('');
    setImage('');
  };

  const filteredTeachers = teachers.filter(t => 
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Teachers</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Search teacher by name or subject..."
          placeholderTextColor={theme.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Staff List ({teachers.length})</Text>
          {filteredTeachers.length === 0 ? (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No teachers found.</Text>
          ) : (
            filteredTeachers.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', borderRadius: 30 }} />
                    ) : (
                        <Ionicons name="person" size={30} color={theme.primary} />
                    )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.subject, { color: theme.primary }]}>{item.subject}</Text>
                  <Text style={[styles.details, { color: theme.textSecondary }]}>{item.qualification} • {item.experience}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={20} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteTeacher(item.id)} style={styles.actionBtn}>
                    <Ionicons name="trash" size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Edit/Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. Dr. Sarah Smith" 
                placeholderTextColor={theme.textSecondary}
                value={name} 
                onChangeText={setName} 
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
              <TouchableOpacity
                onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                  <Text style={{ color: subject ? theme.text : theme.textSecondary }}>
                      {subject || 'Select Subject'}
                  </Text>
              </TouchableOpacity>
              
              {showSubjectDropdown && (
                  <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {SUBJECTS.map((sub) => (
                              <TouchableOpacity 
                                key={sub} 
                                onPress={() => {
                                    setSubject(sub);
                                    setShowSubjectDropdown(false);
                                }}
                                style={[
                                    styles.dropdownItem, 
                                    { borderBottomColor: theme.border, backgroundColor: subject === sub ? theme.primary + '20' : 'transparent' }
                                ]}
                              >
                                  <Text style={{ color: theme.text }}>{sub}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>
              )}
              
              <Text style={[styles.label, { color: theme.text }]}>Qualification</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. PhD in Mathematics" 
                placeholderTextColor={theme.textSecondary}
                value={qualification} 
                onChangeText={setQualification} 
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Experience</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="e.g. 10 Years" 
                placeholderTextColor={theme.textSecondary}
                value={experience} 
                onChangeText={setExperience} 
              />

              <Text style={[styles.label, { color: theme.text }]}>Image URL</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder="https://..." 
                placeholderTextColor={theme.textSecondary}
                value={image} 
                onChangeText={setImage} 
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTeacher} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Choice Modal (Manual vs Upload) */}
      <Modal visible={choiceModalVisible} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setChoiceModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="people" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text, marginTop: 12, marginBottom: 6 }]}>Add New Teacher</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 20, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
              Choose how you want to add teachers.
            </Text>
            
            <TouchableOpacity 
              onPress={handleManualEntry} 
              style={[styles.modernChoiceBtn, styles.primaryChoiceBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            >
              <View style={styles.choiceBtnIconContainer}>
                <Ionicons name="create-outline" size={18} color="#fff" />
              </View>
              <Text style={styles.modernChoiceBtnTitle}>Manual Entry</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handlePickDocument} 
              style={[styles.modernChoiceBtn, styles.secondaryChoiceBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <View style={[styles.choiceBtnIconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.modernChoiceBtnTitle, { color: theme.text }]}>Upload JSON File</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setChoiceModalVisible(false)} 
              style={{ marginTop: 12, padding: 8 }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 4 },
  addButton: { padding: 4 },
  searchContainer: { padding: 16, paddingBottom: 0 },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: { padding: 16 },
  listTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  subject: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  details: { fontSize: 12 },
  cardActions: { flexDirection: 'column', gap: 12, paddingLeft: 8 },
  actionBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryChoiceBtn: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryChoiceBtn: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  choiceBtnIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choiceBtnTextContainer: {
    flex: 1,
  },
  modernChoiceBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
