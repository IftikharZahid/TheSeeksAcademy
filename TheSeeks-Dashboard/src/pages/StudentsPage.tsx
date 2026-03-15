import React, { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchStudents, addOrUpdateStudent, removeStudent } from '../store/slices/studentsSlice';

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
}

const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];
const GENDER_OPTIONS = ['Male', 'Female'];
const FILTER_OPTIONS = ['All', ...CLASS_OPTIONS];
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];

const avatarColor = (name: string) => {
    const n = name || 'A';
    return COLORS[(n.charCodeAt(0) || 65) % COLORS.length];
};

const emptyForm = (): Partial<Student> => ({
    name: '', fatherName: '', grade: '', gender: '', section: '', session: '', phone: '', email: '', profileImage: ''
});

export default function StudentsPage() {
    const dispatch = useAppDispatch();
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const loading = studentsStatus === 'loading' || studentsStatus === 'idle';

    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [form, setForm] = useState<Partial<Student>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewStudent, setViewStudent] = useState<Student | null>(null);

    useEffect(() => { 
        if (studentsStatus === 'idle') {
            dispatch(fetchStudents()); 
        }
    }, [dispatch, studentsStatus]);

    const filtered = students.filter((s: any) => {
        const matchClass = !filterClass || s.grade === filterClass;
        const matchGender = !filterGender || String(s.gender || '').toLowerCase() === filterGender.toLowerCase();
        const q = search.toLowerCase();
        const strName = String(s.name || '').toLowerCase();
        const strEmail = String(s.email || '').toLowerCase();
        const strRollno = String(s.rollno || '').toLowerCase();
        const strStudentId = String(s.studentId || '').toLowerCase();
        
        const matchSearch = !q || strName.includes(q) || strEmail.includes(q) || strRollno.includes(q) || strStudentId.includes(q);
        
        return matchClass && matchGender && matchSearch;
    });

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (s: Student) => { setEditing(s); setForm({ ...s }); setModalOpen(true); };

    const save = async () => {
        if (!form.name || !form.fatherName) { alert('Name and Father Name are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || (form.studentId || Date.now().toString());
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
                profileImage: form.profileImage || '',
            };
            
            // Optimistic UI Update immediately
            dispatch(addOrUpdateStudent({ id, ...payload } as Student));
            setModalOpen(false);

            // Sync to Firebase in background
            await setDoc(doc(db, 'students', id), {
                ...payload,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            
        } catch (e) { alert('Failed to save. Please try again.'); }
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
            <div style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
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
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
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
                                        : filtered.map((s: any, i: number) => {
                                            const sGender = String(s.gender || '').toLowerCase();
                                            return (
                                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{i + 1}</td>
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
                                {[
                                    { label: 'Full Name *', key: 'name', placeholder: 'e.g. Ahmed Ali' },
                                    { label: 'Father Name *', key: 'fatherName', placeholder: 'e.g. Ali Khan' },
                                    { label: 'Phone', key: 'phone', placeholder: '03001234567' },
                                    { label: 'Email', key: 'email', placeholder: 'student@school.edu.pk' },
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
                                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Gender</label>
                                    <select className="form-input" value={form.gender || ''} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                        <option value="">Select Gender</option>
                                        {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
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
