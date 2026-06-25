import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAppSelector } from '../store/hooks';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.45;

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
                    <View key={i} style={[styles.courseCard, { backgroundColor: theme.card, borderColor: theme.border, elevation: 0, shadowOpacity: 0 }]}>
                        <View style={{ width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: skeletonColor, marginBottom: scale(12) }} />
                        <View style={{ width: '80%', height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3), marginBottom: scale(6) }} />
                        <View style={{ width: '60%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginBottom: scale(4) }} />
                        <View style={{ width: '50%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginBottom: scale(12) }} />
                        <View style={{ width: '100%', height: scale(4), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                    </View>
                ))}
            </View>
        </View>
    );
};

// Helper to get an icon based on subject name
const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('math')) return { name: 'calculator', color: '#10b981', bgColor: '#ecfdf5', type: 'Ionicons' };
    if (lower.includes('computer') || lower.includes('cs') || lower.includes('programming')) return { name: 'code-slash', color: '#3b82f6', bgColor: '#eff6ff', type: 'Ionicons' };
    if (lower.includes('physics')) return { name: 'atom', color: '#8b5cf6', bgColor: '#f5f3ff', type: 'FontAwesome5' };
    if (lower.includes('chemistry')) return { name: 'flask', color: '#ec4899', bgColor: '#fdf2f8', type: 'Ionicons' };
    if (lower.includes('english')) return { name: 'book-open', color: '#f59e0b', bgColor: '#fffbeb', type: 'FontAwesome5' };
    if (lower.includes('urdu')) return { name: 'language', color: '#14b8a6', bgColor: '#f0fdfa', type: 'Ionicons' };
    if (lower.includes('islamic') || lower.includes('quran')) return { name: 'book', color: '#0ea5e9', bgColor: '#f0f9ff', type: 'Ionicons' };
    return { name: 'library', color: '#6366f1', bgColor: '#eef2ff', type: 'Ionicons' };
};

export const CourseList: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const netInfo = useNetInfo();

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
            galleryColor: '#3b82f6',
            videos: gallery.videos || []
        });
    };

    const renderCourseItem = ({ item }: { item: any }) => {
        const videoCount = item.videos ? item.videos.length : 0;
        
        let watchedVideosCount = 0;
        if (item.videos && videoCount > 0) {
            item.videos.forEach((video: any) => {
                const progressInSeconds = videoProgressData[video.id] || 0;
                if (progressInSeconds > 0) {
                    watchedVideosCount += 1;
                }
            });
        }
        
        const progressPercentage = videoCount > 0 ? Math.floor((watchedVideosCount / videoCount) * 100) : 0;
        
        // Mock fallback data for design
        const className = item.targetClass || userProfile?.class || '1st Year';
        const section = 'Section A'; // Mock
        const teacherName = item.teacherName || 'Subject Teacher'; // Mock fallback
        
        const iconConfig = getSubjectIcon(item.name);

        return (
            <TouchableOpacity
                style={[styles.courseCard, { backgroundColor: theme.card }]}
                onPress={() => handleCoursePress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.cardIconContainer, { backgroundColor: isDark ? iconConfig.color + '20' : iconConfig.bgColor }]}>
                    {iconConfig.type === 'FontAwesome5' ? (
                        <FontAwesome5 name={iconConfig.name as any} size={22} color={iconConfig.color} />
                    ) : (
                        <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
                    )}
                </View>

                <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                        {className} • {section}
                    </Text>
                    <Text style={[styles.teacherName, { color: theme.textTertiary }]} numberOfLines={1}>
                        {teacherName}
                    </Text>
                </View>

                <View style={styles.progressRow}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: iconConfig.color }]} />
                    </View>
                    <Text style={[styles.progressText, { color: iconConfig.color }]}>{progressPercentage}%</Text>
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
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>My Classes</Text>
                </View>
                <View style={[styles.errorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.errorIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                        <Ionicons name="cloud-offline-outline" size={20} color="#ef4444" />
                    </View>
                    <View style={styles.errorContent}>
                        <Text style={[styles.errorTitle, { color: theme.text }]}>Connection Lost</Text>
                        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                            Connect to the internet to load your classes.
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
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>My Classes</Text>
                    {isOffline && (
                        <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                            <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" style={{ marginRight: scale(3) }} />
                            <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('VideoGallery')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={galleries}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: scale(12) }} />}
                snapToInterval={cardWidth + scale(12)}
                decelerationRate="fast"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: scale(14),
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
        fontSize: scale(15),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    seeAllText: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    listContent: {
        paddingRight: scale(16),
        paddingBottom: scale(8),
    },
    courseCard: {
        width: cardWidth,
        padding: scale(12),
        borderRadius: scale(14),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 3,
    },
    cardIconContainer: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(14),
    },
    cardInfo: {
        marginBottom: scale(12),
    },
    cardTitle: {
        fontSize: scale(13),
        fontWeight: '800',
        marginBottom: scale(4),
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: scale(9.5),
        fontWeight: '500',
        marginBottom: scale(2),
    },
    teacherName: {
        fontSize: scale(9.5),
        fontWeight: '500',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    progressBarBg: {
        flex: 1,
        height: scale(4),
        backgroundColor: '#f1f5f9',
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: scale(2),
    },
    progressText: {
        fontSize: scale(9),
        fontWeight: '700',
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
