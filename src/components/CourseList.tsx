import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAppSelector } from '../store/hooks';
import { Ionicons } from '@expo/vector-icons';

const categoryColors = [
    ['#6366f1', '#818cf8'], // Indigo
    ['#ec4899', '#f472b6'], // Pink
    ['#14b8a6', '#2dd4bf'], // Teal
    ['#f59e0b', '#fbbf24'], // Amber
];

const CourseListSkeleton: React.FC<{ theme: any; isDark: boolean }> = ({ theme, isDark }) => {
    const skeletonColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ width: scale(120), height: scale(15), backgroundColor: skeletonColor, borderRadius: scale(4) }} />
                <View style={{ width: scale(50), height: scale(13), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
            </View>
            <View style={styles.listContent}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.courseItem, { backgroundColor: theme.card, borderColor: theme.border, elevation: 0, shadowOpacity: 0 }]}>
                        <View style={[styles.iconContainer, { backgroundColor: skeletonColor }]} />
                        <View style={styles.courseInfo}>
                            <View style={{ width: '70%', height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3), marginBottom: scale(6) }} />
                            <View style={{ width: '40%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                        </View>
                        <View style={{ width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: skeletonColor }} />
                    </View>
                ))}
            </View>
        </View>
    );
};

export const CourseList: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const netInfo = useNetInfo();

    // Fetch popular courses directly from Redux, and filter by target class
    const globalGalleries = useAppSelector((state) => state.videos.galleries);
    const videoProgressData = useAppSelector((state) => state.videos.videoProgress);
    const userProfile = useAppSelector((state) => state.auth.profile);
    const loading = useAppSelector((state) => state.videos.isLoading);

    const isTeacher = ['teacher', 'hod', 'principal', 'vice principal', 'senior teacher', 'assistant teacher']
        .some(r => (userProfile?.role || '').toLowerCase().includes(r));

    const galleries = Array.isArray(globalGalleries) 
        ? globalGalleries.filter((g: any) => {
            if (isTeacher) return true;
            if (g.targetClass && g.targetClass.trim() !== '' && g.targetClass.trim().toLowerCase() !== 'all classes') {
                if (userProfile?.class) {
                    return g.targetClass.trim().toLowerCase() === userProfile.class.trim().toLowerCase();
                }
                return false;
            }
            return true;
        }).slice(0, 10) 
        : [];

    const handleCoursePress = (gallery: any) => {
        navigation.navigate('VideoLecturesScreen', {
            galleryId: gallery.id,
            galleryName: gallery.name,
            galleryColor: categoryColors[0][0], // Pass a color or handle in screen
            videos: gallery.videos || []
        });
    };

    const renderCourseItem = ({ item, index }: { item: any; index: number }) => {
        const videoCount = item.videos ? item.videos.length : 0;
        
        // Calculate actual progress based on watched videos count
        let watchedVideosCount = 0;
        if (item.videos && videoCount > 0) {
            item.videos.forEach((video: any) => {
                const progressInSeconds = videoProgressData[video.id] || 0;
                // Consider a video "watched" if there's any progress
                if (progressInSeconds > 0) {
                    watchedVideosCount += 1;
                }
            });
        }
        
        const progressPercentage = videoCount > 0 ? Math.floor((watchedVideosCount / videoCount) * 100) : 0;
        const fakeChapters = Math.max(1, Math.floor(videoCount / 6));
        
        // Circular progress SVG setup
        const size = scale(32);
        const strokeWidth = scale(2.5);
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

        return (
            <TouchableOpacity
                style={[styles.courseItem, { backgroundColor: theme.card }]}
                onPress={() => handleCoursePress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
                    <Ionicons name="calculator" size={20} color="#fff" />
                </View>

                <View style={styles.courseInfo}>
                    <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.courseSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                            {fakeChapters} Chapters <Text style={{color: theme.textTertiary || '#cbd5e1'}}>•</Text> {videoCount} Lectures
                        </Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    {/* SVG Circular Progress */}
                    <View style={styles.svgWrapper}>
                        <View style={[styles.circleBg, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth }]} />
                        <View style={[styles.circleProgress, { 
                            width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth,
                            borderTopColor: '#10b981', borderRightColor: progressPercentage > 25 ? '#10b981' : 'transparent',
                            borderBottomColor: progressPercentage > 50 ? '#10b981' : 'transparent',
                            borderLeftColor: progressPercentage > 75 ? '#10b981' : 'transparent',
                            transform: [{ rotate: '-45deg' }]
                        }]} />
                        <View style={styles.progressTextContainer}>
                            <Text style={styles.progressText}>{progressPercentage}%</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const isOffline = netInfo.isConnected === false;
    const isLoading = loading && galleries.length === 0;

    if (isLoading) {
        return <CourseListSkeleton theme={theme} isDark={isDark} />;
    }

    if (isOffline && galleries.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Courses</Text>
                </View>
                <View style={[styles.errorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.errorIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                        <Ionicons name="cloud-offline-outline" size={20} color="#ef4444" />
                    </View>
                    <View style={styles.errorContent}>
                        <Text style={[styles.errorTitle, { color: theme.text }]}>Connection Lost</Text>
                        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                            Connect to the internet to load popular courses.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    if (galleries.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Courses</Text>
                    {isOffline && (
                        <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                            <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" style={{ marginRight: scale(3) }} />
                            <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('VideoGallery')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.listContent}>
                {galleries.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {renderCourseItem({ item, index })}
                        {index < galleries.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: scale(10),
        marginBottom: scale(10),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(8),
        paddingHorizontal: scale(4),
    },
    sectionTitle: {
        fontSize: scale(15),
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
        borderRadius: scale(12),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        marginBottom: scale(6),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseInfo: {
        flex: 1,
        marginLeft: scale(12),
        justifyContent: 'center',
    },
    courseTitle: {
        fontSize: scale(14),
        fontWeight: '800',
        marginBottom: scale(2),
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    courseSubtitle: {
        fontSize: scale(10),
        color: '#64748b',
        fontWeight: '500',
    },
    progressContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: scale(6),
    },
    svgWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleBg: {
        position: 'absolute',
        borderColor: '#f1f5f9',
    },
    circleProgress: {
        position: 'absolute',
    },
    progressTextContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: scale(32),
        height: scale(32),
    },
    progressText: {
        fontSize: scale(9),
        fontWeight: '800',
        color: '#10b981',
    },
    separator: {
        height: 0,
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(6),
    },
    offlineBadgeText: {
        fontSize: scale(9),
        fontWeight: '700',
    },
    errorCard: {
        padding: scale(12),
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        marginTop: scale(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    errorIconContainer: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
    },
    errorContent: {
        flex: 1,
    },
    errorTitle: {
        fontSize: scale(13),
        fontWeight: '600',
        marginBottom: scale(2),
    },
    errorText: {
        fontSize: scale(11),
        lineHeight: scale(15),
    },
});
