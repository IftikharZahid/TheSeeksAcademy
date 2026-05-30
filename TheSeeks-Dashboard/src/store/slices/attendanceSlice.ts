import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../firebase';
import { doc, setDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';

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

export const fetchAttendance = createAsyncThunk('attendance/fetchAttendance', async () => {
    const snap = await getDocs(collection(db, 'attendance'));
    const newDb: Record<string, Record<string, string>> = {};
    snap.docs.forEach((docSnap) => {
        const dr = docSnap.data().dailyRecords ?? {};
        const norm: Record<string, string> = {};
        if (typeof dr === 'object' && !Array.isArray(dr)) {
            Object.keys(dr).forEach(k => {
                const v = dr[k];
                norm[k] = typeof v === 'string' ? v : (v?.status ?? '');
            });
        }
        newDb[docSnap.id] = norm;
    });
    return newDb;
});

// Real-time onSnapshot listener — returns unsubscribe fn via resolved Promise
export const subscribeAttendance = createAsyncThunk(
    'attendance/subscribe',
    async (_, { dispatch }) => {
        return new Promise<() => void>((resolve) => {
            const unsub = onSnapshot(collection(db, 'attendance'), (snap) => {
                const newDb: Record<string, Record<string, string>> = {};
                snap.docs.forEach((docSnap) => {
                    const dr = docSnap.data().dailyRecords ?? {};
                    const norm: Record<string, string> = {};
                    if (typeof dr === 'object' && !Array.isArray(dr)) {
                        Object.keys(dr).forEach(k => {
                            const v = dr[k];
                            norm[k] = typeof v === 'string' ? v : (v?.status ?? '');
                        });
                    }
                    newDb[docSnap.id] = norm;
                });
                dispatch(setAdminDb(newDb));
            }, (err) => {
                console.error('Attendance snapshot error:', err);
            });
            resolve(unsub);
        });
    }
);

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
        setAdminLoading(state, action: PayloadAction<boolean>) {
            state.adminLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchAttendance.pending, (state) => {
            state.adminLoading = true;
        });
        builder.addCase(fetchAttendance.fulfilled, (state, action) => {
            state.adminDb = action.payload;
            state.adminLoading = false;
        });
        builder.addCase(fetchAttendance.rejected, (state, action) => {
            state.error = action.error.message || 'Failed to fetch attendance';
            state.adminLoading = false;
        });
        builder.addCase(writeStudentAttendance.fulfilled, (state, action) => {
            const { studentId, dailyRecords } = action.payload;
            state.adminDb[studentId] = dailyRecords;
        });
        builder.addCase(subscribeAttendance.pending, (state) => {
            state.adminLoading = true;
        });
        builder.addCase(subscribeAttendance.fulfilled, (state) => {
            // unsubscribe fn is returned — loading will be cleared by setAdminDb
        });
    },
});

export const { setAdminDb, setAdminLoading } = attendanceSlice.actions;
export default attendanceSlice.reducer;
