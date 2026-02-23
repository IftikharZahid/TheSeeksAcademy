/**
 * NotificationContext — Compatibility wrapper around Redux notificationsSlice.
 * 
 * Preserves the `useNotifications()` hook API so existing screens don't need changes.
 * The actual state lives in Redux now.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    markAsRead as reduxMarkAsRead,
    persistReadIds,
    selectUnreadCount,
} from '../store/slices/notificationsSlice';
import type { Notice } from '../store/slices/notificationsSlice';

// Re-export Notice type for consumers
export type { Notice } from '../store/slices/notificationsSlice';

interface NotificationContextType {
    notices: Notice[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    isRead: (id: string) => boolean;
}

export const useNotifications = (): NotificationContextType => {
    const dispatch = useAppDispatch();
    const notices = useAppSelector((state) => state.notifications.notices);
    const readIds = useAppSelector((state) => state.notifications.readIds);
    const loading = useAppSelector((state) => state.notifications.loading);

    const unreadCount = selectUnreadCount(notices, readIds);

    const markAsRead = useCallback(
        async (id: string) => {
            dispatch(reduxMarkAsRead(id));
            // Persist updated readIds to AsyncStorage
            const newReadIds = readIds.includes(id) ? readIds : [...readIds, id];
            await persistReadIds(newReadIds);
        },
        [dispatch, readIds]
    );

    const isRead = useCallback(
        (id: string) => readIds.includes(id),
        [readIds]
    );

    return { notices, unreadCount, loading, markAsRead, isRead };
};
