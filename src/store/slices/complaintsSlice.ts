import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db, auth } from '../../api/firebaseConfig';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────

export interface Complaint {
    id: string;
    subject: string;
    category: string;
    description: string;
    status: string;
    createdAt: any;
}

interface ComplaintsState {
    myComplaints: Complaint[];
    loading: boolean;
    submitting: boolean;
}

const initialState: ComplaintsState = {
    myComplaints: [],
    loading: true,
    submitting: false,
};

// ── Async Thunks ───────────────────────────────────────

export const submitComplaint = createAsyncThunk(
    'complaints/submitComplaint',
    async (payload: { subject: string; category: string; description: string }) => {
        const user = auth.currentUser;
        await addDoc(collection(db, 'complaints'), {
            subject: payload.subject.trim(),
            category: payload.category,
            description: payload.description.trim(),
            userId: user?.uid || 'anonymous',
            userEmail: user?.email || 'anonymous',
            userName: user?.displayName || 'Anonymous User',
            status: 'Pending',
            createdAt: serverTimestamp(),
        });
    }
);

// ── Slice ──────────────────────────────────────────────

const complaintsSlice = createSlice({
    name: 'complaints',
    initialState,
    reducers: {
        setMyComplaints(state, action: PayloadAction<Complaint[]>) {
            state.myComplaints = action.payload;
            state.loading = false;
        },
        setComplaintsLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        clearComplaints() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitComplaint.pending, (state) => {
                state.submitting = true;
            })
            .addCase(submitComplaint.fulfilled, (state) => {
                state.submitting = false;
            })
            .addCase(submitComplaint.rejected, (state) => {
                state.submitting = false;
            });
    },
});

export const { setMyComplaints, setComplaintsLoading, clearComplaints } = complaintsSlice.actions;
export default complaintsSlice.reducer;

// ── Firebase Listener (user-side) ─────────────────────

export const initMyComplaintsListener = (dispatch: Dispatch, uid: string) => {
    dispatch(setComplaintsLoading(true));

    const q = query(
        collection(db, 'complaints'),
        where('userId', '==', uid)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const list: Complaint[] = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            } as Complaint));
            // Sort client-side by newest first
            list.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            dispatch(setMyComplaints(list));
        },
        (error) => {
            console.error('Error listening to user complaints:', error);
            dispatch(setComplaintsLoading(false));
        }
    );
};
