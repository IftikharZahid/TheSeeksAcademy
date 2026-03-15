import React, { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTeachers, addOrUpdateTeacher, removeTeacher } from '../store/slices/teachersSlice';

interface Teacher {
    id: string;
    name: string;
    subject: string;
    qualification: string;
    experience: string;
    image: string;
}

const SUBJECTS = [
    'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
    'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics',
    'Ethics', 'Chemistry', 'Biology'
];

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];
const avatarColor = (name: string) => COLORS[(name || 'A').charCodeAt(0) % COLORS.length];

const emptyForm = (): Partial<Teacher> => ({ name: '', subject: '', qualification: '', experience: '', image: '' });

export default function TeachersPage() {
    const dispatch = useAppDispatch();
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const loading = teachersStatus === 'loading' || teachersStatus === 'idle';

    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [form, setForm] = useState<Partial<Teacher>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

    useEffect(() => {
        if (teachersStatus === 'idle') {
            dispatch(fetchTeachers());
        }
    }, [dispatch, teachersStatus]);

    const filtered = teachers.filter((t: any) =>
        !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (t: Teacher) => { setEditing(t); setForm({ ...t }); setModalOpen(true); };

    const save = async () => {
        if (!form.name || !form.subject || !form.qualification || !form.experience) {
            alert('Name, Subject, Qualification and Experience are required.'); return;
        }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const payload = {
                name: form.name, 
                subject: form.subject, 
                qualification: form.qualification,
                experience: form.experience, 
                image: form.image || ''
            };

            // Optimistic Update
            dispatch(addOrUpdateTeacher({ id, ...payload } as any));
            setModalOpen(false);

            // Background Network
            await setDoc(doc(db, 'staff', id), {
                ...payload,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this staff member?')) return;
        setDeleting(id);
        
        // Optimistic Update
        dispatch(removeTeacher(id));
        
        // Background Network
        await deleteDoc(doc(db, 'staff', id));
        setDeleting(null);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Teachers / Staff</div>
                    <div className="page-sub">{teachers.length} staff members</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Teacher</button>
            </div>

            {loading ? <div className="loading"><div className="spinner" />Loading...</div> : (
                <div className="table-wrap">
                    <div className="table-toolbar">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input placeholder="Search by name or subject..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text2)' }}>{filtered.length} records</span>
                    </div>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Name</th><th>Subject</th><th>Qualification</th><th>Experience</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? <tr><td colSpan={6} className="empty">No staff found</td></tr>
                                : filtered.map((t: any, i: any) => (
                                    <tr key={t.id}>
                                        <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ background: `${avatarColor(t.name)}22`, color: avatarColor(t.name) }}>
                                                    {t.image ? <img src={t.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : t.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{t.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{t.subject}</span></td>
                                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{t.qualification}</td>
                                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{t.experience}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openEdit(t as any)}>Edit</button>
                                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', borderColor: '#ef444433' }} disabled={deleting === t.id} onClick={() => remove(t.id)}>🗑</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Teacher' : 'Add Teacher'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {[
                                { label: 'Full Name *', key: 'name', placeholder: 'e.g. Dr. Sarah Smith' },
                                { label: 'Qualification *', key: 'qualification', placeholder: 'e.g. PhD in Mathematics' },
                                { label: 'Experience *', key: 'experience', placeholder: 'e.g. 10 Years' },
                                { label: 'Image URL', key: 'image', placeholder: 'https://...' },
                            ].map(f => (
                                <div className="form-group" key={f.key}>
                                    <label className="form-label">{f.label}</label>
                                    <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                </div>
                            ))}
                            <div className="form-group">
                                <label className="form-label">Subject *</label>
                                <select className="form-input" value={form.subject || ''} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                                    <option value="">Select Subject</option>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
