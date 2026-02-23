import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────
export interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'late' | 'holiday';
    subject?: string;
}

export interface AttendanceData {
    records: AttendanceRecord[];
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalDays: number;
    percentage: number;
}

interface AttendanceState {
    data: AttendanceData | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: AttendanceState = {
    data: null,
    isLoading: false,
    error: null,
};

// ── Thunks ─────────────────────────────────────────────
export const fetchAttendance = createAsyncThunk(
    'attendance/fetch',
    async (uid: string, { rejectWithValue }) => {
        try {
            const docRef = doc(db, 'attendance', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AttendanceData;
            }
            return rejectWithValue('Attendance data not found');
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch attendance');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        clearAttendance(state) {
            state.data = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAttendance.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAttendance.fulfilled, (state, action) => {
                state.data = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchAttendance.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearAttendance } = attendanceSlice.actions;
export default attendanceSlice.reducer;
