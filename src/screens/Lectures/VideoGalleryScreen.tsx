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
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store/hooks';
import { scale } from '../../utils/responsive';

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
    targetClass?: string;
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
    const userProfile = useAppSelector(state => state.auth.profile);

    // Map Redux galleries to the local Gallery type and filter based on user's class
    const isTeacher = ['teacher', 'hod', 'principal', 'vice principal', 'senior teacher', 'assistant teacher']
        .some(r => (userProfile?.role || '').toLowerCase().includes(r));

    const galleries: Gallery[] = reduxGalleries
        .filter((g: any) => {
            // Teachers and Admins can see all galleries
            if (isTeacher) return true;

            // If the gallery has a specific target class assigned
            if (g.targetClass && g.targetClass.trim() !== '' && g.targetClass.trim().toLowerCase() !== 'all classes') {
                // If the student has a class, only show if it matches EXACTLY
                if (userProfile?.class) {
                    return g.targetClass.trim().toLowerCase() === userProfile.class.trim().toLowerCase();
                }
                // If student doesn't have a class assigned, hide targeted galleries
                return false;
            }
            
            // If the gallery has NO target class, it's for everyone
            return true;
        })
        .map((g: any) => ({
            id: g.id,
            name: g.name || '',
            description: g.description || '',
            thumbnail: g.thumbnail || '',
            videos: g.videos || [],
            targetClass: g.targetClass,
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
            <StatusBar backgroundColor={theme.background} barStyle={isDark ? "light-content" : "dark-content"} />
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
        paddingHorizontal: scale(12),
        paddingVertical: scale(10),
    },
    headerIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: scale(12),
    },
    headerTitle: {
        fontSize: scale(18),
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: scale(11),
        marginTop: 1,
    },
    placeholderButton: {
        width: scale(36),
        height: scale(36),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: scale(24),
    },
    // Banner
    bannerContainer: {
        marginHorizontal: scale(12),
        marginTop: scale(12),
    },
    banner: {
        borderRadius: scale(16),
        padding: scale(16),
        overflow: 'hidden',
        position: 'relative',
    },
    bannerContent: {
        zIndex: 10,
    },
    bannerTitle: {
        fontSize: scale(18),
        fontWeight: '700',
        color: '#fff',
        marginBottom: scale(4),
    },
    bannerSubtitle: {
        fontSize: scale(12),
        color: 'rgba(255, 255, 255, 0.85)',
    },
    bannerDecoration: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: scale(80),
        height: scale(80),
        borderRadius: scale(40),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: scale(12),
        marginTop: scale(20),
        marginBottom: scale(12),
    },
    sectionTitle: {
        fontSize: scale(16),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionCount: {
        fontSize: scale(12),
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: scale(40),
    },
    emptyText: {
        marginTop: scale(12),
        fontSize: scale(14),
    },
    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: scale(12),
        gap: 12,
    },
    cardContainer: {
        width: CARD_WIDTH,
    },
    galleryCard: {
        padding: scale(14),
        borderRadius: scale(14),
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    thumbnailImage: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(12),
        marginBottom: scale(10),
        backgroundColor: '#e5e5e5',
    },
    iconGradient: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(10),
    },
    galleryName: {
        fontSize: scale(14),
        fontWeight: '700',
        marginBottom: 2,
    },
    galleryDescription: {
        fontSize: scale(11),
        marginBottom: scale(10),
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: scale(8),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: scale(10),
        fontWeight: '500',
    },
    arrowContainer: {
        position: 'absolute',
        top: scale(14),
        right: scale(14),
        width: scale(24),
        height: scale(24),
        borderRadius: scale(8),
        justifyContent: 'center',
        alignItems: 'center',
    },
});
