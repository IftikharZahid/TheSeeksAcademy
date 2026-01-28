import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

export const LikedVideosScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [likedVideos, setLikedVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'favorites'),
            orderBy('likedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLikedVideos(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Helper to parse duration string to seconds
    const parseDuration = (durationStr: string): number => {
        if (!durationStr) return 0;
        try {
            // Handle "1h 20m 30s" or "10:30" or "1:05:20"
            let totalSeconds = 0;

            if (durationStr.includes(':')) {
                const parts = durationStr.split(':').map(Number);
                if (parts.length === 3) {
                    totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 2) {
                    totalSeconds = parts[0] * 60 + parts[1];
                }
            } else {
                // Approximate parsing for "1h 20m" format if used
                const hoursMatch = durationStr.match(/(\d+)h/);
                const minsMatch = durationStr.match(/(\d+)m/);
                const secsMatch = durationStr.match(/(\d+)s/);

                if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
                if (minsMatch) totalSeconds += parseInt(minsMatch[1]) * 60;
                if (secsMatch) totalSeconds += parseInt(secsMatch[1]);
            }
            return totalSeconds;
        } catch (e) {
            return 0;
        }
    };

    // Calculate total duration
    const totalDuration = React.useMemo(() => {
        const totalSecs = likedVideos.reduce((acc, video) => acc + parseDuration(video.duration), 0);

        if (totalSecs === 0) return '';

        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        // const seconds = totalSecs % 60; // Show only H and M for cleaner look

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }, [likedVideos]);

    const handleVideoPress = async (video: any) => {
        try {
            if (!video.galleryId) return;
            const galleryDoc = await getDoc(doc(db, 'videoGalleries', video.galleryId));
            if (galleryDoc.exists()) {
                const galleryData = galleryDoc.data();
                navigation.navigate('VideoLecturesScreen', {
                    galleryId: video.galleryId,
                    galleryName: galleryData.name,
                    galleryColor: '#6366f1', // Default
                    videos: galleryData.videos,
                    initialVideoId: video.id
                });
            }
        } catch (e) {
            console.error("Error navigating to video", e);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.videoItem, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleVideoPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.thumbnailContainer}>
                <Image
                    source={{ uri: item.thumbnail || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={32} color="#fff" />
                </View>
                {item.progress > 0 && (
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(item.progress * 100, 100)}%` }]} />
                    </View>
                )}
            </View>

            <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.title}
                </Text>

                <View style={styles.metaInfo}>
                    <View style={[styles.galleryBadge, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                        <Ionicons name="videocam" size={12} color={theme.textSecondary} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                            {item.galleryName}
                        </Text>
                    </View>

                    {item.duration && (
                        <Text style={[styles.durationText, { color: theme.textTertiary }]}>
                            {item.duration}
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[styles.header, { backgroundColor: theme.card }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Liked Videos</Text>
                <TouchableOpacity
                    style={[styles.headerIconButton, { backgroundColor: theme.card }]}
                    activeOpacity={1}
                >
                    <Ionicons name="heart" size={scale(22)} color={theme.primary} />
                    {likedVideos.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {likedVideos.length > 99 ? '99+' : likedVideos.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={likedVideos}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="heart-outline" size={64} color={theme.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No liked videos yet
                            </Text>
                            <TouchableOpacity
                                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                                onPress={() => navigation.navigate('VideoGallery')}
                            >
                                <Text style={styles.browseButtonText}>Browse Videos</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    likedVideos.length > 0 && totalDuration ? (
                        <View style={[styles.footerContainer, { borderTopColor: theme.border }]}>
                            <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Total Watch Time</Text>
                            <View style={[styles.footerBadge, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                                <Ionicons name="time" size={16} color={theme.primary} />
                                <Text style={[styles.footerValue, { color: theme.text }]}>{totalDuration}</Text>
                            </View>
                        </View>
                    ) : null
                }
            />
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 10,
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
    listContent: {
        padding: scale(16),
        paddingBottom: scale(40),
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(12),
        borderRadius: scale(12),
        borderWidth: 1,
        padding: scale(10),
        overflow: 'hidden',
    },
    thumbnailContainer: {
        width: scale(100),
        height: scale(64),
        borderRadius: scale(8),
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#eee',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FF0000',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoInfo: {
        flex: 1,
        marginLeft: scale(12),
        justifyContent: 'center',
    },
    videoTitle: {
        fontSize: scale(14),
        fontWeight: '600',
        marginBottom: scale(6),
        lineHeight: scale(18),
    },
    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    galleryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(4),
    },
    metaText: {
        fontSize: scale(10),
        marginLeft: scale(4),
        fontWeight: '500',
    },
    durationText: {
        fontSize: scale(11),
    },
    arrowContainer: {
        paddingLeft: scale(8),
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: scale(60),
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
    footerContainer: {
        marginTop: scale(20),
        paddingTop: scale(20),
        borderTopWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(20),
    },
    footerLabel: {
        fontSize: scale(13),
        marginBottom: scale(8),
        fontWeight: '500',
    },
    footerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
        borderRadius: scale(20),
        gap: scale(6),
    },
    footerValue: {
        fontSize: scale(16),
        fontWeight: '700',
    },
});
