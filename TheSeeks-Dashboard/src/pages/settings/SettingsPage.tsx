import React, { useState, useEffect } from 'react';
import {
    updatePassword,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateProfile
} from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    fetchBooks, fetchClasses, persistBooks, persistClasses,
    setBooks, setClasses, resetStatus, fetchDefaultFees, persistDefaultFees,
} from '../../store/slices/appSettingsSlice';
import * as XLSX from 'xlsx';

const ADMIN_EMAILS = ['theseeksacademyfta@gmail.com', 'iftikharzahid@outlook.com'];

// ── Components ────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.03)', ...style }}>
            {children}
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, paddingLeft: 4 }}>
            {label}
        </div>
    );
}

function SettingRow({
    icon, color, label, desc, right, onClick, danger,
}: {
    icon: string; color: string; label: string; desc?: string;
    right?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
    const [hov, setHov] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                cursor: onClick ? 'pointer' : 'default',
                background: hov && onClick ? (danger ? 'rgba(239,68,68,0.08)' : 'var(--bg3)') : 'transparent',
                transition: 'all 0.1s ease',
            }}
        >
            <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                boxShadow: `inset 0 0 0 1px ${color}30`
            }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: danger ? '#ef4444' : 'var(--text)' }}>{label}</div>
                {desc && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, lineHeight: 1.3 }}>{desc}</div>}
            </div>
            {right ?? (onClick && <span style={{ color: 'var(--text2)', fontSize: 16 }}>›</span>)}
        </div>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                background: value ? '#10b981' : 'var(--bg3)',
                border: `1px solid ${value ? '#10b981' : 'var(--border)'}`,
                position: 'relative', transition: 'all 0.2s ease', flexShrink: 0,
            }}
        >
            <div style={{
                position: 'absolute', top: 1, left: value ? 17 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)',
                width: '100%', maxWidth: 400, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
                    <button onClick={onClose} style={{
                        background: 'var(--bg3)', border: 'none', color: 'var(--text2)', cursor: 'pointer',
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, transition: 'all 0.15s'
                    }} className="hover-brightness">✕</button>
                </div>
                <div style={{ padding: 16 }}>{children}</div>
            </div>
        </div>
    );
}

