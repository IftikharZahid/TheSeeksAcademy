import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

interface VideoItem {
    id: string;
    number: number;
    title: string;
    duration: string;
    youtubeId: string;
    isLocked: boolean;
}

interface Chapter {
    id: string;
    title: string;
    videos: VideoItem[];
}

interface SubjectData {
    name: string;
    color: string;
    gradientColors: [string, string];
    icon: string;
    instructor: string;
    description: string;
    chapters: Chapter[];
}

// Subject-specific video data organized by chapters
const subjectVideos: Record<string, SubjectData> = {
    '1': {
        name: 'Mathematics',
        color: '#6366f1',
        gradientColors: ['#6366f1', '#8b5cf6'],
        icon: 'calculator',
        instructor: 'Dr. Ahmed',
        description: 'Master mathematics from basic algebra to advanced calculus. Our comprehensive course covers number theory, geometry, trigonometry, and more.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Algebra Basics',
                videos: [
                    { id: '1', number: 1, title: 'Introduction to Algebra', duration: '12:30', youtubeId: 'NybHckSEQBI', isLocked: false },
                    { id: '2', number: 2, title: 'Linear Equations', duration: '15:45', youtubeId: '9IUEk9fn2Vs', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Quadratics & Polynomials',
                videos: [
                    { id: '3', number: 3, title: 'Quadratic Functions', duration: '18:20', youtubeId: 'IlNAJl36-10', isLocked: false },
                    { id: '4', number: 4, title: 'Polynomials', duration: '14:00', youtubeId: 'ffLLmV4mZwU', isLocked: true },
                ],
            },
            {
                id: 'ch3',
                title: 'Chapter 3: Trigonometry',
                videos: [
                    { id: '5', number: 5, title: 'Trigonometry Basics', duration: '20:15', youtubeId: 'PUB0TaZ7bhA', isLocked: true },
                ],
            },
        ],
    },
    '2': {
        name: 'Physics',
        color: '#0ea5e9',
        gradientColors: ['#0ea5e9', '#38bdf8'],
        icon: 'flash',
        instructor: 'Prof. Khan',
        description: 'Explore the fundamental laws of nature. From mechanics to electromagnetism, understand how the universe works.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Mechanics',
                videos: [
                    { id: '1', number: 1, title: 'Motion and Kinematics', duration: '16:30', youtubeId: 'ZM8ECpBuQYE', isLocked: false },
                    { id: '2', number: 2, title: 'Newton\'s Laws of Motion', duration: '14:20', youtubeId: 'kKKM8Y-u7ds', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Energy & Waves',
                videos: [
                    { id: '3', number: 3, title: 'Work, Energy and Power', duration: '18:45', youtubeId: 'w4QFJb9a8vo', isLocked: false },
                    { id: '4', number: 4, title: 'Waves and Oscillations', duration: '15:30', youtubeId: 'TfYCnOvNnFU', isLocked: true },
                ],
            },
        ],
    },
    '3': {
        name: 'Chemistry',
        color: '#10b981',
        gradientColors: ['#10b981', '#34d399'],
        icon: 'flask',
        instructor: 'Dr. Fatima',
        description: 'Discover the science of matter, its properties, and reactions. From atomic structure to organic chemistry.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Atomic Structure',
                videos: [
                    { id: '1', number: 1, title: 'Atomic Structure', duration: '14:00', youtubeId: 'rz4Dd1I_fX0', isLocked: false },
                    { id: '2', number: 2, title: 'Chemical Bonding', duration: '16:30', youtubeId: 'NStz7-aDWpk', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Elements & Reactions',
                videos: [
                    { id: '3', number: 3, title: 'Periodic Table', duration: '12:45', youtubeId: '0RRVV4Diomg', isLocked: false },
                    { id: '4', number: 4, title: 'Acids and Bases', duration: '15:20', youtubeId: 'vt8fB3MFzLY', isLocked: true },
                ],
            },
        ],
    },
    '4': {
        name: 'Biology',
        color: '#22c55e',
        gradientColors: ['#22c55e', '#4ade80'],
        icon: 'leaf',
        instructor: 'Dr. Hassan',
        description: 'Study of living organisms, their structure, function, growth, and evolution. Explore the wonders of life.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Cell Biology',
                videos: [
                    { id: '1', number: 1, title: 'Cell Structure', duration: '13:20', youtubeId: 'URUJD5NEXC8', isLocked: false },
                    { id: '2', number: 2, title: 'DNA and Genetics', duration: '17:45', youtubeId: '8m6hHRlKwxY', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Human & Plant Biology',
                videos: [
                    { id: '3', number: 3, title: 'Human Body Systems', duration: '19:30', youtubeId: 'H0nMbkXK4-E', isLocked: false },
                    { id: '4', number: 4, title: 'Plant Biology', duration: '14:15', youtubeId: 'V2aqE1LwSsk', isLocked: true },
                ],
            },
        ],
    },
    '5': {
        name: 'English',
        color: '#f59e0b',
        gradientColors: ['#f59e0b', '#fbbf24'],
        icon: 'book',
        instructor: 'Ms. Sarah',
        description: 'Master the English language. Grammar, vocabulary, reading comprehension, and writing skills.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Grammar',
                videos: [
                    { id: '1', number: 1, title: 'Grammar Fundamentals', duration: '11:30', youtubeId: 'Qf2XvmA0r0Y', isLocked: false },
                    { id: '2', number: 2, title: 'Vocabulary Building', duration: '12:45', youtubeId: 'duDhszJBQ2c', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Writing & Reading',
                videos: [
                    { id: '3', number: 3, title: 'Essay Writing', duration: '15:20', youtubeId: 'Unzc731iCUY', isLocked: false },
                    { id: '4', number: 4, title: 'Reading Comprehension', duration: '13:00', youtubeId: 'dQw4w9WgXcQ', isLocked: true },
                ],
            },
        ],
    },
    '6': {
        name: 'Computer Science',
        color: '#ec4899',
        gradientColors: ['#ec4899', '#f472b6'],
        icon: 'laptop',
        instructor: 'Mr. Ali',
        description: 'Learn programming, algorithms, and software development. Build the foundation for a tech career.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Programming Basics',
                videos: [
                    { id: '1', number: 1, title: 'Introduction to Programming', duration: '10:30', youtubeId: 'zOjov-2OZ0E', isLocked: false },
                    { id: '2', number: 2, title: 'Variables and Data Types', duration: '14:20', youtubeId: 'ysEN5RaKOlA', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Control Flow',
                videos: [
                    { id: '3', number: 3, title: 'Control Structures', duration: '16:45', youtubeId: 'W6NZfCO5SIk', isLocked: false },
                    { id: '4', number: 4, title: 'Functions and Methods', duration: '18:30', youtubeId: '0-S5a0eXPoc', isLocked: true },
                ],
            },
            {
                id: 'ch3',
                title: 'Chapter 3: OOP',
                videos: [
                    { id: '5', number: 5, title: 'Object-Oriented Programming', duration: '20:15', youtubeId: 'c9Wg6Cb_YlU', isLocked: true },
                ],
            },
        ],
    },
    '7': {
        name: 'Urdu',
        color: '#8b5cf6',
        gradientColors: ['#8b5cf6', '#a78bfa'],
        icon: 'language',
        instructor: 'Ms. Ayesha',
        description: 'Learn Urdu literature, grammar, and poetry. Explore the beauty of the national language.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Grammar & Poetry',
                videos: [
                    { id: '1', number: 1, title: 'Urdu Grammar Basics', duration: '12:00', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                    { id: '2', number: 2, title: 'Urdu Poetry', duration: '14:30', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Writing',
                videos: [
                    { id: '3', number: 3, title: 'Essay Writing in Urdu', duration: '13:15', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                ],
            },
        ],
    },
    '8': {
        name: 'Islamiat',
        color: '#14b8a6',
        gradientColors: ['#14b8a6', '#2dd4bf'],
        icon: 'moon',
        instructor: 'Maulana Tariq',
        description: 'Islamic studies covering the Holy Quran, Hadith, and Islamic history and principles.',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: Foundations',
                videos: [
                    { id: '1', number: 1, title: 'Introduction to Islam', duration: '15:00', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                    { id: '2', number: 2, title: 'Pillars of Islam', duration: '18:30', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                ],
            },
            {
                id: 'ch2',
                title: 'Chapter 2: History & Ethics',
                videos: [
                    { id: '3', number: 3, title: 'Life of Prophet (PBUH)', duration: '20:15', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
                    { id: '4', number: 4, title: 'Islamic Ethics', duration: '14:45', youtubeId: 'dQw4w9WgXcQ', isLocked: true },
                ],
            },
        ],
    },
};

// Default fallback data
const defaultSubject: SubjectData = {
    name: 'Video Lectures',
    color: '#6366f1',
    gradientColors: ['#6366f1', '#8b5cf6'],
    icon: 'play-circle',
    instructor: 'The Seeks Academy',
    description: 'Welcome to our video lectures!',
    chapters: [
        {
            id: 'ch1',
            title: 'Chapter 1: Introduction',
            videos: [
                { id: '1', number: 1, title: 'Introduction', duration: '10:00', youtubeId: 'dQw4w9WgXcQ', isLocked: false },
            ],
        },
    ],
};

type RouteParams = {
    VideoLecturesScreen: {
        subjectId?: string;
        subjectName?: string;
        subjectColor?: string;
    };
};

interface ChapterCardProps {
    chapter: Chapter;
    isExpanded: boolean;
    onToggle: () => void;
    subjectColor: string;
    currentVideoId: string;
    isPlaying: boolean;
    onVideoSelect: (video: VideoItem) => void;
}

const ChapterCard: React.FC<ChapterCardProps> = ({
    chapter,
    isExpanded,
    onToggle,
    subjectColor,
    currentVideoId,
    isPlaying,
    onVideoSelect,
}) => {
    const { theme, isDark } = useTheme();
    const unlockedCount = chapter.videos.filter(v => !v.isLocked).length;

    return (
        <View style={[
            styles.chapterCard,
            {
                backgroundColor: isDark ? theme.card : '#fff',
                borderColor: isExpanded ? `${subjectColor}50` : isDark ? theme.border : '#f3f4f6',
            }
        ]}>
            {/* Chapter Header */}
            <TouchableOpacity
                style={styles.chapterHeader}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={[styles.chapterIconContainer, { backgroundColor: `${subjectColor}15` }]}>
                    <Ionicons name="folder" size={16} color={subjectColor} />
                </View>
                <View style={styles.chapterInfo}>
                    <Text style={[styles.chapterTitle, { color: theme.text }]} numberOfLines={1}>
                        {chapter.title}
                    </Text>
                    <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>
                        {chapter.videos.length} videos • {unlockedCount} unlocked
                    </Text>
                </View>
                <View style={[
                    styles.expandButton,
                    { backgroundColor: isExpanded ? `${subjectColor}15` : isDark ? theme.backgroundSecondary : '#f9fafb' }
                ]}>
                    <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={isExpanded ? subjectColor : theme.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {/* Collapsible Video List */}
            {isExpanded && (
                <View style={[styles.videoListContainer, { borderTopColor: isDark ? theme.border : '#f3f4f6' }]}>
                    {chapter.videos.map((video, index) => (
                        <TouchableOpacity
                            key={video.id}
                            style={[
                                styles.videoItem,
                                {
                                    backgroundColor: video.id === currentVideoId
                                        ? `${subjectColor}10`
                                        : 'transparent',
                                },
                                index < chapter.videos.length - 1 && {
                                    borderBottomWidth: 1,
                                    borderBottomColor: isDark ? theme.border : '#f3f4f6'
                                }
                            ]}
                            onPress={() => onVideoSelect(video)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.videoNumber,
                                { backgroundColor: video.id === currentVideoId ? subjectColor : isDark ? theme.backgroundSecondary : '#f3f4f6' }
                            ]}>
                                <Text style={[
                                    styles.videoNumberText,
                                    { color: video.id === currentVideoId ? '#fff' : theme.textSecondary }
                                ]}>
                                    {index + 1}
                                </Text>
                            </View>
                            <View style={styles.videoInfo}>
                                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={1}>
                                    {video.title}
                                </Text>
                                <Text style={[styles.videoDuration, { color: theme.textSecondary }]}>
                                    {video.duration}
                                </Text>
                            </View>
                            {video.isLocked ? (
                                <View style={[styles.statusBadge, { backgroundColor: '#ef444415' }]}>
                                    <Ionicons name="lock-closed" size={12} color="#ef4444" />
                                </View>
                            ) : (
                                <View style={[styles.statusBadge, { backgroundColor: `${subjectColor}15` }]}>
                                    <Ionicons
                                        name={video.id === currentVideoId && isPlaying ? "pause" : "play"}
                                        size={12}
                                        color={subjectColor}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

export const VideoLecturesScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RouteParams, 'VideoLecturesScreen'>>();
    const { theme, isDark } = useTheme();
    const playerRef = useRef<any>(null);

    // Get subject data from route params
    const subjectId = route.params?.subjectId || '1';
    const subjectData = subjectVideos[subjectId] || defaultSubject;

    // Flatten all videos for easy access
    const allVideos = subjectData.chapters.flatMap(ch => ch.videos);
    const totalVideos = allVideos.length;
    const unlockedCount = allVideos.filter(v => !v.isLocked).length;

    const [activeTab, setActiveTab] = useState<'playlist' | 'description'>('playlist');
    const [isFavorite, setIsFavorite] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(allVideos[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
        [subjectData.chapters[0]?.id]: true, // First chapter expanded by default
    });

    const toggleChapter = (chapterId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId],
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
        if (!video.isLocked) {
            setCurrentVideo(video);
            setIsPlaying(true);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Compact Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                        {subjectData.name}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {subjectData.instructor} • {totalVideos} videos
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.favoriteButton, { backgroundColor: isFavorite ? '#ef444420' : theme.backgroundSecondary }]}
                    onPress={() => setIsFavorite(!isFavorite)}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={18}
                        color={isFavorite ? "#ef4444" : theme.text}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Video Player */}
                <View style={styles.playerContainer}>
                    <LinearGradient
                        colors={subjectData.gradientColors}
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
                                }}
                                webViewProps={{
                                    androidLayerType: 'hardware',
                                }}
                            />
                        </View>
                    </LinearGradient>
                </View>

                {/* Current Video Info */}
                <View style={styles.currentVideoInfo}>
                    <Text style={[styles.currentVideoTitle, { color: theme.text }]} numberOfLines={2}>
                        {currentVideo.title}
                    </Text>
                    <View style={styles.videoMeta}>
                        <View style={[styles.metaBadge, { backgroundColor: `${subjectData.color}15` }]}>
                            <Ionicons name={subjectData.icon as any} size={12} color={subjectData.color} />
                            <Text style={[styles.metaText, { color: subjectData.color }]}>{subjectData.name}</Text>
                        </View>
                        <Text style={[styles.videoDuration, { color: theme.textSecondary }]}>
                            {currentVideo.duration}
                        </Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: isDark ? theme.card : '#f3f4f6' }]}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'playlist' && { backgroundColor: subjectData.color }
                        ]}
                        onPress={() => setActiveTab('playlist')}
                    >
                        <Ionicons
                            name="list"
                            size={14}
                            color={activeTab === 'playlist' ? '#fff' : theme.textSecondary}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'playlist' ? '#fff' : theme.textSecondary }
                        ]}>
                            Chapters ({subjectData.chapters.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'description' && { backgroundColor: subjectData.color }
                        ]}
                        onPress={() => setActiveTab('description')}
                    >
                        <Ionicons
                            name="information-circle"
                            size={14}
                            color={activeTab === 'description' ? '#fff' : theme.textSecondary}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'description' ? '#fff' : theme.textSecondary }
                        ]}>
                            About
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {activeTab === 'playlist' ? (
                    <View style={styles.chapterList}>
                        {subjectData.chapters.map((chapter) => (
                            <ChapterCard
                                key={chapter.id}
                                chapter={chapter}
                                isExpanded={expandedChapters[chapter.id] || false}
                                onToggle={() => toggleChapter(chapter.id)}
                                subjectColor={subjectData.color}
                                currentVideoId={currentVideo.id}
                                isPlaying={isPlaying}
                                onVideoSelect={handleVideoSelect}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={[styles.descriptionCard, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}>
                        <View style={styles.descriptionHeader}>
                            <LinearGradient
                                colors={subjectData.gradientColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.descriptionIcon}
                            >
                                <Ionicons name={subjectData.icon as any} size={20} color="#fff" />
                            </LinearGradient>
                            <View style={styles.descriptionHeaderText}>
                                <Text style={[styles.descriptionTitle, { color: theme.text }]}>{subjectData.name}</Text>
                                <Text style={[styles.descriptionInstructor, { color: theme.textSecondary }]}>
                                    Instructor: {subjectData.instructor}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                            {subjectData.description}
                        </Text>
                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb' }]}>
                                <Text style={[styles.statNumber, { color: subjectData.color }]}>{subjectData.chapters.length}</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Chapters</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb' }]}>
                                <Text style={[styles.statNumber, { color: subjectData.color }]}>{totalVideos}</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Videos</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: isDark ? theme.backgroundSecondary : '#f9fafb' }]}>
                                <Text style={[styles.statNumber, { color: subjectData.color }]}>{unlockedCount}</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Free</Text>
                            </View>
                        </View>
                    </View>
                )}
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
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
    favoriteButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 24,
    },
    // Player
    playerContainer: {
        marginHorizontal: 12,
        marginTop: 12,
    },
    playerGradientBorder: {
        borderRadius: 16,
        padding: 3,
    },
    playerWrapper: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    // Current Video Info
    currentVideoInfo: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
    },
    currentVideoTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    videoMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
        fontSize: 11,
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 12,
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Chapter List
    chapterList: {
        paddingHorizontal: 12,
        gap: 10,
    },
    chapterCard: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    chapterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    chapterIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chapterInfo: {
        flex: 1,
        marginLeft: 10,
    },
    chapterTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    chapterMeta: {
        fontSize: 11,
    },
    expandButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoListContainer: {
        borderTopWidth: 1,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    videoNumber: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoNumberText: {
        fontSize: 11,
        fontWeight: '700',
    },
    videoInfo: {
        flex: 1,
        marginLeft: 10,
    },
    videoTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 1,
    },
    statusBadge: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Description
    descriptionCard: {
        marginHorizontal: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    descriptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    descriptionHeaderText: {
        marginLeft: 12,
        flex: 1,
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    descriptionInstructor: {
        fontSize: 12,
        marginTop: 2,
    },
    descriptionText: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 14,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 10,
        marginTop: 2,
    },
});
