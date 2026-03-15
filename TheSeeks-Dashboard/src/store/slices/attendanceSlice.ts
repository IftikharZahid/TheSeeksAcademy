import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'pending';

export interface AttendanceData {
    dailyRecords: Record<string, string>;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalDays: number;
    percentage: number;
}

export type AdminAttendanceDB = Record<string, Record<string, string>>;

interface AttendanceState {
    data: AttendanceData | null;
    isLoading: boolean;
    error: string | null;
    adminDb: AdminAttendanceDB;
    adminLoading: boolean;
}

const initialState: AttendanceState = {
    data: null,
    isLoading: false,
    error: null,
    adminDb: {},
    adminLoading: false,
};

// ── Thunks ─────────────────────────────────────────────

export const writeStudentAttendance = createAsyncThunk(
    'attendance/writeStudent',
    async (payload: { studentId: string; dailyRecords: Record<string, string> }, { rejectWithValue }) => {
        try {
            const { studentId, dailyRecords } = payload;
            let present = 0, absent = 0, late = 0;
            
            Object.values(dailyRecords).forEach(st => {
                const s = st.toLowerCase();
                if (s === 'present') present++;
                else if (s === 'absent') absent++;
                else if (s === 'late') late++;
            });
            const total = present + absent + late;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
            
            await setDoc(doc(db, 'attendance', studentId), {
                dailyRecords,
                totalPresent: present,
                totalAbsent:  absent,
                totalLate:    late,
                totalDays:    total,
                percentage:   pct,
            }, { merge: true });
            
            return { studentId, dailyRecords };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to write attendance');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        setAdminDb(state, action: PayloadAction<AdminAttendanceDB>) {
            state.adminDb = action.payload;
            state.adminLoading = false;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(writeStudentAttendance.fulfilled, (state, action) => {
            const { studentId, dailyRecords } = action.payload;
            state.adminDb[studentId] = dailyRecords;
        });
    },
});

export const { setAdminDb } = attendanceSlice.actions;
export default attendanceSlice.reducer;
