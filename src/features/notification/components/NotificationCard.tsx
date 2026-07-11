import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { PushNotification } from '../types';
import { useTheme } from '../../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface NotificationCardProps {
    notification: PushNotification;
    isRead: boolean;
    onPress: (notification: PushNotification) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification, isRead, onPress }) => {
    const { theme } = useTheme();

    const getPriorityColor = () => {
        switch (notification.priority) {
            case 'Urgent': return '#ef4444';
            case 'Important': return '#f59e0b';
            default: return theme.text + '80';
        }
    };

    return (
        <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => onPress(notification)}
            style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                !isRead && { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }
            ]}
        >
            {notification.imageUrl && (
                <Image source={{ uri: notification.imageUrl }} style={styles.banner} />
            )}
            
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    {!isRead && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                </View>
                
                <Text style={[styles.message, { color: theme.text + '99' }]} numberOfLines={2}>
                    {notification.message}
                </Text>

                <View style={styles.footer}>
                    <View style={styles.dateContainer}>
                        <MaterialIcons name="schedule" size={14} color={theme.text + '60'} />
                        <Text style={[styles.dateText, { color: theme.text + '60' }]}>
                            {notification.createdAt?.toDate 
                                ? notification.createdAt.toDate().toLocaleDateString()
                                : 'Just now'}
                        </Text>
                    </View>

                    {notification.priority !== 'Normal' && (
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() + '20' }]}>
                            <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
                                {notification.priority}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    banner: {
        width: '100%',
        height: 120,
        backgroundColor: '#000',
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 12,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
