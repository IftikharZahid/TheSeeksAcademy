import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTeachers, addOrUpdateTeacher, removeTeacher } from '../../store/slices/teachersSlice';
import { fetchBooks } from '../../store/slices/appSettingsSlice';

interface Teacher {
    id: string;
    name: string;
    fatherName?: string;
    gender?: string;
    role?: string;
    subject: string;
    qualification: string;
    experience: string;
    phone: string;
    email: string;
    password?: string;
    image: string;
    teacherId?: string;
    uid?: string;
}

// Subjects are now dynamically loaded from Firestore

const TEACHER_ROLES = ['Teacher', 'Senior Teacher', 'Assistant Teacher', 'HOD', 'Principal', 'Vice Principal'];
const GENDERS = ['Male', 'Female'];

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];
const avatarColor = (name: string) => COLORS[(name || 'A').charCodeAt(0) % COLORS.length];
const emptyForm = (): Partial<Teacher> => ({ name: '', fatherName: '', gender: '', role: 'Teacher', subject: '', qualification: '', experience: '', phone: '', email: '', image: '' });

const PAGE_SIZE = 12;

// ── Auth helpers (mirrors StudentsPage) ────────────────────────────────────────

const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
};

// Returns teacherId in the format TCH-YEAR-NNN
// Email is derived directly from teacherId: TCH-2026-001@theseeksacademy.edu.pk
const getNextTeacherId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const idCounterRef = doc(db, 'counters', 'teacherId');
    const idSnap = await getDoc(idCounterRef);
    let nextIdNum = 1;
    if (idSnap.exists()) {
        const d = idSnap.data();
        if (d.year === currentYear) nextIdNum = d.nextNumber;
    }
    const teacherId = `TCH-${currentYear}-${String(nextIdNum).padStart(3, '0')}`;
    await setDoc(idCounterRef, { year: currentYear, nextNumber: nextIdNum + 1 });
    return teacherId;
};

// ── Sync ALL profile docs for a teacher by their email ───────────────────────
// Queries both `profile` and `studentsprofile` by email to find every existing
// doc regardless of which ID was used when the teacher was created, then merges
// the updated payload into all of them. Also writes to uid-keyed and
// teacherId-keyed docs so future auth lookups always hit the right document.
const syncTeacherProfileByEmail = async (
    email: string,
    payload: Record<string, any>,
    uid?: string,
    teacherDocId?: string,
) => {
    if (!email) return;
    const writes: Promise<any>[] = [];

    // 1️⃣ Always write to teacherId-keyed docs (catches new-flow teachers)
    if (teacherDocId) {
        writes.push(setDoc(doc(db, 'profile', teacherDocId), payload, { merge: true }));
        writes.push(setDoc(doc(db, 'studentsprofile', teacherDocId), payload, { merge: true }));
    }
    // 2️⃣ Always write to uid-keyed docs (primary mobile lookup)
    if (uid) {
        writes.push(setDoc(doc(db, 'profile', uid), payload, { merge: true }));
        writes.push(setDoc(doc(db, 'studentsprofile', uid), payload, { merge: true }));
    }
    // 3️⃣ Email-based discovery: find & update ANY existing profile docs
    try {
        const [pSnap, spSnap] = await Promise.all([
            getDocs(query(collection(db, 'profile'), where('email', '==', email))),
            getDocs(query(collection(db, 'studentsprofile'), where('email', '==', email))),
        ]);
        pSnap.forEach(d => writes.push(setDoc(doc(db, 'profile', d.id), payload, { merge: true })));
        spSnap.forEach(d => writes.push(setDoc(doc(db, 'studentsprofile', d.id), payload, { merge: true })));
    } catch (e) {
        console.warn('Profile email-query sync failed (non-fatal):', e);
    }
    await Promise.all(writes.map(p => p.catch(e => console.warn('Profile sync write failed:', e?.code))));
    console.log('✅ Teacher profile synced for', email);
};

