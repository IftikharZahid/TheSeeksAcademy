import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { selectUnreadDiariesCount } from '../store/slices/notificationsSlice';

const { width } = Dimensions.get('window');

// Quick Actions data - Modern Minimalist Design
const categories = [
    {
        key: 'attendance',
        label: 'Attendance',
        subtitle: 'View your attendance',
        icon: 'calendar',
        iconType: 'Ionicons',
        color: '#10b981', // Green
        bgColor: '#ecfdf5',
    },
    {
        key: 'timetable',
        label: 'Timetable',
        subtitle: 'Your class schedule',
        icon: 'time',
        iconType: 'Ionicons',
        color: '#f97316', // Orange
        bgColor: '#fff7ed',
    },
    {
        key: 'diary',
        label: 'Diary',
        subtitle: 'Personal diary',
        icon: 'book',
        iconType: 'Ionicons',
        color: '#8b5cf6', // Purple
        bgColor: '#f5f3ff',
    },
    {
        key: 'assignments',
        label: 'Assignments',
        subtitle: 'View & submit work',
        icon: 'document-text',
        iconType: 'Ionicons',
        color: '#3b82f6', // Blue
        bgColor: '#eff6ff',
    },
    {
        key: 'results',
        label: 'Results',
        subtitle: 'Check your results',
        icon: 'bar-chart',
        iconType: 'Ionicons',
        color: '#ec4899', // Pink
        bgColor: '#fdf2f8',
    },
    {
        key: 'teachers',
        label: 'Teachers',
        subtitle: 'Connect teachers',
        icon: 'people',
        iconType: 'Ionicons',
        color: '#6366f1', // Indigo
        bgColor: '#eef2ff',
    },
    {
        key: 'feedetails',
        label: 'Fees',
        subtitle: 'Fee status & history',
        icon: 'wallet',
        iconType: 'Ionicons',
        color: '#14b8a6', // Teal
        bgColor: '#f0fdfa',
    },
    {
        key: 'library',
        label: 'e-Library',
        subtitle: 'Study materials & resources',
        icon: 'library-outline',
        iconType: 'Ionicons',
        color: '#f59e0b', // Amber
        bgColor: '#fffbeb',
    },
    {
        key: 'complaints',
        label: 'Help Center',
        subtitle: 'Get support',
        icon: 'shield-checkmark',
        iconType: 'Ionicons',
        color: '#ef4444', // Red
        bgColor: '#fef2f2',
    },
];

