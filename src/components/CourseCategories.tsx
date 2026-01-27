import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Quick Actions data - Modern Minimalist Design
const categories = [
    {
        key: 'assignments',
        label: 'Assignments',
        icon: 'library',
        iconType: 'Ionicons',
        color: '#2563eb', // Rich Blue
    },
    {
        key: 'teachers',
        label: 'Teachers',
        icon: 'people',
        iconType: 'Ionicons',
        color: '#7c3aed', // Violet
    },
    {
        key: 'results',
        label: 'Results',
        icon: 'podium',
        iconType: 'Ionicons',
        color: '#db2777', // Rose
    },
    {
        key: 'timetable',
        label: 'Timetable',
        icon: 'time',
        iconType: 'Ionicons',
        color: '#ea580c', // Orange
    },
    {
        key: 'attendance',
        label: 'Attendance',
        icon: 'calendar',
        iconType: 'Ionicons',
        color: '#0d9488', // Teal
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
                navigation.navigate('MessagesScreen');
                break;
            default:
                console.log('Unknown action:', key);
        }
    };

    const renderIcon = (item: typeof categories[0]) => {
        const iconSize = scale(22);
        if (item.iconType === 'MaterialCommunityIcons') {
            return <MaterialCommunityIcons name={item.icon as any} size={iconSize} color={item.color} />;
        } else if (item.iconType === 'FontAwesome5') {
            return <FontAwesome5 name={item.icon as any} size={iconSize - 4} color={item.color} />;
        }
        return <Ionicons name={item.icon as any} size={iconSize} color={item.color} />;
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
            <View style={[styles.cardWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.grid}>
                    {categories.map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            style={styles.categoryCard}
                            onPress={() => handlePress(item.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? item.color + '15' : item.color + '10' }]}>
                                {renderIcon(item)}
                            </View>
                            <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

// Calculate card size for exactly 4 buttons per row
// Parent container (HomeScreen content) has paddingHorizontal: scale(16)
// CardWrapper has padding: scale(16)
// Total width reduction = scale(16)*2 (parent) + scale(16)*2 (cardWrapper)
const GAP_SIZE = scale(8);
const ITEMS_PER_ROW = 4;
// Parent padding (16*2) + Wrapper padding (12*2)
const TOTAL_HORIZONTAL_PADDING = (scale(16) * 2) + (scale(12) * 2);
const TOTAL_GAPS = GAP_SIZE * (ITEMS_PER_ROW - 1);
const cardSize = (width - TOTAL_HORIZONTAL_PADDING - TOTAL_GAPS) / ITEMS_PER_ROW;


const styles = StyleSheet.create({
    container: {
        marginTop: scale(12),
    },
    sectionTitle: {
        fontSize: scale(18),
        fontWeight: '700',
        marginBottom: scale(8),
        letterSpacing: -0.3,
    },
    cardWrapper: {
        borderRadius: scale(16),
        padding: scale(12),
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: scale(8),
    },
    categoryCard: {
        width: '22%', // Slightly less than 25% to account for gaps
        aspectRatio: 1 / 0.95,
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    iconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    categoryLabel: {
        fontSize: scale(11),
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.1,
    },
});
