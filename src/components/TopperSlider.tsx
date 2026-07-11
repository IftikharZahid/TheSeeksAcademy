import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { initExamsListener, initStudentsListener, selectToppersData } from '../store/slices/adminSlice';

const { width } = Dimensions.get('window');

interface TopperData {
    id: string;
    studentName: string;
    rollNo: string;
    testNo: string;
    testDate: string;
    obtainedMarks: number;
    totalMarks: number;
    position: number;
    className: string;
}

const getPositionColor = (position: number): string => {
    switch (position) {
        case 1:
            return '#FFD700'; // Gold
        case 2:
            return '#C0C0C0'; // Silver
        case 3:
            return '#CD7F32'; // Bronze
        default:
            return '#667eea'; // Purple
    }
};

const getPositionEmoji = (position: number) => {
    switch (position) {
        case 1:
            return '🥇';
        case 2:
            return '🥈';
        case 3:
            return '🥉';
        default:
            return '🏆';
    }
};

const TopperSliderSkeleton: React.FC<{ theme: any; isDark: boolean }> = ({ theme, isDark }) => {
    const skeletonColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: scale(120), height: scale(15), backgroundColor: skeletonColor, borderRadius: scale(4), marginBottom: scale(4) }} />
            </View>
            <View style={{ flexDirection: 'row', gap: scale(10) }}>
                {[1].map((i) => (
                    <LinearGradient
                        key={i}
                        colors={['#1e3a8a', '#1e40af']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.studentCard, { elevation: 0, shadowOpacity: 0 }]}
                    >
                        <View style={styles.studentCardContent}>
                            <View style={styles.studentCardLeft}>
                                <View style={[styles.studentInitialsContainer, { backgroundColor: skeletonColor, borderColor: 'transparent' }]}>
                                    <View style={[styles.studentRankBadge, { backgroundColor: skeletonColor, borderColor: 'transparent' }]} />
                                </View>
                                <View style={styles.studentDetails}>
                                    <View style={{ width: '55%', height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                                    <View style={{ width: '40%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginTop: scale(4) }} />
                                    <View style={{ width: '60%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginTop: scale(4) }} />
                                </View>
                            </View>
                            <View style={styles.studentCardDivider} />
                            <View style={styles.studentCardRight}>
                                <View style={{ width: scale(40), height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(4) }} />
                                <View style={{ width: scale(30), height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3), marginTop: scale(4) }} />
                            </View>
                        </View>
                    </LinearGradient>
                ))}
            </View>
        </View>
    );
};

export const TopperSlider: React.FC = () => {
    const { theme, isDark } = useTheme();
    const dispatch = useAppDispatch();
    const netInfo = useNetInfo();
    const flatListRef = useRef<FlatList>(null);
    const currentIndex = useRef(0);
    const isUserScrolling = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    const exams = useAppSelector((state) => state.admin.exams);
    const examsLoading = useAppSelector((state) => state.admin.examsLoading);

    useEffect(() => {
        const unsubExams = initExamsListener(dispatch);
        const unsubStudents = initStudentsListener(dispatch);
        return () => {
            unsubExams();
            unsubStudents();
        };
    }, [dispatch]);



    const toppersData = useAppSelector(selectToppersData);

    // Auto-scroll functionality with pause on user interaction
    useEffect(() => {
        const interval = setInterval(() => {
            if (flatListRef.current && toppersData.length > 0 && !isUserScrolling.current) {
                currentIndex.current = (currentIndex.current + 1) % toppersData.length;
                flatListRef.current.scrollToIndex({
                    index: currentIndex.current,
                    animated: true,
                });
            }
        }, 4000); // 4 seconds for better readability

        return () => clearInterval(interval);
    }, [toppersData.length]);

    // Handle user scroll interaction
    const handleScrollBeginDrag = () => {
        isUserScrolling.current = true;
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
    };

    const handleScrollEndDrag = () => {
        // Resume auto-scroll after 6 seconds of user inactivity
        scrollTimeout.current = setTimeout(() => {
            isUserScrolling.current = false;
        }, 6000);
    };

    const handleMomentumScrollEnd = (event: any) => {
        // Update current index based on scroll position
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (LIST_ITEM_WIDTH + scale(10)));
        currentIndex.current = index;
    };

    const renderTopperItem = ({ item }: { item: TopperData }) => {
        const percentageValue = (item.obtainedMarks / item.totalMarks) * 100 || 0;
        const percentage = percentageValue.toFixed(0);

        const getInitials = (name: string) => {
            if (!name) return 'S';
            const parts = name.split(' ').filter(Boolean);
            if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
            return name.substring(0, 2).toUpperCase();
        };

        return (
            <LinearGradient
                colors={['#1e3a8a', '#1e40af']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.studentCard}
            >
                {/* Trophy watermark */}
                <Text style={{ position: 'absolute', right: scale(10), top: scale(6), fontSize: scale(32), opacity: 1 }}>{getPositionEmoji(item.position)}</Text>

                <View style={styles.studentCardContent}>
                    {/* LEFT: Avatar + Name */}
                    <View style={styles.studentCardLeft}>
                        <View style={styles.studentInitialsContainer}>
                            <Text style={styles.studentInitials}>{getInitials(item.studentName)}</Text>
                            <View style={[styles.studentRankBadge, { backgroundColor: getPositionColor(item.position) }]}>
                                <Text style={styles.studentRankText}>{item.position}</Text>
                            </View>
                        </View>
                        <View style={styles.studentDetails}>
                            <Text style={styles.studentCardName} numberOfLines={1}>{item.studentName}</Text>
                            <View style={styles.studentDetailRow}>
                                <Ionicons name="id-card-outline" size={scale(9)} color="rgba(255,255,255,0.65)" />
                                <Text style={styles.studentDetailText}>Roll: {item.rollNo || 'N/A'}</Text>
                            </View>
                            <View style={styles.studentDetailRow}>
                                <Ionicons name="calendar-outline" size={scale(9)} color="rgba(255,255,255,0.65)" />
                                <Text style={styles.studentDetailText}>{item.testNo} • {item.testDate}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.studentCardDivider} />

                    {/* RIGHT: Score */}
                    <View style={styles.studentCardRight}>
                        <View style={styles.yearBadge}>
                            <Text style={styles.yearBadgeText}>{item.className}</Text>
                        </View>
                        <Text style={styles.progressScore}>{item.obtainedMarks}<Text style={styles.progressScoreTotal}>/{item.totalMarks}</Text></Text>
                        <View style={styles.progressTextRow}>
                            <Text style={styles.progressLabelText}>Score</Text>
                            <Text style={styles.progressPercentText}>{percentage}%</Text>
                        </View>
                        <View style={styles.studentProgressBarBg}>
                            <View style={[styles.studentProgressBarFill, { width: `${Math.min(percentageValue, 100)}%` }]} />
                        </View>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    const isOffline = netInfo.isConnected === false;
    const isLoading = examsLoading && toppersData.length === 0;

    if (isLoading) {
        return <TopperSliderSkeleton theme={theme} isDark={isDark} />;
    }

    if (isOffline && toppersData.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top Performers</Text>
                </View>
                <View style={[styles.errorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.errorIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                        <Ionicons name="cloud-offline-outline" size={20} color="#ef4444" />
                    </View>
                    <View style={styles.errorContent}>
                        <Text style={[styles.errorTitle, { color: theme.text }]}>Connection Lost</Text>
                        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                            Connect to the internet to load top performers.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {toppersData.length > 0 && (
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top Performer</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isOffline && (
                            <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                                <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" style={{ marginRight: scale(3) }} />
                                <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                    </View>
                </View>
            )}

            <FlatList
                ref={flatListRef}
                data={toppersData}
                renderItem={renderTopperItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                snapToInterval={LIST_ITEM_WIDTH + scale(10)}
                decelerationRate="fast"
                ItemSeparatorComponent={() => <View style={{ width: scale(10) }} />}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                scrollEventThrottle={16}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={true}
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise((resolve) => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({
                            index: info.index,
                            animated: true,
                        });
                    });
                }}
            />
        </View>
    );
};

const LIST_ITEM_WIDTH = width * 0.92;

const styles = StyleSheet.create({
    container: {
        marginTop: scale(4),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(6),
        paddingHorizontal: scale(4),
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: scale(13),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    listContent: {
        paddingRight: scale(16),
        paddingLeft: scale(4),
        paddingBottom: scale(8),
    },
    studentCard: {
        width: LIST_ITEM_WIDTH,
        borderRadius: scale(14),
        paddingVertical: scale(10),
        paddingHorizontal: scale(14),
        marginBottom: scale(4),
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
        overflow: 'hidden',
    },
    studentCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    studentCardLeft: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    studentInitialsContainer: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(10),
        position: 'relative',
    },
    studentInitials: {
        color: '#fff',
        fontSize: scale(14),
        fontWeight: '700',
    },
    studentRankBadge: {
        position: 'absolute',
        bottom: -scale(3),
        right: -scale(3),
        width: scale(14),
        height: scale(14),
        borderRadius: scale(7),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#1e40af',
    },
    studentRankText: {
        color: '#fff',
        fontSize: scale(8),
        fontWeight: '800',
    },
    studentDetails: {
        flex: 1,
    },
    studentCardName: {
        color: '#fff',
        fontSize: scale(12),
        fontWeight: '700',
        marginBottom: scale(2),
    },
    studentDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(1),
    },
    studentDetailText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: scale(8.5),
        marginLeft: scale(3),
    },
    studentCardDivider: {
        width: 1,
        height: scale(38),
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: scale(10),
    },
    studentCardRight: {
        flex: 0.8,
        alignItems: 'flex-start',
    },
    yearBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: scale(8),
        marginBottom: scale(4),
    },
    yearBadgeText: {
        color: '#fff',
        fontSize: scale(9),
        fontWeight: '600',
    },
    progressScore: {
        color: '#fff',
        fontSize: scale(18),
        fontWeight: '800',
        lineHeight: scale(22),
    },
    progressScoreTotal: {
        fontSize: scale(11),
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: scale(2),
        marginBottom: scale(4),
    },
    progressLabelText: {
        color: '#fff',
        fontSize: scale(8),
        fontWeight: '600',
    },
    progressPercentText: {
        color: '#fff',
        fontSize: scale(8),
        fontWeight: '800',
    },
    studentProgressBarBg: {
        width: '100%',
        height: scale(4),
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    studentProgressBarFill: {
        height: '100%',
        backgroundColor: '#a78bfa',
        borderRadius: scale(2),
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
