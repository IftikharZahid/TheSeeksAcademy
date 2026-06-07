import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTimetable, addOrUpdateTimetable, removeTimetable, setTimetable } from '../../store/slices/generalSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchBooks, fetchClasses } from '../../store/slices/appSettingsSlice';
import { RootState } from '../../store/store';

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
    gender?: string;
}

const DISPLAY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FORM_DAYS = ['All', ...DISPLAY_DAYS];

const emptyForm = (): Partial<TimetableEntry> => ({ day: '', period: '', subject: '', class: '', teacher: '', room: '', startTime: '', endTime: '', gender: 'All' });

const formatTime12Hour = (time24: string) => {
    if (!time24 || time24 === '--:--') return time24;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, '0')}:${mStr || '00'} ${ampm}`;
};

const formatTimeRange12Hour = (timeRange24: string) => {
    if (!timeRange24 || !timeRange24.includes(' - ')) return formatTime12Hour(timeRange24);
    const [start, end] = timeRange24.split(' - ');
    return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
};

export default function TimetablePage() {
    const dispatch = useAppDispatch();
    const { timetable: entries, timetableStatus: status } = useAppSelector((s: RootState) => s.general);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const { books: subjectsList, booksStatus, classes, classesStatus } = useAppSelector((s: any) => s.appSettings);
    const loading = status === 'loading' || status === 'idle';

    const [filterClass, setFilterClass] = useState('All');
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TimetableEntry | null>(null);
    const [form, setForm] = useState<Partial<TimetableEntry>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
    const [teacherAutoFilled, setTeacherAutoFilled] = useState(false);

    const toggleDay = (day: string) => setCollapsedDays(prev => ({ ...prev, [day]: !prev[day] }));

    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
        if (booksStatus === 'idle') dispatch(fetchBooks());
        if (classesStatus === 'idle') dispatch(fetchClasses());

        // Real-time Firestore listener for timetable
        if (unsubRef.current) return; // already subscribed
        const unsub = onSnapshot(collection(db, 'timetable'), (snap) => {
            const flat: TimetableEntry[] = [];
            snap.docs.forEach(d => {
                const data = d.data();
                const day = d.id;
                if (Array.isArray(data.classes)) {
                    data.classes.forEach((cls: any) => {
                        flat.push({
                            id: cls.id || `${day}_${cls.subject}`,
                            day,
                            period: cls.period || '',
                            subject: cls.subject || '',
                            class: cls.class || '',
                            teacher: cls.instructor || cls.teacher || '',
                            room: cls.room || '',
                            startTime: cls.startTime || (cls.time ? cls.time.split('-')[0] : ''),
                            endTime: cls.endTime || (cls.time ? cls.time.split('-')[1] : ''),
                            gender: cls.gender || 'All',
                        } as TimetableEntry);
                    });
                } else if (data.day && data.subject) {
                    flat.push({ id: d.id, ...data } as TimetableEntry);
                }
            });
            dispatch(setTimetable(flat));
        });
        unsubRef.current = unsub;
        return () => { unsub(); unsubRef.current = null; };
    }, [dispatch, teachersStatus, booksStatus]);

    // UI only needs one day's data since all days are identical in a weekly timetable
    const uniqueEntries = entries.filter((e: TimetableEntry) => e.day === 'Monday');

    const filtered = uniqueEntries.filter((e: TimetableEntry) => {
        const matchClass = filterClass === 'All' || e.class === filterClass;
        const q = search.toLowerCase();
        return matchClass && (!q || e.subject.toLowerCase().includes(q) || e.teacher.toLowerCase().includes(q));
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const timeSlots = Array.from(new Set(
        filtered.map((e: TimetableEntry) => `${e.startTime || '--:--'} - ${e.endTime || '--:--'}`)
    )).sort();

    const otherEntries = uniqueEntries.filter((e: TimetableEntry) => !DISPLAY_DAYS.includes(e.day) && e.day !== 'Monday');

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setTeacherAutoFilled(false); setModalOpen(true); };
    const openEdit = (e: TimetableEntry) => { 
        setEditing(e); 
        // Auto-detect if this entry exists on all days to pre-select 'All'
        const existsOnAllDays = DISPLAY_DAYS.every(d => 
            entries.some((entry: TimetableEntry) => entry.day === d && entry.subject === e.subject && entry.class === e.class && entry.period === e.period)
        );
        // Check if the existing teacher matches the auto-fill from subject
        const matchTeacher = teachers?.find((t: any) => t.subject === e.subject);
        setTeacherAutoFilled(!!(matchTeacher && matchTeacher.name === e.teacher));
        setForm({ ...e, day: existsOnAllDays ? 'All' : e.day }); 
        setModalOpen(true); 
    };

    // Helper: rebuild and sync a day's classes array to Firestore (timetable/{dayName})
    const syncDayToFirestore = async (day: string, currentEntries: TimetableEntry[]) => {
        const dayEntries = currentEntries
            .filter(e => e.day === day)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        const classes = dayEntries.map(e => ({
            id: e.id,
            subject: e.subject || '',
            time: e.startTime && e.endTime ? `${e.startTime}-${e.endTime}` : (e.startTime || ''),
            startTime: e.startTime || '',
            endTime: e.endTime || '',
            room: e.room || '',
            instructor: e.teacher || '',
            teacher: e.teacher || '',
            period: e.period || '',
            class: e.class || '',
            type: 'LECTURE',
            gender: e.gender || 'All',
        }));

        await setDoc(doc(db, 'timetable', day), { classes, updatedAt: serverTimestamp() }, { merge: false });
    };

    const save = async () => {
        if (!form.subject) { alert('Subject is required.'); return; }
        setSaving(true);
        try {
            const daysToSave = DISPLAY_DAYS;
            form.day = 'All';
            const daysToSync = new Set(daysToSave);

            if (editing && editing.day !== form.day && form.day !== 'All') {
                daysToSync.add(editing.day); // Sync old day if it was changed
            }

            // Determine which IDs to use for each day
            const dayIds = new Map<string, string>();
            for (const d of daysToSave) {
                if (!editing) {
                    dayIds.set(d, Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5) + '_' + d);
                } else {
                    if (form.day === 'All') {
                        // Find if there's a corresponding entry on this day matching the original editing entry
                        const match = entries.find(e => e.day === d && e.subject === editing.subject && e.class === editing.class && e.period === editing.period);
                        if (match) {
                            dayIds.set(d, match.id);
                        } else {
                            dayIds.set(d, Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5) + '_' + d);
                        }
                    } else {
                        dayIds.set(d, editing.id);
                    }
                }
            }

            for (const d of daysToSave) {
                const idForDay = dayIds.get(d)!;
                // Duplicate check: same teacher + subject + startTime + day (skip for the entry we are overwriting)
                const duplicate = entries.find((e: TimetableEntry) => {
                    if (e.id === idForDay) return false;
                    const sameDay = e.day === d;
                    const sameSubject = e.subject === form.subject;
                    const sameTeacher = form.teacher && e.teacher && e.teacher === form.teacher;
                    const sameTime = form.startTime && e.startTime && e.startTime === form.startTime;
                    return sameDay && sameSubject && sameTeacher && sameTime;
                });

                if (duplicate) {
                    alert(`Duplicate detected for ${d}: ${form.teacher || form.subject} already has a class at ${form.startTime || 'this time'}.`);
                    setSaving(false);
                    return;
                }
            }

            const updatedEntries = [...entries];

            for (const d of daysToSave) {
                const id = dayIds.get(d)!;
                const payload = { ...form, day: d, id } as TimetableEntry;
                dispatch(addOrUpdateTimetable(payload));

                // Update local copy for sync
                const idx = updatedEntries.findIndex(e => e.id === id);
                if (idx !== -1) updatedEntries[idx] = payload; else updatedEntries.push(payload);
            }

            // Sync each affected day's classes array to Firestore
            for (const d of Array.from(daysToSync)) {
                await syncDayToFirestore(d, updatedEntries);
            }

            setModalOpen(false);
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string, day: string) => {
        if (!confirm('Delete this timetable entry?')) return;
        setDeleting(id);
        dispatch(removeTimetable(id));
        // Rebuild remaining entries for this day and sync to Firestore
        const updatedEntries = entries.filter((e: TimetableEntry) => e.id !== id);
        await syncDayToFirestore(day, updatedEntries);
        setDeleting(null);
};

    const clearAll = async () => {
        if (entries.length === 0) { alert('Timetable is already empty.'); return; }
        if (!confirm(`Are you sure you want to delete ALL ${entries.length} timetable entries? This cannot be undone.`)) return;
        const text = prompt('Type "CLEAR" to confirm:');
        if (text !== 'CLEAR') return;
        setSaving(true);
        try {
            // Write empty classes array to each day doc
            await Promise.all(DISPLAY_DAYS.map(day =>
                setDoc(doc(db, 'timetable', day), { classes: [], updatedAt: serverTimestamp() }, { merge: false })
            ));
            entries.forEach((e: TimetableEntry) => dispatch(removeTimetable(e.id)));
            alert('Timetable cleared successfully.');
        } catch (err) {
            alert('Failed to clear timetable.');
        }
        setSaving(false);
    };

    const field = (key: keyof TimetableEntry) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [key]: e.target.value }));

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 12 }}>
                <div>
                    <div className="page-title" style={{ fontSize: 18 }}>Timetable</div>
                    <div className="page-sub" style={{ fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)' }}>Weekly Schedule</span>
                        <span style={{ color: 'var(--text3)', marginLeft: 4 }}>· {uniqueEntries.length} total periods</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="btn btn-ghost" onClick={clearAll} disabled={saving} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: 12, padding: '5px 10px' }}>🧹 Clear</button>
                    <button className="btn btn-primary" onClick={openAdd} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add Period</button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-box" style={{ maxWidth: 220, flex: 1 }}>
                    <span className="search-icon">🔍</span>
                    <input placeholder="Search subject, teacher..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 12 }} />
                </div>
                <div className="filter-chips" style={{ gap: 4 }}>
                    {['All', ...classes].map(c => (
                        <button key={c} className={`chip${filterClass === c ? ' active' : ''}`} onClick={() => setFilterClass(c)} style={{ fontSize: 11, padding: '3px 10px' }}>{c}</button>
                    ))}
                </div>
            </div>

            {loading
                ? <div className="loading"><div className="spinner" />Loading...</div>
                : filtered.length === 0
                ? <div className="table-wrap"><div className="empty">No timetable entries found</div></div>
                : filterClass === 'All'
                ? (
                    // ── MASTER EXCEL-LIKE VIEW ───────────────────────────────────────────
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <style>{`
                            .excel-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; table-layout: fixed; }
                            .excel-table th, .excel-table td { border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); }
                            .excel-table th:last-child, .excel-table td:last-child { border-right: none; }
                            .excel-table thead th { position: sticky; top: 0; background: #1e3a8a; color: #ffffff; z-index: 10; border-right: 1px solid rgba(255,255,255,0.15); border-bottom: none; }
                            .excel-table thead th:first-child { z-index: 11; left: 0; background: #1e3a8a; }
                            .excel-table tbody td:first-child { position: sticky; left: 0; background: var(--surface); z-index: 5; box-shadow: 1px 0 0 var(--border); }
                            .timetable-cell-entry { transition: all 0.2s ease; border: 1px solid transparent; }
                            .timetable-cell-entry:hover { border-color: var(--primary-light); background: rgba(99,102,241,0.05) !important; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                        `}</style>
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: 10, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', width: '90px' }}>
                                        Class
                                    </th>
                                    {timeSlots.map(timeLabel => (
                                        <th key={timeLabel} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 10, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {formatTimeRange12Hour(timeLabel)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from(new Set(filtered.map((e: TimetableEntry) => e.class).filter(Boolean))).sort().map((cls, rowIdx) => {
                                    const clsEntries = filtered.filter((e: TimetableEntry) => e.class === cls);
                                    return (
                                        <tr key={cls as string}>
                                            <td style={{ padding: '8px', fontWeight: 800, color: 'var(--text1)', verticalAlign: 'top', background: 'var(--surface)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ fontSize: 14 }}>🎓</span>
                                                    <span style={{ fontSize: 11 }}>{cls as string}</span>
                                                </div>
                                                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4, fontWeight: 600, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 10, display: 'inline-block' }}>
                                                    {clsEntries.length} per.
                                                </div>
                                            </td>
                                            {timeSlots.map(timeLabel => {
                                                const timeEntries = clsEntries.filter((e: TimetableEntry) => `${e.startTime || '--:--'} - ${e.endTime || '--:--'}` === timeLabel)
                                                    .sort((a, b) => DISPLAY_DAYS.indexOf(a.day) - DISPLAY_DAYS.indexOf(b.day));

                                                return (
                                                    <td key={timeLabel} style={{ padding: '4px', verticalAlign: 'top', background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                                        {timeEntries.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {timeEntries.map((e: TimetableEntry) => (
                                                                    <div key={e.id} className="timetable-cell-entry" onClick={() => openEdit(e)} style={{ 
                                                                        display: 'flex', alignItems: 'flex-start', gap: 6, 
                                                                        padding: '4px 6px', background: 'var(--surface)', 
                                                                        border: '1px solid var(--border)', borderRadius: 6,
                                                                        cursor: 'pointer'
                                                                    }}>
                                                                        <div style={{ 
                                                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', 
                                                                            color: 'var(--primary-light)', 
                                                                            borderRadius: 4, padding: '2px 4px', fontSize: 10, fontWeight: 800,
                                                                            minWidth: 20, textAlign: 'center', border: '1px solid rgba(99,102,241,0.2)'
                                                                        }}>
                                                                            {e.period || '-'}
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                                                {e.subject}
                                                                                {e.gender && e.gender !== 'All' && (
                                                                                    <span style={{ fontSize: 8, background: e.gender === 'Boys' ? 'rgba(37,99,235,0.1)' : 'rgba(219,39,119,0.1)', color: e.gender === 'Boys' ? '#3b82f6' : '#ec4899', padding: '1px 3px', borderRadius: 3, fontWeight: 800 }}>
                                                                                        {e.gender === 'Boys' ? 'B' : 'G'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ fontSize: 9, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                                    <span style={{ opacity: 0.7 }}>👤</span> {e.teacher?.split(' ')[0] || '—'}
                                                                                </span>
                                                                                {/* Removed Day Badge */}
                                                                            </div>
                                                                            {e.room && (
                                                                                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                                    <span style={{ opacity: 0.7 }}>📍</span> {e.room}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text4)', fontSize: 10, fontStyle: 'italic' }}>—</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {/* Unassigned Classes */}
                                {filtered.filter((e: TimetableEntry) => !e.class).length > 0 && (
                                    <tr>
                                        <td style={{ padding: '8px', fontWeight: 800, color: 'var(--text2)', verticalAlign: 'top', background: 'var(--surface)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontSize: 14 }}>⚠️</span>
                                                <span style={{ fontSize: 11 }}>Unassigned</span>
                                            </div>
                                            <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 4, fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 10, display: 'inline-block' }}>
                                                {filtered.filter((e: TimetableEntry) => !e.class).length} per.
                                            </div>
                                        </td>
                                        {timeSlots.map(timeLabel => {
                                            const timeEntries = filtered.filter((e: TimetableEntry) => !e.class && `${e.startTime || '--:--'} - ${e.endTime || '--:--'}` === timeLabel)
                                                .sort((a, b) => DISPLAY_DAYS.indexOf(a.day) - DISPLAY_DAYS.indexOf(b.day));

                                            return (
                                                <td key={`unassigned-${timeLabel}`} style={{ padding: '4px', verticalAlign: 'top', background: 'rgba(245,158,11,0.02)' }}>
                                                    {timeEntries.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {timeEntries.map((e: TimetableEntry) => (
                                                                <div key={e.id} className="timetable-cell-entry" onClick={() => openEdit(e)} style={{ 
                                                                    display: 'flex', alignItems: 'flex-start', gap: 6, 
                                                                    padding: '4px 6px', background: 'var(--surface)', 
                                                                    border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6,
                                                                    cursor: 'pointer'
                                                                }}>
                                                                    <div style={{ 
                                                                        background: 'rgba(245,158,11,0.1)', 
                                                                        color: '#f59e0b', 
                                                                        borderRadius: 4, padding: '2px 4px', fontSize: 10, fontWeight: 800,
                                                                        minWidth: 20, textAlign: 'center'
                                                                    }}>
                                                                        {e.period || '-'}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {e.subject}
                                                                        </div>
                                                                        <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span>{e.teacher?.split(' ')[0] || '—'}</span>
                                                                            {/* Removed Day Badge */}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text4)', fontSize: 10, fontStyle: 'italic' }}>—</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
                : (
                    // ── SINGLE CLASS FILTERED VIEW (grouped by day) ──────────────────────
                    <>
                        <div style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Weekly Schedule</span>
                                <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{filtered.length}</span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface)' }}>
                                        {['#', 'Subject', 'Teacher', 'Room', 'Time', ''].map(h => (
                                            <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e: TimetableEntry, idx: number) => (
                                        <tr key={e.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                                                <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 4, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>{e.period || '—'}</span>
                                            </td>
                                            <td style={{ padding: '5px 10px', fontWeight: 600, color: 'var(--text1)' }}>
                                                {e.subject}
                                                {e.gender && e.gender !== 'All' && (
                                                    <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: e.gender === 'Boys' ? 'rgba(37,99,235,0.12)' : 'rgba(219,39,119,0.12)', color: e.gender === 'Boys' ? '#2563eb' : '#db2777', borderRadius: 3, padding: '1px 5px' }}>
                                                        {e.gender === 'Boys' ? 'Boys' : 'Girls'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '5px 10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{e.teacher || '—'}</td>
                                            <td style={{ padding: '5px 10px', color: 'var(--text3)' }}>{e.room || '—'}</td>
                                            <td style={{ padding: '5px 10px', color: 'var(--text2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                                {formatTime12Hour(e.startTime)}{e.endTime ? ` – ${formatTime12Hour(e.endTime)}` : ''}
                                            </td>
                                            <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => openEdit(e)}>Edit</button>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 7px', fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} disabled={deleting === e.id} onClick={() => remove(e.id, e.day)}>✕</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {otherEntries.length > 0 && (
                            <div style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                <div onClick={() => toggleDay('Other')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface2)', cursor: 'pointer', borderBottom: collapsedDays['Other'] ? 'none' : '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Other Days</span>
                                    <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{otherEntries.length}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{collapsedDays['Other'] ? '▸' : '▾'}</span>
                                </div>
                                {!collapsedDays['Other'] && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead><tr style={{ background: 'var(--surface)' }}>
                                            {['Day', '#', 'Subject', 'Class', 'Teacher', 'Room', ''].map(h => (
                                                <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {otherEntries.map((e: TimetableEntry, idx: number) => (
                                                <tr key={e.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '5px 10px', color: 'var(--text2)' }}>{e.day || '—'}</td>
                                                    <td style={{ padding: '5px 10px' }}><span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 4, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>{e.period || '—'}</span></td>
                                                    <td style={{ padding: '5px 10px', fontWeight: 600 }}>{e.subject}</td>
                                                    <td style={{ padding: '5px 10px', color: 'var(--text2)' }}>{e.class || '—'}</td>
                                                    <td style={{ padding: '5px 10px', color: 'var(--text2)' }}>{e.teacher || '—'}</td>
                                                    <td style={{ padding: '5px 10px', color: 'var(--text3)' }}>{e.room || '—'}</td>
                                                    <td style={{ padding: '5px 8px' }}>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => openEdit(e)}>Edit</button>
                                                            <button className="btn btn-ghost" style={{ padding: '3px 7px', fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} disabled={deleting === e.id} onClick={() => remove(e.id, e.day)}>✕</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </>
                )
            }

            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{
                        width: 'min(520px, 96vw)',
                        maxWidth: '100%',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 12,
                        overflow: 'hidden',
                    }}>
                        {/* Modal Header */}
                        <div className="modal-header" style={{ padding: '14px 18px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div className="modal-title" style={{ fontSize: 15, fontWeight: 700 }}>
                                    {editing ? '✏️ Edit Period' : '➕ Add Period'}
                                </div>
                                {form.day === 'All' && (
                                    <span style={{ fontSize: 10, color: '#818cf8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        ⚡ Changes apply to all 6 days
                                    </span>
                                )}
                            </div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>

                        {/* Modal Body — scrollable */}
                        <div className="modal-body" style={{
                            padding: '16px 18px',
                            overflowY: 'auto',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}>
                            {/* Section: Schedule Info */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid var(--border)' }}>
                                    📅 Schedule
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 12px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Period No.</label>
                                        <input className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} placeholder="e.g. 1" value={form.period || ''} onChange={field('period')} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Class</label>
                                        <select className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} value={form.class || ''} onChange={field('class')}>
                                            <option value="">Select Class</option>
                                            {classes.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 12px', marginTop: 10 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Timetable For (Gender)</label>
                                        <select className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} value={form.gender || 'All'} onChange={field('gender')}>
                                            <option value="All">All (Both Boys & Girls)</option>
                                            <option value="Boys">Boys Only</option>
                                            <option value="Girls">Girls Only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Subject & Teacher */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid var(--border)' }}>
                                    📚 Subject & Teacher
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Subject *</label>
                                        <select className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} value={form.subject || ''} onChange={(e) => {
                                            const val = e.target.value;
                                            const matchTeacher = teachers?.find((t: any) => t.subject === val);
                                            if (matchTeacher) {
                                                setTeacherAutoFilled(true);
                                                setForm(p => ({ ...p, subject: val, teacher: matchTeacher.name }));
                                            } else {
                                                setTeacherAutoFilled(false);
                                                setForm(p => ({ ...p, subject: val }));
                                            }
                                        }}>
                                            <option value="">Select Subject</option>
                                            {subjectsList?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            Teacher
                                            {teacherAutoFilled && (
                                                <span style={{ fontSize: 9, fontWeight: 600, color: '#818cf8', background: 'rgba(129,140,248,0.12)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.3px' }}>
                                                    🔒 Auto-filled
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            className="form-input"
                                            style={{
                                                fontSize: 12,
                                                padding: '7px 8px',
                                                width: '100%',
                                                ...(teacherAutoFilled ? {
                                                    background: 'var(--surface2)',
                                                    color: 'var(--text2)',
                                                    cursor: 'not-allowed',
                                                    opacity: 0.85,
                                                    borderColor: 'rgba(129,140,248,0.3)',
                                                } : {})
                                            }}
                                            placeholder="e.g. Prof. Khan"
                                            value={form.teacher || ''}
                                            onChange={teacherAutoFilled ? undefined : field('teacher')}
                                            readOnly={teacherAutoFilled}
                                            tabIndex={teacherAutoFilled ? -1 : undefined}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Location & Time */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid var(--border)' }}>
                                    🕐 Location & Time
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 12px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Room</label>
                                        <input className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} placeholder="e.g. A1" value={form.room || ''} onChange={field('room')} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>Start Time</label>
                                        <input className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} type="time" value={form.startTime || ''} onChange={field('startTime')} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>End Time</label>
                                        <input className="form-input" style={{ fontSize: 12, padding: '7px 8px', width: '100%' }} type="time" value={form.endTime || ''} onChange={field('endTime')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-footer" style={{ padding: '12px 18px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 18px', fontWeight: 600 }} disabled={saving} onClick={save}>
                                {saving ? '⏳ Saving…' : editing ? '✓ Update' : '+ Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
