import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

interface Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    gradientColors: string[];
    lectureCount: number;
    totalDuration: string;
    instructor: string;
}

const subjects: Subject[] = [
    {
        id: '1',
        name: 'Mathematics',
        icon: 'calculator',
        color: '#6366f1',
        gradientColors: ['#6366f1', '#8b5cf6'],
        lectureCount: 24,
        totalDuration: '12h 30m',
        instructor: 'Dr. Ahmed',
    },
    {
        id: '2',
        name: 'Physics',
        icon: 'flash',
        color: '#0ea5e9',
        gradientColors: ['#0ea5e9', '#38bdf8'],
        lectureCount: 18,
        totalDuration: '9h 45m',
        instructor: 'Prof. Khan',
    },
    {
        id: '3',
        name: 'Chemistry',
        icon: 'flask',
        color: '#10b981',
        gradientColors: ['#10b981', '#34d399'],
        lectureCount: 20,
        totalDuration: '10h 15m',
        instructor: 'Dr. Fatima',
    },
    {
        id: '4',
        name: 'Biology',
        icon: 'leaf',
        color: '#22c55e',
        gradientColors: ['#22c55e', '#4ade80'],
        lectureCount: 16,
        totalDuration: '8h 20m',
        instructor: 'Dr. Hassan',
    },
    {
        id: '5',
        name: 'English',
        icon: 'book',
        color: '#f59e0b',
        gradientColors: ['#f59e0b', '#fbbf24'],
        lectureCount: 15,
        totalDuration: '7h 10m',
        instructor: 'Ms. Sarah',
    },
    {
        id: '6',
        name: 'Computer Science',
        icon: 'laptop',
        color: '#ec4899',
        gradientColors: ['#ec4899', '#f472b6'],
        lectureCount: 22,
        totalDuration: '11h 30m',
        instructor: 'Mr. Ali',
    },
    {
        id: '7',
        name: 'Urdu',
        icon: 'language',
        color: '#8b5cf6',
        gradientColors: ['#8b5cf6', '#a78bfa'],
        lectureCount: 12,
        totalDuration: '6h 15m',
        instructor: 'Ms. Ayesha',
    },
    {
        id: '8',
        name: 'Islamiat',
        icon: 'moon',
        color: '#14b8a6',
        gradientColors: ['#14b8a6', '#2dd4bf'],
        lectureCount: 14,
        totalDuration: '7h 45m',
        instructor: 'Maulana Tariq',
    },
];

interface SubjectCardProps {
    subject: Subject;
    index: number;
    onPress: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, index, onPress }) => {
    const { theme, isDark } = useTheme();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay: index * 60,
                friction: 6,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                delay: index * 60,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.subjectCard,
                    {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#fff',
                        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(229, 231, 235, 0.8)',
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Icon with gradient background */}
                <LinearGradient
                    colors={subject.gradientColors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                >
                    <Ionicons name={subject.icon as any} size={22} color="#fff" />
                </LinearGradient>

                {/* Subject Info */}
                <Text style={[styles.subjectName, { color: theme.text }]} numberOfLines={1}>
                    {subject.name}
                </Text>
                <Text style={[styles.instructorName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {subject.instructor}
                </Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="play-circle" size={12} color={subject.color} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                            {subject.lectureCount}
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="time" size={12} color={subject.color} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                            {subject.totalDuration}
                        </Text>
                    </View>
                </View>

                {/* Arrow */}
                <View style={[styles.arrowContainer, { backgroundColor: `${subject.color}15` }]}>
                    <Ionicons name="chevron-forward" size={14} color={subject.color} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const VideoGalleryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const totalLectures = subjects.reduce((acc, s) => acc + s.lectureCount, 0);

    const handleSubjectPress = (subject: Subject) => {
        navigation.navigate('VideoLecturesScreen', {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectColor: subject.color,
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Compact Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        borderBottomColor: theme.border,
                        opacity: headerAnim,
                    }
                ]}
            >
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Video Gallery</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {totalLectures} lectures available
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                    <Ionicons name="search" size={18} color={theme.text} />
                </TouchableOpacity>
            </Animated.View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Featured Banner */}
                <View style={styles.bannerContainer}>
                    <LinearGradient
                        colors={isDark ? ['#1e293b', '#334155'] : ['#6366f1', '#8b5cf6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.banner}
                    >
                        <View style={styles.bannerContent}>
                            <Text style={styles.bannerTitle}>Start Learning Today!</Text>
                            <Text style={styles.bannerSubtitle}>
                                Access {subjects.length} subjects with {totalLectures}+ video lectures
                            </Text>
                        </View>
                        <View style={styles.bannerDecoration} />
                    </LinearGradient>
                </View>

                {/* Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>All Subjects</Text>
                    <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                        {subjects.length} subjects
                    </Text>
                </View>

                {/* Subject Grid */}
                <View style={styles.grid}>
                    {subjects.map((subject, index) => (
                        <SubjectCard
                            key={subject.id}
                            subject={subject}
                            index={index}
                            onPress={() => handleSubjectPress(subject)}
                        />
                    ))}
                </View>
            </ScrollView>
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
    searchButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 24,
    },
    // Banner
    bannerContainer: {
        marginHorizontal: 12,
        marginTop: 12,
    },
    banner: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    bannerContent: {
        zIndex: 10,
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    bannerDecoration: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionCount: {
        fontSize: 12,
    },
    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    cardContainer: {
        width: CARD_WIDTH,
    },
    subjectCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    iconGradient: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    subjectName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    instructorName: {
        fontSize: 11,
        marginBottom: 10,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 10,
        fontWeight: '500',
    },
    arrowContainer: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 24,
        height: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
