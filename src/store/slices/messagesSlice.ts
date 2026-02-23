import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
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
    timestampMs: number | null;
    createdAtMs: number;
}

interface MessagesState {
    list: SerializableMessage[];
    isLoading: boolean;
}

const initialState: MessagesState = {
    list: [],
    isLoading: true,
};

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
});

export const { setMessages, setLoading, addMessage, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;

// ── Firebase Listener ─────────────────────────────────
export const initMessagesListener = (dispatch: Dispatch) => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const messages: SerializableMessage[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    text: data.text,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    senderPhoto: data.senderPhoto,
                    timestampMs: data.timestamp ? data.timestamp.toMillis() : null,
                    createdAtMs: data.createdAt ? data.createdAt.toMillis() : Date.now(),
                };
            });
            dispatch(setMessages(messages));
        },
        (error) => {
            console.error('Error listening to messages:', error);
            dispatch(setLoading(false));
        }
    );
};
