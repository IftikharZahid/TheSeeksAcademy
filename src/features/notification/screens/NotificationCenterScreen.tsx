import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectPushNotifications, selectPushLoading, markAsRead, persistPushReadIds, markAllAsRead, clearLocalCache } from '../redux/pushNotificationsSlice';
import { NotificationCard } from '../components/NotificationCard';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { store } from '../../../store/store';

export const NotificationCenterScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const dispatch = useAppDispatch();
    
    const notifications = useAppSelector(selectPushNotifications);
    const readIds = useAppSelector((state) => state.pushNotifications.readIds);
    const loading = useAppSelector(selectPushLoading);
    
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Since it's a realtime listener, we just mock a refresh delay
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handlePress = (notification: any) => {
        dispatch(markAsRead(notification.id));
        const state = store.getState();
        persistPushReadIds(state.pushNotifications.readIds);
        
        navigation.navigate('NotificationDetailsScreen', { notification });
    };

    const handleMarkAllRead = () => {
        dispatch(markAllAsRead());
        const state = store.getState();
        persistPushReadIds(state.pushNotifications.readIds);
    };

    const handleClearCache = () => {
        dispatch(clearLocalCache());
        persistPushReadIds([]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
                        <MaterialIcons name="done-all" size={22} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearCache} style={styles.actionBtn}>
                        <MaterialIcons name="delete-sweep" size={22} color={theme.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="notifications-off" size={64} color={theme.text + '30'} />
                        <Text style={[styles.emptyText, { color: theme.text + '60' }]}>
                            {loading ? 'Loading...' : 'No notifications yet'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <NotificationCard 
                        notification={item}
                        isRead={readIds.includes(item.id)}
                        onPress={handlePress}
                    />
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtn: {
        padding: 4,
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    }
});