const createTeacherAuthAccount = async (
    teacherEmail: string,
    teacherPassword: string,
    teacherData: { name: string; fatherName: string; gender: string; role: string; qualification: string; experience: string; phone: string; subject: string; image: string; teacherId: string; }
): Promise<string | null> => {

    let secondaryApp: any;
    try {
        secondaryApp = initializeApp(firebaseConfig, `teacherCreation_${Date.now()}`);
        const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });

        // 1️⃣ Create the Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, teacherEmail, teacherPassword);
        const uid = userCredential.user.uid;

        // 2️⃣ Build the profile payload (matches mobile UserProfile type)
        const profilePayload = {
            // Core UserProfile fields consumed by ProfileScreen
            fullname: teacherData.name,
            fathername: teacherData.fatherName || '',  // ProfileScreen shows fathername
            email: teacherEmail,
            phone: teacherData.phone || '',
            rollno: teacherData.teacherId,             // shown as ID / Roll No
            class: teacherData.subject || '',           // shown as Class → Subject for teacher
            section: teacherData.qualification || '',   // shown as Section → Qualification
            session: teacherData.experience || '',      // shown as Session → Experience
            image: teacherData.image || '',
            gender: teacherData.gender || '',           // shown in Personal Information
            role: teacherData.role || 'teacher',        // shown as Role badge in profile
            // Extra teacher-specific fields
            teacherId: teacherData.teacherId,
            subject: teacherData.subject || '',
            qualification: teacherData.qualification || '',
            experience: teacherData.experience || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // 3️⃣ PRIMARY: Write to studentsprofile/{uid}
        // mobile authSlice checks this collection FIRST via direct UID read
        // → always succeeds regardless of Firestore security rules
        await setDoc(doc(db, 'studentsprofile', uid), profilePayload);
        console.log('✅ studentsprofile/', uid, 'written — primary profile path');

        // 4️⃣ SECONDARY: Also write to profile/{uid} for the direct-uid lookup (step 1b)
        try {
            await setDoc(doc(db, 'profile', uid), profilePayload);
            console.log('✅ profile/', uid, 'written');
        } catch (e1: any) {
            console.warn('⚠️ profile/', uid, 'write failed (non-fatal):', e1?.code);
        }

        // 5️⃣ TERTIARY: Also write to profile/{teacherId} for email-based query fallback
        try {
            await setDoc(doc(db, 'profile', teacherData.teacherId), profilePayload, { merge: true });
            console.log('✅ profile/', teacherData.teacherId, 'written as email-lookup key');
        } catch (e2: any) {
            console.warn('⚠️ profile/', teacherData.teacherId, 'write failed (non-fatal):', e2?.code);
        }

        return uid;
    } catch (error: any) {
        console.error('❌ createTeacherAuthAccount failed:', error?.code, error?.message);
        throw error;
    } finally {
        // Delete secondary app AFTER all writes are complete
        if (secondaryApp) {
            try { await deleteApp(secondaryApp); } catch (_) {}
        }
    }
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function TeachersPage() {
    const dispatch = useAppDispatch();
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const loading = teachersStatus === 'loading' || teachersStatus === 'idle';

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
    const [search, setSearch] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [form, setForm] = useState<Partial<Teacher>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [profileCreating, setProfileCreating] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingProgress, setUploadingProgress] = useState<{current: number, total: number} | null>(null);

    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet([{
                Name: 'Dr. Sarah Smith',
                'Father Name': 'Muhammad Ali',
                Gender: 'Female',
                Role: 'Teacher',
                Subject: 'Mathematics',
                Qualification: 'PhD',
                Experience: '5 Years',
                Phone: '03001234567'
            }]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Staff");
            XLSX.writeFile(wb, "Staff_Import_Template.xlsx");
        } catch (error) {
            alert('Failed to generate template.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws);

                    if (data.length === 0) {
                        alert("No data found in the file.");
                        return;
                    }

                    // Normalize keys to lower case and trim to handle spaces in Excel headers
                    const normalizedData = data.map(row => {
                        const newRow: any = {};
                        for (const key in row) {
                            newRow[key.trim().toLowerCase()] = row[key];
                        }
                        return newRow;
                    });

                    if (!confirm(`Are you sure you want to import ${normalizedData.length} staff members?`)) {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    setUploadingProgress({ current: 0, total: normalizedData.length });

                    let successCount = 0;
                    let skippedCount = 0;
                    for (let i = 0; i < normalizedData.length; i++) {
                        const row = normalizedData[i];
                        const name = row['name'] || row['fullname'] || row['full name'] || row['teacher name'] || '';
                        
                        if (!name) {
                            skippedCount++;
                            setUploadingProgress({ current: i + 1, total: normalizedData.length });
                            continue;
                        }

                        const subject = row['subject'] || row['class'] || '';
                        const fatherName = row['fathername'] || row['father name'] || '';
                        const gender = row['gender'] || '';
                        const qualification = row['qualification'] || row['degree'] || '';
                        const experience = row['experience'] || '';
                        const phone = row['phone'] || row['contact'] || '';
                        const role = row['role'] || row['position'] || 'Teacher';

                        try {
                            const newTeacherId = await getNextTeacherId();
                            const newEmail = `${newTeacherId.toLowerCase()}@theseeksacademy.edu.pk`;
                            const newPassword = generatePassword();

                            const authData = {
                                name: String(name),
                                fatherName: String(fatherName),
                                gender: String(gender),
                                role: String(role),
                                qualification: String(qualification),
                                experience: String(experience),
                                phone: String(phone),
                                subject: String(subject),
                                image: '',
                                teacherId: newTeacherId,
                            };

                            const uid = await createTeacherAuthAccount(newEmail, newPassword, authData);

                            const payload = {
                                name: String(name),
                                fatherName: String(fatherName),
                                gender: String(gender),
                                role: String(role),
                                subject: String(subject),
                                qualification: String(qualification),
                                experience: String(experience),
                                phone: String(phone),
                                email: newEmail,
                                password: newPassword,
                                image: '',
                                teacherId: newTeacherId,
                                uid: uid || '',
                                type: 'Teacher',
                                status: 'Active',
                            };

                            await setDoc(doc(db, 'staff', newTeacherId), { ...payload, updatedAt: serverTimestamp() });
                            dispatch(addOrUpdateTeacher({ id: newTeacherId, ...payload } as any));

                            successCount++;
                        } catch (rowError) {
                            console.error(`Failed to import row ${i} (Name: ${name}):`, rowError);
                            skippedCount++;
                        }
                        
                        setUploadingProgress({ current: i + 1, total: normalizedData.length });
                    }

                    alert(`Import completed!\n✅ Successfully imported: ${successCount}\n⚠️ Skipped/Failed: ${skippedCount}`);
                } catch (err: any) {
                    alert('Error parsing file: ' + err.message);
                } finally {
                    setUploadingProgress(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);
        } catch (err: any) {
            alert('Failed to load xlsx parser: ' + err.message);
            setUploadingProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Load books/subjects from Redux
    const subjectsList = useAppSelector((s: any) => s.appSettings.books);
    const booksStatus = useAppSelector((s: any) => s.appSettings.booksStatus);
    useEffect(() => {
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
    }, [dispatch, teachersStatus]);
    useEffect(() => {
        if (booksStatus === 'idle') dispatch(fetchBooks());
    }, [dispatch, booksStatus]);

    const activeSearch = search || globalSearchQuery;

    const filtered = teachers.filter((t: any) => {
        const q = activeSearch.toLowerCase();
        const matchSearch = !q || (t.name || '').toLowerCase().includes(q)
            || (t.subject || '').toLowerCase().includes(q)
            || (t.email || '').toLowerCase().includes(q)
            || (t.teacherId || '').toLowerCase().includes(q);
        const matchSubject = !filterSubject || t.subject === filterSubject;
        return matchSearch && matchSubject;
    });

    useEffect(() => { setCurrentPage(1); }, [activeSearch, filterSubject]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const paginatedTeachers = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (t: Teacher) => { setEditing(t); setForm({ ...t }); setModalOpen(true); };

    const save = async () => {
        if (!form.name || !form.subject || !form.qualification || !form.experience) {
            alert('Name, Subject, Qualification and Experience are required.'); return;
        }
        setSaving(true);
        try {
            if (editing) {
                // ── EDIT existing teacher ──────────────────────────────
                const id = editing.id;
                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    subject: form.subject || '',
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    email: form.email || '',
                    password: form.password || '',
                    image: form.image || '',
                    teacherId: editing.teacherId || id,
                    type: 'Teacher',
                };
                dispatch(addOrUpdateTeacher({ id, ...payload } as any));
                setModalOpen(false);

                // 1️⃣ Update staff doc
                await setDoc(doc(db, 'staff', id), { ...payload, updatedAt: serverTimestamp() }, { merge: true });

                // 2️⃣ Sync all profile documents so mobile ProfileScreen reflects changes
                const teacherDocId = (editing as any).teacherId || id;
                const uid = (editing as any).uid;
                const profileSync = {
                    fullname: form.name || '',
                    fathername: form.fatherName || '',
                    email: form.email || editing.email || '',
                    phone: form.phone || '',
                    rollno: teacherDocId,
                    class: form.subject || '',
                    section: form.qualification || '',
                    session: form.experience || '',
                    image: form.image || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    teacherId: teacherDocId,
                    subject: form.subject || '',
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    updatedAt: serverTimestamp(),
                };
                const teacherEmail = form.email || editing.email || '';
                await syncTeacherProfileByEmail(teacherEmail, profileSync, uid, teacherDocId);


            } else {
                // ── ADD new teacher: auto-generate ID, email, password ─
                const newTeacherId = await getNextTeacherId();
                // Email = teacherId (lowercase) @ theseeksacademy.edu.pk
                // e.g. TCH-2026-001@theseeksacademy.edu.pk
                const newEmail = `${newTeacherId.toLowerCase()}@theseeksacademy.edu.pk`;
                const newPassword = generatePassword();

                const authData = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    subject: form.subject || '',
                    image: form.image || '',
                    teacherId: newTeacherId,
                };

                // Create Firebase Auth account + profile doc
                const uid = await createTeacherAuthAccount(newEmail, newPassword, authData);

                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    subject: form.subject || '',
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    email: newEmail,
                    password: newPassword,
                    image: form.image || '',
                    teacherId: newTeacherId,
                    uid: uid || '',
                    type: 'Teacher',
                    status: 'Active',
                };

                // Optimistic UI
                dispatch(addOrUpdateTeacher({ id: newTeacherId, ...payload } as any));
                setModalOpen(false);

                await setDoc(doc(db, 'staff', newTeacherId), { ...payload, updatedAt: serverTimestamp() });

                alert(`Teacher added!\n\nTeacher ID: ${newTeacherId}\nEmail: ${newEmail}\nPassword: ${newPassword}\n\nThe teacher can now log in with these credentials.`);
            }
        } catch (e: any) {
            if (e?.code === 'auth/email-already-in-use') {
                alert('An account with this email already exists.');
            } else {
                alert('Failed to save. Please try again.');
            }
        }
        setSaving(false);
    };

    // ── Create/repair Firestore profile for an existing teacher ───────────────
    // Delegates to syncTeacherProfileByEmail which:
    //   • writes to teacherId-keyed docs, uid-keyed docs (if available),
    //   • AND queries both collections by email to catch any existing docs.
    const createProfileForExistingTeacher = async (t: Teacher) => {
        if (!t.email) { alert('This teacher has no email assigned. Edit the teacher first.'); return; }
        setProfileCreating(true);
        try {
            const docId = t.teacherId || t.id;
            const uid = (t as any).uid;
            const profilePayload = {
                fullname: t.name || '',
                fathername: (t as any).fatherName || '',
                email: t.email,
                phone: t.phone || '',
                rollno: docId,
                class: t.subject || '',
                section: t.qualification || '',
                session: t.experience || '',
                image: t.image || '',
                gender: (t as any).gender || '',
                role: (t as any).role || 'Teacher',
                teacherId: docId,
                subject: t.subject || '',
                qualification: t.qualification || '',
                experience: t.experience || '',
                password: t.password || '',
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            };
            await syncTeacherProfileByEmail(t.email, profilePayload, uid, docId);
            alert(`✅ Profile created/updated for ${t.name}!\n\nEmail: ${t.email}\nPassword: ${t.password || '(see staff table)'}\n\nThe teacher can pull-to-refresh on the Profile screen to see the latest data.`);
        } catch (e: any) {
            console.error('createProfileForExistingTeacher failed:', e);
            alert('Failed to create profile: ' + (e?.message || 'Unknown error'));
        }
        setProfileCreating(false);
    };


    const remove = async (t: any) => {
        if (!confirm('Delete this staff member?')) return;
        setDeleting(t.id);
        
        try {
            dispatch(removeTeacher(t.id));
            await deleteDoc(doc(db, 'staff', t.id));
            
            if (t.uid) {
                await deleteDoc(doc(db, 'studentsprofile', t.uid));
                await deleteDoc(doc(db, 'profile', t.uid));
            }
            if (t.teacherId) {
                await deleteDoc(doc(db, 'studentsprofile', t.teacherId));
                await deleteDoc(doc(db, 'profile', t.teacherId));
            }
        } catch (error) {
            console.error('Error deleting staff member:', error);
            alert('Failed to completely delete the record from Firebase.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>👩‍🏫 Teachers / Staff</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage and view staff members</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{filtered.length}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterSubject || search) ? 'found' : 'staff'}</span>
                        </div>
                        <button className="btn btn-ghost" onClick={() => setImportModalOpen(true)} style={{ padding: '5px 12px', fontSize: 12, height: 30, border: '1px solid var(--border)', background: 'var(--card)' }}>
                            📤 Import
                        </button>
                        <button className="btn btn-primary" onClick={openAdd} style={{ padding: '5px 12px', fontSize: 12, height: 30 }} disabled={!!uploadingProgress}>
                            ➕ Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="responsive-filter-bar" style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span className="search-icon" style={{ fontSize: 12, marginRight: 6 }}>🔍</span>
                    <input
                        placeholder="Search name, subject, email, ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'transparent', fontSize: 12, border: 'none', outline: 'none', flex: 1, color: 'var(--text)' }}
                    />
                </div>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {subjectsList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                {(search || filterSubject) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearch(''); setFilterSubject(''); }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div className="table-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 8, overflow: 'hidden', margin: 0 }}>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center', color: '#fff' }}>#</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 180, color: '#fff' }}>Name</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 100, color: '#fff' }}>Teacher ID</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 140, color: '#fff' }}>Subject</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff' }}>Qualification</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 100, color: '#fff' }}>Experience</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 110, color: '#fff' }}>Phone</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff' }}>Email</th>
                                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 140, borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} className="empty" style={{ padding: '30px', fontSize: 12 }}>No staff found matching filters</td></tr>
                                    ) : paginatedTeachers.map((t: any, i: number) => {
                                        const rowNum = startIdx + i + 1;
                                        return (
                                            <tr key={t.id} onClick={() => setViewTeacher(t as Teacher)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{rowNum}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0, background: `${avatarColor(t.name)}22`, color: avatarColor(t.name) }}>
                                                            {t.image ? <img src={t.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (t.name || 'T').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{t.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--primary-light)', fontSize: 12 }}>{t.teacherId || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{t.subject}</span>
                                                </td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{t.qualification || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{t.experience || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{t.phone || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{t.email || '—'}</td>
                                                <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26 }} onClick={(e) => { e.stopPropagation(); setViewTeacher(t as Teacher); }}>View</button>
                                                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26 }} onClick={(e) => { e.stopPropagation(); openEdit(t as Teacher); }}>Edit</button>
                                                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#ef4444' }} disabled={deleting === t.id} onClick={(e) => { e.stopPropagation(); remove(t); }}>🗑</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {filtered.length > PAGE_SIZE && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)', borderRadius: '0 0 8px 8px', flexShrink: 0 }}>
                            <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 12, height: 30 }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>← Previous</button>
                            <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>Showing <b style={{ color: 'var(--text)' }}>{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)}</b> of <b style={{ color: 'var(--primary)' }}>{filtered.length}</b></span>
                                <span style={{ color: 'var(--border)' }}>|</span>
                                <span>Page <b style={{ color: 'var(--text)' }}>{currentPage}</b> of {totalPages}</span>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 12, height: 30 }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next →</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Import Modal ────────────────────────────────────────────────────── */}
            {importModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <div className="modal-title">Bulk Import Staff</div>
                            <button className="modal-close" onClick={() => setImportModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: 'rgba(59,130,246,0.08)', padding: 16, borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>1️⃣</span> Download Template
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                                    Download the exact Excel template required for importing. Fill it with your staff data without modifying the column headers.
                                </div>
                                <button className="btn btn-ghost" style={{ background: '#fff', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 12, padding: '8px 14px', borderRadius: 6, fontWeight: 700, boxShadow: '0 2px 4px rgba(59,130,246,0.1)' }} onClick={downloadTemplate}>
                                    ⬇️ Download .xlsx Template
                                </button>
                            </div>

                            <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>2️⃣</span> Upload Data
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                                    Select your filled template to automatically create staff accounts and profiles.
                                </div>
                                <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={async (e) => { await handleFileUpload(e); setImportModalOpen(false); }} />
                                <button className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, borderRadius: 8, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => fileInputRef.current?.click()} disabled={!!uploadingProgress}>
                                    {uploadingProgress ? `Importing ${uploadingProgress.current}/${uploadingProgress.total}...` : '📤 Select File & Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Teacher' : 'Add Teacher'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { label: 'Full Name *', key: 'name', placeholder: 'e.g. Dr. Sarah Smith' },
                                    { label: 'Father Name', key: 'fatherName', placeholder: 'e.g. Muhammad Ali' },
                                    { label: 'Qualification *', key: 'qualification', placeholder: 'e.g. PhD in Mathematics' },
                                    { label: 'Experience *', key: 'experience', placeholder: 'e.g. 10 Years' },
                                    { label: 'Phone', key: 'phone', placeholder: '03001234567' },
                                    { label: 'Image URL', key: 'image', placeholder: 'https://...' },
                                ].map(f => (
                                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{f.label}</label>
                                        <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                    </div>
                                ))}
                                {/* Subject dropdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Subject *</label>
                                    <select className="form-input" value={form.subject || ''} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                                        <option value="">Select Subject</option>
                                        {subjectsList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                {/* Gender dropdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Gender</label>
                                    <select className="form-input" value={form.gender || ''} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                        <option value="">Select Gender</option>
                                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                {/* Role dropdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Role / Position</label>
                                    <select className="form-input" value={form.role || 'Teacher'} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                                        {TEACHER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {/* Email & Password: auto-generated for new, editable for edit */}
                                {editing ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Email</label>
                                            <input className="form-input" placeholder="teacher@theseeksacademy.edu.pk" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Password</label>
                                            <input className="form-input" placeholder="Portal login password" value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.35)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 18 }}>🔑</span>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Credentials Auto-Generated</div>
                                            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>A unique Teacher ID, email (<em>TCH-YEAR-NNN@theseeksacademy.edu.pk</em>), and password will be created automatically when you save.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Teacher'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Profile Modal ────────────────────────────────────────────── */}
            {viewTeacher && (
                <div className="modal-overlay" onClick={() => setViewTeacher(null)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden', background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
                        {/* Banner */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', height: 100, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                                ID: {viewTeacher.teacherId || viewTeacher.id}
                            </div>
                            <button onClick={() => setViewTeacher(null)} style={{ position: 'absolute', top: 12, left: 16, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
                        </div>

                        {/* Profile Area */}
                        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40, position: 'relative' }}>
                            <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, flexShrink: 0, background: `${avatarColor(viewTeacher.name)}`, color: '#fff', border: '4px solid var(--card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 2 }}>
                                {viewTeacher.image
                                    ? <img src={viewTeacher.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    : (viewTeacher.name || 'T').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: -0.5 }}>{viewTeacher.name}</div>
                                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                    {viewTeacher.subject && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{viewTeacher.subject}</span>}
                                    {viewTeacher.role && (
                                        <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                                            {viewTeacher.role}
                                        </span>
                                    )}
                                    {viewTeacher.gender && (
                                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                            {viewTeacher.gender}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div style={{ padding: '0 24px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg3)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                {[
                                    ['Father Name', (viewTeacher as any).fatherName],
                                    ['Gender',      (viewTeacher as any).gender],
                                    ['Role',        (viewTeacher as any).role],
                                    ['Subject',     viewTeacher.subject],
                                    ['Qualification', viewTeacher.qualification],
                                    ['Experience',  viewTeacher.experience],
                                    ['Phone',       viewTeacher.phone],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>{label}</span>
                                        <span style={{ fontSize: 12, color: value ? 'var(--text)' : 'var(--text2)', fontWeight: 600 }}>{value || '—'}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Credentials */}
                            <div style={{ marginTop: 12, background: 'rgba(99,102,241,0.05)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--primary)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>🔑</span> Portal Access
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Email</span>
                                        {viewTeacher.email ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewTeacher.email}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Password</span>
                                        {viewTeacher.password ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewTeacher.password}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }} onClick={() => setViewTeacher(null)}>Close</button>
                                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => { setViewTeacher(null); openEdit(viewTeacher); }}>Edit Details</button>
                            </div>
                            {/* Create/Repair Profile button — for already-created teachers missing a profile doc */}
                            {viewTeacher.email && (
                                <button
                                    disabled={profileCreating}
                                    onClick={() => createProfileForExistingTeacher(viewTeacher)}
                                    style={{ width: '100%', marginTop: 10, padding: '10px 0', fontSize: 12, fontWeight: 700, background: profileCreating ? '#a3a3a3' : 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, cursor: profileCreating ? 'not-allowed' : 'pointer' }}
                                >
                                    {profileCreating ? '⏳ Creating Profile...' : '🔧 Create / Repair Profile on App'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
