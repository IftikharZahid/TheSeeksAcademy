import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Exam {
    id: string;
    class: string;
    testNo: string;
    subject: string;
    date: string;
    totalMarks: string;
    students: Record<string, { marks: string; status: 'Pass' | 'Fail' }>;
    [key: string]: any;
}

interface ExamsState {
    data: Exam[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: ExamsState = {
    data: [],
    status: 'idle',
    error: null,
};

// We fetch all exams by default. In a real massive app we'd paginate, but for this dashboard we load all.
export const fetchExams = createAsyncThunk('exams/fetchExams', async () => {
    const snap = await getDocs(collection(db, 'exams'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
});

const examsSlice = createSlice({
    name: 'exams',
    initialState,
    reducers: {
        addOrUpdateExam: (state, action: PayloadAction<Exam>) => {
            const index = state.data.findIndex(e => e.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeExam: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(e => e.id !== action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchExams.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchExams.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchExams.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateExam, removeExam } = examsSlice.actions;
export default examsSlice.reducer;
