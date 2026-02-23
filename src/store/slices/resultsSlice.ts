import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────
export interface BookEntry {
    name: string;
    totalMarks: string;
    obtainedMarks: string;
}

export interface ExamEntry {
    id: string;
    title: string;
    date: string;
    category: string;
    rollNo?: string;
    studentName?: string;
    studentEmail?: string;
    studentClass?: string;
    books?: BookEntry[];
    bookName?: string;
    totalMarks?: string;
    obtainedMarks?: string;
    status?: string;
    description: string;
}

interface ResultsState {
    list: ExamEntry[];
    isLoading: boolean;
    error: string | null;
}

const initialState: ResultsState = {
    list: [],
    isLoading: false,
    error: null,
};

// ── Thunks ─────────────────────────────────────────────
export const fetchResults = createAsyncThunk(
    'results/fetch',
    async (userEmail: string, { rejectWithValue }) => {
        try {
            const q = query(
                collection(db, 'results'),
                where('studentEmail', '==', userEmail)
            );
            const snapshot = await getDocs(q);
            const results: ExamEntry[] = [];
            snapshot.forEach((d) =>
                results.push({ id: d.id, ...d.data() } as ExamEntry)
            );
            return results;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch results');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const resultsSlice = createSlice({
    name: 'results',
    initialState,
    reducers: {
        clearResults(state) {
            state.list = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchResults.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchResults.fulfilled, (state, action) => {
                state.list = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchResults.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearResults } = resultsSlice.actions;
export default resultsSlice.reducer;
