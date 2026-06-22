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
                {[1].map((i) => (
                    <View key={i} style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.border, elevation: 0, shadowOpacity: 0 }]}>
                        <View style={[styles.positionBadge, { backgroundColor: skeletonColor }]} />
                        <View style={styles.studentSection}>
                            <View style={{ width: '55%', height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                            <View style={{ width: '40%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginTop: scale(4) }} />
                            <View style={{ width: '60%', height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2), marginTop: scale(4) }} />
                        </View>
                        <View style={styles.marksSection}>
                            <View style={{ flexDirection: 'row', gap: scale(4) }}>
                                <View style={{ width: scale(40), height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(4) }} />
                                <View style={{ width: scale(30), height: scale(14), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(8) }}>
                                <View style={{ width: scale(20), height: scale(10), backgroundColor: skeletonColor, borderRadius: scale(2) }} />
                                <View style={{ width: scale(50), height: scale(6), backgroundColor: skeletonColor, borderRadius: scale(3) }} />
                            </View>
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
        const percentageValue = (item.obtainedMarks / item.totalMarks) * 100;
        const percentage = percentageValue.toFixed(0);

        return (
            <View style={[styles.listItem, { backgroundColor: theme.card }]}>
                {/* Left: Position Badge */}
                <View style={styles.positionBadgeWrapper}>
                    <View style={styles.positionBadge}>
                        <Text style={styles.positionEmoji}>{getPositionEmoji(item.position)}</Text>
                    </View>
                </View>

                {/* Center: Student Info */}
                <View style={styles.studentSection}>
                    <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>
                        {item.studentName}
                    </Text>

                    {item.rollNo ? (
                        <View style={styles.testInfo}>
                            <Ionicons name="id-card-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.testText, { color: theme.textSecondary }]}>
                                Roll: {item.rollNo}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.testInfo}>
                        <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.testText, { color: theme.textSecondary }]}>
                            {item.testNo} • {item.testDate}
                        </Text>
                    </View>
                </View>

                {/* Right: Marks & Percentage */}
                <View style={styles.marksSection}>
                    <View style={styles.marksHeaderRow}>
                        <View style={[styles.classBadge, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[styles.classText, { color: theme.primary }]}>
                                {item.className}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={10} color={theme.textTertiary || '#cbd5e1'} style={{ marginHorizontal: scale(2) }} />
                        <View style={styles.marksBox}>
                            <Text style={[styles.marksValue, { color: '#10b981' }]}>
                                {item.obtainedMarks}
                            </Text>
                            <Text style={[styles.marksTotal, { color: theme.textSecondary }]}>
                                /{item.totalMarks}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.progressRow}>
                        <Text style={[styles.percentage, { color: theme.primary }]}>{percentage}%</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${Math.min(percentageValue, 100)}%` }]} />
                        </View>
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
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>🏆 Top Performer</Text>
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
    listItem: {
        width: LIST_ITEM_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(10),
        paddingHorizontal: scale(10),
        borderRadius: scale(12),
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    positionBadgeWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(10),
    },
    positionBadge: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    positionEmoji: {
        fontSize: scale(18),
    },
    studentSection: {
        flex: 1.2,
        gap: scale(2),
    },
    studentName: {
        fontSize: scale(13),
        fontWeight: '700',
        marginBottom: scale(1),
        letterSpacing: -0.2,
    },
    testInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    testText: {
        fontSize: scale(9.5),
        fontWeight: '500',
    },
    marksSection: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    marksHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    classBadge: {
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(4),
    },
    classText: {
        fontSize: scale(9),
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    marksBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    marksValue: {
        fontSize: scale(15),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    marksTotal: {
        fontSize: scale(9.5),
        fontWeight: '600',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'flex-end',
        gap: scale(4),
    },
    percentage: {
        fontSize: scale(10),
        fontWeight: '800',
    },
    progressBarBg: {
        width: scale(40),
        height: scale(5),
        backgroundColor: '#f1f5f9',
        borderRadius: scale(2.5),
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: scale(2.5),
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
