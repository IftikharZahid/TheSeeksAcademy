import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../store/hooks';

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

export const TopperSlider: React.FC = () => {
    const { theme } = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const currentIndex = useRef(0);
    const isUserScrolling = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    const exams = useAppSelector((state) => state.admin.exams);

    const toppersData = useMemo(() => {
        if (!exams || exams.length === 0) return [];

        const classTestGroups: Record<string, Record<string, {
            studentName: string;
            rollNo: string;
            obtainedMarks: number;
            totalMarks: number;
            testDate: string;
        }>> = {};

        exams.forEach(exam => {
            if (exam.status === 'Absent') return;
            const className = exam.studentClass || 'Unknown Class';
            const testTitle = exam.title || 'Unknown Test';
            const groupKey = `${className}_${testTitle}`;

            if (!classTestGroups[groupKey]) {
                classTestGroups[groupKey] = {};
            }

            const studentKey = exam.rollNo || exam.studentName || 'unknown';
            if (!studentKey) return;

            let obtained = 0;
            let total = 0;

            if (exam.books && exam.books.length > 0) {
                exam.books.forEach(b => {
                    obtained += parseFloat(b.obtainedMarks || '0');
                    total += parseFloat(b.totalMarks || '0');
                });
            } else {
                obtained += parseFloat(exam.obtainedMarks || '0');
                total += parseFloat(exam.totalMarks || '0');
            }

            if (!classTestGroups[groupKey][studentKey]) {
                classTestGroups[groupKey][studentKey] = {
                    studentName: exam.studentName || 'Unknown Student',
                    rollNo: exam.rollNo || '',
                    obtainedMarks: 0,
                    totalMarks: 0,
                    testDate: exam.date || '',
                };
            }

            classTestGroups[groupKey][studentKey].obtainedMarks += obtained;
            classTestGroups[groupKey][studentKey].totalMarks += total;

            if (exam.date && (!classTestGroups[groupKey][studentKey].testDate || new Date(exam.date) > new Date(classTestGroups[groupKey][studentKey].testDate))) {
                classTestGroups[groupKey][studentKey].testDate = exam.date;
            }
        });

        const allToppers: TopperData[] = [];

        Object.keys(classTestGroups).forEach(groupKey => {
            const [className, testTitle] = groupKey.split('_');
            const students = Object.values(classTestGroups[groupKey]);

            students.sort((a, b) => b.obtainedMarks - a.obtainedMarks);

            let currentRank = 1;
            let previousMarks = -1;

            students.forEach((student, index) => {
                if (index > 0 && student.obtainedMarks < previousMarks) {
                    currentRank = index + 1;
                }
                previousMarks = student.obtainedMarks;

                if (currentRank <= 3 && student.totalMarks > 0) {
                    allToppers.push({
                        id: `${student.rollNo}_${groupKey}_${index}`,
                        studentName: student.studentName,
                        rollNo: student.rollNo,
                        testNo: testTitle,
                        testDate: student.testDate,
                        obtainedMarks: student.obtainedMarks,
                        totalMarks: student.totalMarks,
                        position: currentRank,
                        className: className
                    });
                }
            });
        });

        allToppers.sort((a, b) => {
            const dateA = new Date(a.testDate).getTime();
            const dateB = new Date(b.testDate).getTime();
            if (dateB !== dateA) return dateB - dateA;
            if (a.position !== b.position) return a.position - b.position;
            return b.obtainedMarks - a.obtainedMarks;
        });

        return allToppers;
    }, [exams]);

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

    return (
        <View style={styles.container}>
            {toppersData.length > 0 && (
                <View style={styles.header}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Top Performers</Text>
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
        marginTop: scale(8),
    },
    header: {
        marginBottom: scale(6),
    },
    sectionTitle: {
        fontSize: scale(16),
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
        paddingVertical: scale(8),
        paddingHorizontal: scale(12),
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
});
