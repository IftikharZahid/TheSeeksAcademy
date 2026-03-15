import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────
export interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    timestamp: Timestamp | null;
    createdAt: Date;
}

// We store a serializable version
export interface SerializableMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    senderClass?: string;
    timestampMs: number | null;
    createdAtMs: number;
}

interface MessagesState {
    list: SerializableMessage[];
    isLoading: boolean;
    lastReadTimestampMs: number | null;
}

const initialState: MessagesState = {
    list: [],
    isLoading: true,
    lastReadTimestampMs: null,
};

const LAST_READ_KEY = '@messages_last_read';

export const loadLastReadTimestamp = createAsyncThunk(
    'messages/loadLastRead',
    async () => {
        const value = await AsyncStorage.getItem(LAST_READ_KEY);
        return value ? parseInt(value, 10) : 0;
    }
);

export const updateLastReadTimestamp = createAsyncThunk(
    'messages/updateLastRead',
    async (timestampMs: number) => {
        await AsyncStorage.setItem(LAST_READ_KEY, timestampMs.toString());
        return timestampMs;
    }
);

// ── Slice ──────────────────────────────────────────────
const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setMessages(state, action: PayloadAction<SerializableMessage[]>) {
            state.list = action.payload;
            state.isLoading = false;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        addMessage(state, action: PayloadAction<SerializableMessage>) {
            state.list.push(action.payload);
        },
        clearMessages(state) {
            state.list = [];
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadLastReadTimestamp.fulfilled, (state, action) => {
            state.lastReadTimestampMs = action.payload;
        });
        builder.addCase(updateLastReadTimestamp.fulfilled, (state, action) => {
            state.lastReadTimestampMs = action.payload;
        });
    }
});

export const selectUnreadMessagesCount = (state: any) => {
    const { list, lastReadTimestampMs } = state.messages;
    if (lastReadTimestampMs === null) return 0; // still loading from AsyncStorage
    return list.filter((m: SerializableMessage) => m.createdAtMs > lastReadTimestampMs).length;
};

export const { setMessages, setLoading, addMessage, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;

// ── Firebase Listener ─────────────────────────────────
export const initMessagesListener = (dispatch: Dispatch) => {
    // Listen to group_messages for actual global chat
    const q = query(collection(db, 'group_messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const messages: SerializableMessage[] = [];
            snapshot.forEach((d) => {
                const data = d.data();
                messages.push({
                    id: d.id,
                    text: data.text,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    senderPhoto: data.senderPhoto,
                    senderClass: data.senderClass || '',
                    timestampMs: data.timestamp ? data.timestamp.toMillis() : null,
                    createdAtMs: data.timestamp ? data.timestamp.toMillis() : Date.now(),
                });
            });
            dispatch(setMessages(messages));
        },
        (error) => {
            console.error('Error listening to messages:', error);
            dispatch(setLoading(false));
        }
    );
};
