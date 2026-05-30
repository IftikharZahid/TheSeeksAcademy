import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { initAssignmentsListener, createAssignment, removeAssignment } from '../../store';
import { scale } from '../../utils/responsive';
import type { Assignment } from '../../store/slices/assignmentsSlice';

const SUBJECTS = [
    "Islamiyat",
    "Tarjuma Tul Quran",
    "Urdu",
    "English",
    "Pak Study",
    "Mathamatics",
    "Biology",
    "Chemistry",
    "Physics",
    "Computer Science",
    "History",
    "P.Eduation",
    "Psychology"
];

const CLASS_OPTIONS = ['All', '9th', '10th', '1st Year', '2nd Year'];

export const AdminAssignmentsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const dispatch = useAppDispatch();
    const assignments = useAppSelector((state) => state.assignments.data);
    const teachers = useAppSelector((state) => state.teachers?.list || []);
    
    const profile: any = useAppSelector(state => state.auth.profile);
    const isTeacher = (profile?.role || '').toLowerCase() === 'teacher';
    const teacherSubject = profile?.class || profile?.subject || '';
    
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [deadline, setDeadline] = useState('');
    const [targetClass, setTargetClass] = useState('All');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDateValue(selectedDate);
            setDeadline(selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
    };

    useEffect(() => {
        const unsubscribe = initAssignmentsListener(dispatch);
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [dispatch]);

    // Auto-fetch teacher name when subject changes
    useEffect(() => {
        if (isTeacher && teacherSubject) {
            setSubject(teacherSubject);
            setTeacherName(profile?.fullname || profile?.name || 'Teacher');
        } else {
            if (!subject) setSubject(SUBJECTS[0]);
            const matchingTeacher = teachers.find((t: any) => t.subject === subject);
            if (matchingTeacher) {
                setTeacherName(matchingTeacher.name);
            } else {
                setTeacherName('');
            }
        }
    }, [subject, teachers, isTeacher, teacherSubject, profile]);

    const handleCreate = async () => {
        if (!title || !teacherName || !deadline || !subject) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            await dispatch(createAssignment({
                title,
                teacherName,
                deadline,
                targetClass,
                subject,
                description,
            })).unwrap();
            
            Alert.alert('Success', 'Assignment created successfully');
            setModalVisible(false);
            // Reset form
            setTitle('');
            setTeacherName('');
            setDeadline('');
            setTargetClass('All');
            setSubject(isTeacher && teacherSubject ? teacherSubject : SUBJECTS[0]);
            setDescription('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create assignment');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Assignment',
            'Are you sure you want to delete this assignment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(removeAssignment(id)).unwrap();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete assignment');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Assignment }) => (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
                <View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Text style={[styles.subjectText, { color: theme.primary }]}>{item.subject}</Text>
                        <Text style={[{ fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden'}, { backgroundColor: theme.primary + '22', color: theme.primary }]}>{item.targetClass || 'All'}</Text>
                    </View>
                    <Text style={[styles.titleText, { color: theme.text }]}>{item.title}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={scale(20)} color="#ef4444" />
                </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                    <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>{item.teacherName}</Text>
                </View>
                <View style={[styles.footerRow, { justifyContent: 'flex-end' }]}>
                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>{item.deadline}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.card }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Assignments</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={assignments}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.textSecondary }}>No assignments found.</Text>
                    </View>
                }
            />

            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>New Assignment</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Title</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. Chapter 1 Exercise"
                                placeholderTextColor={theme.textTertiary}
                            />

                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Class</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {CLASS_OPTIONS.map((cls) => (
                                    <TouchableOpacity
                                        key={cls}
                                        onPress={() => setTargetClass(cls)}
                                        style={[
                                            styles.subjectChip,
                                            { backgroundColor: targetClass === cls ? theme.primary : theme.card, borderColor: theme.border }
                                        ]}
                                    >
                                        <Text style={{ color: targetClass === cls ? '#fff' : theme.text, fontSize: scale(12) }}>
                                            {cls}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {(isTeacher && teacherSubject ? [teacherSubject] : SUBJECTS).map((sub) => (
                                    <TouchableOpacity
                                        key={sub}
                                        onPress={() => setSubject(sub)}
                                        disabled={isTeacher}
                                        style={[
                                            styles.subjectChip,
                                            { backgroundColor: subject === sub ? theme.primary : theme.card, borderColor: theme.border }
                                        ]}
                                    >
                                        <Text style={{ color: subject === sub ? '#fff' : theme.text, fontSize: scale(12) }}>
                                            {sub}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Teacher Name</Text>
                            <View pointerEvents="none">
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.card, color: theme.textSecondary, borderColor: theme.border }]}
                                    value={teacherName}
                                    editable={false}
                                    placeholder="e.g. Sir Abdullah"
                                    placeholderTextColor={theme.textTertiary}
                                />
                            </View>

                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Deadline</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <View pointerEvents="none">
                                    <TextInput
                                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                        value={deadline}
                                        editable={false}
                                        placeholder="e.g. Nov 25, 2025"
                                        placeholderTextColor={theme.textTertiary}
                                    />
                                </View>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateValue}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Additional details..."
                                placeholderTextColor={theme.textTertiary}
                                multiline
                                numberOfLines={4}
                            />

                            <TouchableOpacity 
                                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                                onPress={handleCreate}
                            >
                                <Text style={styles.submitButtonText}>Create Assignment</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: scale(14),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        elevation: 2,
        shadowOpacity: 0.05,
    },
    backButton: { width: 40, alignItems: 'flex-start' },
    headerTitle: { flex: 1, fontSize: scale(18), fontWeight: '700', textAlign: 'center' },
    listContainer: { padding: scale(16), paddingBottom: scale(80) },
    card: {
        borderRadius: scale(12),
        padding: scale(14),
        marginBottom: scale(12),
        borderWidth: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    subjectText: { fontSize: scale(12), fontWeight: '700', marginBottom: 2 },
    titleText: { fontSize: scale(15), fontWeight: '600' },
    deleteBtn: { padding: 4 },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: scale(10) },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    footerRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 5 },
    footerText: { fontSize: scale(12) },
    emptyContainer: { padding: scale(40), alignItems: 'center' },
    fab: {
        position: 'absolute',
        bottom: scale(30),
        right: scale(20),
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: scale(20),
        borderTopRightRadius: scale(20),
        padding: scale(20),
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    modalTitle: { fontSize: scale(18), fontWeight: '700' },
    inputLabel: { fontSize: scale(13), marginBottom: scale(6), fontWeight: '600', marginLeft: scale(4) },
    input: {
        borderWidth: 1,
        borderRadius: scale(10),
        paddingHorizontal: scale(14),
        paddingVertical: scale(12),
        marginBottom: scale(16),
        fontSize: scale(14),
    },
    textArea: { height: scale(80), textAlignVertical: 'top' },
    subjectChip: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(8),
        borderRadius: scale(20),
        borderWidth: 1,
        marginRight: scale(8),
    },
    submitButton: {
        padding: scale(14),
        borderRadius: scale(12),
        alignItems: 'center',
        marginTop: scale(10),
        marginBottom: scale(20),
    },
    submitButtonText: { color: '#fff', fontSize: scale(16), fontWeight: '700' },
});
