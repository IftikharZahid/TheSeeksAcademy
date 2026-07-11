import { createSlice, PayloadAction, Dispatch } from '@reduxjs/toolkit';
import { db } from '../../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { PushNotification, PushNotificationState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: PushNotificationState = {
    list: [],
    readIds: [],
    loading: true,
    error: null,
};

export const pushNotificationsSlice = createSlice({
    name: 'pushNotifications',
    initialState,
    reducers: {
        setPushNotifications: (state, action: PayloadAction<PushNotification[]>) => {
            state.list = action.payload;
            state.loading = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        },
        setReadIds: (state, action: PayloadAction<string[]>) => {
            state.readIds = action.payload;
        },
        markAsRead: (state, action: PayloadAction<string>) => {
            if (!state.readIds.includes(action.payload)) {
                state.readIds.push(action.payload);
            }
        },
        markAllAsRead: (state) => {
            state.readIds = state.list.map(n => n.id);
        },
        clearLocalCache: (state) => {
            state.readIds = [];
        }
    }
});

export const {
    setPushNotifications,
    setLoading,
    setError,
    setReadIds,
    markAsRead,
    markAllAsRead,
    clearLocalCache
} = pushNotificationsSlice.actions;

export default pushNotificationsSlice.reducer;

// ── Selectors ──
export const selectPushNotifications = (state: any) => state.pushNotifications.list;
export const selectPushUnreadCount = (state: any) => {
    const list = state.pushNotifications.list as PushNotification[];
    const readIds = state.pushNotifications.readIds as string[];
    return list.filter(n => !readIds.includes(n.id)).length;
};
export const selectPushLoading = (state: any) => state.pushNotifications.loading;

// ── Persistence Helpers ──
export const persistPushReadIds = async (readIds: string[]) => {
    try {
        await AsyncStorage.setItem('push_read_ids', JSON.stringify(readIds));
    } catch (e) {
        console.error('Failed to save read ids', e);
    }
};

// ── Realtime Listener ──
export const initPushNotificationsListener = (
    dispatch: Dispatch,
    profile: { class?: string; instituteId?: string; sectionId?: string }
) => {
    // Load read state
    AsyncStorage.getItem('push_read_ids').then(stored => {
        if (stored) {
            try { dispatch(setReadIds(JSON.parse(stored))); } catch {}
        }
    });

    dispatch(setLoading(true));

    // Listen to "notifications" collection (same as admin panel creates)
    let q = query(
        collection(db, 'notifications'),
        where('published', '==', true), // Ensure it's published
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(
        q,
        (snapshot) => {
            let fetched = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as PushNotification[];

            // Client side filtering for matching role & class/institute because Firestore composite indexes
            // might not exist for this complex query dynamically.
            fetched = fetched.filter(n => {
                // It must target Students or Both
                if (n.audience && n.audience !== 'Students' && n.audience !== 'Both') return false;
                
                // If it specifies institute, must match
                if (n.instituteId && n.instituteId !== profile.instituteId) return false;

                // If it specifies class, must match
                if (n.classId && n.classId !== profile.class) return false;

                // If it specifies section, must match
                if (n.sectionId && n.sectionId !== profile.sectionId) return false;

                return true;
            });

            dispatch(setPushNotifications(fetched));
        },
        (error) => {
            console.error('Error fetching push notifications', error);
            dispatch(setError(error.message));
        }
    );
};
