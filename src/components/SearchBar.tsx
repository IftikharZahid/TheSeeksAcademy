import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

interface SearchBarProps {
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Search courses, teachers...',
}) => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const handlePress = () => {
        navigation.navigate('SearchScreen');
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                {placeholder}
            </Text>
            <View style={styles.searchButton}>
                <Ionicons name="search" size={scale(20)} color="#ffffff" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(25),
        paddingLeft: scale(16),
        paddingRight: scale(4),
        paddingVertical: scale(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    placeholderText: {
        flex: 1,
        fontSize: scale(14),
        paddingVertical: scale(12),
    },
    searchButton: {
        backgroundColor: '#2196F3',
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
});
