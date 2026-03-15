import React, { useEffect, useState, useMemo } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchFees, addOrUpdateFee } from '../store/slices/feesSlice';
import { fetchStudents } from '../store/slices/studentsSlice';

interface Student {
    id: string;
    name: string;
    fatherName: string;
    grade: string;
    rollno: string;
    email: string;
}

interface FeeRecord {
    id: string;             // UID matching student
    studentId: string;      // Legacy UI mapping
    studentName: string;
    rollno: string;
    grade: string;
    fatherName: string;
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    amount?: number;        // From Redux type slice
    datePaid?: string;      // From Redux type slice
    months?: string[];      // From Redux type slice
    status: 'Paid' | 'Unpaid' | string;
    month: string;
    lastUpdated?: string;
}

const CLASS_OPTIONS = ['9th', '10th', '1st Year', '2nd Year'];
const MONTH_OPTIONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FILTER_OPTIONS = ['All', 'Paid', 'Pending', 'Partial', ...CLASS_OPTIONS];

function statusClass(s: string) {
    if (s === 'paid') return 'badge-paid';
    if (s === 'partial') return 'badge-partial';
    return 'badge-pending';
}

export default function FeePage() {
    const dispatch = useAppDispatch();
    
    // REDUX STATE
    const { data: feesData, status: feesStatus } = useAppSelector((s: any) => s.fees);
    const { data: studentsData, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const loading = feesStatus === 'loading' || feesStatus === 'idle' || studentsStatus === 'loading';

    // UI STATE
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [editRecord, setEditRecord] = useState<FeeRecord | null>(null);
    const [totalFee, setTotalFee] = useState('50000');
    const [paidAmount, setPaidAmount] = useState('0');
    const [feeMonths, setFeeMonths] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (feesStatus === 'idle') dispatch(fetchFees());
        if (studentsStatus === 'idle') dispatch(fetchStudents());
    }, [dispatch, feesStatus, studentsStatus]);

    const records = useMemo(() => {
        const feesMap: Record<string, any> = {};
        feesData.forEach((d: any) => { feesMap[d.id] = d; });

        return studentsData.map((s: any) => {
            const fee = feesMap[s.id];
            const grade = s.grade || s.class || '';
            const rollno = s.rollno || s.studentId || s.id;
            const fatherName = s.fatherName || s.fathername || '';
            const name = s.name || s.fullname || 'Unknown';
            
            if (fee) {
                const total = fee.totalFee || 50000;
                const paid = fee.paidAmount || 0;
                const pending = total - paid;
                const legacyStatus = pending <= 0 ? 'paid' : paid === 0 ? 'pending' : 'partial';
                return { 
                    id: s.id, studentId: s.id, studentName: name, rollno, grade, fatherName, 
                    totalFee: total, paidAmount: paid, pendingAmount: pending > 0 ? pending : 0, 
                    status: legacyStatus, month: fee.month || '', amount: paid, datePaid: fee.lastUpdated || '', months: fee.month ? fee.month.split(',') : [] 
                } as FeeRecord;
            }
            return { 
                id: s.id, studentId: s.id, studentName: name, rollno, grade, fatherName, 
                totalFee: 50000, paidAmount: 0, pendingAmount: 50000, status: 'pending', month: '', amount: 0, datePaid: '', months: [] 
            } as FeeRecord;
        });
    }, [studentsData, feesData]);

    const filtered = records.filter((r: any) => {
        const matchFilter = filter === 'All' ? true
            : ['Paid', 'Pending', 'Partial'].includes(filter) ? r.status === filter.toLowerCase()
                : r.grade === filter;
        const q = search.toLowerCase();
        return matchFilter && (!q || r.studentName.toLowerCase().includes(q) || r.rollno.toLowerCase().includes(q));
    });

    const paidCount = records.filter((r: any) => r.status === 'paid').length;
    const pendingCount = records.filter((r: any) => r.status === 'pending').length;
    const partialCount = records.filter((r: any) => r.status === 'partial').length;

    const openEdit = (r: FeeRecord) => {
        setEditRecord(r);
        setTotalFee(r.totalFee.toString());
        setPaidAmount(r.paidAmount.toString());
        setFeeMonths(r.month ? r.month.split(',').map(m => m.trim()).filter(Boolean) : []);
    };

    const toggleMonth = (m: string) => setFeeMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

    const save = async () => {
        if (!editRecord) return;
        if (feeMonths.length === 0) { alert('Please select at least one fee month.'); return; }
        setSaving(true);
        try {
            const total = parseInt(totalFee) || 0;
            const paid = parseInt(paidAmount) || 0;
            const pending = total - paid;
            const status = pending <= 0 ? 'paid' : paid === 0 ? 'pending' : 'partial';

            const payload = {
                id: editRecord.studentId,
                studentId: editRecord.studentId,
                studentName: editRecord.studentName,
                totalFee: total, 
                paidAmount: paid, 
                amount: paid, // Map to required redux slice prop
                datePaid: new Date().toISOString(), // Map to required redux slice prop
                months: feeMonths, // Map to required redux slice prop
                pendingAmount: pending > 0 ? pending : 0,
                status: (status === 'paid' ? 'Paid' : 'Unpaid') as 'Paid' | 'Unpaid', 
                month: feeMonths.join(', '),
                lastUpdated: new Date().toISOString(),
            };

            // Optimistic Redux UI Update
            dispatch(addOrUpdateFee(payload));
            setEditRecord(null);

            // Background network execution
            await updateDoc(doc(db, 'students', editRecord.studentId), { month: feeMonths.join(', ') });
            await setDoc(doc(db, 'fees', editRecord.studentId), payload);
        } catch (e) { alert('Failed to save fee record.'); }
        setSaving(false);
    };

    const pending = editRecord ? (parseInt(totalFee) || 0) - (parseInt(paidAmount) || 0) : 0;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Fee Management</div>
                    <div className="page-sub">{records.length} student records</div>
                </div>
            </div>

            {/* Summary strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total', val: records.length, color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
                    { label: 'Paid', val: paidCount, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Pending', val: pendingCount, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Partial', val: partialCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 'var(--radius)', padding: '14px 18px' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? <div className="loading"><div className="spinner" />Loading...</div> : (
                <div className="table-wrap">
                    <div className="table-toolbar">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="filter-chips">
                            {FILTER_OPTIONS.map(f => <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text2)' }}>{filtered.length} records</span>
                    </div>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Student</th><th>Class</th><th>Father</th><th>Month</th><th>Total Fee</th><th>Paid</th><th>Pending</th><th>Status</th><th>Edit</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? <tr><td colSpan={10} className="empty">No records found</td></tr>
                                : filtered.map((r: any, i: any) => (
                                    <tr key={r.studentId}>
                                        <td style={{ color: 'var(--text2)' }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                                        <td>{r.grade || '—'}</td>
                                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{r.fatherName || '—'}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text2)' }}>{r.month || 'Not set'}</td>
                                        <td style={{ fontWeight: 600 }}>PKR {r.totalFee.toLocaleString()}</td>
                                        <td style={{ color: '#10b981', fontWeight: 600 }}>PKR {r.paidAmount.toLocaleString()}</td>
                                        <td style={{ color: r.pendingAmount > 0 ? '#ef4444' : 'var(--text2)', fontWeight: 600 }}>PKR {r.pendingAmount.toLocaleString()}</td>
                                        <td><span className={`badge ${statusClass(r.status)}`}><span className="badge-dot" />  {r.status}</span></td>
                                        <td>
                                            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => openEdit(r)}>Edit</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editRecord && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditRecord(null)}>
                    <div className="modal" style={{ maxWidth: 540 }}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px 16px 0 0' }}>
                            <div>
                                <div className="modal-title" style={{ color: '#fff' }}>Edit Fee Record</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{editRecord.studentName}</div>
                            </div>
                            <button className="modal-close" style={{ color: '#fff' }} onClick={() => setEditRecord(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Student info (read-only) */}
                            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                {[['Father', editRecord.fatherName || '—'], ['Class', editRecord.grade || '—'], ['Roll No', editRecord.rollno || '—']].map(([l, v]) => (
                                    <div key={l}>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Fee amounts */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Total Fee (PKR)</label>
                                    <input className="form-input" type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Paid Amount (PKR)</label>
                                    <input className="form-input" type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                                </div>
                            </div>

                            {/* Live summary */}
                            <div style={{ background: pending <= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${pending <= 0 ? '#10b981' : '#ef4444'}33`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: pending <= 0 ? '#10b981' : '#ef4444' }}>{pending <= 0 ? '✅ Fully Paid' : '⏳ Payment Due'}</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: pending <= 0 ? '#10b981' : '#ef4444' }}>PKR {Math.abs(pending).toLocaleString()}</span>
                            </div>

                            {/* Month picker */}
                            <div className="form-group">
                                <label className="form-label">Fee Months ({feeMonths.length} selected)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    {MONTH_OPTIONS.map(m => (
                                        <button key={m} onClick={() => toggleMonth(m)} style={{ padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: feeMonths.includes(m) ? '1.5px solid #10b981' : '1px solid var(--border)', background: feeMonths.includes(m) ? 'rgba(16,185,129,0.15)' : 'var(--bg3)', color: feeMonths.includes(m) ? '#10b981' : 'var(--text2)' }}>
                                            {m.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: '#10b981' }} disabled={saving} onClick={save}>{saving ? 'Saving...' : '✓ Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
