import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────
export interface Notice {
    id: string;
    title: string;
    message: string;
    timeAgo?: string;
    createdAt?: Timestamp;
    type: 'image' | 'initials' | 'icon';
    avatar?: string;
    initials?: string;
    initialsColor?: string;
    iconName?: string;
    iconColor?: string;
    iconBgColor?: string;
}

interface NotificationsState {
    notices: Notice[];
    readIds: string[];
    loading: boolean;
}

const initialState: NotificationsState = {
    notices: [],
    readIds: [],
    loading: true,
};

// ── Helpers ────────────────────────────────────────────
const formatTimeAgo = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const date = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'Just now';
};

// ── Slice ──────────────────────────────────────────────
const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotices(state, action: PayloadAction<Notice[]>) {
            state.notices = action.payload;
            state.loading = false;
        },
        setReadIds(state, action: PayloadAction<string[]>) {
            state.readIds = action.payload;
        },
        markAsRead(state, action: PayloadAction<string>) {
            if (!state.readIds.includes(action.payload)) {
                state.readIds.push(action.payload);
            }
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
    },
});

export const { setNotices, setReadIds, markAsRead, setLoading } = notificationsSlice.actions;
export default notificationsSlice.reducer;

// ── Selectors ──────────────────────────────────────────
export const selectUnreadCount = (notices: Notice[], readIds: string[]) =>
    notices.filter((n) => !readIds.includes(n.id)).length;

// ── Firebase Listener + Persistence (call once from App.tsx) ──
export const initNotificationsListener = (dispatch: Dispatch) => {
    // Load previously-read IDs from disk
    AsyncStorage.getItem('read_notices').then((stored) => {
        if (stored) {
            try { dispatch(setReadIds(JSON.parse(stored))); } catch { }
        }
    });

    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const fetched = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                timeAgo: formatTimeAgo(d.data().createdAt),
            })) as Notice[];
            dispatch(setNotices(fetched));
        },
        (error) => {
            console.error('Error fetching notices:', error);
            dispatch(setLoading(false));
        }
    );
};

/**
 * Persist read IDs to AsyncStorage after marking one as read.
 * Call this from components after dispatching `markAsRead`.
 */
export const persistReadIds = async (readIds: string[]) => {
    try {
        await AsyncStorage.setItem('read_notices', JSON.stringify(readIds));
    } catch (error) {
        console.error('Error saving read status:', error);
    }
};
