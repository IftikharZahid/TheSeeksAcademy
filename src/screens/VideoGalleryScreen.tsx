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
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../store/hooks';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

// Color palette for galleries
const GALLERY_COLORS = [
    { color: '#6366f1', gradientColors: ['#6366f1', '#8b5cf6'] },
    { color: '#0ea5e9', gradientColors: ['#0ea5e9', '#38bdf8'] },
    { color: '#10b981', gradientColors: ['#10b981', '#34d399'] },
    { color: '#ec4899', gradientColors: ['#ec4899', '#f472b6'] },
    { color: '#f59e0b', gradientColors: ['#f59e0b', '#fbbf24'] },
    { color: '#8b5cf6', gradientColors: ['#8b5cf6', '#a78bfa'] },
    { color: '#14b8a6', gradientColors: ['#14b8a6', '#2dd4bf'] },
    { color: '#ef4444', gradientColors: ['#ef4444', '#f87171'] },
];

interface Video {
    id: string;
    title: string;
    youtubeUrl: string;
    duration?: string;
    chapterNo?: string;
}

interface Gallery {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    videos: Video[];
}

interface GalleryCardProps {
    gallery: Gallery;
    index: number;
    onPress: () => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ gallery, index, onPress }) => {
    const { theme, isDark } = useTheme();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const colorScheme = GALLERY_COLORS[index % GALLERY_COLORS.length];

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

    const videoCount = gallery.videos?.length || 0;

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
                    styles.galleryCard,
                    {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#fff',
                        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(229, 231, 235, 0.8)',
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Thumbnail or Default Video Icon */}
                {gallery.thumbnail && gallery.thumbnail.trim() !== '' && !gallery.thumbnail.includes('placeholder') ? (
                    <Image
                        source={{ uri: gallery.thumbnail }}
                        style={styles.thumbnailImage}
                    />
                ) : (
                    <LinearGradient
                        colors={colorScheme.gradientColors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="videocam" size={22} color="#fff" />
                    </LinearGradient>
                )}

                {/* Gallery Info */}
                <Text style={[styles.galleryName, { color: theme.text }]} numberOfLines={1}>
                    {gallery.name}
                </Text>
                <Text style={[styles.galleryDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                    {gallery.description || 'Video collection'}
                </Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="play-circle" size={12} color={colorScheme.color} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                            {videoCount} {videoCount === 1 ? 'video' : 'videos'}
                        </Text>
                    </View>
                </View>

                {/* Arrow */}
                <View style={[styles.arrowContainer, { backgroundColor: `${colorScheme.color}15` }]}>
                    <Ionicons name="chevron-forward" size={14} color={colorScheme.color} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const VideoGalleryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const headerAnim = useRef(new Animated.Value(0)).current;

    // ── Use Redux store (single source of truth) ──
    const reduxGalleries = useAppSelector(state => state.videos.galleries);
    const loading = useAppSelector(state => state.videos.isLoading);

    // Map Redux galleries to the local Gallery type
    const galleries: Gallery[] = reduxGalleries.map(g => ({
        id: g.id,
        name: g.name || '',
        description: g.description || '',
        thumbnail: g.thumbnail || '',
        videos: g.videos || [],
    }));

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const totalVideos = galleries.reduce((acc, g) => acc + (g.videos?.length || 0), 0);

    const handleGalleryPress = (gallery: Gallery, index: number) => {
        const colorScheme = GALLERY_COLORS[index % GALLERY_COLORS.length];
        // Navigate to Home tab first, then to VideoLecturesScreen within HomeStack
        navigation.navigate('Home', {
            screen: 'VideoLecturesScreen',
            params: {
                galleryId: gallery.id,
                galleryName: gallery.name,
                galleryColor: colorScheme.color,
                videos: gallery.videos,
            },
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Compact Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: headerAnim,
                    }
                ]}
            >
                <View style={styles.headerIcon}>
                    <Ionicons name="videocam" size={24} color={theme.primary} />
                </View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Video Gallery</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {totalVideos} videos available
                    </Text>
                </View>
            </Animated.View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
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
                                    Access {galleries.length} galleries with {totalVideos}+ video lectures
                                </Text>
                            </View>
                            <View style={styles.bannerDecoration} />
                        </LinearGradient>
                    </View>

                    {/* Section Title */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>All Galleries</Text>
                        <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                            {galleries.length} galleries
                        </Text>
                    </View>

                    {/* Gallery Grid */}
                    {galleries.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="videocam-outline" size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No video galleries available yet
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {galleries.map((gallery, index) => (
                                <GalleryCard
                                    key={gallery.id}
                                    gallery={gallery}
                                    index={index}
                                    onPress={() => handleGalleryPress(gallery, index)}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
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
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
    placeholderButton: {
        width: 36,
        height: 36,
    },
    loadingContainer: {
        flex: 1,
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
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
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
    galleryCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    thumbnailImage: {
        width: 42,
        height: 42,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#e5e5e5',
    },
    iconGradient: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    galleryName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    galleryDescription: {
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
