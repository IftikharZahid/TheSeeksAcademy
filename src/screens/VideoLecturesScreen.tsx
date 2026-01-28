import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../api/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface Video {
    id: string;
    title: string;
    youtubeUrl: string;
    duration?: string;
    chapterNo?: string;
}

interface VideoItem {
    id: string;
    number: number;
    title: string;
    duration: string;
    youtubeId: string;
    chapterNo: number;
}

// Helper to extract YouTube video ID from URL
const extractYoutubeId = (url: string): string => {
    if (!url) return '';
    // Handle youtu.be format
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
    // Handle youtube.com format
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (longMatch) return longMatch[1];
    // Handle embed format
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    // If it's already just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    return url;
};

// Convert Firebase videos to VideoItem format
const convertToVideoItems = (videos: Video[]): VideoItem[] => {
    return videos.map((video, index) => ({
        id: video.id,
        number: index + 1,
        title: video.title,
        duration: video.duration || '',
        youtubeId: extractYoutubeId(video.youtubeUrl),
        chapterNo: parseInt(video.chapterNo || '1') || 1,
    }));
};

type RouteParams = {
    VideoLecturesScreen: {
        galleryId?: string;
        galleryName?: string;
        galleryColor?: string;
        videos?: Video[];
        initialVideoId?: string;
    };
};

