import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchExams, saveExam, deleteExam, selectFilteredExams, selectStudentProgressList, selectResultDetails, saveBulkExams, selectBulkEntryData } from '../../store/slices/examsSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

const CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half Book', 'Full Book'];
const TITLE_OPTIONS = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
// Classes are managed in Settings > Manage Classes — use `savedClasses` from Redux (appSettings.classes)

const DEFAULT_SUBJECTS = [
    'Tarjuma Tul Quran', 'Islamiyat', 'Urdu', 'Pak Study', 'English', 
    'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
    'Biology', 'Sociology', 'Psychology', 'Economics', 'Ethics'
];

const sortBooksSequence = <T extends { name: string }>(books: T[]): T[] => {
    const getSubjectRank = (name: string) => {
        const n = name.toLowerCase().trim();
        if (n.includes('tarjuma') || n.includes('tajuma') || n.includes('quran')) return 1;
        if (n.includes('islam')) return 2;
        if (n.includes('urdu')) return 3;
        if (n.includes('pak')) return 4;
        if (n.includes('eng')) return 5;
        if (n.includes('math')) return 6;
        if (n.includes('physic')) return 7;
        if (n.includes('chemist')) return 8;
        if (n.includes('comput')) return 9;
        return 999;
    };

    return [...books].sort((a, b) => {
        const rankA = getSubjectRank(a.name);
        const rankB = getSubjectRank(b.name);
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
    });
};

