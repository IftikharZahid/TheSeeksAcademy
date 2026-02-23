import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Dispatch, Unsubscribe } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────

export interface AdminStudent {
    id: string;
    name: string;
    fatherName: string;
    studentId: string;
    email: string;
    password: string;
    authUid?: string;
    authError?: string;
    grade: string;
    profileImage?: string;
    gender?: string;
    fullname?: string;
    rollno?: string;
    class?: string;
    month?: string;
    section?: string;
    session?: string;
    phone?: string;
}

export interface BookEntry {
    name: string;
    totalMarks: string;
    obtainedMarks: string;
}

export interface AdminExam {
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

export interface AdminComplaint {
    id: string;
    subject: string;
    category: string;
    description: string;
    userEmail: string;
    userName?: string;
    status: 'Pending' | 'Resolved';
    createdAt: any;
}

export interface ClassSession {
    id: string;
    subject: string;
    time: string;
    room: string;
    instructor: string;
    className: string;
    lectureNumber?: string;
}

export interface AdminFeeRecord {
    studentId: string;
    studentName: string;
    rollno: string;
    class: string;
    month: string; // Added for fee month tracking
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    status: 'paid' | 'pending' | 'partial';
}

interface AdminState {
    students: AdminStudent[];
    exams: AdminExam[];
    complaints: AdminComplaint[];
    timetable: Record<string, ClassSession[]>;
    feeRecords: AdminFeeRecord[];
    studentsLoading: boolean;
    examsLoading: boolean;
    complaintsLoading: boolean;
    timetableLoading: boolean;
    feeLoading: boolean;
}

const initialState: AdminState = {
    students: [],
    exams: [],
    complaints: [],
    timetable: {},
    feeRecords: [],
    studentsLoading: true,
    examsLoading: true,
    complaintsLoading: true,
    timetableLoading: true,
    feeLoading: true,
};

// ── Async Thunks ───────────────────────────────────────

/** Fetch combined fee records by merging students + fees collections */
export const fetchAdminFeeRecords = createAsyncThunk(
    'admin/fetchAdminFeeRecords',
    async () => {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsData: AdminStudent[] = studentsSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as AdminStudent));

        const feesSnapshot = await getDocs(collection(db, 'fees'));
        const feesData: { [key: string]: any } = {};
        feesSnapshot.docs.forEach(d => {
            feesData[d.id] = d.data();
        });

        const records: AdminFeeRecord[] = studentsData.map(student => {
            const feeData = feesData[student.id];
            if (feeData) {
                const pending = feeData.totalFee - feeData.paidAmount;
                return {
                    studentId: student.id,
                    studentName: student.fullname || student.name || 'Unknown',
                    rollno: student.rollno || '',
                    class: student.class || '',
                    month: student.month || '',
                    totalFee: feeData.totalFee,
                    paidAmount: feeData.paidAmount,
                    pendingAmount: pending,
                    status: pending === 0 ? 'paid' : pending === feeData.totalFee ? 'pending' : 'partial',
                };
            } else {
                return {
                    studentId: student.id,
                    studentName: student.fullname || student.name || 'Unknown',
                    rollno: student.rollno || '',
                    class: student.class || '',
                    month: student.month || '',
                    totalFee: 50000,
                    paidAmount: 0,
                    pendingAmount: 50000,
                    status: 'pending',
                };
            }
        });

        return records;
    }
);

/** Mark a complaint as Resolved */
export const resolveComplaint = createAsyncThunk(
    'admin/resolveComplaint',
    async (complaintId: string) => {
        await updateDoc(doc(db, 'complaints', complaintId), { status: 'Resolved' });
        return complaintId;
    }
);

/** Permanently delete a complaint */
export const deleteComplaint = createAsyncThunk(
    'admin/deleteComplaint',
    async (complaintId: string) => {
        await deleteDoc(doc(db, 'complaints', complaintId));
        return complaintId;
    }
);

// ── Slice ──────────────────────────────────────────────
const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        setStudents(state, action: PayloadAction<AdminStudent[]>) {
            state.students = action.payload;
            state.studentsLoading = false;
        },
        setExams(state, action: PayloadAction<AdminExam[]>) {
            state.exams = action.payload;
            state.examsLoading = false;
        },
        setComplaints(state, action: PayloadAction<AdminComplaint[]>) {
            state.complaints = action.payload;
            state.complaintsLoading = false;
        },
        setTimetable(state, action: PayloadAction<Record<string, ClassSession[]>>) {
            state.timetable = action.payload;
            state.timetableLoading = false;
        },
        setFeeRecords(state, action: PayloadAction<AdminFeeRecord[]>) {
            state.feeRecords = action.payload;
            state.feeLoading = false;
        },
        setStudentsLoading(state, action: PayloadAction<boolean>) {
            state.studentsLoading = action.payload;
        },
        setExamsLoading(state, action: PayloadAction<boolean>) {
            state.examsLoading = action.payload;
        },
        setComplaintsLoading(state, action: PayloadAction<boolean>) {
            state.complaintsLoading = action.payload;
        },
        setTimetableLoading(state, action: PayloadAction<boolean>) {
            state.timetableLoading = action.payload;
        },
        clearAdmin() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdminFeeRecords.pending, (state) => {
                state.feeLoading = true;
            })
            .addCase(fetchAdminFeeRecords.fulfilled, (state, action) => {
                state.feeRecords = action.payload;
                state.feeLoading = false;
            })
            .addCase(fetchAdminFeeRecords.rejected, (state) => {
                state.feeLoading = false;
            })
            // Optimistic update for resolve
            .addCase(resolveComplaint.fulfilled, (state, action) => {
                const idx = state.complaints.findIndex(c => c.id === action.payload);
                if (idx !== -1) state.complaints[idx].status = 'Resolved';
            })
            // Optimistic removal for delete
            .addCase(deleteComplaint.fulfilled, (state, action) => {
                state.complaints = state.complaints.filter(c => c.id !== action.payload);
            });
    },
});

