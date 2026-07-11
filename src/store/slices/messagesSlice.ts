import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, doc, getDoc, where, getDocs } from 'firebase/firestore';
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
// ── Groups Dummy Data ────────────────────────────────────────────────────────────
export const GROUPS = [
  { id: 'g1', name: '9th Grade — Boys',  grade: '9',   gender: 'boy'  },
  { id: 'g2', name: '9th Grade — Girls', grade: '9',   gender: 'girl' },
  { id: 'g3', name: '10th Grade — Boys', grade: '10',  gender: 'boy'  },
  { id: 'g4', name: '10th Grade — Girls',grade: '10',  gender: 'girl' },
  { id: 'g5', name: '1st Year — Boys',   grade: '11',  gender: 'boy'  },
  { id: 'g6', name: '1st Year — Girls',  grade: '11',  gender: 'girl' },
  { id: 'g7', name: '2nd Year — Boys',   grade: '12',  gender: 'boy'  },
  { id: 'g8', name: '2nd Year — Girls',  grade: '12',  gender: 'girl' },
];

export interface SerializableMessage {
    id: string;
    groupId?: string;
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
    // Messaging settings from admin dashboard
    studentMessagingEnabled: boolean;
    dailyMessageLimit: number; // 0 = unlimited
    todayMsgCount: number;
    settingsLoaded: boolean;
}

const initialState: MessagesState = {
    list: [],
    isLoading: true,
    lastReadTimestampMs: null,
    studentMessagingEnabled: true,
    dailyMessageLimit: 0,
    todayMsgCount: 0,
    settingsLoaded: false,
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

// Fetch messaging settings from Firestore (appSettings/messaging)
export const fetchMessagingSettings = createAsyncThunk(
    'messages/fetchMessagingSettings',
    async () => {
        const settingsDoc = await getDoc(doc(db, 'appSettings', 'messaging'));
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            return {
                studentMessagingEnabled: data.studentMessagingEnabled ?? true,
                dailyMessageLimit: data.dailyMessageLimit ?? 0,
            };
        }
        return { studentMessagingEnabled: true, dailyMessageLimit: 0 };
    }
);

// Count today's messages for a specific user in a specific group
export const fetchTodayMessageCount = createAsyncThunk(
    'messages/fetchTodayMessageCount',
    async ({ uid, groupId }: { uid: string; groupId: string }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesRef = collection(db, 'chatGroups', groupId, 'messages');
        const q = query(
            messagesRef,
            where('senderId', '==', uid),
            orderBy('timestamp', 'desc'),
            limit(999)
        );
        const snap = await getDocs(q);
        let count = 0;
        snap.docs.forEach(d => {
            const ts = d.data().timestamp;
            if (ts && ts.toDate() >= today) count++;
        });
        return count;
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
        incrementTodayMsgCount(state) {
            state.todayMsgCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadLastReadTimestamp.fulfilled, (state, action) => {
            state.lastReadTimestampMs = action.payload;
        });
        builder.addCase(updateLastReadTimestamp.fulfilled, (state, action) => {
            state.lastReadTimestampMs = action.payload;
        });
        builder.addCase(fetchMessagingSettings.fulfilled, (state, action) => {
            state.studentMessagingEnabled = action.payload.studentMessagingEnabled;
            state.dailyMessageLimit = action.payload.dailyMessageLimit;
            state.settingsLoaded = true;
        });
        builder.addCase(fetchTodayMessageCount.fulfilled, (state, action) => {
            state.todayMsgCount = action.payload;
        });
    }
});

export const selectUnreadMessagesCount = (state: any) => {
    const { list, lastReadTimestampMs } = state.messages;
    const currentUserId = state.auth?.user?.uid;
    if (lastReadTimestampMs === null) return 0; // still loading from AsyncStorage
    return list.filter((m: SerializableMessage) => m.createdAtMs > lastReadTimestampMs && m.senderId !== currentUserId).length;
};

export const { setMessages, setLoading, addMessage, clearMessages, incrementTodayMsgCount } = messagesSlice.actions;
export default messagesSlice.reducer;

// ── Firebase Listener ─────────────────────────────────
export const initMessagesListener = (dispatch: Dispatch, profile: any) => {
    if (!profile) return () => {};

    const role = String(profile.role || '').trim().toLowerCase();
    
    const normalizeGrade = (gradeStr: string): string => {
        const g = gradeStr.toLowerCase().trim();
        if (g.includes('9th') || g === '9') return '9';
        if (g.includes('10th') || g === '10') return '10';
        if (g.includes('1st') || g.includes('11') || g.includes('eleven')) return '11';
        if (g.includes('2nd') || g.includes('12') || g.includes('twelve')) return '12';
        return g.replace(/[^0-9]/g, '');
    };

    const isPrivileged = role === 'admin' || role === 'teacher' || role === 'staff' || (role && role !== 'student');
    const filteredGroups = GROUPS.filter(g => {
        if (isPrivileged) return true;
        
        const studentGrade = String(profile.class || profile.grade || '').trim().toLowerCase();
        const studentGender = String(profile.gender || '').trim().toLowerCase();
        
        const isBoys = studentGender === 'male' || studentGender === 'boy' || studentGender === 'boys';
        const isGirls = studentGender === 'female' || studentGender === 'girl' || studentGender === 'girls';
        
        const groupGenderMatch = (g.gender === 'boy' && isBoys) || (g.gender === 'girl' && isGirls);
        const groupGradeMatch = normalizeGrade(studentGrade) === normalizeGrade(g.grade);
        
        return groupGenderMatch && groupGradeMatch;
    });

    const unsubs: (() => void)[] = [];
    let allMessagesMap: Record<string, SerializableMessage[]> = {};

    filteredGroups.forEach(g => {
        const q = query(
            collection(db, 'chatGroups', g.id, 'messages'), 
            orderBy('timestamp', 'desc'), 
            limit(5)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs: SerializableMessage[] = [];
            snapshot.forEach((d) => {
                const data = d.data();
                msgs.push({
                    id: d.id,
                    groupId: g.id,
                    text: data.text,
                    senderId: data.senderId,
                    senderName: data.senderName || data.sender || 'Unknown',
                    senderPhoto: data.senderPhoto || data.avatar,
                    senderClass: data.senderClass || data.subject || '',
                    timestampMs: data.timestamp ? data.timestamp.toMillis() : null,
                    createdAtMs: data.timestamp ? data.timestamp.toMillis() : Date.now(),
                });
            });
            allMessagesMap[g.id] = msgs;
            
            // Re-combine and sort across all allowed groups
            let combined: SerializableMessage[] = [];
            Object.values(allMessagesMap).forEach(arr => {
                combined = [...combined, ...arr];
            });
            combined.sort((a, b) => b.createdAtMs - a.createdAtMs);
            
            dispatch(setMessages(combined));
        }, (error) => {
            console.error(`Error listening to ${g.id} messages:`, error);
            dispatch(setLoading(false));
        });
        unsubs.push(unsub);
    });

    return () => {
        unsubs.forEach(u => u());
    };
};
