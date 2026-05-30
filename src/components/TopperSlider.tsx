import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { initExamsListener, selectToppersData } from '../store/slices/adminSlice';

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
                {[1, 2].map((i) => (
                    <View key={i} style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border, elevation: 0, shadowOpacity: 0 }]}>
                        <View style={[styles.positionBadge, { backgroundColor: skeletonColor }]} />
                        <View style={styles.studentSection}>
                            <View style={styles.topRow}>
                                <View style={{ width: '55%', height: scale(12), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                                <View style={{ width: '22%', height: scale(15), backgroundColor: skeletonColor, borderRadius: scale(4) }} />
                            </View>
                            <View style={styles.bottomRow}>
                                <View style={{ width: '35%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                                <View style={styles.dot} />
                                <View style={{ width: '45%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                            </View>
                        </View>
                        <View style={styles.marksSection}>
                            <View style={{ width: scale(38), height: scale(18), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                            <View style={{ width: scale(32), height: scale(12), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                        </View>
                    </View>
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
        const unsub = initExamsListener(dispatch);
        return () => unsub();
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
        const percentage = ((item.obtainedMarks / item.totalMarks) * 100).toFixed(0);
        const positionColor = getPositionColor(item.position);

        return (
            <View style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Left: Position Badge */}
                <View style={[styles.positionBadge, { backgroundColor: positionColor + '20' }]}>
                    <Text style={styles.positionEmoji}>{getPositionEmoji(item.position)}</Text>
                </View>

                {/* Center: Student Info */}
                <View style={styles.studentSection}>
                    {/* Top Row: Name and Class */}
                    <View style={styles.topRow}>
                        <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>
                            {item.studentName}
                        </Text>
                        <View style={[styles.classBadge, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[styles.classText, { color: theme.primary }]}>
                                {item.className}
                            </Text>
                        </View>
                    </View>

                    {/* Bottom Row: Test Info */}
                    <View style={styles.bottomRow}>
                        {item.rollNo ? (
                            <>
                                <View style={styles.testInfo}>
                                    <Ionicons name="id-card" size={10} color={theme.textSecondary} />
                                    <Text style={[styles.testText, { color: theme.textSecondary }]}>
                                        Roll: {item.rollNo}
                                    </Text>
                                </View>
                                <View style={styles.dot} />
                            </>
                        ) : null}
                        <View style={styles.testInfo}>
                            <Ionicons name="document-text" size={10} color={theme.textSecondary} />
                            <Text style={[styles.testText, { color: theme.textSecondary }]}>
                                {item.testNo}
                            </Text>
                        </View>
                        <View style={styles.dot} />
                        <View style={styles.testInfo}>
                            <Ionicons name="calendar" size={10} color={theme.textSecondary} />
                            <Text style={[styles.testText, { color: theme.textSecondary }]}>
                                {item.testDate}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Right: Marks & Percentage */}
                <View style={styles.marksSection}>
                    <View style={styles.marksBox}>
                        <Text style={[styles.marksValue, { color: '#10b981' }]}>
                            {item.obtainedMarks}
                        </Text>
                        <Text style={[styles.marksTotal, { color: theme.textSecondary }]}>
                            /{item.totalMarks}
                        </Text>
                    </View>
                    <View style={styles.percentageBadge}>
                        <Text style={styles.percentage}>{percentage}%</Text>
                    </View>
                </View>
            </View>
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
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top Performers</Text>
                    {isOffline && (
                        <View style={[styles.offlineBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                            <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" style={{ marginRight: scale(3) }} />
                            <Text style={[styles.offlineBadgeText, { color: '#d97706' }]}>Offline Cache</Text>
                        </View>
                    )}
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

const LIST_ITEM_WIDTH = width * 0.85;

const styles = StyleSheet.create({
    container: {
        marginTop: scale(4),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(6),
        paddingRight: scale(16),
    },
    sectionTitle: {
        fontSize: scale(15),
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: scale(11),
        fontWeight: '500',
        marginTop: scale(2),
    },
    listContent: {
        paddingRight: scale(16),
    },
    listItem: {
        width: LIST_ITEM_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(7),
        paddingHorizontal: scale(10),
        borderRadius: scale(12),
        borderWidth: 1,
        gap: scale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    positionBadge: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    positionEmoji: {
        fontSize: scale(22),
    },
    studentSection: {
        flex: 1,
        gap: scale(4),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
    },
    studentName: {
        fontSize: scale(14),
        fontWeight: '700',
        flex: 1,
    },
    classBadge: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(3),
        borderRadius: scale(6),
    },
    classText: {
        fontSize: scale(11),
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    testInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(3),
    },
    dot: {
        width: scale(3),
        height: scale(3),
        borderRadius: scale(1.5),
        backgroundColor: '#d1d5db',
    },
    testText: {
        fontSize: scale(10),
        fontWeight: '500',
    },
    marksSection: {
        alignItems: 'flex-end',
        gap: scale(4),
    },
    marksBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    marksValue: {
        fontSize: scale(18),
        fontWeight: '800',
    },
    marksTotal: {
        fontSize: scale(12),
        fontWeight: '600',
    },
    percentageBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: scale(6),
    },
    percentage: {
        fontSize: scale(12),
        fontWeight: '800',
        color: '#8b5cf6',
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
