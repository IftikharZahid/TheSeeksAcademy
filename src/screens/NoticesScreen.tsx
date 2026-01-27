import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

export const NoticesScreen: React.FC = () => {
    const { theme, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: theme.text }]}>Notices</Text>
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
    content: {
        padding: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: scale(24),
        fontWeight: 'bold',
        marginBottom: scale(10),
    },
    subtitle: {
        fontSize: scale(16),
        textAlign: 'center',
    },
});