export const VideoLecturesScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RouteParams, 'VideoLecturesScreen'>>();
    const { theme, isDark } = useTheme();
    const playerRef = useRef<any>(null);

    // Get data from route params
    const galleryName = route.params?.galleryName || 'Video Lectures';
    const galleryColor = route.params?.galleryColor || '#6366f1';
    const rawVideos = route.params?.videos || [];

    // Convert videos to proper format
    const allVideos = useMemo(() => convertToVideoItems(rawVideos), [rawVideos]);
    const totalVideos = allVideos.length;

    // Group videos by chapter
    const chapters = useMemo(() => {
        const grouped: { [key: number]: VideoItem[] } = {};
        allVideos.forEach(video => {
            if (!grouped[video.chapterNo]) {
                grouped[video.chapterNo] = [];
            }
            grouped[video.chapterNo].push(video);
        });
        // Sort chapters by number
        return Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([chapterNo, videos]) => ({
                chapterNo: Number(chapterNo),
                videos,
            }));
    }, [allVideos]);

    const [isFavorite, setIsFavorite] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(allVideos[0] || null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Check if video is liked
    const checkIfLiked = useCallback(async (videoId: string) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'favorites', videoId);
            const docSnap = await getDoc(docRef);
            setIsFavorite(docSnap.exists());
        } catch (error) {
            console.error("Error checking favorite:", error);
        }
    }, []);

    // Toggle Check checking when video changes
    React.useEffect(() => {
        if (currentVideo) {
            checkIfLiked(currentVideo.id);
        }
    }, [currentVideo, checkIfLiked]);

    const handleToggleLike = async () => {
        const user = auth.currentUser;
        if (!user || !currentVideo) return;

        const videoRef = doc(db, 'users', user.uid, 'favorites', currentVideo.id);

        try {
            if (isFavorite) {
                await deleteDoc(videoRef);
                setIsFavorite(false);
            } else {
                await setDoc(videoRef, {
                    id: currentVideo.id,
                    title: currentVideo.title,
                    duration: currentVideo.duration,
                    youtubeId: currentVideo.youtubeId,
                    chapterNo: currentVideo.chapterNo,
                    galleryId: route.params.galleryId || '',
                    galleryName: route.params.galleryName || '',
                    likedAt: serverTimestamp(),
                    thumbnail: `https://img.youtube.com/vi/${currentVideo.youtubeId}/hqdefault.jpg`
                });
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    // Progress Tracking
    React.useEffect(() => {
        if (!isPlaying || !currentVideo || !isFavorite) return;

        const interval = setInterval(async () => {
            if (playerRef.current) {
                try {
                    const currentTime = await playerRef.current.getCurrentTime();
                    const duration = await playerRef.current.getDuration();

                    if (duration > 0) {
                        const progress = currentTime / duration;
                        const user = auth.currentUser;
                        if (user) {
                            const videoRef = doc(db, 'users', user.uid, 'favorites', currentVideo.id);
                            await setDoc(videoRef, {
                                progress: progress,
                                lastPosition: currentTime,
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }
                    }
                } catch (e) {
                    console.log("Error updating progress", e);
                }
            }
        }, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [isPlaying, currentVideo, isFavorite]);

    // Track expanded state for each chapter - default all expanded
    const [expandedChapters, setExpandedChapters] = useState<{ [key: number]: boolean }>(
        chapters.reduce((acc, chapter) => ({ ...acc, [chapter.chapterNo]: true }), {})
    );

    // Update state when data changes (e.g. navigating between galleries)
    // Update state when data changes (e.g. navigating between galleries)
    React.useEffect(() => {
        if (allVideos.length > 0) {
            if (route.params.initialVideoId) {
                const target = allVideos.find(v => v.id === route.params.initialVideoId);
                setCurrentVideo(target || allVideos[0]);
                // Set playing true if we jumped to a specific video
                if (target) setIsPlaying(true);
            } else {
                setCurrentVideo(allVideos[0]);
            }
        }
        setExpandedChapters(chapters.reduce((acc, chapter) => ({ ...acc, [chapter.chapterNo]: true }), {}));
    }, [allVideos, chapters, route.params.initialVideoId]);

    const toggleChapter = (chapterNo: number) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterNo]: !prev[chapterNo]
        }));
    };

    const onStateChange = useCallback((state: string) => {
        if (state === 'playing') {
            setIsPlaying(true);
        } else if (state === 'paused' || state === 'ended') {
            setIsPlaying(false);
        }
    }, []);

    const handleVideoSelect = (video: VideoItem) => {
        setCurrentVideo(video);
        setIsPlaying(true);
    };

    const gradientColors = isDark
        ? [`${galleryColor}40`, `${galleryColor}10`]
        : [`${galleryColor}20`, `${galleryColor}05`];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    backgroundColor: isDark ? theme.card : '#fff',
                    borderBottomColor: isDark ? theme.border : '#e5e7eb'
                }
            ]}>
                <TouchableOpacity
                    onPress={() => (navigation as any).navigate('VideoGallery')}
                    style={[styles.backButton, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}
                >
                    <Ionicons name="chevron-back" size={20} color={theme.text} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                        {galleryName}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {totalVideos} Videos
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={handleToggleLike}
                    style={[styles.actionButton, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={18}
                        color={isFavorite ? "#ef4444" : theme.text}
                    />
                </TouchableOpacity>
            </View>

            {/* Fixed Video Player Area */}
            <View>
                {/* Video Player */}
                {currentVideo && currentVideo.youtubeId ? (
                    <View style={styles.playerContainer}>
                        <LinearGradient
                            colors={gradientColors as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.playerGradientBorder}
                        >
                            <View style={styles.playerWrapper}>
                                <YoutubePlayer
                                    ref={playerRef}
                                    height={180}
                                    width={width - 32}
                                    play={isPlaying}
                                    videoId={currentVideo.youtubeId}
                                    onChangeState={onStateChange}
                                    initialPlayerParams={{
                                        modestbranding: true,
                                        rel: false,
                                        showClosedCaptions: false,
                                        iv_load_policy: 3,
                                        controls: true,
                                        fs: true,
                                    }}
                                    webViewProps={{
                                        androidLayerType: 'hardware',
                                        allowsInlineMediaPlayback: true,
                                        mediaPlaybackRequiresUserAction: false,
                                        injectedJavaScript: `
                                            (function() {
                                                // Hide ad overlays and banners types
                                                var style = document.createElement('style');
                                                style.innerHTML = \`
                                                    .ytp-ad-overlay-slot,
                                                    .ytp-ad-text-overlay,
                                                    .ytp-ad-image-overlay,
                                                    .ytp-paid-content-overlay,
                                                    .ytp-ad-message-container,
                                                    .video-ads .ytp-ad-display-slot,
                                                    .ytp-pause-overlay,
                                                    .ytp-suggested-action,
                                                    .iv-branding {
                                                        display: none !important;
                                                    }
                                                \`;
                                                document.head.appendChild(style);
                                                
                                                // Active Ad Skipping Logic
                                                setInterval(function() {
                                                    // 1. Click Skip Buttons
                                                    var skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
                                                    if (skipBtn) {
                                                        skipBtn.click();
                                                        return;
                                                    }
                                                    
                                                    // 2. Click Overlay Close Buttons
                                                    var closeBtn = document.querySelector('.ytp-ad-overlay-close-button');
                                                    if (closeBtn) closeBtn.click();

                                                    // 3. Fast Forward & Mute Ads
                                                    var player = document.querySelector('.html5-video-player');
                                                    var video = document.querySelector('video');
                                                    
                                                    if (player && player.classList.contains('ad-showing') && video) {
                                                        video.playbackRate = 16.0; // Speed up 16x
                                                        video.muted = true;      // Mute audio
                                                        // Try to jump to end if allowed
                                                        if (isFinite(video.duration) && video.currentTime < video.duration) {
                                                           try { video.currentTime = video.duration; } catch(e){}
                                                        }
                                                    }
                                                }, 100);
                                            })();
                                            true;
                                        `,
                                    }}

                                />
                            </View>
                        </LinearGradient>
                    </View>
                ) : (
                    <View style={[styles.noVideoContainer, { backgroundColor: isDark ? theme.card : '#f3f4f6' }]}>
                        <Ionicons name="videocam-off" size={48} color={theme.textSecondary} />
                        <Text style={[styles.noVideoText, { color: theme.textSecondary }]}>
                            No videos available
                        </Text>
                    </View>
                )}

                {/* Current Video Info */}
                {currentVideo && (
                    <View style={styles.currentVideoInfo}>
                        <Text style={[styles.currentVideoTitle, { color: theme.text }]} numberOfLines={2}>
                            {currentVideo.title}
                        </Text>
                        <View style={styles.videoMeta}>
                            <View style={[styles.metaBadge, { backgroundColor: `${galleryColor}15` }]}>
                                <Ionicons name="videocam" size={12} color={galleryColor} />
                                <Text style={[styles.metaText, { color: galleryColor }]}>{galleryName}</Text>
                            </View>
                            <View style={[styles.metaBadge, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6', marginLeft: 8 }]}>
                                <Ionicons name="bookmark" size={12} color={theme.textSecondary} />
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>Chapter {currentVideo.chapterNo}</Text>
                            </View>
                            {currentVideo.duration && (
                                <Text style={[styles.videoDuration, { color: theme.textSecondary, marginLeft: 10 }]}>
                                    {currentVideo.duration}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >



                {/* Chapters List */}
                {chapters.map((chapter) => (
                    <View key={chapter.chapterNo} style={styles.chapterSection}>
                        {/* Chapter Header - Collapsible */}
                        <TouchableOpacity
                            style={[
                                styles.chapterHeader,
                                {
                                    backgroundColor: isDark ? theme.card : '#fff',
                                    borderColor: isDark ? theme.border : '#e5e7eb',
                                }
                            ]}
                            onPress={() => toggleChapter(chapter.chapterNo)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.chapterIcon, { backgroundColor: `${galleryColor}15` }]}>
                                <Ionicons name="book" size={18} color={galleryColor} />
                            </View>
                            <View style={styles.chapterInfo}>
                                <Text style={[styles.chapterTitle, { color: theme.text }]}>
                                    Chapter {chapter.chapterNo}
                                </Text>
                                <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>
                                    {chapter.videos.length} {chapter.videos.length === 1 ? 'video' : 'videos'}
                                </Text>
                            </View>
                            <View style={[styles.expandIcon, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                                <Ionicons
                                    name={expandedChapters[chapter.chapterNo] ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={theme.textSecondary}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Collapsible Video List */}
                        {expandedChapters[chapter.chapterNo] && (
                            <View style={styles.videoListContainer}>
                                <View style={styles.videoList}>
                                    {chapter.videos.map((video, index) => (
                                        <TouchableOpacity
                                            key={video.id}
                                            style={[
                                                styles.videoItem,
                                                {
                                                    backgroundColor: video.id === currentVideo?.id
                                                        ? `${galleryColor}10`
                                                        : isDark ? theme.card : '#fff',
                                                    borderColor: video.id === currentVideo?.id
                                                        ? `${galleryColor}40`
                                                        : isDark ? theme.border : '#f3f4f6',
                                                }
                                            ]}
                                            onPress={() => handleVideoSelect(video)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.videoNumber,
                                                { backgroundColor: video.id === currentVideo?.id ? galleryColor : isDark ? theme.backgroundSecondary : '#f3f4f6' }
                                            ]}>
                                                <Text style={[
                                                    styles.videoNumberText,
                                                    { color: video.id === currentVideo?.id ? '#fff' : theme.textSecondary }
                                                ]}>
                                                    {index + 1}
                                                </Text>
                                            </View>
                                            <View style={styles.videoInfo}>
                                                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={1}>
                                                    {video.title}
                                                </Text>
                                                {video.duration && (
                                                    <View style={[styles.durationBadge, { backgroundColor: isDark ? theme.backgroundSecondary : '#f3f4f6' }]}>
                                                        <Ionicons name="time-outline" size={10} color={theme.textSecondary} />
                                                        <Text style={[styles.durationText, { color: theme.textSecondary }]}>
                                                            {video.duration}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={[styles.playBadge, { backgroundColor: `${galleryColor}15` }]}>
                                                <Ionicons
                                                    name={video.id === currentVideo?.id && isPlaying ? "pause" : "play"}
                                                    size={12}
                                                    color={galleryColor}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                ))}

                {allVideos.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="film-outline" size={40} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No videos in this gallery yet
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
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
        borderBottomWidth: 0.5,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 20,
        paddingTop: 10,
    },
    playerContainer: {
        width: width - 24,
        alignSelf: 'center',
        marginBottom: 16,
    },
    playerGradientBorder: {
        padding: 2,
        borderRadius: 14,
    },
    playerWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    noVideoContainer: {
        width: width - 32,
        height: 200,
        borderRadius: 16,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    noVideoText: {
        marginTop: 10,
        fontWeight: '500',
    },
    currentVideoInfo: {
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    currentVideoTitle: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 24,
        marginBottom: 8,
    },
    videoMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '600',
    },
    videoDuration: {
        fontSize: 12,
    },

    // Chapter Section
    chapterSection: {
        paddingHorizontal: 12,
        marginTop: 16,
    },
    chapterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    chapterIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chapterInfo: {
        flex: 1,
        marginLeft: 10,
    },
    chapterTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    chapterMeta: {
        fontSize: 11,
        marginTop: 2,
    },
    expandIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoListContainer: {
        marginTop: 8,
        marginLeft: 20,
        borderLeftWidth: 2,
        borderLeftColor: '#e5e7eb',
        paddingLeft: 12,
    },
    videoList: {
        gap: 8,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    videoNumber: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoNumberText: {
        fontSize: 12,
        fontWeight: '700',
    },
    videoInfo: {
        flex: 1,
        marginLeft: 10,
    },
    videoTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    videoItemDuration: {
        fontSize: 12,
        marginTop: 2,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        gap: 4,
    },
    durationText: {
        fontSize: 10,
        fontWeight: '500',
    },
    playBadge: {
        width: 32,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
        marginTop: 20,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 14,
    },
});