export default function ExamsPage() {
    const dispatch = useAppDispatch();

    const { data: exams, status: examsStatus } = useAppSelector((s: any) => s.exams);
    const { data: studentsRaw, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const savedClasses = useAppSelector((s: any) => s.appSettings.classes);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);

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
    const [filterCategory, setFilterCategory] = useState('');
    const [visibleCount, setVisibleCount] = useState(200);

    // Modals
    const [choiceModal, setChoiceModal] = useState(false);
    const [formModal, setFormModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [detailsModal, setDetailsModal] = useState(false);
    const [subjectModal, setSubjectModal] = useState(false);
    const [categoryModal, setCategoryModal] = useState(false);
    const [titleModal, setTitleModal] = useState(false);
    const [classModal, setClassModal] = useState(false);
    const [summaryModal, setSummaryModal] = useState(false);

    // Subjects State
    const [savedSubjects, setSavedSubjects] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('school_saved_subjects');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return DEFAULT_SUBJECTS;
    });
    const [newSubjectInput, setNewSubjectInput] = useState('');

    const handleAddSavedSubject = () => {
        const val = newSubjectInput.trim();
        if (!val) return;
        if (savedSubjects.some(s => s.toLowerCase() === val.toLowerCase())) return alert('Subject already exists');
        const updated = [...savedSubjects, val];
        setSavedSubjects(updated);
        localStorage.setItem('school_saved_subjects', JSON.stringify(updated));
        setNewSubjectInput('');
    };

    const handleDeleteSavedSubject = (subjectToRemove: string) => {
        if (!confirm(`Delete ${subjectToRemove}?`)) return;
        const updated = savedSubjects.filter(s => s !== subjectToRemove);
        setSavedSubjects(updated);
        localStorage.setItem('school_saved_subjects', JSON.stringify(updated));
    };

    // Categories State
    const [savedCategories, setSavedCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('school_saved_categories');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return CATEGORIES;
    });
    const [newCategoryInput, setNewCategoryInput] = useState('');

    const handleAddSavedCategory = () => {
        const val = newCategoryInput.trim();
        if (!val) return;
        if (savedCategories.some(s => s.toLowerCase() === val.toLowerCase())) return alert('Test type already exists');
        const updated = [...savedCategories, val];
        setSavedCategories(updated);
        localStorage.setItem('school_saved_categories', JSON.stringify(updated));
        setNewCategoryInput('');
    };

    const handleDeleteSavedCategory = (categoryToRemove: string) => {
        if (!confirm(`Delete ${categoryToRemove}?`)) return;
        const updated = savedCategories.filter(s => s !== categoryToRemove);
        setSavedCategories(updated);
        localStorage.setItem('school_saved_categories', JSON.stringify(updated));
    };

    // Titles (Test Numbers) State
    const [savedTitles, setSavedTitles] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('school_saved_titles');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return TITLE_OPTIONS;
    });
    const [newTitleInput, setNewTitleInput] = useState('');

    const handleAddSavedTitle = () => {
        const val = newTitleInput.trim();
        if (!val) return;
        if (savedTitles.some(s => s.toLowerCase() === val.toLowerCase())) return alert('Test Number already exists');
        const updated = [...savedTitles, val];
        setSavedTitles(updated);
        localStorage.setItem('school_saved_titles', JSON.stringify(updated));
        setNewTitleInput('');
    };

    const handleDeleteSavedTitle = (titleToRemove: string) => {
        if (!confirm(`Delete ${titleToRemove}?`)) return;
        const updated = savedTitles.filter(s => s !== titleToRemove);
        setSavedTitles(updated);
        localStorage.setItem('school_saved_titles', JSON.stringify(updated));
    };

    // Classes — now driven by Redux (appSettings/classes in Firestore via SettingsPage)
    const [newClassInput, setNewClassInput] = useState('');

    const handleAddSavedClass = () => {
        // Classes are managed in Settings > Manage Classes
        // This modal is read-only in ExamsPage; use Settings to add/remove classes
    };

    const handleDeleteSavedClass = (_classToRemove: string) => {
        // Classes are managed in Settings > Manage Classes
    };

    // Bulk Entry State
    const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
    const [bulkColWidth, setBulkColWidth] = useState(100);
    const [bulkClass, setBulkClass] = useState('');
    const [bulkTestNo, setBulkTestNo] = useState('');
    const [bulkCategory, setBulkCategory] = useState(CATEGORIES[0]);
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkSubjects, setBulkSubjects] = useState<{ name: string; maxMarks: string }[]>([]);
    const [downloadingResults, setDownloadingResults] = useState(false);
    const [captureBatch, setCaptureBatch] = useState<any[] | null>(null);
    const [bulkData, setBulkData] = useState<Record<string, string>>({}); // Key: rollNo_subjectName
    const [newBulkSubject, setNewBulkSubject] = useState('');
    const [newBulkTotalMarks, setNewBulkTotalMarks] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkGender, setBulkGender] = useState('');

    const [editingExam, setEditingExam] = useState<ExamEntry | null>(null);
    const [selectedStudentData, setSelectedStudentData] = useState<StudentProgress | null>(null); // For details modal/sheet

    // Student Details Spreadsheet State
    const [detailSubjects, setDetailSubjects] = useState<{ name: string, maxMarks: string }[]>([]);
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
        if (classesStatus === 'idle') dispatch(fetchClasses());
    }, [dispatch, examsStatus, studentsStatus, teachersStatus, classesStatus]);

    // ── Data Processing via RTK Selectors ───────────────────────────────────────────────

    const filters = useMemo(() => ({
        searchTerm, filterClass, filterTestNo, filterCategory, filterGender
    }), [searchTerm, filterClass, filterTestNo, filterCategory, filterGender]);

    const filteredExams = useAppSelector(state => selectFilteredExams(state, filters));
    const studentProgressList = useAppSelector(state => selectStudentProgressList(state, students, filters));

    // ── Bulk Entry Logic ────────────────────────────────────────────────────────

    const bulkFilters = useMemo(() => ({
        bulkClass,
        bulkTestNo,
        bulkCategory
    }), [bulkClass, bulkTestNo, bulkCategory]);

    const rtkBulkData = useAppSelector(state => 
        selectBulkEntryData(state, bulkFilters)
    );

    useEffect(() => {
        if (!isBulkEntryMode || !bulkTestNo) return;
        setBulkSubjects(sortBooksSequence([...rtkBulkData.bulkSubjects]));
        setBulkData(rtkBulkData.existingData as any);
        // If there are relevant exams, maybe update the date/category
    }, [isBulkEntryMode, bulkTestNo, bulkClass, bulkCategory, rtkBulkData]);

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
    const detailFilters = useMemo(() => ({
        rollNo: selectedStudentData?.rollNo,
        studentName: selectedStudentData?.studentName,
        filterCategory
    }), [selectedStudentData?.rollNo, selectedStudentData?.studentName, filterCategory]);

    const rtkResultDetails = useAppSelector(state => 
        selectResultDetails(state, detailFilters)
    );

    useEffect(() => {
        if (!selectedStudentData) return;
        setDetailSubjects(sortBooksSequence(rtkResultDetails.detailSubjects));
        setDetailData(rtkResultDetails.existingData as any);
    }, [selectedStudentData, rtkResultDetails]);

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
            // Only iterate over savedTitles (respects custom test numbers), fall back to TITLE_OPTIONS
            const titleOptions = savedTitles.length > 0 ? savedTitles : TITLE_OPTIONS;
            for (const testNo of titleOptions) {
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
                    const category = filterCategory || CATEGORIES[0];
                    const existing = exams.find((e: any) =>
                        (e.rollNo === rollNo || e.studentName === studentName) &&
                        e.title === testNo &&
                        e.category === category
                    );
                    // Stable unique docId — no Date.now() collision
                    const docId = existing
                        ? existing.id
                        : `${category}_${studentClass}_${testNo}_${rollNo}`.replace(/\s+/g, '_');

                    const formattedDate = existing?.date || format(new Date(), 'dd MMM yyyy');
                    const examData = {
                        id: docId,
                        title: testNo,
                        date: formattedDate,
                        category: category,
                        rollNo,
                        studentName,
                        studentEmail: (studentEmail || '').toLowerCase(),
                        studentClass,
                        books: sortBooksSequence(testBooks),
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: existing?.description || 'Details Uploaded Record',
                    };

                    // Optimistic update + Network Sync via RTK Thunk
                    dispatch(saveExam(examData as any));
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
        if (!bulkTestNo) {
            alert('Please select a Test No to save bulk data.');
            return;
        }
        setBulkLoading(true);

        const targetStudents = students.filter((s: any) => {
            const g = (s.grade || s.class || '').toLowerCase().trim();
            const matchClass = !bulkClass || g === bulkClass.toLowerCase().trim();
            return matchClass;
        });
        const formattedDate = format(new Date(bulkDate), 'dd MMM yyyy');

        const examsToSave: any[] = [];

        try {
            for (const student of targetStudents) {
                const rollNo = student.studentId;
                const studentClassToSave = student.grade || student.class || '';

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
                    const existing = exams.find((e: any) =>
                        e.rollNo === rollNo &&
                        e.title === bulkTestNo &&
                        e.studentClass === studentClassToSave &&
                        e.category === bulkCategory
                    );
                    const docId = existing
                        ? existing.id
                        : `${bulkCategory}_${studentClassToSave}_${bulkTestNo}_${rollNo}`.replace(/\s+/g, '_');

                    examsToSave.push({
                        id: docId,
                        title: bulkTestNo,
                        date: formattedDate,
                        category: bulkCategory,
                        rollNo: rollNo,
                        studentName: student.name,
                        studentEmail: (student.email || '').toLowerCase(),
                        studentClass: studentClassToSave,
                        books: sortBooksSequence(studentBooks),
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: 'Bulk Uploaded Record',
                    });
                }
            }

            if (examsToSave.length > 0) {
                await dispatch(saveBulkExams({ examDataArray: examsToSave }));
                alert(`Successfully saved records for ${examsToSave.length} students!`);
            } else {
                alert('No data entered to save.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to queue bulk data');
        }

        setBulkLoading(false);
    };

    const handleDownloadBulkResults = async () => {
        if (!bulkClass || !bulkCategory || !bulkTestNo) {
            alert("Please select Class, Test Type, and Test No to generate cards.");
            return;
        }

        setDownloadingResults(true);

        const targetStudents = students.filter((s: any) => {
            const g = (s.grade || s.class || '').toLowerCase().trim();
            const matchClass = !bulkClass || g === bulkClass.toLowerCase().trim();
            if (!bulkGender) return matchClass;
            const gv = (s.gender || '').toLowerCase().trim();
            const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
            const isFemale = gv === 'female' || gv === 'f' || gv === 'girl';
            const matchGender = bulkGender === 'Male' ? isMale : isFemale;
            return matchClass && matchGender;
        });

        if (targetStudents.length === 0) {
            alert("No students found to generate cards for.");
            setDownloadingResults(false);
            return;
        }

        const testExams = exams.filter((e: any) => 
            e.studentClass === bulkClass &&
            e.category === bulkCategory &&
            e.title === bulkTestNo
        );

        const peerRankings = testExams.map((ex: any) => {
            let obt = 0; let tot = 0;
            if (ex.books) {
                obt = ex.books.reduce((sum: number, b: any) => sum + (parseFloat(b.obtainedMarks) || 0), 0);
                tot = ex.books.reduce((sum: number, b: any) => sum + (parseFloat(b.totalMarks) || 0), 0);
            } else {
                obt = parseFloat(ex.obtainedMarks) || 0;
                tot = parseFloat(ex.totalMarks) || 0;
            }
            return { 
                id: ex.rollNo || ex.studentEmail || ex.studentName,
                percentage: tot > 0 ? (obt / tot) * 100 : 0
            };
        }).sort((a: any, b: any) => b.percentage - a.percentage);

        const getGradeAndRemarks = (percentage: number) => {
            if (percentage >= 90) return { grade: 'A+', remarks: 'Excellent' };
            if (percentage >= 80) return { grade: 'A', remarks: 'Very Good' };
            if (percentage >= 70) return { grade: 'B', remarks: 'Good' };
            if (percentage >= 60) return { grade: 'C', remarks: 'Satisfactory' };
            if (percentage >= 50) return { grade: 'D', remarks: 'Needs Improvement' };
            if (percentage >= 40) return { grade: 'E', remarks: 'Hard work' };
            return { grade: 'Fail', remarks: 'Hard work' };
        };

        const cardsData = targetStudents.map((student: any) => {
            const studentExam = testExams.find((e: any) => e.rollNo === student.studentId || e.rollNo === student.rollno);
            if (!studentExam) return null;

            let totalObtained = 0;
            let totalPossible = 0;
            let subjects: any[] = [];
            
            if (studentExam.books) {
                subjects = studentExam.books.map((b: any) => {
                    const obt = parseFloat(b.obtainedMarks) || 0;
                    const tot = parseFloat(b.totalMarks) || 0;
                    const perc = tot > 0 ? (obt / tot) * 100 : 0;
                    totalObtained += obt;
                    totalPossible += tot;
                    return { ...b, percentage: perc, ...getGradeAndRemarks(perc) };
                });
            }
            
            const overallPerc = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
            
            let position = '-';
            const stuIdLow = (student.studentId || student.rollno || '').toLowerCase();
            const myIndex = peerRankings.findIndex((r: any) => (r.id || '').toLowerCase() === stuIdLow);
            if (myIndex !== -1) {
                let posStr = (myIndex + 1).toString();
                if (posStr.endsWith('1') && posStr !== '11') posStr += 'st';
                else if (posStr.endsWith('2') && posStr !== '12') posStr += 'nd';
                else if (posStr.endsWith('3') && posStr !== '13') posStr += 'rd';
                else posStr += 'th';
                position = `${posStr} / ${peerRankings.length}`;
            }

            return {
                student,
                examDate: studentExam.date || bulkDate,
                subjects,
                totalObtained,
                totalPossible,
                overallPerc,
                gradeRes: getGradeAndRemarks(overallPerc),
                position,
            };
        }).filter(Boolean);

        if (cardsData.length === 0) {
            alert("No saved exam records found for the selected students.");
            setDownloadingResults(false);
            return;
        }

        setCaptureBatch(cardsData);

        // Give React time to render the hidden items in the DOM
        setTimeout(async () => {
            try {
                const zip = new JSZip();
                const container = document.getElementById('capture-templates-container');
                if (container) {
                    container.style.display = 'block';

                    for (let i = 0; i < cardsData.length; i++) {
                        const element = document.getElementById(`result-card-${i}`);
                        if (element) {
                            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                            const imgData = canvas.toDataURL('image/png').split(',')[1];
                            const sName = (cardsData[i].student.fullname || cardsData[i].student.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
                            const sRoll = cardsData[i].student.rollno || cardsData[i].student.studentId || `STD-UNKNOWN`;
                            zip.file(`${sRoll}_${sName}.png`, imgData, {base64: true});
                        }
                    }
                    container.style.display = 'none';

                    const content = await zip.generateAsync({type: "blob"});
                    saveAs(content, `Results_${bulkClass}_${bulkCategory}_${bulkTestNo}.zip`);
                }
            } catch (err) {
                console.error("Error generating zip:", err);
                alert("An error occurred while generating result cards.");
            } finally {
                setDownloadingResults(false);
                setCaptureBatch(null);
            }
        }, 1500); // 1.5s delay to ensure robust rendering of off-screen DOM
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
        // Retain currentTotalMarks so subsequent subjects default to the same total marks
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
            return exam.title === title && exam.category === category && exam.rollNo === rollNo;
        });

        if (isDuplicate) {
            alert('An exam with this Test Type + Test No + Roll No already exists.');
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
            books: entryBooks.length > 0 ? sortBooksSequence(entryBooks) : undefined,
            totalMarks: totalPossible.toString(),
            obtainedMarks: totalObtained.toString(),
            status: computedStatus,
            description,
        };

        try {
            dispatch(saveExam(examData as any));
            setFormModal(false);
        } catch (error) {
            alert('Failed to save entry');
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            dispatch(deleteExam(id));
            setDetailsModal(false);
        } catch (e) {
            alert('Failed to delete');
        }
    };

    // ── Excel Upload ────────────────────────────────────────────────────────────

    const handleDownloadTemplate = () => {
        const headerRow = [
            {
                'Roll No': 'STD-101',
                'Student Name': 'Ahmed Ali',
                'Class': '9th',
                'Test No': 'T1',
                'Category': 'Monthly',
                'Date': '2024-03-20',
                'Email': 'ahmed@example.com',
                'Urdu_Total': 100,
                'Urdu_Obtained': 85,
                'English_Total': 100,
                'English_Obtained': 72,
                'Math_Total': 100,
                'Math_Obtained': 90,
                'Description': 'First Test Example'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headerRow);

        const wscols = [
            { wch: 15 }, // Roll No
            { wch: 25 }, // Student Name
            { wch: 15 }, // Class
            { wch: 15 }, // Test No
            { wch: 15 }, // Category
            { wch: 15 }, // Date
            { wch: 25 }, // Email
            { wch: 12 }, { wch: 15 }, // Urdu
            { wch: 15 }, { wch: 18 }, // English
            { wch: 12 }, { wch: 15 }, // Math
            { wch: 30 }  // Description
        ];
        ws['!cols'] = wscols;

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

                let successCount = 0;
                let errorCount = 0;

                for (const row of data as any[]) {
                    try {
                        const rollNo = row['Roll No']?.toString() || row['rollNo']?.toString();
                        const studentName = row['Student Name'] || row['studentName'] || 'Unknown Student';
                        const studentClass = row['Class'] || row['studentClass'] || '';
                        const title = row['Test No'] || row['title'];
                        const category = row['Category'] || row['category'] || CATEGORIES[0];
                        const dateRaw = row['Date'] || row['date'];
                        const email = row['Email'] || row['studentEmail'] || '';
                        const description = row['Description'] || row['description'] || 'Uploaded via Excel';

                        if (!rollNo || !title || !studentClass) {
                            console.warn('Skipping row missing required fields (Roll No, Test No, Class):', row);
                            errorCount++;
                            continue;
                        }

                        let formattedDate = format(new Date(), 'dd MMM yyyy');
                        if (dateRaw) {
                            if (typeof dateRaw === 'number') {
                                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                                const dateObj = new Date(excelEpoch.getTime() + dateRaw * 86400000);
                                formattedDate = format(dateObj, 'dd MMM yyyy');
                            } else {
                                formattedDate = format(new Date(dateRaw), 'dd MMM yyyy');
                            }
                        }

                        const books: BookEntry[] = [];
                        let totalObtained = 0;
                        let totalPossible = 0;

                        Object.keys(row).forEach(key => {
                            if (key.endsWith('_Total')) {
                                const subjectName = key.replace('_Total', '');
                                const obtainedKey = `${subjectName}_Obtained`;

                                const tMarks = parseFloat(row[key]) || 0;
                                const oMarks = parseFloat(row[obtainedKey]) || 0;

                                if (tMarks > 0 || oMarks > 0) {
                                    books.push({
                                        name: subjectName,
                                        totalMarks: tMarks.toString(),
                                        obtainedMarks: oMarks.toString()
                                    });
                                    totalPossible += tMarks;
                                    totalObtained += oMarks;
                                }
                            }
                        });

                        const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';

                        const existing = exams.find((e: any) => e.rollNo === rollNo && e.title === title && e.studentClass === studentClass && e.category === category);
                        const docId = existing ? existing.id : Date.now().toString() + '_' + rollNo + '_' + title + '_' + category;

                        const examData = {
                            id: docId,
                            title,
                            date: formattedDate,
                            category,
                            rollNo,
                            studentName,
                            studentEmail: (email || '').toLowerCase(),
                            studentClass,
                            books: books.length > 0 ? sortBooksSequence(books) : undefined,
                            totalMarks: totalPossible.toString(),
                            obtainedMarks: totalObtained.toString(),
                            status: computedStatus,
                            description,
                        };

                        dispatch(saveExam(examData as any));
                        successCount++;
                    } catch (err) {
                        console.error('Error processing row:', row, err);
                        errorCount++;
                    }
                }

                alert(`Finished! Successfully imported ${successCount} records. ${errorCount > 0 ? `Failed ${errorCount} records.` : ''}`);
                setUploadModal(false);
            } catch (err) {
                console.error(err);
                alert('Failed to read Excel file or parse data. Please match the template format.');
            }
        };
        reader.readAsBinaryString(file);

        if (e.target) e.target.value = '';
    };

    // ── Result Details Viewer ───────────────────────────────────────────────────

    const openDetailsSheet = (student: StudentProgress) => {
        setSelectedStudentData(student);
    };

    const handleDeleteAllRecords = async () => {
        const examsToDelete = exams.filter((e: any) => {
            const matchClass = !filterClass || e.studentClass === filterClass;
            const matchTestNo = !filterTestNo || e.title === filterTestNo;
            const matchCategory = !filterCategory || e.category === filterCategory;
            const matchSearch = !searchTerm || (e.studentName && e.studentName.toLowerCase().includes(searchTerm.toLowerCase())) || (e.rollNo && e.rollNo.toString().toLowerCase().includes(searchTerm.toLowerCase()));
            
            let matchGender = true;
            if (filterGender) {
                const student = students.find((s: any) => s.rollno === e.rollNo || s.studentId === e.rollNo || s.name === e.studentName);
                if (!student) {
                    matchGender = false;
                } else {
                    const gv = (student.gender || '').toLowerCase().trim();
                    const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
                    const isFemale = gv === 'female' || gv === 'f' || gv === 'girl';
                    matchGender = filterGender === 'Male' ? isMale : isFemale;
                }
            }

            return matchClass && matchTestNo && matchCategory && matchSearch && matchGender;
        });

        if (examsToDelete.length === 0) return alert('No records match the current filters.');

        let filterStr = [];
        if (filterClass) filterStr.push(`Class: ${filterClass}`);
        if (filterTestNo) filterStr.push(`Test: ${filterTestNo}`);
        if (filterCategory) filterStr.push(`Type: ${filterCategory}`);
        if (searchTerm) filterStr.push(`Search: ${searchTerm}`);
        if (filterGender) filterStr.push(`Gender: ${filterGender}`);
        
        const filterMsg = filterStr.length > 0 ? `(${filterStr.join(', ')})` : 'ALL';
        
        if (!confirm(`Are you sure you want to clean ${examsToDelete.length} student records matching ${filterMsg}? This action is permanent and cannot be undone.`)) return;
        
        const text = prompt('Type "DELETE" to confirm wiping these records:');
        if (text !== 'DELETE') return;

        setBulkLoading(true);
        try {
            await Promise.all(examsToDelete.map(async (exam: any) => {
                if (exam.id) {
                    await dispatch(deleteExam(exam.id));
                }
            }));
            alert(`${examsToDelete.length} records deleted successfully.`);
        } catch (error) {
            console.error(error);
            alert('Error deleting records.');
        } finally {
            setBulkLoading(false);
        }
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
                        {!isBulkEntryMode && (
                            <button className="btn btn-ghost" onClick={() => setSummaryModal(true)} title="View Summary for current filters." style={{ padding: '5px 12px', fontSize: 12, height: 30, color: 'var(--primary)', borderColor: 'rgba(59,130,246,0.2)' }}>
                                📊 Summary
                            </button>
                        )}
                        {!isBulkEntryMode && (
                            <button className="btn btn-ghost" onClick={handleDeleteAllRecords} title="Wipe all exams to start fresh." style={{ padding: '5px 12px', fontSize: 12, height: 30, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} disabled={bulkLoading}>
                                {bulkLoading ? 'Cleaning...' : '🧹 Clean All'}
                            </button>
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
            <div className="responsive-filter-bar" style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
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
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4 }}>
                            <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                <option value="">All Classes</option>
                                {savedClasses.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="btn btn-ghost" title="Manage Classes" style={{ padding: '0 4px', height: 30 }} onClick={() => setClassModal(true)}>⚙️</button>
                        </div>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4 }}>
                            <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterTestNo} onChange={e => setFilterTestNo(e.target.value)}>
                                <option value="">All Tests</option>
                                {savedTitles.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button className="btn btn-ghost" title="Manage Test Nos" style={{ padding: '0 4px', height: 30 }} onClick={() => setTitleModal(true)}>⚙️</button>
                        </div>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4 }}>
                            <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                <option value="">All Types</option>
                                {savedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="btn btn-ghost" title="Manage Test Types" style={{ padding: '0 4px', height: 30 }} onClick={() => setCategoryModal(true)}>⚙️</button>
                        </div>
                        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                            {['', 'Male', 'Female'].map(g => (
                                <button key={g} onClick={() => setFilterGender(g)} style={{ padding: '2px 8px', height: 26, fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: filterGender === g ? 700 : 400, background: filterGender === g ? 'var(--primary)' : 'transparent', color: filterGender === g ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
                                    {g === '' ? 'All' : g === 'Male' ? '👦 Boys' : '👧 Girls'}
                                </button>
                            ))}
                        </div>
                        {(searchTerm || filterClass || filterTestNo || filterGender || filterCategory) && (
                            <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearchTerm(''); setFilterClass(''); setFilterTestNo(''); setFilterGender(''); setFilterCategory(''); }}>
                                ✕ Clear
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="search-box" style={{ flex: 1, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>
                            <span className="search-icon" style={{ fontSize: 12 }}>🔍</span>
                            <input
                                placeholder="Search student, ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', fontSize: 12 }}
                            />
                        </div>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4 }}>
                            <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkClass} onChange={e => setBulkClass(e.target.value)}>
                                <option value="">* Class</option>
                                {savedClasses.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="btn btn-ghost" title="Manage Classes" style={{ padding: '0 4px', height: 30 }} onClick={() => setClassModal(true)}>⚙️</button>
                        </div>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4 }}>
                            <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkTestNo} onChange={e => setBulkTestNo(e.target.value)}>
                                <option value="">* Test No</option>
                                {savedTitles.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button className="btn btn-ghost" title="Manage Test Nos" style={{ padding: '0 4px', height: 30 }} onClick={() => setTitleModal(true)}>⚙️</button>
                        </div>
                        <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} disabled={!bulkClass || !bulkTestNo}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="date" className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={bulkDate} onChange={e => setBulkDate(e.target.value)} disabled={!bulkClass || !bulkTestNo} />
                        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                            {['', 'Male', 'Female'].map(g => (
                                <button key={g} onClick={() => setBulkGender(g)} style={{ padding: '2px 8px', height: 26, fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: bulkGender === g ? 700 : 400, background: bulkGender === g ? 'var(--primary)' : 'transparent', color: bulkGender === g ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
                                    {g === '' ? 'All' : g === 'Male' ? '👦 Boys' : '👧 Girls'}
                                </button>
                            ))}
                        </div>
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
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center', color: '#fff' }}>#</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 60, textAlign: 'center', color: '#fff' }}>Roll</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>Name</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>Father</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>Class</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#fff' }}>Gender</th>
                                                <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#fff' }}>Tests</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 80, color: '#fff' }}>Total</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 80, color: '#fff' }}>Obtained</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', width: 60, borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>%</th>
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
                                        {savedSubjects.filter(s => !detailSubjects.some(ds => ds.name === s)).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <button className="btn btn-ghost" title="Manage Subjects" style={{ padding: '0 4px', height: 26 }} onClick={() => setSubjectModal(true)}>⚙️</button>
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
                                                                    {savedSubjects.filter(s => s !== sub.name && !detailSubjects.some(ds => ds.name === s)).map(s => (
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
                                                                            if (confirm(`Remove ${sub.name} column?`)) {
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>Add Column:</span>
                                        <select className="form-input" style={{ width: 140, height: 26, fontSize: 11, padding: '0 6px' }} value={newBulkSubject} onChange={e => setNewBulkSubject(e.target.value)}>
                                            <option value="">Select Subject</option>
                                            {savedSubjects.filter(s => !bulkSubjects.some(bs => bs.name === s)).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <button className="btn btn-ghost" title="Manage Subjects" style={{ padding: '0 4px', height: 26 }} onClick={() => setSubjectModal(true)}>⚙️</button>
                                        <input className="form-input" style={{ width: 80, height: 26, fontSize: 11, padding: '0 6px' }} type="number" placeholder="Total Marks" value={newBulkTotalMarks} onChange={e => setNewBulkTotalMarks(e.target.value)} />
                                        <button className="btn btn-secondary" style={{ padding: '0 8px', height: 26, fontSize: 11 }} onClick={handleAddBulkSubject}>+ Add</button>
                                        <div style={{ flex: 1 }} />

                                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg3)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                            <button title="Decrease Width" onClick={() => setBulkColWidth(w => Math.max(60, w - 20))} style={{ background: 'transparent', border: 'none', padding: '4px 10px', cursor: 'pointer', fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                                            <span style={{ fontSize: 11, padding: '0 8px', color: 'var(--text2)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{bulkColWidth}px</span>
                                            <button title="Increase Width" onClick={() => setBulkColWidth(w => Math.min(300, w + 20))} style={{ background: 'transparent', border: 'none', padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                        </div>

                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary" style={{ padding: '0 10px', height: 26, fontSize: 11, background: '#10b981', color: 'white' }} onClick={handleDownloadBulkResults} disabled={downloadingResults}>
                                                {downloadingResults ? 'Generating ZIP...' : '📥 Download Results'}
                                            </button>
                                            <button className="btn btn-primary" style={{ padding: '0 10px', height: 26, fontSize: 11 }} onClick={handleSaveBulk} disabled={bulkLoading}>
                                                {bulkLoading ? 'Saving...' : '💾 Save All'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-wrap" style={{ flex: 1, border: '1px solid var(--primary)', boxShadow: '0 0 0 1px rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                                        <div style={{ overflow: 'auto', flex: 1, minWidth: 0 }}>
                                            <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                                <thead style={{ zIndex: 10 }}>
                                                    <tr style={{ color: '#fff' }}>
                                                        <th style={{ position: 'sticky', top: 0, background: '#3730a3', zIndex: 11, padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.2)', width: 80, textAlign: 'center' }}>RollNo</th>
                                                        <th style={{ position: 'sticky', top: 0, background: '#3730a3', zIndex: 11, padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.2)', width: 250, textAlign: 'left' }}>Student Name</th>
                                                        {bulkSubjects.map((sub, sIdx) => (
                                                            <th key={sIdx} style={{ position: 'sticky', top: 0, background: '#3730a3', zIndex: 11, borderRight: '1px solid rgba(255,255,255,0.2)', minWidth: bulkColWidth, width: bulkColWidth, padding: 0 }}>
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
                                                                        {savedSubjects.filter(s => s !== sub.name && !bulkSubjects.some(bs => bs.name === s)).map(s => (
                                                                            <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'rgba(0,0,0,0.15)', position: 'relative' }}>
                                                                        <span style={{ fontSize: 9, color: '#cbd5e1', marginRight: 4 }}>Total:</span>
                                                                        <input
                                                                            type="number"
                                                                            value={sub.maxMarks}
                                                                            onChange={(e) => {
                                                                                const newSubs = [...bulkSubjects];
                                                                                newSubs[sIdx].maxMarks = e.target.value;
                                                                                setBulkSubjects(newSubs);
                                                                            }}
                                                                            style={{
                                                                                background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 10, fontWeight: 600,
                                                                                textAlign: 'left', width: 30, outline: 'none'
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm(`Remove ${sub.name} column?`)) {
                                                                                    setBulkSubjects(bulkSubjects.filter((_, i) => i !== sIdx));
                                                                                }
                                                                            }}
                                                                            title="Remove Subject"
                                                                            style={{ position: 'absolute', right: 4, background: 'transparent', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
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
                                                    {students
                                                        .filter((s: any) => {
                                                            const g = (s.grade || s.class || '').toLowerCase().trim();
                                                            const matchClass = !bulkClass || g === bulkClass.toLowerCase().trim();
                                                            
                                                            let matchGender = true;
                                                            if (bulkGender) {
                                                                const gv = (s.gender || '').toLowerCase().trim();
                                                                const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
                                                                const isFemale = gv === 'female' || gv === 'f' || gv === 'girl';
                                                                matchGender = bulkGender === 'Male' ? isMale : isFemale;
                                                            }

                                                            const matchSearch = !searchTerm || 
                                                                (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                                                                (s.studentId && s.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()));

                                                            return matchClass && matchGender && matchSearch;
                                                        })
                                                        .map((s: any, i: any) => (
                                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                                <td style={{ padding: '6px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 600, fontSize: 12 }}>{s.studentId}</td>
                                                                <td style={{ padding: '6px 10px', borderRight: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>
                                                                    {s.name}
                                                                    {(() => {
                                                                        const gv = (s.gender || '').toLowerCase().trim();
                                                                        const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
                                                                        if (!gv) return null;
                                                                        return <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: isMale ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)', color: isMale ? '#818cf8' : '#ec4899' }}>{isMale ? '♂' : '♀'}</span>;
                                                                    })()}
                                                                </td>
                                                                {bulkTestNo ? bulkSubjects.map(sub => {
                                                                    const key = `${s.studentId}_${sub.name}`;
                                                                    return (
                                                                        <td key={sub.name} style={{ borderRight: '1px solid var(--border)', padding: 0 }}>
                                                                            <input
                                                                                type="number"
                                                                                style={{ width: '100%', height: 36, border: 'none', background: 'transparent', textAlign: 'center', color: 'var(--primary-light)', fontWeight: 700, fontSize: 14, outline: 'none', padding: '0 4px' }}
                                                                                placeholder="-"
                                                                                value={bulkData[key] || ''}
                                                                                onChange={(e) => setBulkData({ ...bulkData, [key]: e.target.value })}
                                                                                onFocus={(e) => e.target.style.background = 'rgba(99,102,241,0.1)'}
                                                                                onBlur={(e) => e.target.style.background = 'transparent'}
                                                                            />
                                                                        </td>
                                                                    );
                                                                }) : (
                                                                    <td colSpan={100} style={{ padding: '6px 10px', color: 'var(--text2)', fontStyle: 'italic', fontSize: 12 }}>Select a Test No to enter marks</td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    {students.filter((s: any) => {
                                                        const g = (s.grade || s.class || '').toLowerCase().trim();
                                                        const mc = !bulkClass || g === bulkClass.toLowerCase().trim();
                                                        
                                                        let mg = true;
                                                        if (bulkGender) {
                                                            const gv = (s.gender || '').toLowerCase().trim();
                                                            const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
                                                            const isFemale = gv === 'female' || gv === 'f' || gv === 'girl';
                                                            mg = bulkGender === 'Male' ? isMale : isFemale;
                                                        }

                                                        const ms = !searchTerm || 
                                                            (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                                                            (s.studentId && s.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()));

                                                        return mc && mg && ms;
                                                    }).length === 0 && (
                                                            <tr><td colSpan={100} className="empty" style={{ padding: '30px' }}>No students found{bulkClass ? ' in ' + bulkClass : ''}{bulkGender ? ` (${bulkGender})` : ''}</td></tr>
                                                        )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals will go here below */}

            {subjectModal && (
                <div className="modal-overlay" onClick={() => setSubjectModal(false)} style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Manage Subjects</div>
                            <button className="modal-close" onClick={() => setSubjectModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <input className="form-input" style={{ flex: 1 }} placeholder="New subject name..." value={newSubjectInput} onChange={e => setNewSubjectInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSavedSubject()} />
                                <button className="btn btn-primary" onClick={handleAddSavedSubject}>+ Add</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {savedSubjects.map(s => (
                                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                                        <button className="btn btn-ghost" style={{ padding: '4px', height: 'auto', color: '#ef4444' }} onClick={() => handleDeleteSavedSubject(s)}>🗑️</button>
                                    </div>
                                ))}
                                {savedSubjects.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>No subjects found.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {categoryModal && (
                <div className="modal-overlay" onClick={() => setCategoryModal(false)} style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Manage Test Types</div>
                            <button className="modal-close" onClick={() => setCategoryModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <input className="form-input" style={{ flex: 1 }} placeholder="New test type..." value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSavedCategory()} />
                                <button className="btn btn-primary" onClick={handleAddSavedCategory}>+ Add</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {savedCategories.map(s => (
                                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                                        <button className="btn btn-ghost" style={{ padding: '4px', height: 'auto', color: '#ef4444' }} onClick={() => handleDeleteSavedCategory(s)}>🗑️</button>
                                    </div>
                                ))}
                                {savedCategories.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>No test types found.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {titleModal && (
                <div className="modal-overlay" onClick={() => setTitleModal(false)} style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Manage Test Numbers</div>
                            <button className="modal-close" onClick={() => setTitleModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <input className="form-input" style={{ flex: 1 }} placeholder="New test number..." value={newTitleInput} onChange={e => setNewTitleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSavedTitle()} />
                                <button className="btn btn-primary" onClick={handleAddSavedTitle}>+ Add</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {savedTitles.map(s => (
                                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                                        <button className="btn btn-ghost" style={{ padding: '4px', height: 'auto', color: '#ef4444' }} onClick={() => handleDeleteSavedTitle(s)}>🗑️</button>
                                    </div>
                                ))}
                                {savedTitles.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>No test numbers found.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {classModal && (
                <div className="modal-overlay" onClick={() => setClassModal(false)} style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Manage Classes</div>
                            <button className="modal-close" onClick={() => setClassModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <input className="form-input" style={{ flex: 1 }} placeholder="New class..." value={newClassInput} onChange={e => setNewClassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSavedClass()} />
                                <button className="btn btn-primary" onClick={handleAddSavedClass}>+ Add</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {savedClasses.map((s: string) => (
                                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                                        <button className="btn btn-ghost" style={{ padding: '4px', height: 'auto', color: '#ef4444' }} onClick={() => handleDeleteSavedClass(s)}>🗑️</button>
                                    </div>
                                ))}
                                {savedClasses.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>No classes found.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                <div className="modal-overlay" onClick={() => { }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-row" style={{ gap: 12 }}>
                                        <div className="form-group" style={{ flex: 2 }}>
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
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Roll No</label>
                                            <input className="form-input" placeholder="Auto-filled" value={rollNo} readOnly style={{ background: 'var(--bg3)', color: 'var(--text2)', cursor: 'not-allowed' }} />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ gap: 12 }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Email</label>
                                            <input className="form-input" placeholder="Auto-filled" value={studentEmail} readOnly style={{ background: 'var(--bg3)', color: 'var(--text2)', cursor: 'not-allowed' }} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                Class
                                                <button className="btn btn-ghost" title="Manage Classes" style={{ padding: 0, height: 'auto', lineHeight: 1 }} onClick={(e) => { e.preventDefault(); setClassModal(true); }}>⚙️</button>
                                            </label>
                                            <select className="form-input" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
                                                <option value="">Select Class</option>
                                                {savedClasses.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                                    <div className="form-row" style={{ gap: 12 }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                Test No
                                                <button className="btn btn-ghost" title="Manage Test Nos" style={{ padding: 0, height: 'auto', lineHeight: 1 }} onClick={(e) => { e.preventDefault(); setTitleModal(true); }}>⚙️</button>
                                            </label>
                                            <select className="form-input" value={title} onChange={e => setTitle(e.target.value)}>
                                                <option value="">Select Test</option>
                                                {savedTitles.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                Type
                                                <button className="btn btn-ghost" title="Manage Test Types" style={{ padding: 0, height: 'auto', lineHeight: 1 }} onClick={(e) => { e.preventDefault(); setCategoryModal(true); }}>⚙️</button>
                                            </label>
                                            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                                                {savedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Date</label>
                                            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                    {/* Added Books */}
                                    {entryBooks.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {entryBooks.map((book, idx) => (
                                                <div key={idx} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ minWidth: 90 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{book.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>Marks breakdown:</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        <input
                                                            type="number"
                                                            style={{ width: 50, padding: '4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12, textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}
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
                                                            style={{ width: 50, padding: '4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12, textAlign: 'center', color: 'var(--text2)' }}
                                                            value={book.totalMarks}
                                                            onChange={e => {
                                                                const newBooks = [...entryBooks];
                                                                newBooks[idx].totalMarks = e.target.value;
                                                                setEntryBooks(newBooks);
                                                            }}
                                                        />
                                                    </div>
                                                    <button onClick={() => setEntryBooks(entryBooks.filter((_, i) => i !== idx))} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: 22, height: 22, borderRadius: 11, cursor: 'pointer', marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Book Area */}
                                    <div style={{ background: 'rgba(99,102,241,0.03)', padding: 12, borderRadius: 10, border: '1px dashed rgba(99,102,241,0.3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>+ ADD SUBJECT</div>
                                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: 8, alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <input className="form-input" style={{ width: '100%', height: 36, padding: '0 12px', fontSize: 13, minWidth: 100 }} list="available-subjects" placeholder="Type or select subject..." value={currentBookName} onChange={e => setCurrentBookName(e.target.value)} />
                                                <datalist id="available-subjects">
                                                    {Array.from(new Set([
                                                        ...savedSubjects,
                                                        ...teachers.map((t: any) => t.booktitle || t.subject).filter(Boolean)
                                                    ])).map((name: any, idx) => {
                                                        // Hide if already in entryBooks
                                                        if (entryBooks.some(b => b.name.toLowerCase() === name.toLowerCase())) return null;
                                                        return <option key={idx} value={name} />
                                                    })}
                                                </datalist>
                                            </div>
                                            <div style={{ width: 70 }}>
                                                <input className="form-input" style={{ width: '100%', height: 36, padding: '0 8px', fontSize: 13, textAlign: 'center' }} type="number" placeholder="Total" value={currentTotalMarks} onChange={e => setCurrentTotalMarks(e.target.value)} />
                                            </div>
                                            <div style={{ width: 70 }}>
                                                <input className="form-input" style={{ width: '100%', height: 36, padding: '0 8px', fontSize: 13, textAlign: 'center' }} type="number" placeholder="Obt" value={currentObtainedMarks} onChange={e => setCurrentObtainedMarks(e.target.value)} />
                                            </div>
                                            <button className="btn btn-primary" style={{ height: 36, padding: '0 16px', borderRadius: 6, fontSize: 13, whiteSpace: 'nowrap' }} onClick={handleAddBook}>Add</button>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: 4 }}>
                                        <label className="form-label">Notes / Description (Optional)</label>
                                        <textarea className="form-input" style={{ resize: 'vertical', minHeight: 50, fontSize: 13 }} placeholder="Additional instructions..." value={description} onChange={e => setDescription(e.target.value)} />
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

            {summaryModal && (
                <div className="modal-overlay" onClick={() => setSummaryModal(false)}>
                    <div className="modal" style={{ maxWidth: 500, padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '20px', background: 'var(--primary)', color: '#fff', border: 'none' }}>
                            <div className="modal-title" style={{ color: '#fff' }}>📊 Entry Summary</div>
                            <button className="modal-close" onClick={() => setSummaryModal(false)} style={{ color: '#fff' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: 20 }}>
                            {(() => {
                                const baseStudents = students.filter((s: any) => {
                                    const mc = !filterClass || s.grade === filterClass;
                                    const gv = (s.gender || '').toLowerCase().trim();
                                    const isMale = gv === 'male' || gv === 'm' || gv === 'boy';
                                    const isFemale = gv === 'female' || gv === 'f' || gv === 'girl';
                                    const mg = !filterGender || (filterGender === 'Male' ? isMale : isFemale);
                                    const ms = !searchTerm || (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || (s.studentId && s.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()));
                                    return mc && mg && ms;
                                });

                                let enteredCount = 0;
                                let missingStudents: any[] = [];

                                baseStudents.forEach((student: any) => {
                                    const hasExam = exams.some((e: any) => {
                                        const matchUser = e.rollNo === student.rollno || e.studentName === student.name;
                                        const matchClass = !filterClass || e.studentClass === filterClass;
                                        const matchTestNo = !filterTestNo || e.title === filterTestNo;
                                        const matchCategory = !filterCategory || e.category === filterCategory;
                                        return matchUser && matchClass && matchTestNo && matchCategory;
                                    });

                                    if (hasExam) {
                                        enteredCount++;
                                    } else {
                                        missingStudents.push(student);
                                    }
                                });

                                const pct = baseStudents.length > 0 ? Math.round((enteredCount / baseStudents.length) * 100) : 0;

                                return (
                                    <>
                                        <div style={{ marginBottom: 15, fontSize: 13, color: 'var(--text2)' }}>
                                            <strong>Filters Applied:</strong><br />
                                            Class: <b>{filterClass || "All"}</b> | Gender: <b>{filterGender || "All"}</b> | Test: <b>{filterTestNo || "All"}</b> | Type: <b>{filterCategory || "All"}</b>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                            <div style={{ flex: 1, background: 'var(--bg3)', padding: 15, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{baseStudents.length}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Target Students</div>
                                            </div>
                                            <div style={{ flex: 1, background: 'var(--bg3)', padding: 15, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{enteredCount}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Results Added</div>
                                            </div>
                                            <div style={{ flex: 1, background: 'var(--bg3)', padding: 15, borderRadius: 8, textAlign: 'center', border: '1px solid #ef4444' }}>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{missingStudents.length}</div>
                                                <div style={{ fontSize: 11, color: '#ef4444' }}>Missing Data</div>
                                            </div>
                                        </div>

                                        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)' }} />
                                        </div>
                                        
                                        {missingStudents.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Missing Students ({missingStudents.length}):</div>
                                                <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg3)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                                                    {missingStudents.map(ms => (
                                                        <div key={ms.studentId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{ms.name}</span>
                                                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{ms.studentId}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {captureBatch && (
                <div id="capture-templates-container" style={{ display: 'none' }}>
                    {captureBatch.map((data: any, i: number) => (
                        <div key={i} id={`result-card-${i}`} style={{ width: 800, padding: '40px 30px', background: '#fff', color: '#000', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
                            
                            {/* Header exactly like Mobile App */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '3px solid #3730A3', paddingBottom: 15, marginBottom: 20 }}>
                                <img src="/logo.png" style={{ position: 'absolute', left: 0, width: 60, height: 60, objectFit: 'contain' }} alt="Logo" />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: 0.5 }}>The Seeks Academy Fort Abbas</div>
                                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 600 }}>
                                        Result Sheet ({bulkCategory} {bulkTestNo} Session 2025-26)
                                    </div>
                                </div>
                            </div>

                            {/* Student Info Section */}
                            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '15px 20px', border: '1px solid #E2E8F0', marginBottom: 20 }}>
                                <div style={{ display: 'flex', marginBottom: 10 }}>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={{ flex: 1, fontWeight: 600, color: '#475569', fontSize: 14 }}>Name:</div>
                                        <div style={{ flex: 2, fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{data.student.fullname || data.student.name || '-'}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={{ flex: 1, fontWeight: 600, color: '#475569', fontSize: 14 }}>Roll No.</div>
                                        <div style={{ flex: 2, fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{data.student.rollno || data.student.studentId || '-'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex' }}>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={{ flex: 1, fontWeight: 600, color: '#475569', fontSize: 14 }}>Father Name:</div>
                                        <div style={{ flex: 2, fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{data.student.fathername || data.student.fatherName || '-'}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={{ flex: 1, fontWeight: 600, color: '#475569', fontSize: 14 }}>Class:</div>
                                        <div style={{ flex: 2, fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{data.student.class || data.student.grade || bulkClass}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Marks Table constructed using Flex to perfectly match React Native layout */}
                            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', marginBottom: 30 }}>
                                <div style={{ display: 'flex', background: '#3730A3', color: '#fff', padding: '12px', fontWeight: 600, fontSize: 14 }}>
                                    <div style={{ flex: 2 }}>Subjects</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>Total</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>Obtained</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>%</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>Grade</div>
                                    <div style={{ flex: 1.5, textAlign: 'left', paddingLeft: 10 }}>Remarks</div>
                                </div>

                                {data.subjects.map((sub: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', padding: '12px', background: idx % 2 === 1 ? '#F8FAFC' : '#fff', borderBottom: '1px solid #E2E8F0', fontSize: 14 }}>
                                        <div style={{ flex: 2, fontWeight: 600, color: '#1E293B' }}>{sub.name}</div>
                                        <div style={{ flex: 1, textAlign: 'center', color: '#475569' }}>{sub.totalMarks}</div>
                                        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>{sub.obtainedMarks}</div>
                                        <div style={{ flex: 1, textAlign: 'center', color: '#475569' }}>{sub.percentage.toFixed(1)}</div>
                                        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, color: sub.grade === 'Fail' ? '#DC2626' : '#16A34A' }}>{sub.grade}</div>
                                        <div style={{ flex: 1.5, textAlign: 'left', paddingLeft: 10, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.remarks}</div>
                                    </div>
                                ))}

                                <div style={{ display: 'flex', background: '#1E293B', color: '#fff', padding: '12px', fontSize: 14 }}>
                                    <div style={{ flex: 2, fontWeight: 700 }}>Total</div>
                                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{data.totalPossible}</div>
                                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{data.totalObtained}</div>
                                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{data.overallPerc.toFixed(1)}</div>
                                    <div style={{ flex: 2.5, textAlign: 'left', paddingLeft: 10, fontWeight: 700 }}>
                                        Position: <span style={{ color: '#FBBF24' }}>{data.position}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer exactly like Mobile App */}
                            <div style={{ marginTop: 25, borderTopWidth: 2, borderTopColor: '#E2E8F0', borderTopStyle: 'solid', paddingTop: 20 }}>
                                <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 30, textAlign: 'center' }}>
                                    Please contact the Principal for further support with your child's progress.
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 40 }}>
                                    <div style={{ width: 250, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600 }}>Parent's Signature:</span>
                                            <div style={{ flex: 1, borderBottom: '1px solid #1E293B' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
