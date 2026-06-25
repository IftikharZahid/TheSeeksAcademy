import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Dispatch } from '@reduxjs/toolkit';

export interface TimetableClass {
    id: string;
    subject: string;
    time: string;
    startTime: string;
    endTime: string;
    room: string;
    instructor: string;
    teacher: string;
    lectureNo?: string | number;
    lectureNumber?: string | number;
    period: string;
    class: string;
    type: string;
    gender?: string;
    day?: string;
}

export interface TimetableEntry {
    day: string;
    classes: TimetableClass[];
}

interface TimetableState {
    entries: TimetableClass[];   // Flat list of all classes across all days
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: TimetableState = {
    entries: [],
    status: 'idle',
    error: null,
};

// ── Listener: start Firestore onSnapshot listener ───────────────────────────────
export const initTimetableListener = (dispatch: Dispatch) => {
    dispatch(setStatus('loading'));
    return onSnapshot(
                collection(db, 'timetable'),
                (snap) => {
                    const flat: TimetableClass[] = [];
                    snap.docs.forEach((d) => {
                        const data = d.data();
                        const day = d.id;
                        if (Array.isArray(data.classes)) {
                            data.classes.forEach((cls: any) => {
                                flat.push({
                                    id: cls.id || `${day}_${cls.subject}`,
                                    subject: cls.subject || '',
                                    time: cls.time || (cls.startTime && cls.endTime ? `${cls.startTime}-${cls.endTime}` : cls.startTime || ''),
                                    startTime: cls.startTime || '',
                                    endTime: cls.endTime || '',
                                    room: cls.room || '',
                                    instructor: cls.instructor || cls.teacher || '',
                                    teacher: cls.instructor || cls.teacher || '',
                                    lectureNo: cls.lectureNo || cls.lectureNumber || cls.period || '',
                                    lectureNumber: cls.lectureNumber || cls.lectureNo || cls.period || '',
                                    period: cls.period || '',
                                    class: cls.class || '',
                                    type: cls.type || 'LECTURE',
                                    gender: cls.gender || 'All',
                                    // Attach the day for filtering
                                    ...(day ? { day } : {}),
                                } as any);
                            });
                        }
                    });
                    // Sort by day order then startTime
                    const dayOrder: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
                    flat.sort((a: any, b: any) => {
                        const dA = dayOrder[a.day] ?? 99;
                        const dB = dayOrder[b.day] ?? 99;
                        if (dA !== dB) return dA - dB;
                        return (a.startTime || '').localeCompare(b.startTime || '');
                    });
                    dispatch(setEntries(flat));
                    dispatch(setStatus('succeeded'));
                },
                (err) => {
                    dispatch(setStatus('failed'));
                    console.error('Timetable snapshot error:', err);
                }
            );
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const timetableSlice = createSlice({
    name: 'timetable',
    initialState,
    reducers: {
        setEntries: (state, action: PayloadAction<TimetableClass[]>) => {
            state.entries = action.payload;
        },
        setStatus: (state, action: PayloadAction<TimetableState['status']>) => {
            state.status = action.payload;
        },
        clearTimetable: (state) => {
            state.entries = [];
            state.status = 'idle';
            state.error = null;
        },
    },
});

export const { setEntries, setStatus, clearTimetable } = timetableSlice.actions;
export default timetableSlice.reducer;