export const CourseCategories: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    const diaries = useAppSelector((state) => state.notifications.diaries);
    const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);
    const unreadDiariesCount = useAppSelector((state) => selectUnreadDiariesCount(state.notifications.diaries, state.notifications.readDiaryIds));

    const assignments = useAppSelector((state) => state.assignments.data);
    const readAssignmentIds = useAppSelector((state) => state.assignments.readIds);
    const profile = useAppSelector((state) => state.auth.profile);
    
    const unreadAssignmentsCount = React.useMemo(() => {
        return assignments.filter(a => {
            const target = a.targetClass || 'All';
            const isRelevant = target === 'All' || (profile && profile.class === target);
            return isRelevant && !readAssignmentIds.includes(a.id);
        }).length;
    }, [assignments, readAssignmentIds, profile]);

    const resultsList = useAppSelector((state) => state.results.list);
    const readResultIds = useAppSelector((state) => state.results.readIds);
    const unreadResultsCount = React.useMemo(() => {
        return resultsList.filter(r => !readResultIds.includes(r.id)).length;
    }, [resultsList, readResultIds]);

    const notices = useAppSelector((state) => state.notifications.notices);
    const readNoticeIds = useAppSelector((state) => state.notifications.readIds);
    const unreadLibraryCount = React.useMemo(() => {
        return notices.filter(n => {
            const targetClass = (n as any).targetClass || (n as any).class || 'All Classes';
            if (!profile?.class) return true;
            if (targetClass.toLowerCase() === 'all' || targetClass.toLowerCase() === 'all classes') return true;
            return targetClass.toLowerCase() === profile.class.toLowerCase();
        }).filter(n => !readNoticeIds.includes(n.id)).length;
    }, [notices, readNoticeIds, profile]);

    const handlePress = (key: string) => {
        switch (key) {
            case 'assignments':
                navigation.navigate('AssignmentsScreen');
                break;
            case 'teachers':
                navigation.navigate('TeachersScreen');
                break;
            case 'results':
                navigation.navigate('ResultsScreen');
                break;
            case 'timetable':
                navigation.navigate('TimetableScreen');
                break;
            case 'attendance':
                navigation.navigate('AttendanceScreen');
                break;
            case 'feedetails':
                navigation.navigate('FeeDetailScreen');
                break;
            case 'library':
                navigation.navigate('LibraryScreen');
                break;
            case 'complaints':
                navigation.navigate('HelpCenterScreen');
                break;
            case 'diary':
                navigation.navigate('DiaryScreen');
                break;
            default:
                console.log('Unknown action:', key);
        }
    };

    const renderIcon = (item: typeof categories[0]) => {
        const iconSize = scale(20);
        if (item.iconType === 'MaterialCommunityIcons') {
            return <MaterialCommunityIcons name={item.icon as any} size={iconSize} color={item.color} />;
        } else if (item.iconType === 'FontAwesome5') {
            return <FontAwesome5 name={item.icon as any} size={iconSize - 4} color={item.color} />;
        }
        return <Ionicons name={item.icon as any} size={iconSize} color={item.color} />;
    };

    // Group categories into rows of 2
    const rows: (typeof categories)[] = [];
    for (let i = 0; i < categories.length; i += 2) {
        rows.push(categories.slice(i, i + 2));
    }

    // Helper: pick connector color from the bottom-right of top row (or top-left bottom row)
    const getConnectorColor = (rowIndex: number) => {
        const topRow = rows[rowIndex];
        const bottomRow = rows[rowIndex + 1];
        // Use the color from the bottom of the top-left card as a blend reference
        return topRow[0]?.color ?? bottomRow?.[0]?.color ?? '#3b82f6';
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Access</Text>
                <TouchableOpacity onPress={() => console.log('View All pressed')}>
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
            </View>

            <View>
                {rows.map((row, rowIndex) => {
                    const lineColor = getConnectorColor(rowIndex);
                    const prevLineColor = rowIndex > 0 ? getConnectorColor(rowIndex - 1) : lineColor;
                    const hasNext = rowIndex < rows.length - 1;
                    const hasPrev = rowIndex > 0;

                    return (
                    <React.Fragment key={rowIndex}>
                        {/* Card row — with vertical line passing through center gap */}
                        <View style={[styles.row, { overflow: 'visible', position: 'relative' }]}>
                            {/* Vertical line through this row (behind cards, in the gap) */}
                            {(hasNext || hasPrev) && (
                                <View style={{
                                    position: 'absolute',
                                    left: '50%',
                                    marginLeft: -1,
                                    top: hasPrev ? 0 : '50%',
                                    bottom: hasNext ? 0 : '50%',
                                    width: 2,
                                    backgroundColor: hasPrev ? prevLineColor + '50' : lineColor + '50',
                                    zIndex: 0,
                                }} />
                            )}

                            {row.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.categoryCard, { backgroundColor: theme.card, zIndex: 1 }]}
                                    onPress={() => handlePress(item.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: isDark ? item.color + '15' : item.bgColor }]}>
                                        {renderIcon(item)}
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.categoryLabel, { color: theme.text }]} numberOfLines={1}>{item.label}</Text>
                                        <Text style={[styles.categorySubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                                    </View>
                                    {/* Unread dot indicators */}
                                    {item.key === 'diary' && unreadDiariesCount > 0 && <View style={styles.topRightDot} />}
                                    {item.key === 'assignments' && unreadAssignmentsCount > 0 && <View style={styles.topRightDot} />}
                                    {item.key === 'library' && unreadLibraryCount > 0 && <View style={styles.topRightDot} />}
                                    {item.key === 'results' && unreadResultsCount > 0 && <View style={styles.topRightDot} />}
                                </TouchableOpacity>
                            ))}
                            {/* Fill empty slot if last row has 1 card */}
                            {row.length === 1 && <View style={styles.categoryCard} />}
                        </View>

                        {/* Connector dot + line through separator */}
                        {hasNext && (
                            <View style={[styles.rowSeparator, { overflow: 'visible' }]}>
                                {/* Line segment through the separator */}
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: 2,
                                    backgroundColor: lineColor + '50',
                                    zIndex: 0,
                                }} />
                                {/* Connector dot on top */}
                                <View style={[styles.connectorOuter, {
                                    backgroundColor: lineColor + '22',
                                    borderColor: lineColor + '90',
                                    shadowColor: lineColor,
                                }]}>
                                    <View style={[styles.connectorInner, { backgroundColor: lineColor }]} />
                                </View>
                            </View>
                        )}
                    </React.Fragment>
                )})}
            </View>
        </View>
    );
};

const DOT_SIZE = scale(24);
const ROW_GAP = scale(6);
const COL_GAP = scale(6);
const TOTAL_HORIZONTAL_PADDING = scale(14) * 2;
const cardWidth = (width - TOTAL_HORIZONTAL_PADDING - COL_GAP) / 2;
const GAP_SIZE = COL_GAP;

const styles = StyleSheet.create({
    container: {
        marginTop: scale(10),
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
        letterSpacing: -0.2,
    },
    viewAllText: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: GAP_SIZE,
    },
    categoryCard: {
        width: cardWidth,
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(10),
        borderRadius: scale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    iconContainer: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(10),
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    categoryLabel: {
        fontSize: scale(13),
        fontWeight: '700',
        marginBottom: scale(2),
        letterSpacing: -0.2,
    },
    categorySubtitle: {
        fontSize: scale(9.5),
        fontWeight: '500',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: scale(16),
        height: scale(16),
        borderRadius: scale(8),
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: scale(8),
        fontWeight: '700',
    },
    topRightDot: {
        position: 'absolute',
        top: scale(10),
        right: scale(10),
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#22c55e',
    },
    row: {
        flexDirection: 'row',
        gap: COL_GAP,
        marginBottom: 0,
    },
    rowSeparator: {
        height: DOT_SIZE,
        marginVertical: -(DOT_SIZE / 2),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    connectorOuter: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 16,
        zIndex: 20,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
    },
    connectorInner: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
    },
});
