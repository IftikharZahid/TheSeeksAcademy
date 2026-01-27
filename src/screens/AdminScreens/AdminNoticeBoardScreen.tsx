import React, { useState, useEffect } from 'react';
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
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';

// Firebase
import { db } from '../../api/firebaseConfig';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export interface Notice {
    id: string;
    title: string;
    message: string;
    timeAgo?: string;
    createdAt?: Timestamp;
    type: 'image' | 'initials' | 'icon';
    iconName?: string;
    iconColor?: string;
    iconBgColor?: string;
}

const formatTimeAgo = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const date = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";

    return "Just now";
};

export const AdminNoticeBoardScreen: React.FC = () => {
    const { theme, isDark } = useTheme();
    const navigation = useNavigation();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch Notices
    useEffect(() => {
        const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timeAgo: formatTimeAgo(doc.data().createdAt)
            })) as Notice[];

            setNotices(fetchedNotices);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notices:", error);
            setLoading(false);
            Alert.alert("Error", "Failed to fetch notices");
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Notice",
            "Are you sure you want to delete this notice?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'notices', id));
                        } catch (error) {
                            console.error("Error deleting notice:", error);
                            Alert.alert("Error", "Failed to delete notice");
                        }
                    }
                }
            ]
        );
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
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                // Update existing
                await updateDoc(doc(db, 'notices', editingId), {
                    title,
                    message,
                    // We don't update createdAt usually, or maybe update an 'updatedAt' field
                });
            } else {
                // Create new
                await addDoc(collection(db, 'notices'), {
                    title,
                    message,
                    type: 'icon',
                    iconName: 'notifications', // Default icon
                    iconColor: theme.primary,
                    iconBgColor: isDark ? '#1e293b' : '#e0e7ff',
                    createdAt: serverTimestamp(),
                });
            }
            setModalVisible(false);
        } catch (error) {
            console.error("Error saving notice:", error);
            Alert.alert("Error", "Failed to save notice");
        } finally {
            setSaving(false);
        }
    };

    const renderNotice = ({ item }: { item: Notice }) => (
        <View style={[styles.noticeItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor }]}>
                <Ionicons name={item.iconName as any || 'notifications'} size={scale(24)} color={item.iconColor} />
            </View>

            <View style={styles.noticeContent}>
                <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.noticeMessage, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.message}
                </Text>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{item.timeAgo}</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                    <Ionicons name="pencil" size={scale(18)} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, { marginLeft: scale(8) }]}>
                    <Ionicons name="trash-outline" size={scale(18)} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Notice Board</Text>
                <View style={{ width: scale(40) }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotice}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={scale(48)} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No notices found</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={handleAddNew}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={scale(30)} color="#ffffff" />
            </TouchableOpacity>

            {/* Modern Compact Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {editingId ? 'Edit Notice' : 'New Notice'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <Ionicons name="close" size={scale(20)} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>TITLE</Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.background,
                                        color: theme.text,
                                        borderColor: theme.border
                                    }]}
                                    placeholder="Enter notice title"
                                    placeholderTextColor={theme.textSecondary}
                                    value={title}
                                    onChangeText={setTitle}
                                    editable={!saving}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>MESSAGE</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, {
                                        backgroundColor: theme.background,
                                        color: theme.text,
                                        borderColor: theme.border
                                    }]}
                                    placeholder="Enter description..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    editable={!saving}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                                onPress={handleSave}
                                activeOpacity={0.8}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {editingId ? 'Update Notice' : 'Post Notice'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        borderBottomWidth: 1,
    },
    backButton: {
        padding: scale(4),
    },
    headerTitle: {
        fontSize: scale(18),
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginLeft: scale(-40),
    },
    listContent: {
        padding: scale(16),
        paddingBottom: scale(100),
    },
    noticeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(12),
        borderRadius: scale(12),
        borderWidth: 1,
        marginBottom: scale(12),
    },
    iconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        justifyContent: 'center',
        alignItems: 'center',
    },
    noticeContent: {
        flex: 1,
        marginLeft: scale(12),
        marginRight: scale(8),
    },
    noticeTitle: {
        fontSize: scale(15),
        fontWeight: '600',
        marginBottom: scale(4),
    },
    noticeMessage: {
        fontSize: scale(13),
    },
    timeAgo: {
        fontSize: scale(11),
        marginTop: scale(4),
        fontStyle: 'italic',
    },
    actionButtons: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    actionButton: {
        padding: scale(4),
    },
    fab: {
        position: 'absolute',
        bottom: scale(24),
        right: scale(24),
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: scale(20),
    },
    modalContent: {
        borderRadius: scale(24),
        padding: scale(24),
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(24),
    },
    modalTitle: {
        fontSize: scale(20),
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: scale(8),
        borderRadius: scale(12),
    },
    formContainer: {
        gap: scale(16),
    },
    formGroup: {
        marginBottom: 0,
    },
    label: {
        fontSize: scale(11),
        marginBottom: scale(6),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        borderRadius: scale(12),
        padding: scale(14),
        fontSize: scale(15),
        borderWidth: 1,
    },
    textArea: {
        height: scale(100),
    },
    saveButton: {
        padding: scale(14),
        borderRadius: scale(14),
        alignItems: 'center',
        marginTop: scale(8),
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: scale(16),
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: scale(60),
        opacity: 0.7
    },
    emptyText: {
        marginTop: scale(12),
        fontSize: scale(16)
    }
});
