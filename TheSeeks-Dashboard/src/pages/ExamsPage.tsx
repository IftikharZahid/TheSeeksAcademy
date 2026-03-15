import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchExams, addOrUpdateExam, removeExam } from '../store/slices/examsSlice';
import { fetchStudents } from '../store/slices/studentsSlice';
import { fetchTeachers } from '../store/slices/teachersSlice';

interface BookEntry {
    name: string;
    totalMarks: string;
    obtainedMarks: string;
}

interface ExamEntry {
    id: string;
    title: string;
    date: string;
    category: string;
    rollNo: string;
    studentName: string;
    studentEmail: string;
    studentClass: string;
    books?: BookEntry[];
    bookName?: string;
    totalMarks: string;
    obtainedMarks: string;
    status: string;
    description: string;
}

interface StudentProgress {
    studentName: string;
    fatherName: string;
    gender: string;
    rollNo: string;
    studentClass: string;
    studentEmail: string;
    totalMarks: number;
    obtainedMarks: number;
    testCount: number;
    tests: string[];
    latestExam: ExamEntry;
}

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Year', 'Final'];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];

const SUBJECTS = [
    'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
    'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics',
    'Ethics', 'Chemistry', 'Biology'
];

export default function ExamsPage() {
    const dispatch = useAppDispatch();
    
    const { data: exams, status: examsStatus } = useAppSelector((s: any) => s.exams);
    const { data: studentsRaw, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    
    const loading = examsStatus === 'loading' || examsStatus === 'idle' || studentsStatus === 'loading' || teachersStatus === 'loading';

    // Students slice uses `id` for uid, but ExamsPage expects fallback arrays.
    // The Redux slice already normalizes fatherName, email, etc.
    const students = useMemo(() => studentsRaw.map((s: any) => ({
        ...s,
        studentId: s.id,
        grade: s.grade || s.class || '',
        gender: s.gender || '',
        rollno: s.rollno || s.studentId || '',
    })), [studentsRaw]);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterTestNo, setFilterTestNo] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [visibleCount, setVisibleCount] = useState(200);

    // Modals
    const [choiceModal, setChoiceModal] = useState(false);
    const [formModal, setFormModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [detailsModal, setDetailsModal] = useState(false);
    
    // Bulk Entry State
    const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
    const [bulkClass, setBulkClass] = useState('');
    const [bulkTestNo, setBulkTestNo] = useState('');
    const [bulkCategory, setBulkCategory] = useState(CATEGORIES[0]);
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkSubjects, setBulkSubjects] = useState<{name: string, maxMarks: string}[]>([]);
    const [bulkData, setBulkData] = useState<Record<string, string>>({}); // Key: rollNo_subjectName
    const [newBulkSubject, setNewBulkSubject] = useState('');
    const [newBulkTotalMarks, setNewBulkTotalMarks] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    
    const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
    const [selectedStudentData, setSelectedStudentData] = useState<StudentProgress | null>(null); // For details modal/sheet
    
    // Student Details Spreadsheet State
    const [detailSubjects, setDetailSubjects] = useState<{name: string, maxMarks: string}[]>([]);
    const [detailData, setDetailData] = useState<Record<string, string>>({}); // Key: testNo_subjectName
    const [newDetailSubject, setNewDetailSubject] = useState('');
    const [newDetailTotalMarks, setNewDetailTotalMarks] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    
    // Form States
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [rollNo, setRollNo] = useState('');
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [description, setDescription] = useState('');
    
    // Multi-book state
    const [entryBooks, setEntryBooks] = useState<BookEntry[]>([]);
    const [currentBookName, setCurrentBookName] = useState('');
    const [currentTotalMarks, setCurrentTotalMarks] = useState('');
    const [currentObtainedMarks, setCurrentObtainedMarks] = useState('');

    // Active Tab in Form
    const [activeTab, setActiveTab] = useState<'info' | 'marks'>('info');

    useEffect(() => {
        if (examsStatus === 'idle') dispatch(fetchExams());
        if (studentsStatus === 'idle') dispatch(fetchStudents());
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
    }, [dispatch, examsStatus, studentsStatus, teachersStatus]);

    // ── Data Processing ─────────────────────────────────────────────────────────

    const filteredExams = useMemo(() => {
        return exams.filter((e: any) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term ||
                (e.studentName || '').toLowerCase().includes(term) ||
                (e.rollNo || '').toLowerCase().includes(term) ||
                (e.title || '').toLowerCase().includes(term) ||
                (e.category || '').toLowerCase().includes(term);
            const matchesClass = filterClass ? e.studentClass === filterClass : true;
            const matchesTestNo = filterTestNo ? e.title === filterTestNo : true;
            return matchesSearch && matchesClass && matchesTestNo;
        });
    }, [exams, searchTerm, filterClass, filterTestNo]);

    const studentProgressList = useMemo(() => {
        // Start by seeding ALL registered students so they always show even with 0 exams
        const map = new Map<string, StudentProgress>();
        for (const s of students) {
            const rollNo = s.studentId || s.rollno || s.id || '';
            const key = rollNo + '|' + (s.grade || '');
            if (!map.has(key)) {
                const dummyExam: ExamEntry = { id: '', title: '', date: '', category: '', rollNo, studentName: s.name, studentEmail: s.email || '', studentClass: s.grade || '', totalMarks: '0', obtainedMarks: '0', status: '', description: '' };
                map.set(key, {
                    studentName: s.name,
                    fatherName: s.fatherName || '',
                    gender: s.gender || '',
                    rollNo,
                    studentClass: s.grade || '',
                    studentEmail: s.email || '',
                    totalMarks: 0,
                    obtainedMarks: 0,
                    testCount: 0,
                    tests: [],
                    latestExam: dummyExam,
                });
            }
        }

        // Now overlay exam data on top
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
                // Fill in student details from exam if the student wasn't in students collection
                if (!existing.studentName || existing.studentName === 'Unknown') existing.studentName = e.studentName || existing.studentName;
            } else {
                // Student exists in exams but not in students collection — still show them
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

        // Apply search/class/test filters
        const term = searchTerm.toLowerCase();
        return Array.from(map.values())
            .filter(s => {
                const matchesSearch = !term ||
                    s.studentName.toLowerCase().includes(term) ||
                    s.rollNo.toLowerCase().includes(term) ||
                    s.studentClass.toLowerCase().includes(term);
                const matchesClass = filterClass ? s.studentClass === filterClass : true;
                const matchesTest = filterTestNo ? s.tests.includes(filterTestNo) : true;
                const matchesGender = filterGender ? s.gender.toLowerCase() === filterGender.toLowerCase() : true;
                return matchesSearch && matchesClass && matchesTest && matchesGender;
            })
            .sort((a, b) => a.studentName.localeCompare(b.studentName));
    }, [students, filteredExams, searchTerm, filterClass, filterTestNo, filterGender]);

    // ── Bulk Entry Logic ────────────────────────────────────────────────────────

    // When bulk Class & Test No change, auto-load existing marks into bulkData
    useEffect(() => {
        if (!isBulkEntryMode || !bulkClass || !bulkTestNo) return;
        
        const existingData: Record<string, string> = {};
        const subjectMap = new Map<string, string>();

        const relevantExams = exams.filter((e: any) => e.studentClass === bulkClass && e.title === bulkTestNo);
        
        relevantExams.forEach((e: any) => {
            if (e.books) {
                e.books.forEach((b: any) => {
                    subjectMap.set(b.name, b.totalMarks);
                    existingData[`${e.rollNo}_${b.name}`] = b.obtainedMarks;
                });
            }
        });

        setBulkSubjects(Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks })));
        setBulkData(existingData);
        if (relevantExams.length > 0) {
            setBulkDate(relevantExams[0].date ? new Date(relevantExams[0].date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setBulkCategory(relevantExams[0].category || CATEGORIES[0]);
        }
    }, [isBulkEntryMode, bulkClass, bulkTestNo, exams]);

    const handleAddBulkSubject = () => {
        if (!newBulkSubject.trim() || !newBulkTotalMarks.trim()) {
            alert('Enter subject name and total marks.'); return;
        }
        if (bulkSubjects.some(s => s.name.toLowerCase() === newBulkSubject.trim().toLowerCase())) {
            alert('Subject already exists.'); return;
        }
        setBulkSubjects([...bulkSubjects, { name: newBulkSubject.trim(), maxMarks: newBulkTotalMarks.trim() }]);
        setNewBulkSubject('');
        setNewBulkTotalMarks('');
    };

    // ── Student Details Spreadsheet Logic ───────────────────────────────────────
    useEffect(() => {
        if (!selectedStudentData) return;

        // Use ALL exams (not filteredExams) so the sheet is populated regardless of active page filters
        const studentExams = exams.filter((e: any) => e.rollNo === selectedStudentData.rollNo || e.studentName === selectedStudentData.studentName);
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

        setDetailSubjects(Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks })));
        setDetailData(existingData as any);
    }, [selectedStudentData, exams]);

    const handleAddDetailSubject = () => {
        if (!newDetailSubject.trim() || !newDetailTotalMarks.trim()) {
            alert('Enter subject name and total marks.'); return;
        }
        if (detailSubjects.some(s => s.name.toLowerCase() === newDetailSubject.trim().toLowerCase())) {
            alert('Subject already exists.'); return;
        }
        setDetailSubjects([...detailSubjects, { name: newDetailSubject.trim(), maxMarks: newDetailTotalMarks.trim() }]);
        setNewDetailSubject('');
        setNewDetailTotalMarks('');
    };

    const handleSaveStudentDetails = async () => {
        if (!selectedStudentData) return;
        setDetailLoading(true);

        const rollNo = selectedStudentData.rollNo;
        const studentName = selectedStudentData.studentName;
        const studentClass = selectedStudentData.studentClass;
        const studentEmail = selectedStudentData.studentEmail;
        let updateCount = 0;

        try {
            for (const testNo of TITLE_OPTIONS) {
                const testBooks: BookEntry[] = [];
                let totalObtained = 0;
                let totalPossible = 0;

                detailSubjects.forEach(sub => {
                    const val = detailData[`${testNo}_${sub.name}`];
                    // @ts-ignore
                    if (val && val.trim() !== '') {
                        testBooks.push({
                            name: sub.name,
                            totalMarks: sub.maxMarks,
                            // @ts-ignore
                            obtainedMarks: val.trim()
                        });
                        // @ts-ignore
                        totalObtained += parseFloat(val) || 0;
                        totalPossible += parseFloat(sub.maxMarks) || 0;
                    }
                });

                if (testBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    const existing = exams.find((e: any) => (e.rollNo === rollNo || e.studentName === studentName) && e.title === testNo);
                    const formattedDate = existing?.date || format(new Date(), 'dd MMM yyyy');
                    const category = existing?.category || CATEGORIES[0];
                    const docId = existing ? existing.id : Date.now().toString() + '_' + rollNo + '_' + testNo;
                    
                    const examData = {
                        id: docId,
                        title: testNo,
                        date: formattedDate,
                        category: category,
                        rollNo,
                        studentName,
                        studentEmail,
                        studentClass,
                        books: testBooks,
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: existing?.description || 'Details Uploaded Record',
                        updatedAt: serverTimestamp(),
                    };

                    // Optimistic update
                    dispatch(addOrUpdateExam(examData as any));

                    // Network Sync
                    if (existing) {
                        setDoc(doc(db, 'exams', existing.id), examData, { merge: true }).catch(console.error);
                    } else {
                        setDoc(doc(db, 'exams', docId), examData).catch(console.error);
                    }
                    updateCount++;
                }
            }
            alert(`Successfully queued ${updateCount} test records for ${studentName}!`);
        } catch (e) {
            console.error(e);
            alert('Failed to save student details');
        }
        
        setDetailLoading(false);
    };

    const handleSaveBulk = async () => {
        if (!bulkClass || !bulkTestNo) return;
        setBulkLoading(true);

        const classStudents = students.filter((s: any) => s.grade === bulkClass);
        const formattedDate = format(new Date(bulkDate), 'dd MMM yyyy');
        
        let updateCount = 0;

        try {
            for (const student of classStudents) {
                const rollNo = student.studentId;
                
                // Collect all books that have an obtained mark filled in
                const studentBooks: BookEntry[] = [];
                let totalObtained = 0;
                let totalPossible = 0;

                bulkSubjects.forEach(sub => {
                    const val = bulkData[`${rollNo}_${sub.name}`];
                    if (val && val.trim() !== '') {
                        studentBooks.push({
                            name: sub.name,
                            totalMarks: sub.maxMarks,
                            obtainedMarks: val.trim()
                        });
                        totalObtained += parseFloat(val) || 0;
                        totalPossible += parseFloat(sub.maxMarks) || 0;
                    }
                });

                // Only save if the student has at least one subject filled
                if (studentBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    const existing = exams.find((e: any) => e.rollNo === rollNo && e.title === bulkTestNo && e.studentClass === bulkClass);
                    const docId = existing ? existing.id : Date.now().toString() + '_' + rollNo;

                    const examData = {
                        id: docId,
                        title: bulkTestNo,
                        date: formattedDate,
                        category: bulkCategory,
                        rollNo: rollNo,
                        studentName: student.name,
                        studentEmail: student.email || '',
                        studentClass: bulkClass,
                        books: studentBooks,
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: 'Bulk Uploaded Record',
                        updatedAt: serverTimestamp(),
                    };

                    // Optimistic Redux UI Update
                    dispatch(addOrUpdateExam(examData as any));

                    // Background Sync
                    if (existing) {
                        setDoc(doc(db, 'exams', existing.id), examData, { merge: true }).catch(console.error);
                    } else {
                        setDoc(doc(db, 'exams', docId), examData).catch(console.error);
                    }
                    updateCount++;
                }
            }
            alert(`Successfully queued records for ${updateCount} students!`);
        } catch (e) {
            console.error(e);
            alert('Failed to queue bulk data');
        }
        
        setBulkLoading(false);
    };


    // ── Form Actions ─────────────────────────────────────────────────────────────

    const resetForm = () => {
        setEditingExam(null);
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory(CATEGORIES[0]);
        setRollNo('');
        setStudentName('');
        setStudentEmail('');
        setStudentClass('');
        setEntryBooks([]);
        setCurrentBookName('');
        setCurrentTotalMarks('');
        setCurrentObtainedMarks('');
        setDescription('');
        setActiveTab('info');
    };

    const handleAddBook = () => {
        if (!currentBookName.trim() || !currentTotalMarks.trim() || !currentObtainedMarks.trim()) {
            alert('Please fill out book name, total marks, and obtained marks.');
            return;
        }
        if (entryBooks.some(b => b.name.toLowerCase() === currentBookName.trim().toLowerCase())) {
            alert('This subject is already added.');
            return;
        }
        setEntryBooks([...entryBooks, {
            name: currentBookName.trim(),
            totalMarks: currentTotalMarks.trim(),
            obtainedMarks: currentObtainedMarks.trim()
        }]);
        setCurrentBookName('');
        setCurrentTotalMarks('');
        setCurrentObtainedMarks('');
    };

    const handleSaveRecord = async () => {
        if (!title || !category || !studentName) {
            alert('Please fill Title, Category, and Student Name');
            return;
        }

        // Format Date to match mobile app's legacy format `DD MMM YYYY`
        const parsedDate = new Date(date);
        const formattedDate = format(parsedDate, 'dd MMM yyyy');

        const isDuplicate = exams.some((exam: any) => {
            if (editingExam && exam.id === editingExam.id) return false;
            return exam.title === title && exam.date === formattedDate && exam.rollNo === rollNo;
        });

        if (isDuplicate) {
            alert('An exam with this Title + Roll No already exists.');
            return;
        }

        let computedStatus = 'Absent';
        let totalObtained = 0;
        let totalPossible = 0;

        if (entryBooks.length > 0) {
            entryBooks.forEach(book => {
                totalObtained += parseFloat(book.obtainedMarks) || 0;
                totalPossible += parseFloat(book.totalMarks) || 0;
            });
            if (totalPossible > 0) {
                computedStatus = (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
            }
        }

        const docId = editingExam ? editingExam.id : Date.now().toString();
        const examData = {
            id: docId,
            title,
            date: formattedDate, // Store as string like mobile app does
            category,
            rollNo,
            studentName,
            studentEmail,
            studentClass,
            books: entryBooks.length > 0 ? entryBooks : undefined,
            totalMarks: totalPossible.toString(),
            obtainedMarks: totalObtained.toString(),
            status: computedStatus,
            description,
            updatedAt: serverTimestamp(),
        };

        try {
            // Optimistic
            dispatch(addOrUpdateExam(examData as any));
            setFormModal(false);

            if (editingExam) {
                setDoc(doc(db, 'exams', editingExam.id), examData, { merge: true }).catch(console.error);
            } else {
                setDoc(doc(db, 'exams', docId), examData).catch(console.error);
            }
        } catch (error) {
            alert('Failed to save entry');
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            dispatch(removeExam(id));
            setDetailsModal(false);
            deleteDoc(doc(db, 'exams', id)).catch(console.error);
        } catch (e) {
            alert('Failed to delete');
        }
    };

    // ── Excel Upload ────────────────────────────────────────────────────────────

    const handleDownloadTemplate = () => {
        const sampleData = [
            { title: 'T1', category: 'Monthly', date: '2024-03-20', rollNo: '101', studentName: 'Ahmed Ali', studentClass: '9th', studentEmail: 'ahmed@example.com', Urdu_Total: 100, Urdu_Obtained: 85, English_Total: 100, English_Obtained: 72, Math_Total: 100, Math_Obtained: 90, description: 'First Test' }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Exam Template');
        XLSX.writeFile(wb, 'Exam_Record_Template.xlsx');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!Array.isArray(data) || data.length === 0) {
                    alert('Invalid or empty excel file');
                    return;
                }

                alert(`Processing ${data.length} records. This feature is a work in progress on Web but logic mirrors the mobile app!`);
                setUploadModal(false);
            } catch (err) {
                console.error(err);
                alert('Failed to read Excel file');
            }
        };
        reader.readAsBinaryString(file);
    };

    // ── Result Details Viewer ───────────────────────────────────────────────────

    const openDetailsSheet = (student: StudentProgress) => {
        setSelectedStudentData(student);
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{isBulkEntryMode ? '📝 Bulk Spreadsheet Entry' : '📊 Exams & Results'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{isBulkEntryMode ? 'Rapidly enter marks for an entire class' : 'Comprehensive tracking of student performance'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {!isBulkEntryMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                                <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{studentProgressList.length}</span>
                                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterClass || filterGender) ? 'found' : 'students'}</span>
                            </div>
                        )}
                        <button className={`btn ${isBulkEntryMode ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setIsBulkEntryMode(!isBulkEntryMode)} style={{ padding: '5px 12px', fontSize: 12, height: 30, borderColor: 'var(--primary)', color: isBulkEntryMode ? 'var(--primary)' : '#fff' }}>
                            {isBulkEntryMode ? '🔙 Back to Results' : '📝 Bulk Entry'}
                        </button>
                        {!isBulkEntryMode && (
                            <button className="btn btn-primary" onClick={() => setChoiceModal(true)} style={{ padding: '5px 12px', fontSize: 12, height: 30 }}>
                                ➕ Add
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter / Setup Bar */}
            <div style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                {!isBulkEntryMode ? (
                    <>
                        <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>
                            <span className="search-icon" style={{ fontSize: 12 }}>🔍</span>
                            <input 
                                placeholder="Search student, ID..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', fontSize: 12 }}
                            />
                        </div>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                            <option value="">All Classes</option>
                            {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterTestNo} onChange={e => setFilterTestNo(e.target.value)}>
                            <option value="">All Tests</option>
                            {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                            {['', 'Male', 'Female'].map(g => (
                                <button key={g} onClick={() => setFilterGender(g)} style={{ padding: '2px 8px', height: 26, fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: filterGender === g ? 700 : 400, background: filterGender === g ? 'var(--primary)' : 'transparent', color: filterGender === g ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
                                    {g === '' ? 'All' : g === 'Male' ? '👦 Boys' : '👧 Girls'}
                                </button>
                            ))}
                        </div>
                        {(searchTerm || filterClass || filterTestNo || filterGender) && (
                            <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearchTerm(''); setFilterClass(''); setFilterTestNo(''); setFilterGender(''); }}>
                                ✕ Clear
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkClass} onChange={e => setBulkClass(e.target.value)}>
                            <option value="">* Class</option>
                            {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkTestNo} onChange={e => setBulkTestNo(e.target.value)}>
                            <option value="">* Test No</option>
                            {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} disabled={!bulkClass || !bulkTestNo}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="date" className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkDate} onChange={e => setBulkDate(e.target.value)} disabled={!bulkClass || !bulkTestNo} />
                    </>
                )}
            </div>

            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {!isBulkEntryMode ? (
                        !selectedStudentData ? (
                            // MASTER LIST VIEW
                            <div className="table-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ overflow: 'auto', flex: 1 }}>
                                    <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                            <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center' }}>#</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 60, textAlign: 'center' }}>Roll</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Name</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>Father</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Class</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>Gender</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>Tests</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 80 }}>Total</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 80 }}>Obtained</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 60, borderLeft: '1px solid rgba(255,255,255,0.15)' }}>%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentProgressList.slice(0, visibleCount).map((s, i) => {
                                                const pct = s.totalMarks > 0 ? ((s.obtainedMarks / s.totalMarks) * 100).toFixed(1) : '0.0';
                                                const pass = parseFloat(pct) >= 40;
                                                return (
                                                    <tr key={i} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }} onClick={() => openDetailsSheet(s)}>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{i + 1}</td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>{s.rollNo}</td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--primary-light)' }}>{s.studentName}</td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{s.fatherName || '—'}</td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12 }}>{s.studentClass}</td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                                                            {s.gender ? (
                                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: s.gender.toLowerCase() === 'male' ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)', color: s.gender.toLowerCase() === 'male' ? '#818cf8' : '#ec4899' }}>
                                                                    {s.gender.toLowerCase() === 'male' ? '♂ M' : '♀ F'}
                                                                </span>
                                                            ) : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{s.testCount}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'center', fontSize: 12 }}>{s.totalMarks}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{s.obtainedMarks}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: pass ? '#10b981' : '#ef4444', borderLeft: '1px solid var(--border)' }}>{pct}%</td>
                                                    </tr>
                                                );
                                            })}
                                            {studentProgressList.length === 0 && (
                                                <tr><td colSpan={100} className="empty" style={{ padding: '30px', fontSize: 12 }}>No student records found matching filters</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {visibleCount < studentProgressList.length && (
                                    <div style={{ textAlign: 'center', padding: '8px', borderTop: '1px solid var(--border)' }}>
                                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px', height: 28 }} onClick={() => setVisibleCount(v => v + 20)}>
                                            Load More ({studentProgressList.length - visibleCount} remaining)
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // STUDENT DETAIL SPREADSHEET VIEW
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minHeight: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0 }}>
                                    <button className="btn btn-ghost" onClick={() => setSelectedStudentData(null)} style={{ padding: '2px 8px', fontSize: 11, height: 26 }}>← Back</button>
                                    <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{selectedStudentData.studentName}</div>
                                    <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Roll: {selectedStudentData.rollNo}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{selectedStudentData.studentClass}</span>
                                    <div style={{ flex: 1 }} />
                                    <select className="form-input" style={{ width: 130, height: 26, fontSize: 11, padding: '0 6px' }} value={newDetailSubject} onChange={e => setNewDetailSubject(e.target.value)}>
                                        <option value="">+ Subject</option>
                                        {SUBJECTS.filter(s => !detailSubjects.some(ds => ds.name === s)).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <input className="form-input" style={{ width: 56, height: 26, fontSize: 11, padding: '0 6px' }} type="number" placeholder="Marks" value={newDetailTotalMarks} onChange={e => setNewDetailTotalMarks(e.target.value)} />
                                    <button className="btn btn-secondary" style={{ padding: '0 8px', height: 26, fontSize: 11 }} onClick={handleAddDetailSubject}>Add</button>
                                    <button className="btn btn-primary" style={{ padding: '0 10px', height: 26, fontSize: 11 }} onClick={handleSaveStudentDetails} disabled={detailLoading}>
                                        {detailLoading ? '...' : '💾 Save'}
                                    </button>
                                </div>

                                <div className="table-wrap" style={{ flex: 1, minHeight: 0, border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', borderRadius: 8, overflow: 'hidden' }}>
                                    <div style={{ overflow: 'auto', flex: 1 }}>
                                        <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                <tr style={{ background: '#0f172a', color: '#fff' }}>
                                                    <th style={{ padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,0.1)', width: 60, textAlign: 'center', fontSize: 12 }}>Test</th>
                                                    {detailSubjects.map((sub, sIdx) => (
                                                        <th key={sIdx} style={{ borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 100, padding: 0 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                                <select 
                                                                    value={sub.name}
                                                                    onChange={(e) => {
                                                                        const newSubs = [...detailSubjects];
                                                                        newSubs[sIdx].name = e.target.value;
                                                                        setDetailSubjects(newSubs);
                                                                    }}
                                                                    style={{ 
                                                                        background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                                                                        color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '6px 4px', outline: 'none', width: '100%',
                                                                        appearance: 'none', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <option value={sub.name} style={{ color: '#000' }}>{sub.name}</option>
                                                                    {SUBJECTS.filter(s => s !== sub.name && !detailSubjects.some(ds => ds.name === s)).map(s => (
                                                                        <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
                                                                    ))}
                                                                </select>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'rgba(0,0,0,0.15)', position: 'relative' }}>
                                                                    <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 4 }}>Total:</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={sub.maxMarks}
                                                                        onChange={(e) => {
                                                                            const newSubs = [...detailSubjects];
                                                                            newSubs[sIdx].maxMarks = e.target.value;
                                                                            setDetailSubjects(newSubs);
                                                                        }}
                                                                        style={{ 
                                                                            background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 11, fontWeight: 600, 
                                                                            textAlign: 'left', width: 40, outline: 'none' 
                                                                        }}
                                                                    />
                                                                    <button 
                                                                        onClick={() => {
                                                                            if(confirm(`Remove ${sub.name} column?`)) {
                                                                                setDetailSubjects(detailSubjects.filter((_, i) => i !== sIdx));
                                                                            }
                                                                        }}
                                                                        title="Remove Subject"
                                                                        style={{ position: 'absolute', right: 4, background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th style={{ padding: '8px 12px', minWidth: 150 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {TITLE_OPTIONS.map((t, i) => (
                                                    <tr key={t} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                        <td style={{ padding: '6px 12px', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--primary-light)' }}>{t}</td>
                                                        {detailSubjects.map(sub => {
                                                            const key = `${t}_${sub.name}`;
                                                            // @ts-ignore
                                                            const cell = detailData[key] || '';
                                                            
                                                            return (
                                                                <td key={sub.name} style={{ borderRight: '1px solid var(--border)', padding: 0 }}>
                                                                    <input 
                                                                        type="number"
                                                                        style={{ 
                                                                            width: '100%', height: 36, border: 'none', background: 'transparent',
                                                                            textAlign: 'center', color: 'var(--text)', fontWeight: 700, fontSize: 14,
                                                                            outline: 'none', padding: '0 4px'
                                                                        }}
                                                                        placeholder="-"
                                                                        // @ts-ignore
                                                                        value={cell || ''}
                                                                        onChange={(e) => setDetailData({ ...detailData, [key]: e.target.value })}
                                                                        onFocus={(e) => e.target.style.background = 'rgba(16,185,129,0.1)'}
                                                                        onBlur={(e) => e.target.style.background = 'transparent'}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                        <td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        // BULK ENTRY GRID VIEW
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
                            {(!bulkClass || !bulkTestNo) ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                                    <div style={{ textAlign: 'center', color: 'var(--text2)' }}>
                                        <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Select Class & Test No above</div>
                                        <div style={{ fontSize: 12 }}>Select the target class and test number to begin bulk entry.</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>Add Column:</span>
                                        <select className="form-input" style={{ width: 140, height: 26, fontSize: 11, padding: '0 6px' }} value={newBulkSubject} onChange={e => setNewBulkSubject(e.target.value)}>
                                            <option value="">Select Subject</option>
                                            {SUBJECTS.filter(s => !bulkSubjects.some(bs => bs.name === s)).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <input className="form-input" style={{ width: 80, height: 26, fontSize: 11, padding: '0 6px' }} type="number" placeholder="Total Marks" value={newBulkTotalMarks} onChange={e => setNewBulkTotalMarks(e.target.value)} />
                                        <button className="btn btn-secondary" style={{ padding: '0 8px', height: 26, fontSize: 11 }} onClick={handleAddBulkSubject}>+ Add</button>
                                        <div style={{ flex: 1 }} />
                                        <button className="btn btn-primary" style={{ padding: '0 10px', height: 26, fontSize: 11 }} onClick={handleSaveBulk} disabled={bulkLoading}>
                                            {bulkLoading ? '...' : '💾 Save All'}
                                        </button>
                                    </div>

                                    <div className="table-wrap" style={{ flex: 1, border: '1px solid var(--primary)', boxShadow: '0 0 0 1px rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ overflow: 'auto', flex: 1 }}>
                                            <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                    <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #3730a3 100%)', color: '#fff' }}>
                                                        <th style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.2)', width: 80, textAlign: 'center' }}>RollNo</th>
                                                        <th style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.2)', width: 250, textAlign: 'left' }}>Student Name</th>
                                                        {bulkSubjects.map((sub, sIdx) => (
                                                            <th key={sIdx} style={{ borderRight: '1px solid rgba(255,255,255,0.2)', minWidth: 100, padding: 0 }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                                    <select 
                                                                        value={sub.name}
                                                                        onChange={(e) => {
                                                                            const newSubs = [...bulkSubjects];
                                                                            newSubs[sIdx].name = e.target.value;
                                                                            setBulkSubjects(newSubs);
                                                                        }}
                                                                        style={{ 
                                                                            background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                                                                            color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '6px 4px', outline: 'none', width: '100%',
                                                                            appearance: 'none', cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <option value={sub.name} style={{ color: '#000' }}>{sub.name}</option>
                                                                        {SUBJECTS.filter(s => s !== sub.name && !bulkSubjects.some(bs => bs.name === s)).map(s => (
                                                                            <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'rgba(0,0,0,0.15)', position: 'relative' }}>
                                                                        <span style={{ fontSize: 10, color: '#cbd5e1', marginRight: 4 }}>Total:</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={sub.maxMarks}
                                                                            onChange={(e) => {
                                                                                const newSubs = [...bulkSubjects];
                                                                                newSubs[sIdx].maxMarks = e.target.value;
                                                                                setBulkSubjects(newSubs);
                                                                            }}
                                                                            style={{ 
                                                                                background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 11, fontWeight: 600, 
                                                                                textAlign: 'left', width: 40, outline: 'none' 
                                                                            }}
                                                                        />
                                                                        <button 
                                                                            onClick={() => {
                                                                                if(confirm(`Remove ${sub.name} column?`)) {
                                                                                    setBulkSubjects(bulkSubjects.filter((_, i) => i !== sIdx));
                                                                                }
                                                                            }}
                                                                            title="Remove Subject"
                                                                            style={{ position: 'absolute', right: 4, background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.filter((s: any) => s.grade === bulkClass).map((s: any, i: any) => (
                                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                            <td style={{ padding: '10px 16px', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 600 }}>{s.studentId}</td>
                                                            <td style={{ padding: '10px 16px', borderRight: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                                                            
                                                            {bulkSubjects.map(sub => {
                                                                const key = `${s.studentId}_${sub.name}`;
                                                                return (
                                                                    <td key={sub.name} style={{ borderRight: '1px solid var(--border)', padding: 0 }}>
                                                                        <input 
                                                                            type="number"
                                                                            style={{ 
                                                                                width: '100%', height: 44, border: 'none', background: 'transparent',
                                                                                textAlign: 'center', color: 'var(--primary-light)', fontWeight: 800, fontSize: 16,
                                                                                outline: 'none', padding: '0 8px'
                                                                            }}
                                                                            placeholder="-"
                                                                            value={bulkData[key] || ''}
                                                                            onChange={(e) => setBulkData({ ...bulkData, [key]: e.target.value })}
                                                                            onFocus={(e) => e.target.style.background = 'rgba(99,102,241,0.1)'}
                                                                            onBlur={(e) => e.target.style.background = 'transparent'}
                                                                        />
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                    {students.filter((s: any) => s.grade === bulkClass).length === 0 && (
                                                        <tr><td colSpan={100} className="empty" style={{ padding: '40px' }}>No active students found in {bulkClass}</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modals will go here below */}
            
            {/* 1. Choice Modal */}
            {choiceModal && (
                <div className="modal-overlay" onClick={() => setChoiceModal(false)}>
                    <div className="modal" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Add New Record</div>
                            <button className="modal-close" onClick={() => setChoiceModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="btn btn-primary" onClick={() => { setChoiceModal(false); resetForm(); setFormModal(true); }}>
                                ✍️ Manual Entry
                            </button>
                            <button className="btn btn-ghost" onClick={() => { setChoiceModal(false); setUploadModal(true); }}>
                                📄 Upload Excel File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Upload Modal */}
            {uploadModal && (
                <div className="modal-overlay" onClick={() => setUploadModal(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: 6, borderRadius: 8 }}>📄</span> 
                                Excel Upload
                            </div>
                            <button className="modal-close" onClick={() => setUploadModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
                                Upload an <b>.xlsx</b> file containing exam records. Ensure columns match the required format.
                            </p>
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid var(--border)', marginBottom: 20 }} onClick={handleDownloadTemplate}>
                                <span style={{ background: '#1D6F42', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>↓</span>
                                Download Excel Template
                            </button>
                            <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 8, border: '1px dashed var(--border)', textAlign: 'center' }}>
                                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Form Modal */}
            {formModal && (
                <div className="modal-overlay" onClick={() => {}}>
                    <div className="modal" style={{ maxWidth: 650, height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
                            <div style={{ flex: 1 }}>
                                <div className="modal-title" style={{ color: 'white' }}>{editingExam ? 'Edit Record' : 'New Record'}</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{editingExam ? 'Update exam details' : 'Enter student exam details'}</div>
                            </div>
                            <button onClick={() => setFormModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                            <button onClick={() => setActiveTab('info')} style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'info' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'info' ? 'var(--primary)' : 'var(--text2)', fontWeight: activeTab === 'info' ? 600 : 500, cursor: 'pointer' }}>
                                👤 Basic Info
                            </button>
                            <button onClick={() => setActiveTab('marks')} style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'marks' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'marks' ? 'var(--primary)' : 'var(--text2)', fontWeight: activeTab === 'marks' ? 600 : 500, cursor: 'pointer' }}>
                                📚 Marks & Subjects
                            </button>
                        </div>

                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                            {activeTab === 'info' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div className="form-row">
                                        <div className="form-group" style={{ flex: 1.5 }}>
                                            <label className="form-label">Search Student Data</label>
                                            <input className="form-input" list="student-list" placeholder="Start typing name..." value={studentName} onChange={e => {
                                                const val = e.target.value;
                                                setStudentName(val);
                                                const found = students.find((s: any) => s.name === val);
                                                if (found) { setRollNo(found.studentId || ''); setStudentClass(found.grade || ''); setStudentEmail(found.email || ''); }
                                            }} />
                                            <datalist id="student-list">
                                                {students.map((s: any) => <option key={s.id} value={s.name}>{s.studentId}</option>)}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Roll No</label>
                                            <input className="form-input" placeholder="STD-..." value={rollNo} onChange={e => setRollNo(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Class</label>
                                            <select className="form-input" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
                                                <option value="">Select Class</option>
                                                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email (Optional)</label>
                                        <input className="form-input" placeholder="student@example.com" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
                                    </div>

                                    <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Test No</label>
                                            <select className="form-input" value={title} onChange={e => setTitle(e.target.value)}>
                                                <option value="">Select Test</option>
                                                {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Category</label>
                                            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Date</label>
                                            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    
                                    {/* Added Books */}
                                    {entryBooks.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            {entryBooks.map((book, idx) => (
                                                <div key={idx} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ minWidth: 100 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{book.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>Marks breakdown:</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <input 
                                                            type="number" 
                                                            style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12 }} 
                                                            value={book.obtainedMarks} 
                                                            onChange={e => {
                                                                const newBooks = [...entryBooks];
                                                                newBooks[idx].obtainedMarks = e.target.value;
                                                                setEntryBooks(newBooks);
                                                            }} 
                                                        />
                                                        <span style={{ color: 'var(--text2)', fontSize: 12 }}>/</span>
                                                        <input 
                                                            type="number" 
                                                            style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12 }} 
                                                            value={book.totalMarks} 
                                                            onChange={e => {
                                                                const newBooks = [...entryBooks];
                                                                newBooks[idx].totalMarks = e.target.value;
                                                                setEntryBooks(newBooks);
                                                            }} 
                                                        />
                                                    </div>
                                                    <button onClick={() => setEntryBooks(entryBooks.filter((_, i) => i !== idx))} style={{ background: 'var(--error-bg)', color: '#ef4444', border: 'none', width: 24, height: 24, borderRadius: 12, cursor: 'pointer', marginLeft: 8 }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Book Area */}
                                    <div style={{ background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>+ Add Subject / Book</div>
                                        <div className="form-row">
                                            <div className="form-group" style={{ flex: 1.5 }}>
                                                <label className="form-label">Subject</label>
                                                <input className="form-input" list="teacher-books" placeholder="Type or select..." value={currentBookName} onChange={e => setCurrentBookName(e.target.value)} />
                                                <datalist id="teacher-books">
                                                    {teachers.map((t: any) => {
                                                        const name = t.booktitle || t.subject;
                                                        if (!name) return null;
                                                        return <option key={t.id} value={name} />
                                                    })}
                                                </datalist>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Total</label>
                                                <input className="form-input" type="number" placeholder="100" value={currentTotalMarks} onChange={e => setCurrentTotalMarks(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Obtained</label>
                                                <input className="form-input" type="number" placeholder="0" value={currentObtainedMarks} onChange={e => setCurrentObtainedMarks(e.target.value)} />
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8, border: '1px solid var(--border)' }} onClick={handleAddBook}>Add to List</button>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Notes / Description (Optional)</label>
                                        <textarea className="form-input" style={{ resize: 'vertical', minHeight: 60 }} placeholder="Additional instructions..." value={description} onChange={e => setDescription(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
                            <button className="btn btn-ghost" onClick={() => setFormModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveRecord}>{editingExam ? 'Update Record' : 'Save Record'}</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}