// ── Main Content ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { user, profile, logout } = useAuth();
    const dispatch = useAppDispatch();
    const email = user?.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.includes(email);

    // Redux — Books & Classes
    const books = useAppSelector((s: any) => s.appSettings.books);
    const booksStatus = useAppSelector((s: any) => s.appSettings.booksStatus);
    const classes = useAppSelector((s: any) => s.appSettings.classes);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const defaultFees = useAppSelector((s: any) => s.appSettings.defaultFees);

    // Always fetch fresh Books & Classes from Firestore on mount
    useEffect(() => {
        dispatch(fetchBooks());
        dispatch(fetchClasses());
        dispatch(fetchDefaultFees());
    }, [dispatch]);

    // Initial state loading
    const [darkMode, setDarkMode] = useState(true);
    const [compactLayout, setCompactLayout] = useState(true);
    const [notifEmail, setNotifEmail] = useState(true);
    const [notifBrowser, setNotifBrowser] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [modal, setModal] = useState<'changePassword' | 'profile' | 'privacy' | 'help' | 'books' | 'classes' | 'backup' | 'defaultFees' | 'upload' | null>(null);

    // Local UI state for Books inline editing
    const [newBookName, setNewBookName] = useState('');
    const [editBookIndex, setEditBookIndex] = useState<number | null>(null);
    const [editBookValue, setEditBookValue] = useState('');
    const booksLoading = booksStatus === 'idle' || booksStatus === 'loading';

    // Local UI state for Classes inline editing
    const [newClassName, setNewClassName] = useState('');
    const [editClassIndex, setEditClassIndex] = useState<number | null>(null);
    const [editClassValue, setEditClassValue] = useState('');
    const classesLoading = classesStatus === 'idle' || classesStatus === 'loading';

    // Books handlers
    const handleAddBook = () => {
        if (!newBookName.trim()) return;
        const updated = [...books, newBookName.trim()];
        dispatch(setBooks(updated));
        dispatch(persistBooks(updated));
        setNewBookName('');
    };
    const handleUpdateBook = (index: number) => {
        if (!editBookValue.trim()) return;
        const updated = [...books];
        updated[index] = editBookValue.trim();
        dispatch(setBooks(updated));
        dispatch(persistBooks(updated));
        setEditBookIndex(null); setEditBookValue('');
    };
    const handleDeleteBook = (index: number) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        const updated = books.filter((_: string, i: number) => i !== index);
        dispatch(setBooks(updated));
        dispatch(persistBooks(updated));
    };

    // Classes handlers
    const handleAddClass = () => {
        if (!newClassName.trim()) return;
        const updated = [...classes, newClassName.trim()];
        dispatch(setClasses(updated));
        dispatch(persistClasses(updated));
        setNewClassName('');
    };
    const handleUpdateClass = (index: number) => {
        if (!editClassValue.trim()) return;
        const updated = [...classes];
        updated[index] = editClassValue.trim();
        dispatch(setClasses(updated));
        dispatch(persistClasses(updated));
        setEditClassIndex(null); setEditClassValue('');
    };
    const handleDeleteClass = (index: number) => {
        if (!confirm('Delete this class?')) return;
        const updated = classes.filter((_: string, i: number) => i !== index);
        dispatch(setClasses(updated));
        dispatch(persistClasses(updated));
    };

    // Default Fees handlers
    const [localDefaultFees, setLocalDefaultFees] = useState<Record<string, number>>({});
    useEffect(() => {
        if (modal === 'defaultFees') {
            setLocalDefaultFees(defaultFees || {});
        }
    }, [modal, defaultFees]);

    const handleSaveDefaultFees = async () => {
        dispatch(persistDefaultFees(localDefaultFees));
        setModal(null);
    };

    // Backup logic
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupOptions, setBackupOptions] = useState({
        students: true, ledger: true, teachers: true, attendance: true,
        timetable: true, videoGalleries: true, assignments: true, exams: true
    });

    const handleExportBackup = async () => {
        setBackupLoading(true);
        try {
            const collectionsToBackup = Object.keys(backupOptions).filter(k => backupOptions[k as keyof typeof backupOptions]);
            const workbook = XLSX.utils.book_new();

            for (const colName of collectionsToBackup) {
                const snap = await getDocs(collection(db, colName));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Flatten nested objects/arrays for Excel rows
                const flatData = data.map((item: Record<string, any>) => {
                    const flat: any = {};
                    for (const key in item) {
                        if (typeof item[key] === 'object' && item[key] !== null) {
                            flat[key] = JSON.stringify(item[key]);
                        } else {
                            flat[key] = item[key];
                        }
                    }
                    return flat;
                });

                const worksheet = XLSX.utils.json_to_sheet(flatData);
                XLSX.utils.book_append_sheet(workbook, worksheet, colName);
            }

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `TheSeeksAcademy_Backup_${dateStr}.xlsx`);
            
            setModal(null);
        } catch (err) {
            console.error("Backup failed", err);
            alert("Failed to export backup. Check console for details.");
        } finally {
            setBackupLoading(false);
        }
    };

    // Upload logic
    const [uploadType, setUploadType] = useState('students');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    const UPLOAD_COLLECTIONS = [
        { id: 'students', label: 'Students', headers: ['name', 'fatherName', 'class', 'rollNo', 'phone', 'address'] },
        { id: 'teachers', label: 'Faculty', headers: ['name', 'subject', 'phone', 'email', 'qualification'] },
        { id: 'exams', label: 'Exams', headers: ['examName', 'class', 'date', 'totalMarks'] },
        { id: 'timetable', label: 'Timetable', headers: ['class', 'subject', 'day', 'time', 'teacher'] },
        { id: 'attendance', label: 'Attendance', headers: ['studentId', 'date', 'status'] },
        { id: 'fees', label: 'Fees Management', headers: ['studentId', 'month', 'year', 'amount', 'status'] },
        { id: 'assignments', label: 'Notices / Assignments', headers: ['title', 'description', 'date', 'targetClass'] },
        { id: 'videoGalleries', label: 'Videos', headers: ['title', 'url', 'class', 'subject'] },
        { id: 'gallery', label: 'Gallery', headers: ['title', 'imageUrl', 'date'] }
    ];

    const handleDownloadTemplate = () => {
        const col = UPLOAD_COLLECTIONS.find(c => c.id === uploadType);
        if (!col) return;
        const worksheet = XLSX.utils.json_to_sheet([
            col.headers.reduce((acc, header) => ({ ...acc, [header]: '' }), {})
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, col.label);
        XLSX.writeFile(workbook, `${col.label}_Template.xlsx`);
    };

    const handleUploadData = async () => {
        if (!uploadFile) return;
        setUploadLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        alert('No data found in the Excel file.');
                        setUploadLoading(false);
                        return;
                    }

                    const colRef = collection(db, uploadType);
                    const promises = jsonData.map((row: any) => addDoc(colRef, { ...row, createdAt: new Date().toISOString() }));
                    await Promise.all(promises);

                    alert(`Successfully uploaded ${jsonData.length} records to ${uploadType}.`);
                    setModal(null);
                    setUploadFile(null);
                } catch (err) {
                    console.error('Error parsing/uploading Excel', err);
                    alert('Failed to process Excel file.');
                } finally {
                    setUploadLoading(false);
                }
            };
            reader.readAsArrayBuffer(uploadFile);
        } catch (err) {
            console.error('Upload error', err);
            setUploadLoading(false);
        }
    };

    // Group messaging settings
    const [studentMessaging, setStudentMessaging] = useState(false);
    const [dailyMessageLimit, setDailyMessageLimit] = useState(10);
    const [messagingLoading, setMessagingLoading] = useState(true);
    const [messagingSaveMsg, setMessagingSaveMsg] = useState('');

    // Load messaging settings from Firestore
    useEffect(() => {
        const loadMessagingSettings = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'appSettings', 'messaging'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    setStudentMessaging(data.studentMessagingEnabled ?? false);
                    setDailyMessageLimit(data.dailyMessageLimit ?? 10);
                }
            } catch (err) {
                console.error('Failed to load messaging settings:', err);
            } finally {
                setMessagingLoading(false);
            }
        };
        loadMessagingSettings();
    }, []);

    // Save messaging settings to Firestore
    const saveMessagingSettings = async (enabled: boolean, limit: number) => {
        try {
            await setDoc(doc(db, 'appSettings', 'messaging'), {
                studentMessagingEnabled: enabled,
                dailyMessageLimit: limit,
                updatedAt: new Date(),
                updatedBy: user?.email || 'unknown',
            }, { merge: true });
            setMessagingSaveMsg('✅ Saved');
            setTimeout(() => setMessagingSaveMsg(''), 2000);
        } catch (err) {
            console.error('Failed to save messaging settings:', err);
            setMessagingSaveMsg('❌ Failed');
            setTimeout(() => setMessagingSaveMsg(''), 3000);
        }
    };

    const handleStudentMessagingToggle = (val: boolean) => {
        setStudentMessaging(val);
        saveMessagingSettings(val, dailyMessageLimit);
    };

    const handleDailyLimitChange = (val: string) => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0 && num <= 999) {
            setDailyMessageLimit(num);
        } else if (val === '') {
            setDailyMessageLimit(0);
        }
    };

    const handleDailyLimitSave = () => {
        saveMessagingSettings(studentMessaging, dailyMessageLimit);
    };

    useEffect(() => {
        setDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
        setCompactLayout(document.documentElement.getAttribute('data-layout') === 'compact');
    }, []);

    // Change password form
    const [cpCurrent, setCpCurrent] = useState('');
    const [cpNew, setCpNew] = useState('');
    const [cpConfirm, setCpConfirm] = useState('');
    const [cpLoading, setCpLoading] = useState(false);
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState('');

    // Profile edit form
    const [profileName, setProfileName] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    useEffect(() => {
        if (modal === 'profile') {
            setProfileName(profile?.fullname || user?.displayName || '');
            setProfileMsg('');
        }
    }, [modal, profile, user]);

    // Reset email
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState('');

    // Handlers
    const handleDarkMode = (val: boolean) => {
        setDarkMode(val);
        document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
        localStorage.setItem('theme', val ? 'dark' : 'light');
    };

    const handleCompactLayout = (val: boolean) => {
        setCompactLayout(val);
        if (val) {
            document.documentElement.setAttribute('data-layout', 'compact');
            localStorage.setItem('layout', 'compact');
        } else {
            document.documentElement.removeAttribute('data-layout');
            localStorage.setItem('layout', 'default');
        }
    };

    const handleChangePassword = async () => {
        setCpError(''); setCpSuccess('');
        if (!cpNew || !cpConfirm || !cpCurrent) { setCpError('All fields are required.'); return; }
        if (cpNew.length < 6) { setCpError('Password must be at least 6 characters.'); return; }
        if (cpNew !== cpConfirm) { setCpError('Passwords do not match.'); return; }
        setCpLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user!.email!, cpCurrent);
            await reauthenticateWithCredential(user!, credential);
            await updatePassword(user!, cpNew);
            setCpSuccess('Password updated successfully! ✅');
            setCpCurrent(''); setCpNew(''); setCpConfirm('');
            setTimeout(() => setModal(null), 1500);
        } catch (err: any) {
            const map: Record<string, string> = {
                'auth/wrong-password': 'Current password is incorrect.',
                'auth/invalid-credential': 'Current password is incorrect.',
                'auth/requires-recent-login': 'Please sign out and sign in again to change your password.',
                'auth/weak-password': 'New password is too weak.',
            };
            setCpError(map[err.code] || err.message || 'Failed to update password.');
        } finally {
            setCpLoading(false);
        }
    };

    const handleSendReset = async () => {
        if (!user?.email) return;
        setResetLoading(true); setResetMsg('');
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetMsg(`✅ Reset link sent to ${user.email}`);
        } catch {
            setResetMsg('❌ Failed to send reset email.');
        } finally {
            setTimeout(() => setResetMsg(''), 4000);
            setResetLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user?.email || !profileName.trim()) return;
        setProfileLoading(true); setProfileMsg('');
        try {
            // Update auth profile
            await updateProfile(user, { displayName: profileName.trim() });

            // Update firestore profile collection
            const q = query(collection(db, 'profile'), where('email', '==', user.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'profile', snap.docs[0].id), { fullname: profileName.trim() });
            } else {
                // If it doesn't exist, create it (edge case)
                await setDoc(doc(db, 'profile', user.uid), {
                    email: user.email,
                    fullname: profileName.trim(),
                    role: 'admin',
                    createdAt: new Date()
                });
            }
            setProfileMsg('✅ Profile updated successfully!');
            setTimeout(() => {
                setModal(null);
                window.location.reload(); // Refresh to update context
            }, 1000);
        } catch (err) {
            console.error(err);
            setProfileMsg('❌ Failed to save profile updates.');
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <div className="page" style={{ maxWidth: 860, paddingTop: 20 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div>
                    <div className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>⚙️ Settings</div>
                    <div className="page-sub" style={{ fontSize: 12 }}>Manage your account, appearance, and system preferences</div>
                </div>
            </div>

            <div className="responsive-grid-2" style={{ gap: 24 }}>

                {/* ── LEFT COLUMN ─────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Account Module */}
                    <section>
                        <SectionLabel label="Account & Security" />
                        <Card>
                            {/* Profile Header */}
                            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(99,102,241,0.05), transparent)' }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 17, fontWeight: 800, color: '#fff',
                                    boxShadow: '0 4px 10px rgba(99,102,241,0.2)'
                                }}>
                                    {(profile?.fullname || user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                        {profile?.fullname || user?.displayName || 'Admin User'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {user?.email}
                                        {user?.emailVerified && <span style={{ color: '#10b981', fontSize: 11 }} title="Verified">✓</span>}
                                    </div>
                                    {isAdmin && (
                                        <div style={{ marginTop: 5 }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.3)', letterSpacing: 0.5 }}>
                                                ✦ SUPER ADMIN
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <SettingRow icon="✏️" color="#3b82f6" label="Edit Profile Information" desc="Update your display name and details" onClick={() => setModal('profile')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🔑" color="#8b5cf6" label="Update Password" desc="Change your login credentials securely" onClick={() => { setCpError(''); setCpSuccess(''); setCpCurrent(''); setCpNew(''); setCpConfirm(''); setModal('changePassword'); }} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📧" color="#6366f1" label="Send Password Reset" desc={`Reset link will be sent via email`}
                                right={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {resetMsg && <div style={{ fontSize: 11, fontWeight: 600, color: resetMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{resetMsg}</div>}
                                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8 }} onClick={(e) => { e.stopPropagation(); handleSendReset(); }} disabled={resetLoading}>
                                            {resetLoading ? 'Sending...' : 'Send Link'}
                                        </button>
                                    </div>
                                }
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🚪" color="#ef4444" label="Sign Out" desc="End your current admin session" danger onClick={logout} />
                        </Card>
                    </section>

                    {/* Academy Data Module */}
                    <section>
                        <SectionLabel label="Academy Configuration" />
                        <Card>
                            <SettingRow icon="🎫" color="#6366f1" label="Manage Classes" desc="Add, update, or remove classes for student assignment"
                                right={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {classesStatus === 'loading' ? (
                                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>Loading...</span>
                                        ) : classes.length > 0 ? (
                                            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '2px 8px', borderRadius: 20 }}>{classes.length}</span>
                                        ) : null}
                                        <span style={{ color: 'var(--text2)', fontSize: 16 }}>›</span>
                                    </div>
                                }
                                onClick={() => setModal('classes')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📚" color="#ec4899" label="Manage Books / Subjects" desc="Add, update, or remove exam subjects" onClick={() => setModal('books')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="💰" color="#10b981" label="Manage Default Fees" desc="Set default monthly fees for each class" onClick={() => setModal('defaultFees')} />
                        </Card>
                    </section>

                    {/* Data Management */}
                    <section>
                        <SectionLabel label="Data Management" />
                        <Card>
                            <SettingRow icon="💾" color="#3b82f6" label="Backup Database" desc="Download records as a secure Excel file" onClick={() => setModal('backup')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📤" color="#8b5cf6" label="Upload Data" desc="Bulk upload records using Excel templates" onClick={() => setModal('upload')} />
                        </Card>
                    </section>
                </div>

                {/* ── RIGHT COLUMN ────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Experience Module */}
                    <section>
                        <SectionLabel label="App Preferences" />
                        <Card>
                            <SettingRow icon={darkMode ? '🌙' : '☀️'} color="#f59e0b" label="Dark Theme" desc="Toggle dark/light interface colors"
                                right={<Toggle value={darkMode} onChange={handleDarkMode} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🖥️" color="#0ea5e9" label="Compact Layout" desc="Reduce spacing to show more data in tables"
                                right={<Toggle value={compactLayout} onChange={handleCompactLayout} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="⚡" color="#10b981" label="Firebase Real-time Sync" desc="Keep dashboard constantly updated with mobile app"
                                right={<Toggle value={autoSync} onChange={setAutoSync} />}
                            />
                        </Card>
                    </section>

                    {/* Group Messaging Controls & Notifications */}
                    <section>
                        <SectionLabel label="Communications & Notifications" />
                        <Card>
                            <SettingRow
                                icon="💬"
                                color="#6366f1"
                                label="Allow Student Messages"
                                desc="Let students send messages in group chats"
                                right={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {messagingSaveMsg && <span style={{ fontSize: 11, fontWeight: 600, color: messagingSaveMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{messagingSaveMsg}</span>}
                                        <Toggle value={studentMessaging} onChange={handleStudentMessagingToggle} />
                                    </div>
                                }
                            />
                            {studentMessaging && (
                                <>
                                    <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                            background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                                            boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.2)'
                                        }}>📊</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Daily Message Limit</div>
                                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, lineHeight: 1.3 }}>Max messages each student can send per day (0 = unlimited)</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="number"
                                                min={0}
                                                max={999}
                                                value={dailyMessageLimit}
                                                onChange={e => handleDailyLimitChange(e.target.value)}
                                                onBlur={handleDailyLimitSave}
                                                onKeyDown={e => { if (e.key === 'Enter') handleDailyLimitSave(); }}
                                                style={{
                                                    width: 64, padding: '6px 8px', fontSize: 13, fontWeight: 700,
                                                    textAlign: 'center', borderRadius: 8,
                                                    border: '1px solid var(--border)', background: 'var(--bg3)',
                                                    color: 'var(--text)', outline: 'none',
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap' }}>/day</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0 14px 12px' }}>
                                        <div style={{
                                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                                            borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5,
                                            display: 'flex', gap: 8,
                                        }}>
                                            <span>ℹ️</span>
                                            <span>Students who exceed the daily limit will be blocked from sending until the next day. Set to <strong style={{ color: 'var(--text)' }}>0</strong> for unlimited messages.</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📬" color="#8b5cf6" label="Email Digest" desc="Receive weekly summary reports of academy activity"
                                right={<Toggle value={notifEmail} onChange={setNotifEmail} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🔔" color="#ec4899" label="Push Notifications" desc="Desktop alerts for new complaints or important notices"
                                right={
                                    <Toggle value={notifBrowser} onChange={(v) => {
                                        if (v && 'Notification' in window) {
                                            Notification.requestPermission().then(p => setNotifBrowser(p === 'granted'));
                                        } else {
                                            setNotifBrowser(v);
                                        }
                                    }} />
                                }
                            />
                        </Card>
                    </section>

                    {/* Platform Info */}
                    <section>
                        <SectionLabel label="About & Support" />
                        {/* Status block */}
                        <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', padding: '9px 13px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.18)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>All Systems Operational</div>
                                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>Project: <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>theseeksacademy-66d12</span></div>
                            </div>
                        </div>

                        <Card>
                            <SettingRow icon="ℹ️" color="#6366f1" label="About Dashboard" desc="Version 1.0.0 · React / Vite" onClick={() => window.dispatchEvent(new CustomEvent('open-about'))} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🛡️" color="#f59e0b" label="Data Security & Privacy" desc="Review how academy data is protected" onClick={() => setModal('privacy')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="❓" color="#0ea5e9" label="Help & Documentation" desc="Guides for using the admin features" onClick={() => setModal('help')} />
                        </Card>
                    </section>
                </div>
            </div>

            {/* ── Modals ──────────────────────────────────────────────── */}

            {/* Change Password Modal */}
            {modal === 'changePassword' && (
                <Modal title="Change Security Password" onClose={() => setModal(null)}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                        For security reasons, you must provide your current password before setting a new one. This will update your login for both the Web Dashboard and the Mobile App.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>Current Password</label>
                            <input type="password" className="form-input" value={cpCurrent} onChange={e => { setCpCurrent(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Enter current password" style={{ padding: '8px 12px', fontSize: 13 }} />
                        </div>
                        <div style={{ height: 1, background: 'var(--border)' }} />
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>New Password</label>
                            <input type="password" className="form-input" value={cpNew} onChange={e => { setCpNew(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Must be at least 6 characters" style={{ padding: '8px 12px', fontSize: 13 }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>Confirm New Password</label>
                            <input type="password" className="form-input" value={cpConfirm} onChange={e => { setCpConfirm(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Re-enter new password" style={{ padding: '8px 12px', fontSize: 13 }} />
                        </div>

                        {cpError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8 }}><span>⚠️</span> {cpError}</div>}
                        {cpSuccess && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8 }}><span>✅</span> {cpSuccess}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none' }} onClick={handleChangePassword} disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}>
                                {cpLoading ? 'Updating credentials...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Profile Modal */}
            {modal === 'profile' && (
                <Modal title="Edit Profile Details" onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, fontWeight: 800, color: '#fff',
                            boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
                            marginBottom: 16
                        }}>
                            {(profileName || user?.email || 'A').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>Admin Display Name</label>
                            <input className="form-input" value={profileName} onChange={e => { setProfileName(e.target.value); setProfileMsg(''); }} placeholder="e.g. Iftikhar Zahid" style={{ padding: '8px 12px', fontSize: 13 }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>Email Address (Read-only)</label>
                            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed', padding: '8px 12px', fontSize: 13, background: 'var(--bg3)' }} />
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>Email acts as your unique identifier and cannot be changed here. Contact support if you need to migrate accounts.</div>
                        </div>

                        {profileMsg && <div style={{ background: profileMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${profileMsg.startsWith('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: profileMsg.startsWith('✅') ? '#34d399' : '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{profileMsg}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleSaveProfile} disabled={profileLoading || !profileName.trim()}>
                                {profileLoading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Privacy Policy */}
            {modal === 'privacy' && (
                <Modal title="Security & Privacy Policy" onClose={() => setModal(null)}>
                    <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
                        <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', gap: 10 }}>
                            <span>🛡️</span> Your academy data is protected by enterprise-grade security.
                        </div>
                        {[
                            ['Data Storage & Encryption', 'All student data, fee records, and attendance logs are stored on Google Cloud Firestore. Data is encrypted both in transit (TLS/SSL) and at rest (AES-256).'],
                            ['Authentication security', 'Admin authentication is managed securely via Firebase. Passwords are mathematically hashed and salted. We never store or transmit plain-text passwords.'],
                            ['Access Control', 'This dashboard is strictly limited to authorized administrator accounts. Student and Teacher logins will be rejected.'],
                            ['Data Sync', 'Information synchronized between the mobile app and this web dashboard occurs over secure, authenticated WebSocket connections.'],
                        ].map(([title, body]) => (
                            <div key={title} style={{ padding: '0 4px' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{body}</div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Help Center */}
            {modal === 'help' && (
                <Modal title="Admin Support & Guides" onClose={() => setModal(null)}>
                    <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 8 }}>
                        {[
                            ['How does real-time sync work?', 'Both this web dashboard and the mobile app connect to the same Firebase database. When a teacher marks attendance on mobile, it instantly appears on your dashboard charts without refreshing.'],
                            ['Adding a new Student', 'Navigate to the "Students" tab and click "Add Student". Provide details and setup their default fee structure. They will be immediately able to log in to the mobile app.'],
                            ['Managing Fee Records', 'The "Fees" module automatically tracks pending amounts. Click any student row to explicitly manage their Paid vs Total fee amounts.'],
                            ['I need to change an admin password', 'You can safely reset any account\'s password (including your own) by clicking "Send Password Reset". An email will be dispatched with a secure link.'],
                        ].map(([q, a]) => (
                            <div key={q} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 8, display: 'flex', gap: 8 }}>
                                    <span>Q.</span> {q}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>A.</span> {a}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Backup Database Modal */}
            {modal === 'backup' && (
                <Modal title="Backup Database" onClose={() => setModal(null)}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                        Select the collections you want to include in this backup. The data will be downloaded as a structured Excel file (.xlsx) with a separate sheet for each collection.
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
                        {[
                            { id: 'students', label: 'Students', desc: 'Profiles and basic information' },
                            { id: 'fees', label: 'Fee Records', desc: 'Financial transactions and ledger' },
                            { id: 'teachers', label: 'Teachers', desc: 'Staff profiles' },
                            { id: 'attendance', label: 'Attendance', desc: 'Daily attendance logs' },
                            { id: 'timetable', label: 'Timetable', desc: 'Class schedules' },
                            { id: 'videoGalleries', label: 'Video Galleries', desc: 'Video courses and links' },
                            { id: 'assignments', label: 'Assignments', desc: 'Student assignments' },
                            { id: 'exams', label: 'Exams', desc: 'Exam schedules and records' }
                        ].map((opt) => (
                            <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: 'var(--bg3)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={backupOptions[opt.id as keyof typeof backupOptions]} 
                                    onChange={(e) => setBackupOptions(prev => ({ ...prev, [opt.id]: e.target.checked }))}
                                    style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)' }}
                                />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{opt.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setModal(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }} onClick={handleExportBackup} disabled={backupLoading || !Object.values(backupOptions).some(Boolean)}>
                            {backupLoading ? 'Exporting...' : 'Download Backup'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Upload Data Modal */}
            {modal === 'upload' && (
                <Modal title="Upload Data" onClose={() => { setModal(null); setUploadFile(null); }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                        Select the collection you want to upload data into. You can download the Excel template, fill it with your records, and upload it back.
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>1. Select Collection</label>
                            <select 
                                className="form-input" 
                                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
                                value={uploadType}
                                onChange={(e) => setUploadType(e.target.value)}
                            >
                                {UPLOAD_COLLECTIONS.map(col => (
                                    <option key={col.id} value={col.id}>{col.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>2. Download Template</label>
                            <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 13, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={handleDownloadTemplate}>
                                <span>Download Excel Template</span>
                                <span>📥</span>
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>3. Upload Filled File</label>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                className="form-input" 
                                style={{ padding: '8px 12px', fontSize: 13 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => { setModal(null); setUploadFile(null); }}>Cancel</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} onClick={handleUploadData} disabled={uploadLoading || !uploadFile}>
                            {uploadLoading ? 'Uploading...' : 'Upload Data'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Classes Modal */}
            {modal === 'classes' && (
                <Modal title="Manage Classes" onClose={() => { setModal(null); setEditClassIndex(null); setNewClassName(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Add input */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="form-input"
                                style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
                                placeholder="e.g. 9th, 10th, 1st Year..."
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                                autoFocus
                            />
                            <button className="btn btn-primary" style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', fontWeight: 700, borderRadius: 8 }} onClick={handleAddClass} disabled={!newClassName.trim()}>+ Add</button>
                        </div>
                        {/* Count header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                {classesLoading ? 'Loading...' : `${classes.length} Class${classes.length !== 1 ? 'es' : ''}`}
                            </span>
                            {!classesLoading && classes.length > 0 && <span style={{ fontSize: 11, color: 'var(--text2)' }}>Click ✏️ to edit</span>}
                        </div>
                        {/* Pill grid */}
                        <div style={{ minHeight: 80, maxHeight: 320, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', padding: 14 }}>
                            {classesLoading ? (
                                <div style={{ width: '100%', textAlign: 'center', padding: '24px 0', color: 'var(--text2)', fontSize: 13 }}>⏳ Loading classes from Firestore...</div>
                            ) : classes.length === 0 ? (
                                <div style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎓</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>No classes yet</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Add your first class above</div>
                                </div>
                            ) : classes.map((cls: string, index: number) => (
                                editClassIndex === index ? (
                                    <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input className="form-input" style={{ width: 110, padding: '5px 10px', fontSize: 13, borderRadius: 8 }} value={editClassValue} onChange={(e) => setEditClassValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateClass(index); if (e.key === 'Escape') setEditClassIndex(null); }} autoFocus />
                                        <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }} onClick={() => handleUpdateClass(index)}>✓</button>
                                        <button className="btn btn-ghost" style={{ padding: '5px 8px', fontSize: 12, borderRadius: 8 }} onClick={() => setEditClassIndex(null)}>✕</button>
                                    </div>
                                ) : (
                                    <div key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.10))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#818cf8', boxShadow: '0 1px 3px rgba(99,102,241,0.1)' }}>
                                        <span>🎓</span>
                                        <span>{cls}</span>
                                        <button title="Edit" onClick={() => { setEditClassIndex(index); setEditClassValue(cls); }} style={{ background: 'rgba(99,102,241,0.15)', border: 'none', cursor: 'pointer', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#818cf8', padding: 0 }}>✏️</button>
                                        <button title="Delete" onClick={() => handleDeleteClass(index)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#ef4444', padding: 0 }}>✕</button>
                                    </div>
                                )
                            ))}
                        </div>
                        {!classesLoading && classes.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>ℹ️ Changes are saved automatically to Firestore</div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Subjects Modal - removed, replaced by Classes */}
            {modal === 'books' && (
                <Modal title="Manage Books / Subjects" onClose={() => { setModal(null); setEditBookIndex(null); setNewBookName(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="form-input"
                                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                                placeholder="Add a new book / subject..."
                                value={newBookName}
                                onChange={(e) => setNewBookName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddBook()}
                            />
                            <button className="btn btn-primary" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }} onClick={handleAddBook} disabled={!newBookName.trim()}>
                                Add
                            </button>
                        </div>

                        <div style={{ background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
                            {booksLoading ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>Loading books...</div>
                            ) : books.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No books found.</div>
                            ) : (
                                books.map((book: string, index: number) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: index < books.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        {editBookIndex === index ? (
                                            <div style={{ display: 'flex', gap: 8, flex: 1, marginRight: 8 }}>
                                                <input
                                                    className="form-input"
                                                    style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                                                    value={editBookValue}
                                                    onChange={(e) => setEditBookValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateBook(index)}
                                                    autoFocus
                                                />
                                                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleUpdateBook(index)}>Save</button>
                                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditBookIndex(null)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{book}</div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 26 }} onClick={() => { setEditBookIndex(index); setEditBookValue(book); }}>Edit</button>
                                                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 26, color: '#ef4444' }} onClick={() => handleDeleteBook(index)}>Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Modal>
            )}
            {/* Default Fees Modal */}
            {modal === 'defaultFees' && (
                <Modal title="Manage Default Fees" onClose={() => setModal(null)}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5 }}>
                        Set the default fee amount for each class. This will be automatically applied to new fee records for students in these classes.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
                        {classes.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: 20 }}>No classes available. Add classes first.</div>
                        ) : (
                            classes.map((clsName: string) => (
                                <div key={clsName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{clsName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', width: 140 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginRight: 6 }}>PKR</span>
                                        <input 
                                            type="number" 
                                            value={localDefaultFees[clsName] || ''} 
                                            placeholder="0"
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                setLocalDefaultFees(prev => ({ ...prev, [clsName]: isNaN(val) ? 0 : val }));
                                            }}
                                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: 10 }} onClick={() => setModal(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: 10 }} onClick={handleSaveDefaultFees}>Save Fees</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
