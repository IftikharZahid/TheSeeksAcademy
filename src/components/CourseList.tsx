import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCourses } from '../context/CoursesContext';
import { scale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const categoryColors = [
    ['#f8bbd9', '#fce4ec'], // Pink gradient
    ['#bbdefb', '#e3f2fd'], // Blue gradient
    ['#c8e6c9', '#e8f5e9'], // Green gradient
    ['#ffe0b2', '#fff3e0'], // Orange gradient
];

export const CourseList: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { courses } = useCourses();

    const handleCoursePress = (course: any) => {
        navigation.navigate('CourseDetail', { course });
    };

    const renderCourseItem = ({ item, index }: { item: any; index: number }) => {
        const colors = categoryColors[index % categoryColors.length];

        return (
            <TouchableOpacity
                style={[
                    styles.courseItem,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    }
                ]}
                onPress={() => handleCoursePress(item)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={colors as any}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.courseIcon} />
                    ) : (
                        <Text style={styles.courseEmoji}>📚</Text>
                    )}
                </LinearGradient>

                <View style={styles.courseInfo}>
                    <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title || item.name}
                    </Text>
                    <Text style={[styles.courseSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.description || item.instructor || 'Explore this course'}
                    </Text>
                </View>

                <View style={styles.actionIcon}>
                    <Text style={{ fontSize: scale(18), color: theme.textTertiary }}>›</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Courses</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Courses')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={courses.slice(0, 5)}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: scale(20),
        marginBottom: scale(10),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(12),
        paddingHorizontal: scale(4),
    },
    sectionTitle: {
        fontSize: scale(17),
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    seeAllText: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    listContent: {
        gap: scale(2),
    },
    courseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(10),
        borderRadius: scale(14),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        marginBottom: scale(8),
    },
    iconContainer: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    courseIcon: {
        width: scale(24),
        height: scale(24),
        borderRadius: scale(6),
    },
    courseEmoji: {
        fontSize: scale(20),
    },
    courseInfo: {
        flex: 1,
        marginLeft: scale(12),
        justifyContent: 'center',
    },
    courseTitle: {
        fontSize: scale(14),
        fontWeight: '600',
        marginBottom: scale(2),
        letterSpacing: -0.2,
    },
    courseSubtitle: {
        fontSize: scale(12),
        opacity: 0.7,
    },
    actionIcon: {
        paddingHorizontal: scale(8),
    },
    separator: {
        height: 0,
    },
});
