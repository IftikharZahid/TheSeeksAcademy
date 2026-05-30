import React, { useEffect, useState, useRef, useMemo } from 'react';

import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchExams } from '../../store/slices/examsSlice';
import { fetchFees } from '../../store/slices/feesSlice';
import { fetchComplaints, fetchNotices, fetchVideos } from '../../store/slices/generalSlice';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ── SVG Icon Components ────────────────────────────────────────────────────────
const Icons = {
    students: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    faculty: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    exams: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    ),
    notices: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    ),
    money: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
    ),
    chart: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ),
    clipboard: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
    ),
    message: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    calendar: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
    ),
    arrowRight: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
        </svg>
    ),
    video: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
    ),
    trendUp: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
        </svg>
    ),
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface RecentStudent { id: string; name: string; cls: string; rollno: string; createdAt: any; }

function timeAgo(ts: any): string {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

// ── Animated Counter ───────────────────────────────────────────────────────────
function AnimCount({ to }: { to: number }) {
    const [v, setV] = useState(0);
    const raf = useRef(0); const t0 = useRef(0); const fr = useRef(0);
    useEffect(() => {
        fr.current = v; t0.current = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0.current) / 700, 1);
            setV(Math.round(fr.current + (to - fr.current) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [to]);
    return <>{v}</>;
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
    const dispatch = useAppDispatch();
    
    // Selectors
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const { data: exams, status: examsStatus } = useAppSelector((s: any) => s.exams);
    const { data: fees, status: feesStatus } = useAppSelector((s: any) => s.fees);
    const { complaints, notices, videos, complaintsStatus, noticesStatus, videosStatus } = useAppSelector((s: any) => s.general);
    const { data: assignments, status: assignmentsStatus } = useAppSelector((s: any) => s.assignments);
    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery)?.toLowerCase() || '';
    // Fetch on mount if idle
    useEffect(() => {
        if (studentsStatus === 'idle') dispatch(fetchStudents());
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
        if (examsStatus === 'idle') dispatch(fetchExams());
        if (feesStatus === 'idle') dispatch(fetchFees());
        if (videosStatus === 'idle') dispatch(fetchVideos());
        if (complaintsStatus === 'idle') dispatch(fetchComplaints());
        if (noticesStatus === 'idle') dispatch(fetchNotices());
        if (assignmentsStatus === 'idle') dispatch({ type: 'assignments/fetchAssignments' } as any); // dispatch the thunk action safely without strict typeof
    }, [dispatch, studentsStatus, teachersStatus, examsStatus, feesStatus, videosStatus, complaintsStatus, noticesStatus, assignmentsStatus]);

    // Enriched Complaints
    const enrichedComplaints = useMemo(() => {
        const enriched = complaints.map((c: any) => {
            const student = students.find((s: any) => (s.email && s.email.toLowerCase() === c.userEmail?.toLowerCase()) || (s.uid && s.uid === c.userId));
            return {
                ...c,
                displayUser: student?.name || c.userName,
                displayClass: student?.grade || 'N/A',
                displayRollNo: student?.rollno || 'N/A'
            };
        });
        return enriched.sort((a: any, b: any) => {
            const getT = (x: any) => x.createdAt?.seconds !== undefined ? x.createdAt.seconds * 1000 : (typeof x.createdAt === 'number' ? x.createdAt : 0);
            return getT(b) - getT(a);
        });
    }, [complaints, students]);

    // Computed Stats
    const studentCount = students.length;
    const teacherCount = teachers.length;
    const examCount = exams.length;
    const noticeCount = notices.length;
    const galleryCount = videos.length;
    const assignmentCount = assignments?.length || 0;
    const pendingComplaints = complaints.filter((c: any) => c.status === 'Pending').length;

    // Recent Students computed from Redux
    const loading = studentsStatus === 'loading' || teachersStatus === 'loading' || feesStatus === 'loading';

    const recent = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
            return timeB - timeA;
        });
        return sorted.slice(0, 8).map(s => ({
            id: s.id,
            name: s.name,
            cls: s.grade || '—',
            rollno: s.rollno || '—',
            createdAt: s.createdAt,
        }));
    }, [students]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Fee computations
    const feeRecords = useMemo(() => {
        const feesMap: Record<string, any> = {};
        fees.forEach((d: any) => { feesMap[d.id] = d; });

        const getDefaultFee = (grade: string) => {
            if (grade === '9th' || grade === '10th') return 2500;
            if (grade === '1st Year' || grade === '2nd Year') return 4500;
            return 0;
        };

        return students.map((s: any) => {
            const fee = feesMap[s.id];
            const grade = s.grade || s.class || '';
            const defaultFee = getDefaultFee(grade);
            
            if (fee) {
                const total = fee.totalFee || defaultFee;
                const paid = fee.paidAmount || 0;
                const pending = total - paid;
                return { 
                    ...fee,
                    totalFee: total, 
                    paidAmount: paid, 
                    pendingAmount: pending > 0 ? pending : 0, 
                };
            }
            return { 
                totalFee: defaultFee, 
                paidAmount: 0, 
                pendingAmount: defaultFee, 
            };
        });
    }, [students, fees]);

    const feePendingCount = feeRecords.filter((r: any) => r.pendingAmount > 0).length;

    const totalReceived = feeRecords.reduce((sum: number, r: any) => sum + (r.paidAmount || 0), 0);
    
    const totalFeeAmount = feeRecords.reduce((sum: number, r: any) => sum + (r.totalFee || 0), 0);

    const today = new Date();
    const todayStr = today.toDateString();
    
    const todayReceived = fees.reduce((sum: number, f: any) => {
        let dailySum = 0;
        if (f.history && f.history.length > 0) {
            f.history.forEach((h: any) => {
                try {
                    if (new Date(h.date).toDateString() === todayStr) {
                        dailySum += Number(h.amountPaid || 0);
                    }
                } catch { /* skip */ }
            });
        } else if (f.datePaid) {
            try {
                if (new Date(f.datePaid).toDateString() === todayStr) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                }
            } catch { /* skip */ }
        }
        return sum + dailySum;
    }, 0);

    const fmtRs = (n: number) => n >= 1000 ? `Rs ${(n / 1000).toFixed(1)}k` : `Rs ${n}`;

    // Fee Chart Data (Monthly)
    const currentYear = today.getFullYear();
    const feeDataMap: Record<string, number> = {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
        'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    fees.forEach((f: any) => {
        if (f.history && f.history.length > 0) {
            f.history.forEach((h: any) => {
                try {
                    const pd = new Date(h.date);
                    if (pd.getFullYear() === currentYear) {
                        const month = monthNames[pd.getMonth()];
                        feeDataMap[month] += Number(h.amountPaid || 0);
                    }
                } catch { /* skip */ }
            });
        } else if (f.datePaid) {
            try {
                const pd = new Date(f.datePaid);
                if (pd.getFullYear() === currentYear) {
                    const month = monthNames[pd.getMonth()];
                    feeDataMap[month] += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                }
            } catch { /* skip */ }
        }
    });

    const feeChartData = monthNames.map(m => ({ name: m, val: feeDataMap[m] }));

    // Filtering based on globalSearchQuery
    const filteredRecent = recent.filter(s => 
        !globalSearchQuery || 
        s.name.toLowerCase().includes(globalSearchQuery) || 
        s.rollno.toLowerCase().includes(globalSearchQuery) || 
        s.cls.toLowerCase().includes(globalSearchQuery)
    );

    const filteredNotices = notices.filter((n: any) => 
        !globalSearchQuery || 
        (n.title && n.title.toLowerCase().includes(globalSearchQuery)) || 
        (n.content && n.content.toLowerCase().includes(globalSearchQuery)) ||
        (n.category && n.category.toLowerCase().includes(globalSearchQuery))
    );

    const filteredComplaints = enrichedComplaints.filter((c: any) => 
        !globalSearchQuery || 
        (c.displayUser && c.displayUser.toLowerCase().includes(globalSearchQuery)) || 
        (c.category && c.category.toLowerCase().includes(globalSearchQuery)) ||
        (c.displayClass && c.displayClass.toLowerCase().includes(globalSearchQuery)) ||
        (c.status && c.status.toLowerCase().includes(globalSearchQuery))
    );    // KPI card config — all unique stats in one row
    const kpiCards = [
        { label: 'Students', value: studentCount, icon: Icons.students, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', link: '/students' },
        { label: 'Faculty', value: teacherCount, icon: Icons.faculty, gradient: 'linear-gradient(135deg, #10b981, #059669)', link: '/teachers' },
        { label: 'Exams', value: examCount, icon: Icons.exams, gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', link: '/exams' },
        { label: 'Notices', value: noticeCount, icon: Icons.notices, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', link: '/notices' },
        { label: 'Pending Fees', value: feePendingCount, icon: Icons.money, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', link: '/fees' },
        { label: 'Complaints', value: pendingComplaints, icon: Icons.message, gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', link: '/complaints' },
    ];

    // Fee card config
    const feeCards = [
        { label: 'Total Received', value: fmtRs(totalReceived), sub: 'All time collected', accent: '#10b981' },
        { label: 'Pending Dues', value: `${feePendingCount}`, sub: 'Students unpaid', accent: '#ef4444' },
        { label: 'Today Received', value: fmtRs(todayReceived), sub: 'Collected today', accent: '#3b82f6' },
        { label: 'Total Fee Amount', value: fmtRs(totalFeeAmount), sub: 'All records', accent: '#8b5cf6' },
    ];

    const catColors: Record<string, string> = { General: '#6366f1', Academic: '#0ea5e9', Exam: '#ef4444', Holiday: '#10b981', Event: '#f59e0b', Fee: '#8b5cf6', Other: '#94a3b8' };
    const formatDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div className="page" style={{ maxWidth: 1600, padding: '16px 24px', background: 'var(--bg)', minHeight: '100vh' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="dash-animate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {Icons.calendar}
                        {todayLabel}
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3, margin: 0 }}>
                        {greeting}, <span style={{ color: 'var(--primary)' }}>Admin</span>
                    </h1>
                </div>
                <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, background: '#eff6ff', transition: 'all 0.15s' }}>
                    Settings {Icons.arrowRight}
                </Link>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" />Loading live data...</div>
            ) : (
                <>
                    {/* ── KPI Stats Row ─────────────────────────────────────── */}
                    <div className="dash-kpi-grid dash-animate" style={{ marginBottom: 16, animationDelay: '0.05s', gridTemplateColumns: 'repeat(6, 1fr)' }}>
                        {kpiCards.map((c, i) => (
                            <Link key={i} to={c.link} className="dash-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: c.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', flexShrink: 0
                                }}>
                                    {c.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1 }}>
                                        <AnimCount to={c.value} />
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                        {c.label}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* ── Hero Banner ──────────────────────────────────────── */}
                    <div className="dash-hero dash-animate" style={{ marginBottom: 16, animationDelay: '0.1s' }}>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ maxWidth: 520 }}>
                                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: -0.2 }}>
                                    Welcome to The Seeks Academy Dashboard
                                </h2>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
                                    Manage students, faculty, exams, and fees all from one place.
                                </p>
                            </div>
                            <Link to="/students" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                                padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', textDecoration: 'none', flexShrink: 0,
                                backdropFilter: 'blur(4px)',
                                transition: 'background 0.15s'
                            }}>
                                View Students {Icons.arrowRight}
                            </Link>
                        </div>
                    </div>

                    {/* ── Fee Overview Row ─────────────────────────────────── */}
                    <div className="dash-fee-grid dash-animate" style={{ marginBottom: 16, animationDelay: '0.15s' }}>
                        {feeCards.map((c, i) => (
                            <div key={i} className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ height: 2, background: c.accent }} />
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{c.label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{c.value}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{c.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Main Two-Column Layout ──────────────────────────── */}
                    <div className="responsive-main-sidebar" style={{ alignItems: 'start' }}>

                        {/* ── LEFT COLUMN ─────────────────────────────────── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>


                            {/* Fee Collection Bar Chart */}
                            <div className="dash-card dash-animate" style={{ padding: '16px 18px', animationDelay: '0.25s' }}>
                                <div className="dash-section-hdr">
                                    <div className="dash-section-title">
                                        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {Icons.chart}
                                        </div>
                                        Fee Collection
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--text2)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d4ed8' }} /> Monthly</div>
                                        <div style={{ background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 10, border: '1px solid var(--border)' }}>
                                            This Year ▾
                                        </div>
                                    </div>
                                </div>
                                
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={feeChartData} barSize={18} margin={{ top: 5, right: 0, bottom: 0, left: -24 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.03)' }}
                                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: 11, padding: '6px 10px' }}
                                        />
                                        <Bar dataKey="val" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Registered Student List Table */}
                            <div className="dash-card dash-animate" style={{ padding: '16px 18px', animationDelay: '0.3s' }}>
                                <div className="dash-section-hdr">
                                    <div className="dash-section-title">
                                        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {Icons.clipboard}
                                        </div>
                                        Recent Registrations
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid var(--border)' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                            </svg>
                                            <input 
                                                type="text" 
                                                placeholder="Search..." 
                                                value={globalSearchQuery}
                                                onChange={(e) => dispatch({ type: 'general/setGlobalSearchQuery', payload: e.target.value })}
                                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, width: 80, color: 'var(--text)' }} 
                                            />
                                        </div>
                                        <Link to="/students" className="dash-viewall">View all →</Link>
                                    </div>
                                </div>
                                
                                <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th>Roll No</th>
                                            <th>Student Name</th>
                                            <th>Class</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecent.slice(0, 5).map((s, i) => {
                                            const avatarColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
                                            return (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text2)', fontSize: 11 }}>{s.rollno}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{
                                                                width: 26, height: 26, borderRadius: '50%',
                                                                background: avatarColors[i % 5],
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0
                                                            }}>
                                                                {s.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 11 }}>{s.cls}</td>
                                                    <td>
                                                        <span style={{
                                                            background: '#ecfdf5', color: '#059669',
                                                            padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700
                                                        }}>
                                                            Approved
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredRecent.length === 0 && (
                                            <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>No recent registrations found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN ────────────────────────────────── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Notice Board */}
                            <div className="dash-card dash-animate" style={{ padding: '14px 16px', animationDelay: '0.2s' }}>
                                <div className="dash-section-hdr">
                                    <div className="dash-section-title">
                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                            {Icons.notices}
                                        </div>
                                        Notice Board
                                    </div>
                                    <Link to="/notices" className="dash-viewall">View all →</Link>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {filteredNotices.length === 0 ? (
                                        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '16px 0' }}>No notices found</div>
                                    ) : [...filteredNotices].sort((a: any, b: any) => {
                                        const getT = (x: any) => x.createdAt?.seconds !== undefined ? x.createdAt.seconds * 1000 : (typeof x.createdAt === 'number' ? x.createdAt : 0);
                                        return getT(b) - getT(a);
                                    }).slice(0, 4).map((n: any, i: number) => {
                                        const color = catColors[n.category] || '#6366f1';
                                        return (
                                            <div key={n.id || i} style={{
                                                border: '1px solid var(--border)',
                                                borderLeft: `2px solid ${color}`,
                                                borderRadius: 8, padding: '10px 12px',
                                                transition: 'background 0.15s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{n.title}</div>
                                                    <span style={{ background: `${color}12`, color: color, fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                                                        {n.category || 'General'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span>{n.target || 'All'}</span>
                                                    <span>·</span>
                                                    <span>{formatDate(n.createdAt)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent Complaints */}
                            <div className="dash-card dash-animate" style={{ padding: '14px 16px', animationDelay: '0.25s' }}>
                                <div className="dash-section-hdr">
                                    <div className="dash-section-title">
                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                            {Icons.message}
                                        </div>
                                        Recent Complaints
                                    </div>
                                    <Link to="/complaints" className="dash-viewall">View all →</Link>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                    {filteredComplaints.length === 0 ? (
                                        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '14px 0' }}>No complaints found</div>
                                    ) : filteredComplaints.slice(0, 5).map((c: any, i: number) => {
                                        const statusColor = c.status === 'Resolved' ? '#10b981' : c.status === 'In Progress' ? '#0ea5e9' : '#f59e0b';
                                        const initials = (c.displayUser || 'U').charAt(0).toUpperCase();
                                        const avatarBg = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#f59e0b'][i % 6];
                                        const fmtDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                        return (
                                            <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                                                <div style={{
                                                    width: 30, height: 30, borderRadius: '50%', background: avatarBg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                                                }}>
                                                    {initials}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {c.displayUser || 'Unknown'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                                                        {c.category} · Class {c.displayClass}{c.createdAt ? ` · ${fmtDate(c.createdAt)}` : ''}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                                                    borderRadius: 10, background: `${statusColor}12`, color: statusColor,
                                                    flexShrink: 0
                                                }}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Assignments Quick Card */}
                            <div className="dash-card dash-animate" style={{ padding: '12px 14px', animationDelay: '0.35s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 8,
                                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', flexShrink: 0
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                            <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                                        </svg>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Assignments</div>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{assignmentCount} active</div>
                                    </div>
                                    <Link to="/assignments" className="dash-viewall" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                        Manage {Icons.arrowRight}
                                    </Link>
                                </div>
                            </div>

                            {/* Gallery Quick Card */}
                            <div className="dash-card dash-animate" style={{ padding: '12px 14px', animationDelay: '0.3s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 8,
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', flexShrink: 0
                                    }}>
                                        {Icons.video}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Video Gallery</div>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{galleryCount} galleries</div>
                                    </div>
                                    <Link to="/videos" className="dash-viewall" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                        View {Icons.arrowRight}
                                    </Link>
                                </div>
                            </div>

                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
