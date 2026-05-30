import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents, addOrUpdateStudent, removeStudent } from '../../store/slices/studentsSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';

interface Student {
    id: string;
    name: string;
    fatherName: string;
    studentId: string;
    email: string;
    password?: string;
    grade: string;
    gender: string;
    section: string;
    session: string;
    phone: string;
    rollno?: string;
    profileImage?: string;
    uid?: string;
}

const GENDER_OPTIONS = ['Male', 'Female'];
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];

const avatarColor = (name: string) => {
    const n = name || 'A';
    return COLORS[(n.charCodeAt(0) || 65) % COLORS.length];
};

const emptyForm = (): Partial<Student> => ({
    name: '', fatherName: '', grade: '', gender: '', section: '', session: '', phone: '', email: '', profileImage: '', rollno: ''
});

// Auto-generates an 8-character alphanumeric password
const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
};

// Reads/increments a Firestore counter to produce STD-YEAR-NNN
const getNextStudentId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', 'studentId');
    const counterSnap = await getDoc(counterRef);
    let nextNumber = 1;
    if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (data.year === currentYear) nextNumber = data.nextNumber;
    }
    const studentId = `STD-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
    await setDoc(counterRef, { year: currentYear, nextNumber: nextNumber + 1 });
    return studentId;
};

// Creates a Firebase Auth account via a secondary app so admin stays signed in,
// and writes the student profile to `studentsprofile`
const createStudentAuthAccount = async (
    studentEmail: string,
    studentPassword: string,
    studentData: { name: string; fatherName: string; grade: string; profileImage: string; gender: string; section: string; session: string; phone: string; studentId: string; rollno?: string; }
): Promise<string | null> => {
    let secondaryApp: any;
    try {
        secondaryApp = initializeApp(firebaseConfig, `studentCreation_${Date.now()}`);
        const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, studentEmail, studentPassword);
        const uid = userCredential.user.uid;
        await setDoc(doc(db, 'studentsprofile', uid), {
            fullname: studentData.name,
            fathername: studentData.fatherName,
            email: studentEmail,
            phone: studentData.phone || '',
            rollno: studentData.rollno || studentData.studentId || '',
            class: studentData.grade || '',
            section: studentData.section || '',
            session: studentData.session || '',
            image: studentData.profileImage || '',
            gender: studentData.gender || '',
            role: 'student',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return uid;
    } catch (error: any) {
        console.error('Error creating student auth account:', error);
        throw error;
    } finally {
        if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
    }
};

// Resolves a student's Firebase Auth UID and current password by querying studentsprofile,
// then signs in and updates the password. Returns true if Auth was actually updated.
const updateStudentAuthAccount = async (
    oldEmail: string,
    oldPassword: string | undefined,
    newEmail: string,
    newPassword: string | undefined,
    studentData: any,
    uid: string | undefined
): Promise<'updated' | 'skipped' | 'no_uid'> => {
    if (!newPassword) return 'skipped';

    // Step 1: Resolve UID and current Auth password — query studentsprofile by email
    let resolvedUid = uid || '';
    let resolvedAuthPassword = oldPassword || '';

    try {
        const emailLower = (oldEmail || '').toLowerCase().trim();
        const q = query(collection(db, 'studentsprofile'), where('email', '==', emailLower));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const profileDoc = snap.docs[0];
            if (!resolvedUid) resolvedUid = profileDoc.id;
            const profileData = profileDoc.data();
            // Prefer the password stored in studentsprofile (it was written at creation or last successful update)
            if (profileData.password) resolvedAuthPassword = profileData.password;
        }
    } catch (lookupError) {
        console.warn('studentsprofile lookup failed:', lookupError);
    }

    if (!resolvedUid) return 'no_uid';

    // Step 2: Sign in as student with resolved current password and update to new one
    let authUpdated = false;
    if (resolvedAuthPassword) {
        let secondaryApp: any;
        try {
            const emailLower = (oldEmail || '').toLowerCase().trim();
            secondaryApp = initializeApp(firebaseConfig, `studentUpdate_${Date.now()}`);
            const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
            const userCredential = await signInWithEmailAndPassword(secondaryAuth, emailLower, resolvedAuthPassword);
            await updatePassword(userCredential.user, newPassword);
            authUpdated = true;
            console.log('✅ Firebase Auth password updated for', emailLower);
        } catch (authError: any) {
            console.warn('Auth update failed:', authError?.code, authError?.message);
        } finally {
            if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
        }
    }

    // Step 3: Always sync studentsprofile (password field + profile data)
    try {
        const profileUpdates: any = {
            fullname: studentData.name,
            fathername: studentData.fatherName,
            class: studentData.grade,
            image: studentData.profileImage,
            gender: studentData.gender,
            section: studentData.section,
            session: studentData.session,
            phone: studentData.phone,
            rollno: studentData.rollno || studentData.studentId || '',
            email: (newEmail || '').toLowerCase().trim(),
            password: newPassword,
            updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'studentsprofile', resolvedUid), profileUpdates, { merge: true });
    } catch (profileError: any) {
        console.warn('studentsprofile sync skipped:', profileError?.message);
    }

    return authUpdated ? 'updated' : 'skipped';
};

export default function StudentsPage() {
    const dispatch = useAppDispatch();
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const loading = studentsStatus === 'loading' || studentsStatus === 'idle';

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [form, setForm] = useState<Partial<Student>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewStudent, setViewStudent] = useState<Student | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;

    useEffect(() => { 
        if (studentsStatus === 'idle') {
            dispatch(fetchStudents()); 
        }
        if (classesStatus === 'idle') {
            dispatch(fetchClasses());
        }
    }, [dispatch, studentsStatus, classesStatus]);

    const activeSearch = search || globalSearchQuery;

    const filtered = students.filter((s: any) => {
        const matchClass = !filterClass || s.grade === filterClass;
        const matchGender = !filterGender || String(s.gender || '').toLowerCase() === filterGender.toLowerCase();
        const q = activeSearch.toLowerCase();
        const strName = String(s.name || '').toLowerCase();
        const strEmail = String(s.email || '').toLowerCase();
        const strRollno = String(s.rollno || '').toLowerCase();
        const strStudentId = String(s.studentId || '').toLowerCase();
        
        const matchSearch = !q || strName.includes(q) || strEmail.includes(q) || strRollno.includes(q) || strStudentId.includes(q);
        
        return matchClass && matchGender && matchSearch;
    });

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [activeSearch, filterClass, filterGender]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const paginatedStudents = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (s: Student) => { setEditing(s); setForm({ ...s }); setModalOpen(true); };

    const save = async () => {
        if (!form.name || !form.fatherName) { alert('Name and Father Name are required.'); return; }
        setSaving(true);
        try {
            if (editing) {
                // --- EDIT existing student ---
                const id = editing.id;
                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    studentId: id,
                    email: form.email || '',
                    grade: form.grade || '',
                    gender: form.gender || '',
                    section: form.section || '',
                    session: form.session || '',
                    phone: form.phone || '',
                    rollno: form.rollno || '',
                    profileImage: form.profileImage || '',
                    password: form.password || '',
                };
                
                const authResult = await updateStudentAuthAccount(
                    editing.email,
                    editing.password,
                    payload.email,
                    payload.password,
                    payload,
                    editing.uid
                );
                
                await setDoc(doc(db, 'students', id), { ...payload, uid: editing.uid || '', updatedAt: serverTimestamp() }, { merge: true });
                dispatch(addOrUpdateStudent({ id, ...payload, uid: editing.uid } as Student));
                setModalOpen(false);

                if (authResult === 'updated') {
                    alert('✅ Student updated successfully. Firebase Auth password has been changed — student can now log in with the new password.');
                } else if (authResult === 'skipped') {
                    alert('⚠️ Student record saved. Firebase Auth password could not be updated (stored password may be out of sync). Update the password in Firebase Console manually, or ask the student to use Forgot Password.');
                } else if (authResult === 'no_uid') {
                    alert('⚠️ Student record saved in Firestore. However, no Firebase Auth account was found for this student — they may not be able to log in. Use Firebase Console to reset their password manually.');
                } else {
                    alert('✅ Student updated.');
                }
            } else {
                // --- ADD new student: auto-generate ID, email, password ---
                const newStudentId = await getNextStudentId();
                const newEmail = `${newStudentId}@theseeksacademy.edu.pk`;
                const newPassword = generatePassword();

                const authData = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    grade: form.grade || '',
                    profileImage: form.profileImage || '',
                    gender: form.gender || '',
                    section: form.section || '',
                    session: form.session || '',
                    phone: form.phone || '',
                    rollno: form.rollno || '',
                    studentId: newStudentId,
                };

                // Create Firebase Auth account + studentsprofile doc
                const uid = await createStudentAuthAccount(newEmail, newPassword, authData);

                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    studentId: newStudentId,
                    email: newEmail,
                    password: newPassword,
                    grade: form.grade || '',
                    gender: form.gender || '',
                    section: form.section || '',
                    session: form.session || '',
                    phone: form.phone || '',
                    rollno: form.rollno || '',
                    profileImage: form.profileImage || '',
                    uid: uid || '',
                };

                // Optimistic UI update
                dispatch(addOrUpdateStudent({ id: newStudentId, ...payload } as Student));
                setModalOpen(false);

                // Write to students collection
                await setDoc(doc(db, 'students', newStudentId), { ...payload, updatedAt: serverTimestamp() });

                alert(`Student added!\n\nStudent ID: ${newStudentId}\nEmail: ${newEmail}\nPassword: ${newPassword}\n\nThe student can now log in with these credentials.`);
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

    const remove = async (id: string) => {
        if (!confirm('Delete this student record?')) return;
        setDeleting(id);
        
        // Optimistic UI update
        dispatch(removeStudent(id));
        
        // Finalize backend
        await deleteDoc(doc(db, 'students', id));
        setDeleting(null);
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>👥 Student Directory</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage and view enrolled students</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{filtered.length}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterClass || filterGender || search) ? 'found' : 'students'}</span>
                        </div>
                        <button className="btn btn-primary" onClick={openAdd} style={{ padding: '5px 12px', fontSize: 12, height: 30 }}>
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
                        placeholder="Search name, ID, email..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'transparent', fontSize: 12, border: 'none', outline: 'none', flex: 1, color: 'var(--text)' }}
                    />
                </div>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                    {['', 'Male', 'Female'].map(g => (
                        <button key={g} onClick={() => setFilterGender(g)} style={{ padding: '2px 8px', height: 26, fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: filterGender === g ? 700 : 400, background: filterGender === g ? 'var(--primary)' : 'transparent', color: filterGender === g ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
                            {g === '' ? 'All' : g === 'Male' ? '👦 Boys' : '👧 Girls'}
                        </button>
                    ))}
                </div>
                {(search || filterClass || filterGender) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearch(''); setFilterClass(''); setFilterGender(''); }}>
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
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center', color: '#ffffff' }}>#</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 150 }}>Name</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 100 }}>Student ID</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 80 }}>Class</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)', minWidth: 120 }}>Father</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#ffffff', width: 80 }}>Gender</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 80 }}>Section</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 110 }}>Phone</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 150 }}>Email</th>
                                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 120, borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? <tr><td colSpan={10} className="empty" style={{ padding: '30px', fontSize: 12 }}>No students found matching filters</td></tr>
                                        : paginatedStudents.map((s: any, i: number) => {
                                            const sGender = String(s.gender || '').toLowerCase();
                                            const rowNum = startIdx + i + 1;
                                            return (
                                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{rowNum}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0, background: `${avatarColor(String(s.name || ''))}22`, color: avatarColor(String(s.name || '')) }}>{String(s.name || 'S').charAt(0).toUpperCase()}</div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{s.name}</div>
                                                                {s.rollno && <div style={{ fontSize: 10, color: 'var(--text2)' }}>Roll: {s.rollno}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--primary-light)', fontSize: 12 }}>{s.studentId}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12 }}>{s.grade || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{s.fatherName || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                                                        {sGender ? (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sGender === 'male' ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)', color: sGender === 'male' ? '#818cf8' : '#ec4899' }}>
                                                                {sGender === 'male' ? '♂ M' : '♀ F'}
                                                            </span>
                                                        ) : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{s.section || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{s.phone || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{s.email || '—'}</td>
                                                    <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26 }} onClick={(e) => { e.stopPropagation(); setViewStudent(s); }}>View</button>
                                                            <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26 }} onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Edit</button>
                                                            <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#ef4444' }} disabled={deleting === s.id} onClick={(e) => { e.stopPropagation(); remove(s.id); }}>🗑</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Bar */}
                    {filtered.length > PAGE_SIZE && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)',
                            borderRadius: '0 0 8px 8px', flexShrink: 0
                        }}>
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '5px 14px', fontSize: 12, height: 30 }}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                ← Previous
                            </button>
                            <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>Showing <strong style={{ color: 'var(--text)' }}>{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)}</strong> of <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong></span>
                                <span style={{ color: 'var(--border)' }}>|</span>
                                <span>Page <strong style={{ color: 'var(--text)' }}>{currentPage}</strong> of {totalPages}</span>
                            </div>
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '5px 14px', fontSize: 12, height: 30 }}
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Student' : 'Add Student'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {/* Name fields — always shown */}
                                {[
                                    { label: 'Full Name *', key: 'name', placeholder: 'e.g. Ahmed Ali' },
                                    { label: 'Father Name *', key: 'fatherName', placeholder: 'e.g. Ali Khan' },
                                    { label: 'Roll No', key: 'rollno', placeholder: 'e.g. 101' },
                                    { label: 'Phone', key: 'phone', placeholder: '03001234567' },
                                    { label: 'Section', key: 'section', placeholder: 'e.g. A' },
                                    { label: 'Session', key: 'session', placeholder: 'e.g. 2024-2025' },
                                    { label: 'Profile Image URL', key: 'profileImage', placeholder: 'https://...' },
                                ].map(f => (
                                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{f.label}</label>
                                        <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Class</label>
                                    <select className="form-input" value={form.grade || ''} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Gender</label>
                                    <select className="form-input" value={form.gender || ''} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                        <option value="">Select Gender</option>
                                        {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>

                                {/* Email & Password: auto-generated for new, editable for edit */}
                                {editing ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Email</label>
                                            <input className="form-input" placeholder="student@theseeksacademy.edu.pk" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
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
                                            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>A unique Student ID, email (<em>STD-YEAR-NNN@theseeksacademy.edu.pk</em>), and password will be created automatically when you save.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Student'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewStudent && (
                <div className="modal-overlay" onClick={() => setViewStudent(null)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden', background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
                        {/* ID Card Header Banner */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', height: 100, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>ID: {viewStudent.studentId}</div>
                            <button onClick={() => setViewStudent(null)} style={{ position: 'absolute', top: 12, left: 16, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
                        </div>
                        
                        {/* Profile Area */}
                        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40, position: 'relative' }}>
                            <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, flexShrink: 0, background: `${avatarColor(viewStudent.name)}`, color: '#fff', border: '4px solid var(--card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 2 }}>
                                {String(viewStudent.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: -0.5 }}>{viewStudent.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                                    {viewStudent.grade && <span style={{ color: 'var(--primary)' }}>{viewStudent.grade}</span>}
                                    {viewStudent.section && <><span>•</span><span>{viewStudent.section}</span></>}
                                </div>
                            </div>
                        </div>

                        {/* ID Details Grid */}
                        <div style={{ padding: '0 24px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg3)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                {[
                                    ['Father Name', viewStudent.fatherName],
                                    ['Roll No', viewStudent.rollno],
                                    ['Session', viewStudent.session],
                                    ['Section', viewStudent.section],
                                    ['Phone', viewStudent.phone],
                                    ['Gender', viewStudent.gender],
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
                                        {viewStudent.email ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewStudent.email}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Password</span>
                                        {viewStudent.password ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewStudent.password}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }} onClick={() => setViewStudent(null)}>Close</button>
                                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => { setViewStudent(null); openEdit(viewStudent); }}>Edit Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
