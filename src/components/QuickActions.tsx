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

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Access</Text>
                <TouchableOpacity onPress={() => console.log('View All pressed')}>
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.grid}>
                {categories.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.categoryCard, { backgroundColor: theme.card }]}
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
                        
                        {/* Top right green dot indicator */}
                        {item.key === 'diary' && unreadDiariesCount > 0 && (
                            <View style={styles.topRightDot} />
                        )}
                        {item.key === 'assignments' && unreadAssignmentsCount > 0 && (
                            <View style={styles.topRightDot} />
                        )}
                        {item.key === 'library' && unreadLibraryCount > 0 && (
                            <View style={styles.topRightDot} />
                        )}
                        {item.key === 'results' && unreadResultsCount > 0 && (
                            <View style={styles.topRightDot} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const GAP_SIZE = scale(8);
const ITEMS_PER_ROW = 2; // Switched to 2 columns for better layout with subtitles
const TOTAL_HORIZONTAL_PADDING = scale(14) * 2;
const TOTAL_GAPS = GAP_SIZE * (ITEMS_PER_ROW - 1);
const cardWidth = (width - TOTAL_HORIZONTAL_PADDING - TOTAL_GAPS) / ITEMS_PER_ROW;

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
});
