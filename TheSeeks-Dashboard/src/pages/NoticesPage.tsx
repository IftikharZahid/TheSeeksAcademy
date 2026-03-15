import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchNotices, addOrUpdateNotice, removeNotice } from '../store/slices/generalSlice';

export interface Notice {
    id: string;
    title: string;
    content: string;
    category: string;
    target: string;
    createdAt: any;
    updatedAt: any;
}

const CATEGORIES = ['General', 'Academic', 'Exam', 'Holiday', 'Event', 'Fee', 'Other'];
const TARGETS = ['All', 'Students', 'Teachers', 'Parents'];

const emptyForm = (): Partial<Notice> => ({ title: '', content: '', category: 'General', target: 'All' });

export default function NoticesPage() {
    const dispatch = useAppDispatch();
    const { notices, noticesStatus: status } = useAppSelector((s: any) => s.general);
    const loading = status === 'loading' || status === 'idle';

    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<Partial<Notice>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const CATEGORY_COLORS: Record<string, string> = {
        General: '#6366f1', Academic: '#0ea5e9', Exam: '#ef4444',
        Holiday: '#10b981', Event: '#f59e0b', Fee: '#8b5cf6', Other: '#94a3b8'
    };

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchNotices());
        }
    }, [dispatch, status]);

    const filtered = notices.filter((n: Notice) =>
        !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (n: Notice) => { setEditing(n); setForm({ ...n }); setModalOpen(true); };

    const save = async () => {
        if (!form.title || !form.content) { alert('Title and Content are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const payload = {
                id,
                title: form.title, 
                content: form.content, 
                category: form.category || 'General', 
                target: form.target || 'All',
                ...(editing ? { createdAt: editing.createdAt, updatedAt: { seconds: Date.now() / 1000 } } : { createdAt: { seconds: Date.now() / 1000 }, updatedAt: null })
            } as Notice;

            // Optimistic Redux UI Update
            dispatch(addOrUpdateNotice(payload));
            setModalOpen(false); 

            // Background network execution
            await setDoc(doc(db, 'notices', id), {
                title: form.title, content: form.content, category: form.category || 'General', target: form.target || 'All',
                updatedAt: serverTimestamp(), ...(!editing ? { createdAt: serverTimestamp() } : {}),
            }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this notice?')) return;
        setDeleting(id);
        
        // Optimistic Redux Update
        dispatch(removeNotice(id));
        
        // Background network execution
        await deleteDoc(doc(db, 'notices', id));
        setDeleting(null);
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return '';
        return new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Notice Board</div>
                    <div className="page-sub">{notices.length} notices published</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Post Notice</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="search-box" style={{ maxWidth: 300 }}>
                    <span className="search-icon">🔍</span>
                    <input placeholder="Search notices..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? <div className="loading"><div className="spinner" />Loading...</div>
                : filtered.length === 0 ? <div className="table-wrap"><div className="empty">No notices found</div></div>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                            {filtered.map((n: Notice) => {
                                const cColor = CATEGORY_COLORS[n.category] || '#94a3b8';
                                return (
                                    <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `3px solid ${cColor}` }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{n.title}</div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 10, color: cColor, background: `${cColor}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{n.category}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--text2)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>👥 {n.target}</span>
                                                    {n.createdAt && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 'auto' }}>{formatDate(n.createdAt)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, flex: 1 }}>{n.content}</div>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => openEdit(n)}>Edit</button>
                                            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11, color: '#ef4444', borderColor: '#ef444433' }} disabled={deleting === n.id} onClick={() => remove(n.id)}>🗑 Delete</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Notice' : 'Post Notice'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" placeholder="Notice title..." value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input" value={form.category || 'General'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Audience</label>
                                    <select className="form-input" value={form.target || 'All'} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>
                                        {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Content *</label>
                                <textarea className="form-input" style={{ resize: 'vertical', minHeight: 120 }} placeholder="Write the notice content here..." value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Publishing...' : 'Publish Notice'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