export const {
    setStudents,
    setExams,
    setComplaints,
    setTimetable,
    setFeeRecords,
    setStudentsLoading,
    setExamsLoading,
    setComplaintsLoading,
    setTimetableLoading,
    clearAdmin,
} = adminSlice.actions;
export default adminSlice.reducer;

// ── Firebase Listeners (call from AdminDashboard) ──────

export const initStudentsListener = (dispatch: Dispatch) => {
    return onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
            const students: AdminStudent[] = [];
            snapshot.forEach((d) => students.push({ id: d.id, ...d.data() } as AdminStudent));
            dispatch(setStudents(students));
        },
        (error) => {
            console.error('Error listening to students:', error);
            dispatch(setStudentsLoading(false));
        }
    );
};

export const initExamsListener = (dispatch: Dispatch) => {
    return onSnapshot(
        collection(db, 'exams'),
        (snapshot) => {
            const exams: AdminExam[] = [];
            snapshot.forEach((d) => exams.push({ id: d.id, ...d.data() } as AdminExam));
            dispatch(setExams(exams));
        },
        (error) => {
            console.error('Error listening to exams:', error);
            dispatch(setExamsLoading(false));
        }
    );
};

export const initComplaintsListener = (dispatch: Dispatch) => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const complaints: AdminComplaint[] = [];
            snapshot.forEach((d) => complaints.push({ id: d.id, ...d.data() } as AdminComplaint));
            dispatch(setComplaints(complaints));
        },
        (error) => {
            console.error('Error listening to complaints:', error);
            dispatch(setComplaintsLoading(false));
        }
    );
};

export const initTimetableListener = (dispatch: Dispatch) => {
    return onSnapshot(
        collection(db, 'timetable'),
        (snapshot) => {
            const timetable: Record<string, ClassSession[]> = {};
            snapshot.forEach((d) => {
                timetable[d.id] = d.data().classes || [];
            });
            dispatch(setTimetable(timetable));
        },
        (error) => {
            console.error('Error listening to timetable:', error);
            dispatch(setTimetableLoading(false));
        }
    );
};

/** Real-time fee listener — merges students + fees collections */
export const initFeeListener = (dispatch: Dispatch) => {
    let studentsData: AdminStudent[] = [];
    let feesData: { [key: string]: any } = {};
    let studentsReady = false;
    let feesReady = false;

    const computeRecords = () => {
        if (!studentsReady || !feesReady) return;
        const records: AdminFeeRecord[] = studentsData.map(student => {
            const feeData = feesData[student.id];
            if (feeData) {
                const pending = feeData.totalFee - feeData.paidAmount;
                return {
                    studentId: student.id,
                    studentName: student.fullname || student.name || 'Unknown',
                    rollno: student.rollno || '',
                    class: student.class || '',
                    month: student.month || '',
                    totalFee: feeData.totalFee,
                    paidAmount: feeData.paidAmount,
                    pendingAmount: pending,
                    status: pending === 0 ? 'paid' : pending === feeData.totalFee ? 'pending' : 'partial',
                } as AdminFeeRecord;
            }
            return {
                studentId: student.id,
                studentName: student.fullname || student.name || 'Unknown',
                rollno: student.rollno || '',
                class: student.class || '',
                month: student.month || '',
                totalFee: 50000,
                paidAmount: 0,
                pendingAmount: 50000,
                status: 'pending',
            } as AdminFeeRecord;
        });
        dispatch(setFeeRecords(records));
    };

    const unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
            studentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminStudent));
            studentsReady = true;
            computeRecords();
        },
        (error) => {
            console.error('Error in fee listener (students):', error);
        }
    );

    const unsubFees = onSnapshot(
        collection(db, 'fees'),
        (snapshot) => {
            feesData = {};
            snapshot.docs.forEach(d => { feesData[d.id] = d.data(); });
            feesReady = true;
            computeRecords();
        },
        (error) => {
            console.error('Error in fee listener (fees):', error);
        }
    );

    return () => {
        unsubStudents();
        unsubFees();
    };
};
