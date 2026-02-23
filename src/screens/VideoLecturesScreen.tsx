import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../api/firebaseConfig';
import { useNetInfo } from '@react-native-community/netinfo';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppSelector } from '../store/hooks';

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
// Convert Firebase videos to VideoItem format with deduplication and validation
const convertToVideoItems = (videos: Video[]): VideoItem[] => {
    const seenIds = new Set<string>();

    return videos
        .map((video) => {
            const yId = extractYoutubeId(video.youtubeUrl);
            if (!yId) return null; // Skip invalid URLs

            // Deduplicate based on YouTube ID
            if (seenIds.has(yId)) return null;
            seenIds.add(yId);

            return {
                id: video.id,
                title: video.title,
                duration: video.duration || '',
                youtubeId: yId,
                chapterNo: parseInt(video.chapterNo || '1') || 1,
                // Temp number, will re-index below
                number: 0
            };
        })
        .filter((item): item is Omit<VideoItem, 'number'> & { number: number } => item !== null)
        .map((item, index) => ({
            ...item,
            number: index + 1
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
    const netInfo = useNetInfo();

    // Get data from route params
    const galleryName = route.params?.galleryName || 'Video Lectures';
    const galleryColor = route.params?.galleryColor || '#6366f1';

    // State for videos (initially from params, updated on refresh)
    const [videos, setVideos] = useState<Video[]>(route.params?.videos || []);
    const [refreshing, setRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    // Sync state with params when they change (e.g. navigating from another gallery)
    React.useEffect(() => {
        if (route.params?.videos && route.params.videos.length > 0) {
            setVideos(route.params.videos);
        }
    }, [route.params?.videos]);

    // ── Fallback: Fetch from Firestore if videos param is empty ──
    React.useEffect(() => {
        const hasVideos = route.params?.videos && route.params.videos.length > 0;
        const galleryId = route.params?.galleryId;
        if (!hasVideos && galleryId) {
            setInitialLoading(true);
            (async () => {
                try {
                    const galleryDoc = await getDoc(doc(db, 'videoGalleries', galleryId));
                    if (galleryDoc.exists()) {
                        const data = galleryDoc.data();
                        if (data.videos && data.videos.length > 0) {
                            setVideos(data.videos);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching gallery videos:", error);
                } finally {
                    setInitialLoading(false);
                }
            })();
        }
    }, [route.params?.galleryId, route.params?.videos]);

    // Convert videos to proper format
    const allVideos = useMemo(() => convertToVideoItems(videos), [videos]);
    const totalVideos = allVideos.length;

    // Refresh Logic
    const onRefresh = useCallback(async () => {
        if (!route.params?.galleryId) return;
        setRefreshing(true);
        try {
            const galleryDoc = await getDoc(doc(db, 'videoGalleries', route.params.galleryId));
            if (galleryDoc.exists()) {
                const data = galleryDoc.data();
                if (data.videos) {
                    setVideos(data.videos);
                }
            }
        } catch (error) {
            console.error("Error refreshing videos:", error);
        } finally {
            setRefreshing(false);
        }
    }, [route.params?.galleryId]);

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

    const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(allVideos[0] || null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [savedPosition, setSavedPosition] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);

    // Derive isFavorite from Redux liked videos (instant, no Firestore read needed)
    const likedVideos = useAppSelector((state) => state.videos.likedVideos);
    const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(null);

    const isFavorite = optimisticFavorite !== null
        ? optimisticFavorite
        : currentVideo ? likedVideos.some((v: any) => v.id === currentVideo.id) : false;

    // Reset optimistic override when Redux state catches up
    React.useEffect(() => {
        setOptimisticFavorite(null);
    }, [likedVideos]);

    // Check watch history for resume
    const checkWatchHistory = useCallback(async (videoId: string) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'watch_history', videoId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.lastPosition) {
                    setSavedPosition(data.lastPosition);
                    setVideoProgress(data.progress || 0);
                }
            } else {
                setSavedPosition(0);
                setVideoProgress(0);
            }
        } catch (error) {
            console.error("Error checking history:", error);
        }
    }, []);

    // Check watch history when video changes
    React.useEffect(() => {
        if (currentVideo) {
            checkWatchHistory(currentVideo.id);
            setVideoError(null);
            setOptimisticFavorite(null); // Reset optimistic state for new video
        }
    }, [currentVideo, checkWatchHistory]);

    // Optimistic like toggle — instant UI, background Firestore write
    const handleToggleLike = useCallback(() => {
        const user = auth.currentUser;
        if (!user || !currentVideo) return;

        const newFavorite = !isFavorite;
        // Instant UI update
        setOptimisticFavorite(newFavorite);

        const videoRef = doc(db, 'users', user.uid, 'favorites', currentVideo.id);

        // Fire-and-forget Firestore write, revert on error
        (async () => {
            try {
                if (!newFavorite) {
                    await deleteDoc(videoRef);
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
                }
            } catch (error) {
                console.error("Error toggling favorite:", error);
                // Revert on failure
                setOptimisticFavorite(!newFavorite);
            }
        })();
    }, [currentVideo, isFavorite, route.params.galleryId, route.params.galleryName]);

    // Progress Tracking
    React.useEffect(() => {
        if (!isPlaying || !currentVideo) return;

        const interval = setInterval(async () => {
            if (playerRef.current) {
                try {
                    const currentTime = await playerRef.current.getCurrentTime();
                    const duration = await playerRef.current.getDuration();

                    if (duration > 0) {
                        const progress = currentTime / duration;
                        setVideoProgress(progress);

                        const user = auth.currentUser;
                        if (user) {
                            // Save to watch_history locally and DB
                            const historyRef = doc(db, 'users', user.uid, 'watch_history', currentVideo.id);
                            await setDoc(historyRef, {
                                id: currentVideo.id,
                                youtubeId: currentVideo.youtubeId,
                                progress: progress,
                                lastPosition: currentTime,
                                galleryId: route.params.galleryId || '',
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }
                    }
                } catch (e) {
                    console.log("Error updating progress", e);
                }
            }
        }, 5000); // Update every 5 seconds for better resume accuracy

        return () => clearInterval(interval);
    }, [isPlaying, currentVideo, route.params.galleryId]);

    const onPlayerReady = useCallback(() => {
        if (savedPosition > 0 && playerRef.current) {
            playerRef.current.seekTo(savedPosition, true);
        }
    }, [savedPosition]);

    // Track expanded state for each chapter - default all expanded
    const [expandedChapters, setExpandedChapters] = useState<{ [key: number]: boolean }>(
        chapters.reduce((acc, chapter) => ({ ...acc, [chapter.chapterNo]: true }), {})
    );

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
            setVideoError(null);
        } else if (state === 'paused' || state === 'ended') {
            setIsPlaying(false);
        }
    }, []);

    const onPlayerError = useCallback((error: string) => {
        setVideoError(error);
        setIsPlaying(false);
    }, []);

    const handleRetry = () => {
        setVideoError(null);
        setIsPlaying(true);
    };

    const handleVideoSelect = (video: VideoItem) => {
        setCurrentVideo(video);
        setSavedPosition(0); // Reset position for new video until fetched
        setVideoProgress(0);
        setIsPlaying(true);
        setVideoError(null);
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
                                {videoError || (netInfo.isConnected === false) ? (
                                    <View style={[styles.errorContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa' }]}>
                                        <Ionicons
                                            name={netInfo.isConnected === false ? "cloud-offline-outline" : "alert-circle-outline"}
                                            size={32}
                                            color={theme.textSecondary}
                                        />
                                        <Text style={[styles.errorText, { color: theme.text }]}>
                                            {netInfo.isConnected === false ? "You are offline" : "Video Unavailable"}
                                        </Text>
                                        <Text style={[styles.errorSubText, { color: theme.textSecondary }]}>
                                            {netInfo.isConnected === false
                                                ? "Please check your internet connection"
                                                : "Something went wrong playing this video"}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.retryButton, { backgroundColor: galleryColor }]}
                                            onPress={handleRetry}
                                        >
                                            <Ionicons name="refresh" size={16} color="#fff" />
                                            <Text style={styles.retryText}>Retry</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <YoutubePlayer
                                        ref={playerRef}
                                        height={180}
                                        width={width - 32}
                                        play={isPlaying}
                                        videoId={currentVideo.youtubeId}
                                        onChangeState={onStateChange}
                                        onError={onPlayerError}
                                        onReady={onPlayerReady}
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
                                )}
                            </View>

                            {/* Visual Progress Bar */}
                            {(videoProgress > 0) && (
                                <View style={styles.progressBarContainer}>
                                </View>
                            )}
                        </LinearGradient>

                        {/* Visual Progress Bar */}
                        {(videoProgress > 0) && (
                            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0,0,0,0.1)' }]}>
                                <View style={[styles.progressBarFill, { width: `${videoProgress * 100}%`, backgroundColor: galleryColor }]} />
                            </View>
                        )}
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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={galleryColor} />
                }
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

                {allVideos.length === 0 && !initialLoading && (
                    <View style={styles.emptyState}>
                        <Ionicons name="film-outline" size={40} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No videos in this gallery yet
                        </Text>
                    </View>
                )}

                {initialLoading && (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={galleryColor} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 12 }]}>
                            Loading videos...
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
    // Error UI Styles
    errorContainer: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    errorSubText: {
        fontSize: 11,
        marginTop: 4,
        marginBottom: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    retryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Progress Bar
    progressBarContainer: {
        height: 3,
        width: '100%',
        marginTop: 0, // Just below the video
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
    },
});
