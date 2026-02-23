import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Full-screen offline indicator – theme-aware (light/dark).
 * Renders when the device has no internet connectivity.
 */
export const OfflineScreen: React.FC = () => {
    const netInfo = useNetInfo();
    const { theme, isDark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Subtle background accent */}
            <View style={[styles.bgAccent, { backgroundColor: theme.warning + '08' }]} />

            {/* Main Content — compact & centered */}
            <View style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconRing, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '25' }]}>
                    <Ionicons name="cloud-offline" size={36} color={theme.warning} />
                </View>

                {/* Title & subtitle */}
                <Text style={[styles.title, { color: theme.text }]}>You're Offline</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Internet connection is not stable.{'\n'}Please check your Wi-Fi or mobile data.
                </Text>

                {/* Status Card */}
                <View style={[styles.statusCard, { backgroundColor: isDark ? theme.card : theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={styles.statusRow}>
                        <View style={[styles.dot, { backgroundColor: theme.error }]} />
                        <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Network</Text>
                        <Text style={[styles.statusValue, { color: theme.text }]}>Disconnected</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.statusRow}>
                        <View style={[styles.dot, { backgroundColor: theme.warning }]} />
                        <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Type</Text>
                        <Text style={[styles.statusValue, { color: theme.text, textTransform: 'capitalize' }]}>
                            {netInfo.type || 'Unknown'}
                        </Text>
                    </View>
                </View>

                {/* Hint */}
                <View style={styles.hintRow}>
                    <Ionicons name="sync-outline" size={13} color={theme.textTertiary} />
                    <Text style={[styles.hintText, { color: theme.textTertiary }]}>
                        Will reconnect automatically
                    </Text>
                </View>
            </View>
        </View>
    );
};

/** Hook to check offline status — use in App.tsx */
export const useOfflineStatus = () => {
    const netInfo = useNetInfo();
    return netInfo.isConnected === false;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 36,
    },
    bgAccent: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        top: '15%',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 300,
    },
    iconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    statusCard: {
        width: '100%',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 8,
    },
    statusLabel: {
        flex: 1,
        fontSize: 12,
    },
    statusValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    hintText: {
        fontSize: 11,
    },
});
