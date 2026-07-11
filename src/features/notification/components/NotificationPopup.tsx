import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../../context/ThemeContext';
import { PushNotification } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppDispatch } from '../../../store/hooks';
import { markAsRead, persistPushReadIds } from '../redux/pushNotificationsSlice';
import { store } from '../../../store/store';

export const NotificationPopup: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const dispatch = useAppDispatch();
    
    const [visible, setVisible] = useState(false);
    const [currentNotification, setCurrentNotification] = useState<PushNotification | null>(null);

    useEffect(() => {
        // Listen for incoming notifications when app is in foreground
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data as any;
            // Map the FCM data payload to our PushNotification type
            const notifItem: PushNotification = {
                id: data.id || Math.random().toString(),
                title: notification.request.content.title || 'New Notification',
                message: notification.request.content.body || '',
                imageUrl: data.imageUrl,
                priority: data.priority || 'Normal',
                targetRole: 'Students',
                createdAt: { toDate: () => new Date() } // rough approximation for the popup
            };
            setCurrentNotification(notifItem);
            setVisible(true);
        });

        // Listen for user tapping on notification in background/killed state
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            navigation.navigate('NotificationCenterScreen' as any);
        });

        return () => {
            subscription.remove();
            responseSubscription.remove();
        };
    }, [navigation]);

    const handleReadNow = () => {
        if (currentNotification) {
            dispatch(markAsRead(currentNotification.id));
            const state = store.getState();
            persistPushReadIds(state.pushNotifications.readIds);
            setVisible(false);
            // Navigate to notification center
            navigation.navigate('NotificationCenterScreen' as any);
        }
    };

    if (!visible || !currentNotification) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                <View style={[styles.dialog, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.header}>
                        <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                            <MaterialIcons name="notifications-active" size={24} color={theme.primary} />
                        </View>
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <MaterialIcons name="close" size={24} color={theme.text + '80'} />
                        </TouchableOpacity>
                    </View>

                    {currentNotification.imageUrl && (
                        <Image source={{ uri: currentNotification.imageUrl }} style={styles.banner} />
                    )}

                    <Text style={[styles.title, { color: theme.text }]}>{currentNotification.title}</Text>
                    <Text style={[styles.message, { color: theme.text + '90' }]} numberOfLines={3}>
                        {currentNotification.message}
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]} 
                            onPress={() => setVisible(false)}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>Close</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: theme.primary }]} 
                            onPress={handleReadNow}
                        >
                            <Text style={[styles.buttonText, { color: '#fff' }]}>Read Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialog: {
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    banner: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: 16,
    }
});
