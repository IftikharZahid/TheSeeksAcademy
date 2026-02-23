import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

export const NoticesScreen: React.FC = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
            {/* Floating Back Button */}
            <View style={styles.floatingHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.floatingBackButton, { backgroundColor: theme.card }]}
                >
                    <Ionicons name="arrow-back" size={scale(22)} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.screenTitle, { color: theme.text }]}>Notices</Text>
                <View style={styles.placeholderButton} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Ionicons name="notifications-outline" size={scale(64)} color={theme.textTertiary} />
                <Text style={[styles.title, { color: theme.text }]}>No Notices Yet</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Important updates and announcements will appear here.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
    },
    floatingBackButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    screenTitle: {
        fontSize: scale(18),
        fontWeight: '700',
    },
    placeholderButton: {
        width: scale(40),
        height: scale(40),
    },
    content: {
        padding: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: scale(20),
        fontWeight: '700',
        marginTop: scale(16),
        marginBottom: scale(8),
    },
    subtitle: {
        fontSize: scale(14),
        textAlign: 'center',
        lineHeight: scale(20),
    },
});
