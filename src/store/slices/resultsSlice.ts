import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, query, where, getDocs, orderBy, or } from 'firebase/firestore';

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
    readIds: string[];
    isLoading: boolean;
    error: string | null;
}

const initialState: ResultsState = {
    list: [],
    readIds: [],
    isLoading: false,
    error: null,
};

// ── Thunks ─────────────────────────────────────────────
export const fetchResults = createAsyncThunk(
    'results/fetch',
    async (params: { userRollNo: string | null; userEmail: string | null; studentName: string | null; studentClass: string | null }, { rejectWithValue }) => {
        try {
            const { userRollNo, userEmail, studentName, studentClass } = params;

            if (!userRollNo && !userEmail && (!studentName || !studentClass)) {
                return [];
            }

            const examsRef = collection(db, 'exams');

            // Build OR conditions using every available identifier.
            // Exams saved from the dashboard store studentEmail in mixed-case academy format
            // (e.g. STD-9002@TheSeeksAcademy.edu.pk) while Firebase Auth gives lowercase.
            // We include both variants so results are found regardless of storage case.
            const conditions: any[] = [];

            if (userRollNo) {
                conditions.push(where('rollNo', '==', userRollNo));
            }
            if (userEmail) {
                const emailLower = userEmail.toLowerCase();
                conditions.push(where('studentEmail', '==', emailLower));

                // Also try the academy mixed-case format: STD-9002@TheSeeksAcademy.edu.pk
                const parts = emailLower.split('@');
                const emailMixed = parts.length === 2
                    ? `${parts[0].toUpperCase()}@TheSeeksAcademy.edu.pk`
                    : emailLower;
                if (emailMixed !== emailLower) {
                    conditions.push(where('studentEmail', '==', emailMixed));
                }
            }
            if (studentName) {
                conditions.push(where('studentName', '==', studentName));
            }

            if (conditions.length === 0) return [];

            const q = conditions.length === 1
                ? query(examsRef, conditions[0])
                : query(examsRef, or(...conditions));

            const snapshot = await getDocs(q);

            // De-duplicate (or() may return the same doc from multiple clauses)
            const seen = new Set<string>();
            const results: ExamEntry[] = [];
            snapshot.forEach((d) => {
                if (!seen.has(d.id)) {
                    seen.add(d.id);
                    const data = d.data() as ExamEntry;

                    // If studentClass is known, also filter to this student's class
                    // to avoid picking up homonymous students in other classes
                    if (studentClass && data.studentClass && data.studentClass !== studentClass) {
                        // Only reject if we matched by name (not by rollNo or email)
                        const matchedByRollNo = userRollNo && data.rollNo === userRollNo;
                        const matchedByEmail  = userEmail  && data.studentEmail === userEmail;
                        if (!matchedByRollNo && !matchedByEmail) return;
                    }

                    results.push({ ...data, id: d.id });
                }
            });

            // Sort by date descending
            results.sort((a, b) => {
                const dA = new Date(a.date).getTime() || 0;
                const dB = new Date(b.date).getTime() || 0;
                return dB - dA;
            });

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
        setReadResultIds(state, action) {
            state.readIds = action.payload;
        },
        markResultAsRead(state, action) {
            if (!state.readIds.includes(action.payload)) {
                state.readIds.push(action.payload);
            }
        }
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

export const { clearResults, setReadResultIds, markResultAsRead } = resultsSlice.actions;

import AsyncStorage from '@react-native-async-storage/async-storage';

export const persistReadResultIds = async (ids: string[]) => {
    try {
        await AsyncStorage.setItem('readResultIds', JSON.stringify(ids));
    } catch (e) {
        console.error('Failed to save readResultIds to storage', e);
    }
};

export const loadReadResultIds = () => async (dispatch: any) => {
    try {
        const data = await AsyncStorage.getItem('readResultIds');
        if (data) {
            dispatch(setReadResultIds(JSON.parse(data)));
        }
    } catch (e) {
        console.error('Failed to load readResultIds from storage', e);
    }
};

export default resultsSlice.reducer;
