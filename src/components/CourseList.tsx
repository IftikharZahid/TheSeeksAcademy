import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../store/hooks';
import { Ionicons } from '@expo/vector-icons';

const categoryColors = [
    ['#6366f1', '#818cf8'], // Indigo
    ['#ec4899', '#f472b6'], // Pink
    ['#14b8a6', '#2dd4bf'], // Teal
    ['#f59e0b', '#fbbf24'], // Amber
];

export const CourseList: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    // Fetch popular courses directly from Redux, taking the first 10
    const globalGalleries = useAppSelector((state) => state.videos.galleries);
    const galleries = Array.isArray(globalGalleries) ? globalGalleries.slice(0, 10) : [];
    const loading = useAppSelector((state) => state.videos.isLoading);

    const handleCoursePress = (gallery: any) => {
        navigation.navigate('VideoLecturesScreen', {
            galleryId: gallery.id,
            galleryName: gallery.name,
            galleryColor: categoryColors[0][0], // Pass a color or handle in screen
            videos: gallery.videos || []
        });
    };

    const renderCourseItem = ({ item, index }: { item: any; index: number }) => {
        const colors = categoryColors[index % categoryColors.length];
        const videoCount = item.videos ? item.videos.length : 0;

        return (
            <TouchableOpacity
                style={[
                    styles.courseItem,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        shadowColor: theme.shadow,
                    }
                ]}
                onPress={() => handleCoursePress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}>
                    {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.courseIcon} resizeMode="cover" />
                    ) : (
                        <LinearGradient
                            colors={colors as [string, string]}
                            style={styles.placeholderIcon}
                        >
                            <Ionicons name="videocam" size={20} color="#fff" />
                        </LinearGradient>
                    )}
                </View>

                <View style={styles.courseInfo}>
                    <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="play-circle-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.courseSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                            {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}
                    onPress={() => handleCoursePress(item)}
                >
                    <Ionicons name="play" size={16} color={theme.primary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading || galleries.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Courses</Text>
                <TouchableOpacity onPress={() => navigation.navigate('VideoGallery')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={galleries}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.id}
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
        padding: scale(12),
        borderRadius: scale(16),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        marginBottom: scale(10),
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    iconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    placeholderIcon: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseIcon: {
        width: '100%',
        height: '100%',
    },
    courseInfo: {
        flex: 1,
        marginLeft: scale(12),
        justifyContent: 'center',
    },
    courseTitle: {
        fontSize: scale(14),
        fontWeight: '700',
        marginBottom: scale(4),
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    courseSubtitle: {
        fontSize: scale(12),
        fontWeight: '500',
    },
    playButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: scale(8),
    },
    separator: {
        height: 0,
    },
});
