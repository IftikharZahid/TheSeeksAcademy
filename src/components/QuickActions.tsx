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
        icon: 'calendar',
        iconType: 'Ionicons',
        color: '#0d9488', // Teal
    },
    {
        key: 'timetable',
        label: 'Timetable',
        icon: 'time',
        iconType: 'Ionicons',
        color: '#ea580c', // Orange
    },
    {
        key: 'diary',
        label: 'Diary',
        icon: 'book',
        iconType: 'Ionicons',
        color: '#8b5cf6', // Purple/Indigo
    },
    {
        key: 'assignments',
        label: 'Assignments',
        icon: 'library',
        iconType: 'Ionicons',
        color: '#2563eb', // Rich Blue
    },
    {
        key: 'results',
        label: 'Results',
        icon: 'podium',
        iconType: 'Ionicons',
        color: '#db2777', // Rose
    },
    {
        key: 'teachers',
        label: 'Teachers',
        icon: 'people',
        iconType: 'Ionicons',
        color: '#7c3aed', // Violet
    },
    {
        key: 'feedetails',
        label: 'Fees',
        icon: 'wallet',
        iconType: 'Ionicons',
        color: '#059669', // Emerald
    },
    {
        key: 'noticeboard',
        label: 'Notices',
        icon: 'megaphone',
        iconType: 'Ionicons',
        color: '#d97706', // Amber
    },
    {
        key: 'complaints',
        label: 'Help',
        icon: 'shield-checkmark',
        iconType: 'Ionicons',
        color: '#dc2626', // Red
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
            case 'noticeboard':
                navigation.navigate('NoticesScreen');
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
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
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
                        <View style={[styles.iconContainer, { backgroundColor: isDark ? item.color + '15' : item.color + '10' }]}>
                            {renderIcon(item)}
                            {item.key === 'diary' && unreadDiariesCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadDiariesCount > 9 ? '9+' : unreadDiariesCount}
                                    </Text>
                                </View>
                            )}
                            {item.key === 'assignments' && unreadAssignmentsCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadAssignmentsCount > 9 ? '9+' : unreadAssignmentsCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.categoryLabel, { color: theme.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const GAP_SIZE = scale(8);
const ITEMS_PER_ROW = 3;
const TOTAL_HORIZONTAL_PADDING = scale(14) * 2;
const TOTAL_GAPS = GAP_SIZE * (ITEMS_PER_ROW - 1);
const cardSize = (width - TOTAL_HORIZONTAL_PADDING - TOTAL_GAPS) / ITEMS_PER_ROW;

const styles = StyleSheet.create({
    container: {
        marginTop: scale(10),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(6),
        paddingHorizontal: scale(4),
    },
    sectionTitle: {
        fontSize: scale(14),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    viewAllText: {
        fontSize: scale(11),
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: GAP_SIZE,
    },
    categoryCard: {
        width: cardSize,
        height: cardSize * 0.9,
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    iconContainer: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(6),
    },
    categoryLabel: {
        fontSize: scale(10.5),
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.1,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: scale(9),
        fontWeight: '700',
    },
});
