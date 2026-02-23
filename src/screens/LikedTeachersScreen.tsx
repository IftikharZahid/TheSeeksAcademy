import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { scale } from '../utils/responsive';
import { HomeStackParamList } from './navigation/HomeStack';

const { width } = Dimensions.get('window');

interface Teacher {
    id: string;
    name: string;
    subject: string;
    qualification: string;
    experience: string;
    image: string;
    likedAt?: any;
}

type LikedTeachersScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'LikedTeachersScreen'>;

export const LikedTeachersScreen: React.FC = () => {
    const navigation = useNavigation<LikedTeachersScreenNavigationProp>();
    const { theme, isDark } = useTheme();
    const [likedTeachers, setLikedTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'favoriteTeachers'),
            orderBy('likedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const favorites = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Teacher));

            // Cross-reference with live staff collection for latest images
            try {
                const staffSnapshot = await getDocs(collection(db, 'staff'));
                const staffMap = new Map<string, string>();
                staffSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.image) {
                        staffMap.set(doc.id, data.image);
                    }
                });

                // Merge: use latest image from staff if available
                const merged = favorites.map(teacher => ({
                    ...teacher,
                    image: staffMap.get(teacher.id) || teacher.image,
                }));
                setLikedTeachers(merged);
            } catch {
                // Fallback to saved data if staff fetch fails
                setLikedTeachers(favorites);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const cardWidth = (width - scale(48)) / 2;

    const renderTeacherCard = (teacher: Teacher) => (
        <TouchableOpacity
            key={teacher.id}
            style={[
                styles.card,
                {
                    width: cardWidth,
                    backgroundColor: isDark ? theme.card : '#ffffff',
                    borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)',
                }
            ]}
            onPress={() => navigation.navigate('StaffInfoScreen', { teacher })}
            activeOpacity={0.9}
        >
            {/* Teacher Image */}
            <View style={styles.imageWrapper}>
                <Image source={{ uri: teacher.image }} style={styles.teacherImage} />
                <View style={styles.heartBadge}>
                    <Ionicons name="heart" size={scale(12)} color="#ef4444" />
                </View>
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
                <Text style={[styles.teacherName, { color: theme.text }]} numberOfLines={1}>
                    {teacher.name}
                </Text>
                <Text style={[styles.subject, { color: theme.primary }]} numberOfLines={1}>
                    {teacher.subject}
                </Text>

                <View style={styles.separator} />

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="school" size={scale(12)} color={theme.textSecondary} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {teacher.qualification}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
            {/* Floating Back Button */}
            <View style={styles.floatingHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.floatingBackButton, { backgroundColor: theme.card }]}
                >
                    <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.screenTitle, { color: theme.text }]}>Favorite Teachers</Text>
                <View style={styles.placeholderButton} />
            </View>

            {/* Loading State */}
            {loading && (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading favorites...</Text>
                </View>
            )}

            {/* Empty State */}
            {!loading && likedTeachers.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={64} color={theme.textTertiary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        No favorite teachers yet
                    </Text>
                    <TouchableOpacity
                        style={[styles.browseButton, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.navigate('TeachersScreen')}
                    >
                        <Text style={styles.browseButtonText}>Browse Teachers</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Teachers Grid */}
            {!loading && likedTeachers.length > 0 && (
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: scale(20) }}
                >
                    <View style={styles.cardsGrid}>
                        {likedTeachers.map((teacher) => renderTeacherCard(teacher))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
    },
    floatingBackButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    screenTitle: {
        fontSize: scale(18),
        fontWeight: '700',
    },
    placeholderButton: {
        width: scale(40),
        height: scale(40),
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
    headerIconButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: scale(16),
        height: scale(16),
        borderRadius: scale(8),
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: scale(9),
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: scale(16),
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: scale(16),
    },
    card: {
        borderRadius: scale(16),
        marginBottom: scale(16),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    imageWrapper: {
        width: '100%',
        height: scale(110),
        position: 'relative',
        backgroundColor: '#f3f4f6',
    },
    teacherImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heartBadge: {
        position: 'absolute',
        top: scale(8),
        right: scale(8),
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        padding: scale(10),
        alignItems: 'center',
    },
    teacherName: {
        fontSize: scale(13),
        fontWeight: '700',
        marginBottom: scale(2),
        textAlign: 'center',
    },
    subject: {
        fontSize: scale(11),
        fontWeight: '600',
        marginBottom: scale(8),
        textAlign: 'center',
        opacity: 0.8,
    },
    separator: {
        width: '40%',
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: scale(8),
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    statText: {
        fontSize: scale(9),
        fontWeight: '500',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    loadingText: {
        marginTop: scale(12),
        fontSize: scale(15),
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
    },
    emptyText: {
        fontSize: scale(16),
        marginTop: scale(16),
        marginBottom: scale(24),
    },
    browseButton: {
        paddingHorizontal: scale(24),
        paddingVertical: scale(12),
        borderRadius: scale(8),
    },
    browseButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: scale(14),
    },
});
