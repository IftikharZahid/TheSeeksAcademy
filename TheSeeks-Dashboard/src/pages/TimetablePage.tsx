import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTimetable, addOrUpdateTimetable, removeTimetable } from '../store/slices/generalSlice';
import { RootState } from '../store/store';

export interface TimetableEntry {
    id: string;
    day: string;
    period: string;
    subject: string;
    class: string;
    teacher: string;
    room: string;
    startTime: string;
    endTime: string;
}

const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = (): Partial<TimetableEntry> => ({ day: '', period: '', subject: '', class: '', teacher: '', room: '', startTime: '', endTime: '' });

export default function TimetablePage() {
    const dispatch = useAppDispatch();
    const { timetable: entries, timetableStatus: status } = useAppSelector((s: RootState) => s.general);
    const loading = status === 'loading' || status === 'idle';

    const [filterClass, setFilterClass] = useState('All');
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TimetableEntry | null>(null);
    const [form, setForm] = useState<Partial<TimetableEntry>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => { 
        if (status === 'idle') dispatch(fetchTimetable()); 
    }, [dispatch, status]);

    const filtered = entries.filter((e: TimetableEntry) => {
        const matchClass = filterClass === 'All' || e.class === filterClass;
        const q = search.toLowerCase();
        return matchClass && (!q || e.subject.toLowerCase().includes(q) || e.teacher.toLowerCase().includes(q) || e.day.toLowerCase().includes(q));
    });

    // Group by day for display
    const byDay = DAYS.map(day => ({ day, entries: filtered.filter((e: TimetableEntry) => e.day === day) })).filter(g => g.entries.length > 0);
    const otherEntries = filtered.filter((e: TimetableEntry) => !DAYS.includes(e.day));

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (e: TimetableEntry) => { setEditing(e); setForm({ ...e }); setModalOpen(true); };

    const save = async () => {
        if (!form.day || !form.subject) { alert('Day and Subject are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const payload = { ...form, id } as TimetableEntry;
            
            // Optimistic Redux UI trigger
            dispatch(addOrUpdateTimetable(payload));
            setModalOpen(false);

            await setDoc(doc(db, 'timetable', id), { ...form, updatedAt: serverTimestamp() }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this timetable entry?')) return;
        setDeleting(id);
        dispatch(removeTimetable(id));
        await deleteDoc(doc(db, 'timetable', id));
        setDeleting(null);
    };

    const field = (key: keyof TimetableEntry) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [key]: e.target.value }));

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Timetable</div>
                    <div className="page-sub">{entries.length} periods scheduled</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Period</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="search-box" style={{ maxWidth: 260 }}>
                    <span className="search-icon">🔍</span>
                    <input placeholder="Search subject, teacher..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-chips">
                    {['All', ...CLASS_OPTIONS].map(c => <button key={c} className={`chip${filterClass === c ? ' active' : ''}`} onClick={() => setFilterClass(c)}>{c}</button>)}
                </div>
            </div>

            {loading ? <div className="loading"><div className="spinner" />Loading...</div> : filtered.length === 0 ? <div className="table-wrap"><div className="empty">No timetable entries found</div></div> : (
                <>
                    {byDay.map(({ day, entries: dayEntries }) => (
                        <div key={day} style={{ marginBottom: 18 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                📅 {day}
                                <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>({dayEntries.length} periods)</span>
                            </div>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr><th>Period</th><th>Subject</th><th>Class</th><th>Teacher</th><th>Room</th><th>Time</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {dayEntries.map((e: TimetableEntry) => (
                                            <tr key={e.id}>
                                                <td><div style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12, display: 'inline-block' }}>{e.period || '—'}</div></td>
                                                <td style={{ fontWeight: 600 }}>{e.subject}</td>
                                                <td>{e.class || '—'}</td>
                                                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.teacher || '—'}</td>
                                                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.room || '—'}</td>
                                                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openEdit(e)}>Edit</button>
                                                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', borderColor: '#ef444433' }} disabled={deleting === e.id} onClick={() => remove(e.id)}>🗑</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {otherEntries.length > 0 && (
                        <div className="table-wrap"><table>
                            <thead><tr><th>Day</th><th>Period</th><th>Subject</th><th>Class</th><th>Teacher</th><th>Room</th><th>Actions</th></tr></thead>
                            <tbody>
                                {otherEntries.map((e: TimetableEntry) => (
                                    <tr key={e.id}>
                                        <td>{e.day || '—'}</td><td>{e.period || '—'}</td><td style={{ fontWeight: 600 }}>{e.subject}</td>
                                        <td>{e.class || '—'}</td><td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.teacher || '—'}</td>
                                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.room || '—'}</td>
                                        <td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openEdit(e)}>Edit</button><button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', borderColor: '#ef444433' }} disabled={deleting === e.id} onClick={() => remove(e.id)}>🗑</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    )}
                </>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Period' : 'Add Period'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Day *</label>
                                    <select className="form-input" value={form.day || ''} onChange={field('day')}>
                                        <option value="">Select Day</option>
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Period No.</label>
                                    <input className="form-input" placeholder="e.g. 1 or 1st" value={form.period || ''} onChange={field('period')} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Subject *</label>
                                    <input className="form-input" placeholder="e.g. Mathematics" value={form.subject || ''} onChange={field('subject')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Class</label>
                                    <select className="form-input" value={form.class || ''} onChange={field('class')}>
                                        <option value="">Select Class</option>
                                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Teacher</label>
                                    <input className="form-input" placeholder="e.g. Prof. Khan" value={form.teacher || ''} onChange={field('teacher')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Room</label>
                                    <input className="form-input" placeholder="e.g. Room A1" value={form.room || ''} onChange={field('room')} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Time</label>
                                    <input className="form-input" type="time" value={form.startTime || ''} onChange={field('startTime')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Time</label>
                                    <input className="form-input" type="time" value={form.endTime || ''} onChange={field('endTime')} />
                                </div>
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
