import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

export const fetchExams = createAsyncThunk('exams/fetchExams', async () => {
    const snap = await getDocs(collection(db, 'exams'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
});

export const saveExam = createAsyncThunk('exams/saveExam', async (examData: any, { dispatch }) => {
    const finalData = { ...examData, updatedAt: serverTimestamp() };
    dispatch(addOrUpdateExam(examData)); // Optimistic update immediately
    await setDoc(doc(db, 'exams', examData.id), finalData, { merge: true });
    return finalData;
});

export const deleteExam = createAsyncThunk('exams/deleteExam', async (id: string, { dispatch }) => {
    dispatch(removeExam(id)); // Optimistic removal
    await deleteDoc(doc(db, 'exams', id));
    return id;
});

export const saveBulkExams = createAsyncThunk('exams/saveBulkExams', async (payload: { examDataArray: any[] }, { dispatch }) => {
    const promises = payload.examDataArray.map(async (examData) => {
        const finalData = { ...examData, updatedAt: serverTimestamp() };
        dispatch(addOrUpdateExam(examData));
        await setDoc(doc(db, 'exams', examData.id), finalData, { merge: true });
    });
    await Promise.all(promises);
    return true;
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

// ── Professional RTK Selectors ──────────────────────────────────────────────

export const selectAllExams = (state: { exams: ExamsState }) => state.exams.data;

export const selectFilteredExams = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        const term = (filters.searchTerm || '').toLowerCase();
        return exams.filter((e: any) => {
            const matchesSearch = !term ||
                (e.studentName || '').toLowerCase().includes(term) ||
                (e.rollNo || '').toLowerCase().includes(term) ||
                (e.title || '').toLowerCase().includes(term) ||
                (e.category || '').toLowerCase().includes(term);
            const matchesClass = filters.filterClass ? e.studentClass === filters.filterClass : true;
            const matchesTestNo = filters.filterTestNo ? e.title === filters.filterTestNo : true;
            const matchesCategory = filters.filterCategory ? e.category === filters.filterCategory : true;
            return matchesSearch && matchesClass && matchesTestNo && matchesCategory;
        });
    }
);

export const selectStudentProgressList = createSelector(
    [
        (_state: any, students: any[], _filters: any) => students,
        (state: any, _students: any[], filters: any) => selectFilteredExams(state, filters),
        (_state: any, _students: any[], filters: any) => filters
    ],
    (students, filteredExams, filters) => {
        const map = new Map<string, any>();
        
        for (const s of students) {
            const rollNo = s.studentId || s.rollno || s.id || '';
            const grade = s.grade || s.class || '';
            const key = rollNo + '|' + grade;
            if (!map.has(key)) {
                map.set(key, {
                    studentName: s.name,
                    fatherName: s.fatherName || '',
                    gender: s.gender || '',
                    rollNo,
                    studentClass: grade,
                    studentEmail: s.email || '',
                    totalMarks: 0,
                    obtainedMarks: 0,
                    testCount: 0,
                    tests: [],
                    latestExam: { id: '', title: '', date: '', category: '', rollNo, studentName: s.name, studentEmail: s.email || '', studentClass: grade, totalMarks: '0', obtainedMarks: '0', status: '', description: '' },
                });
            }
        }

        for (const e of filteredExams) {
            const key = (e.rollNo || e.studentName || '') + '|' + (e.studentClass || '');
            const total = parseFloat(e.totalMarks || '0') || 0;
            const obtained = parseFloat(e.obtainedMarks || '0') || 0;
            const existing = map.get(key);

            if (existing) {
                existing.totalMarks += total;
                existing.obtainedMarks += obtained;
                existing.testCount += 1;
                if (e.title && !existing.tests.includes(e.title)) existing.tests.push(e.title);
                if (e.title > existing.latestExam.title) existing.latestExam = e;
                if (!existing.studentName || existing.studentName === 'Unknown') existing.studentName = e.studentName || existing.studentName;
            } else {
                map.set(key, {
                    studentName: e.studentName || 'Unknown',
                    fatherName: '',
                    gender: '',
                    rollNo: e.rollNo || '',
                    studentClass: e.studentClass || '',
                    studentEmail: e.studentEmail || '',
                    totalMarks: total,
                    obtainedMarks: obtained,
                    testCount: 1,
                    tests: e.title ? [e.title] : [],
                    latestExam: e,
                });
            }
        }

        const term = (filters.searchTerm || '').toLowerCase();
        return Array.from(map.values())
            .filter(s => {
                const matchesSearch = !term ||
                    s.studentName.toLowerCase().includes(term) ||
                    s.rollNo.toLowerCase().includes(term) ||
                    s.studentClass.toLowerCase().includes(term);
                const matchesClass = filters.filterClass ? s.studentClass === filters.filterClass : true;
                const matchesTest = filters.filterTestNo ? s.tests.includes(filters.filterTestNo) : true;
                const matchesGender = filters.filterGender ? s.gender.toLowerCase() === filters.filterGender.toLowerCase() : true;
                return matchesSearch && matchesClass && matchesTest && matchesGender;
            })
            .sort((a, b) => a.studentName.localeCompare(b.studentName));
    }
);

export const selectResultDetails = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        if (!filters.rollNo && !filters.studentName) return { detailSubjects: [], existingData: {} };

        const studentExams = exams.filter((e: any) => {
            const matchUser = e.rollNo === filters.rollNo || e.studentName === filters.studentName;
            const matchCategory = filters.filterCategory ? e.category === filters.filterCategory : true;
            return matchUser && matchCategory;
        });

        const existingData: Record<string, string> = {};
        const subjectMap = new Map<string, string>();

        studentExams.forEach((e: any) => {
            if (e.books) {
                e.books.forEach((b: any) => {
                    if (!subjectMap.has(b.name) || parseFloat(b.totalMarks) > parseFloat(subjectMap.get(b.name) || '0')) {
                        subjectMap.set(b.name, b.totalMarks);
                    }
                    existingData[`${e.title}_${b.name}`] = b.obtainedMarks;
                });
            }
        });

        const rawDetailSubjects = Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks }));
        
        return { detailSubjects: rawDetailSubjects, existingData };
    }
);

export const selectBulkEntryData = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        const relevantExams = exams.filter((e: any) => {
            const matchClass = !filters.bulkClass || e.studentClass === filters.bulkClass;
            const matchTestNo = !filters.bulkTestNo || e.title === filters.bulkTestNo;
            const matchCategory = !filters.bulkCategory || e.category === filters.bulkCategory;
            return matchClass && matchTestNo && matchCategory;
        });

        const existingData: Record<string, string> = {};
        const subjectMap = new Map<string, string>();

        relevantExams.forEach((e: any) => {
            if (e.books) {
                e.books.forEach((b: any) => {
                    if (!subjectMap.has(b.name) || parseFloat(b.totalMarks) > parseFloat(subjectMap.get(b.name) || '0')) {
                        subjectMap.set(b.name, b.totalMarks);
                    }
                    existingData[`${e.rollNo}_${b.name}`] = b.obtainedMarks;
                });
            }
        });

        const rawBulkSubjects = Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks }));
        return { bulkSubjects: rawBulkSubjects, existingData };
    }
);

export default examsSlice.reducer;
