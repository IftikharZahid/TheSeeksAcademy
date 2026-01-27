import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCourses } from '../context/CoursesContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../api/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

interface SearchResult {
    id: string;
    type: 'course' | 'teacher';
    title: string;
    subtitle: string;
    image?: string;
    data: any;
}

export const SearchScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { courses } = useCourses();
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Color Palette
    const bg = isDark ? '#0f172a' : '#f8fafc';
    const cardBg = isDark ? '#1e293b' : '#fff';
    const textMain = isDark ? '#f8fafc' : '#0f172a';
    const textSub = isDark ? '#94a3b8' : '#64748b';
    const accent = '#334155'; // Slate-700
    const border = isDark ? '#334155' : '#e2e8f0';

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const snapshot = await getDocs(collection(db, "staff"));
                setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error('Error fetching teachers:', error); }
        };
        fetchTeachers();
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (!text.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        const query = text.toLowerCase().trim();

        // Mock debounce could go here, but direct is fine for small datasets
        setTimeout(() => {
            const searchResults: SearchResult[] = [];
            courses.forEach((c: any) => {
                if ((c.title || '').toLowerCase().includes(query) || (c.teacher || '').toLowerCase().includes(query)) {
                    searchResults.push({
                        id: `course-${c.id}`,
                        type: 'course',
                        title: c.title || c.name,
                        subtitle: c.teacher || 'Instructor',
                        image: c.image || c.thumbnail,
                        data: c,
                    });
                }
            });
            teachers.forEach((t: any) => {
                if ((t.name || '').toLowerCase().includes(query) || (t.subject || '').toLowerCase().includes(query)) {
                    searchResults.push({
                        id: `teacher-${t.id}`,
                        type: 'teacher',
                        title: t.name,
                        subtitle: t.subject || 'Teacher',
                        image: t.image,
                        data: t,
                    });
                }
            });
            setResults(searchResults);
            setLoading(false);
        }, 300);
    };

    const renderResult = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            style={[styles.resultItem, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => item.type === 'course' ? navigation.navigate('CourseDetail', { course: item.data }) : navigation.navigate('StaffInfoScreen', { teacher: item.data })}
            activeOpacity={0.7}
        >
            <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.resultImage} />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                        <Ionicons name={item.type === 'course' ? 'book' : 'person'} size={18} color={textSub} />
                    </View>
                )}
            </View>
            <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: textMain }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.resultSubtitle, { color: textSub }]} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                <Text style={[styles.badgeText, { color: textSub }]}>{item.type === 'course' ? 'Course' : 'Staff'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textSub} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
            {/* Minimal Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={textMain} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textMain }]}>Search</Text>
                <View style={{ width: 22 }} />
            </View>

            {/* Search Input Area */}
            <View style={[styles.searchWrapper, { backgroundColor: cardBg, borderColor: border }]}>
                <Ionicons name="search" size={18} color={textSub} />
                <TextInput
                    style={[styles.input, { color: textMain }]}
                    placeholder="Search courses, teachers..."
                    placeholderTextColor={textSub}
                    value={searchText}
                    onChangeText={handleSearch}
                    autoFocus
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={18} color={textSub} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerBox}><ActivityIndicator color={accent} /></View>
            ) : hasSearched && results.length === 0 ? (
                <View style={styles.centerBox}>
                    <Ionicons name="search-outline" size={48} color={textSub} style={{ opacity: 0.5, marginBottom: 12 }} />
                    <Text style={[styles.emptyText, { color: textSub }]}>No matches found</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderResult}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={results.length > 0 ? (
                        <Text style={[styles.countText, { color: textSub }]}>{results.length} results</Text>
                    ) : null}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontWeight: '600' },

    searchWrapper: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, paddingHorizontal: 12, height: 44,
        borderRadius: 12, marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1
    },
    input: { flex: 1, marginLeft: 10, fontSize: 15, height: '100%' },

    listContent: { paddingHorizontal: 16 },
    countText: { fontSize: 12, fontWeight: '600', marginBottom: 12, marginLeft: 4 },

    resultItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 10, borderRadius: 12, marginBottom: 8,
        borderWidth: 1,
    },
    imageContainer: { marginRight: 12 },
    resultImage: { width: 40, height: 40, borderRadius: 8 },
    placeholderImage: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    resultContent: { flex: 1, justifyContent: 'center' },
    resultTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    resultSubtitle: { fontSize: 12 },

    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    emptyText: { fontSize: 14, fontWeight: '500' }
});
