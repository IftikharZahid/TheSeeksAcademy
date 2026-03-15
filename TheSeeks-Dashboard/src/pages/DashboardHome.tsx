import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchStudents } from '../store/slices/studentsSlice';
import { fetchTeachers } from '../store/slices/teachersSlice';
import { fetchExams } from '../store/slices/examsSlice';
import { fetchFees } from '../store/slices/feesSlice';
import { fetchComplaints, fetchNotices, fetchVideos } from '../store/slices/generalSlice';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ── Exact collection names as used by the mobile Redux slices ─────────────────
// students     → 'students'          (adminSlice: initStudentsListener)
// teachers     → 'staff'             (teachersSlice: initTeachersListener)
// exams        → 'exams'             (adminSlice: initExamsListener)
// fees         → 'fees' + 'students' (adminSlice: initFeeListener — merged)
// attendance   → 'attendance'        (attendanceSlice: per-student doc with dailyRecords)
// complaints   → 'complaints'        (adminSlice: initComplaintsListener)
// notices      → 'notices'           (notificationsSlice: initNotificationsListener)
// videoGalleries → 'videoGalleries'  (videosSlice: initVideoGalleriesListener)

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
    const { complaints, notices, videos, status: generalStatus } = useAppSelector((s: any) => s.general);

    // Fetch on mount if idle
    useEffect(() => {
        if (studentsStatus === 'idle') dispatch(fetchStudents());
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
        if (examsStatus === 'idle') dispatch(fetchExams());
        if (feesStatus === 'idle') dispatch(fetchFees());
        if (generalStatus === 'idle') {
            dispatch(fetchComplaints());
            dispatch(fetchNotices());
            dispatch(fetchVideos());
        }
    }, [dispatch, studentsStatus, teachersStatus, examsStatus, feesStatus, generalStatus]);

    // Computed Stats
    const studentCount = students.length;
    const teacherCount = teachers.length;
    const examCount = exams.length;
    const noticeCount = notices.length;
    const galleryCount = videos.length;
    const pendingComplaints = complaints.filter((c: any) => c.status === 'Pending').length;

    // Recent Students
    const [recent, setRecent] = useState<RecentStudent[]>([]);
    const loading = studentsStatus === 'loading' && teachersStatus === 'loading';

    useEffect(() => {
        async function loadExtras() {
            try {
                // Fetch recent students
                const sQ = await getDocs(query(collection(db, 'students'), orderBy('createdAt', 'desc'), limit(8)));
                setRecent(sQ.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        name: data.fullname || data.name || 'Student',
                        cls: data.class || data.grade || '—',
                        rollno: data.rollno || data.studentId || '—',
                        createdAt: data.createdAt,
                    };
                }));
            } catch (e) {
                console.error(e);
            }
        }
        loadExtras();
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Fee pending count = students without full payment
    const feePendingCount = students.filter((s: any) => {
        const studentFees = fees.filter((f: any) => f.studentId === s.id);
        if (studentFees.length === 0) return true; // No fee records = pending
        let sPaid = 0, sTotal = 0;
        studentFees.forEach((f: any) => {
            sTotal += Number(f.totalFee || f.amount || 0);
            sPaid += Number(f.paidAmount || 0);
            if (f.status === 'Paid') sPaid = sTotal;
        });
        return sPaid < sTotal;
    }).length;


    return (
        <div className="page" style={{ maxWidth: 1600, padding: '20px 30px', background: '#f4f7fe', minHeight: '100vh' }}>

            {/* ── Greeting Header ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1B254B', display:'flex', alignItems:'center', gap: 8 }}>
                    👋 Welcome , Super Admin <span style={{ color: '#2b5fe7' }}>Mr. Admin!</span>
                </div>
                <div style={{ fontSize: 13, color: '#A3AED0', fontWeight: 500 }}>
                    {today}
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" />Loading live data...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
                    
                    {/* ── LEFT COLUMN ────────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        
                        {/* Hero Banner */}
                        <div style={{
                            background: '#2b5fe7', borderRadius: 16, padding: '30px',
                            color: '#fff', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 10px 20px rgba(43, 95, 231, 0.2)'
                        }}>
                            <div style={{ position: 'relative', zIndex: 1, maxWidth: '60%' }}>
                                <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px 0' }}>Welcome - Join The Seeks Academy Today!</h2>
                                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                                    Explore your interests and connect with like-minded students by joining our diverse range of classes. Whether you're into sciences, arts, or academics—there's a place for you. Find your community!
                                </p>
                                <button style={{
                                    background: '#fff', color: '#2b5fe7', border: 'none',
                                    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    See More <span>→</span>
                                </button>
                            </div>
                            {/* Placeholder for Illustration */}
                            <div style={{ position: 'absolute', right: 20, bottom: -20, fontSize: 140, opacity: 0.9 }}>
                                👨‍🎓
                            </div>
                        </div>

                        {/* Payment Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[
                                { lbl: 'Total Received', val: '$154,000', sub: 'Last 30 days' },
                                { lbl: 'Pending Dues', val: `${feePendingCount} Students`, sub: 'Current Month' },
                                { lbl: 'Today Received', val: '$5,800', sub: 'Today' },
                                { lbl: 'Online Pay', val: '$25,800', sub: 'Last 30 days' }
                            ].map((c, i) => (
                                <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F4F7FE', color: '#2b5fe7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                                        💰
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1B254B', marginBottom: 4 }}>{c.val}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', marginBottom: 14 }}>{c.lbl}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#A3AED0' }}>{c.sub}</span>
                                        <button style={{ background: '#2b5fe7', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Learn More</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Colored Stat Blocks Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                            {[
                                { lbl: 'Total Students', val: studentCount, color: '#3b82f6' },
                                { lbl: 'Total Faculty', val: teacherCount, color: '#10b981' },
                                { lbl: 'Total Exams', val: examCount, color: '#8b5cf6' },
                                { lbl: 'Total Notices', val: noticeCount, color: '#f59e0b' },
                                { lbl: 'Video Galleries', val: galleryCount, color: '#ef4444' }
                            ].map((c, i) => (
                                <div key={i} style={{ background: c.color, borderRadius: 12, padding: '20px 16px', color: '#fff', textAlign: 'center', boxShadow: `0 4px 15px ${c.color}40` }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{c.val}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{c.lbl}</div>
                                    <div style={{ fontSize: 11, background:'rgba(255,255,255,0.15)', padding:'4px', borderRadius:4, display:'inline-block' }}>Active: {c.val} Inactive: 0</div>
                                </div>
                            ))}
                        </div>

                        {/* Registered List Table placeholder to match style */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1B254B', display:'flex', alignItems:'center', gap:8 }}>
                                    <span>📋</span> Registered Student List
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ background: '#F4F7FE', borderRadius: 20, padding: '6px 14px', display:'flex', alignItems:'center', gap:6 }}>
                                        <span style={{ fontSize: 12, color: '#A3AED0' }}>🔍</span>
                                        <input type="text" placeholder="Search" style={{ border:'none', background:'transparent', outline:'none', fontSize:12, width:120 }} />
                                    </div>
                                    <span style={{ fontSize: 13, color: '#2b5fe7', fontWeight: 600, cursor: 'pointer' }}>View all &gt;</span>
                                </div>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#A3AED0', fontSize: 12, fontWeight: 600 }}>
                                        <th style={{ padding: '12px 0' }}>Roll No ↑↓</th>
                                        <th style={{ padding: '12px 0' }}>Student Name ↑↓</th>
                                        <th style={{ padding: '12px 0' }}>Class/Grade ↑↓</th>
                                        <th style={{ padding: '12px 0' }}>Status ↑↓</th>
                                        <th style={{ padding: '12px 0' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.slice(0, 5).map((s, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 0', fontSize: 13, color: '#4b5563', fontWeight: 500 }}>{s.rollno}</td>
                                            <td style={{ padding: '14px 0', fontSize: 13, color: '#1B254B', fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ padding: '14px 0', fontSize: 13, color: '#4b5563' }}>{s.cls}</td>
                                            <td style={{ padding: '14px 0' }}>
                                                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>Approved</span>
                                            </td>
                                            <td style={{ padding: '14px 0', textAlign: 'right', color: '#A3AED0', cursor: 'pointer' }}>⋮</td>
                                        </tr>
                                    ))}
                                    {recent.length === 0 && (
                                        <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#A3AED0', fontSize: 13 }}>No recent student registrations</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Horizontal Pill Strip */}
                        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                            {[
                                { lbl: 'Students', val: studentCount, icon: '🎓' },
                                { lbl: 'Exam Result', val: `${examCount}+`, icon: '🏅' },
                                { lbl: 'Total Expense', val: '$505', icon: '💸' },
                                { lbl: 'Fees Collection', val: '$50500', icon: '💰' },
                                { lbl: 'School selection', val: '30+', icon: '🏫' }
                            ].map((p, i) => (
                                <div key={i} style={{ flex: 1, minWidth: 140, background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 600, marginBottom: 4 }}>{p.lbl}</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1B254B' }}>{p.val}</div>
                                    </div>
                                    <div style={{ fontSize: 24 }}>{p.icon}</div>
                                </div>
                            ))}
                        </div>

                        {/* Fee Collection Bar Chart */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1B254B', display:'flex', alignItems:'center', gap:8 }}>
                                    <span>💸</span> Fee Collection
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#A3AED0', fontWeight: 600 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }}/> Exam fee</div>
                                    <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6' }}/> Board fee</div>
                                    <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:'50%', background:'#3b82f6' }}/> School fee</div>
                                    <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b' }}/> Registration fee</div>
                                    <div style={{ background: '#F4F7FE', padding: '4px 10px', borderRadius: 6, color: '#1B254B', cursor: 'pointer' }}>Weekly ⌄</div>
                                </div>
                            </div>
                            
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={[
                                    { name: 'Jan', val: 320 }, { name: 'Feb', val: 290 }, { name: 'Mar', val: 350 },
                                    { name: 'Apr', val: 360 }, { name: 'May', val: 280 }, { name: 'Jun', val: 350 },
                                    { name: 'Jul', val: 270 }, { name: 'Aug', val: 380 }, { name: 'Sep', val: 290 },
                                    { name: 'Oct', val: 350 }, { name: 'Nov', val: 380 }, { name: 'Dec', val: 380 }
                                ]} barSize={20} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A3AED0' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A3AED0' }} />
                                    <Tooltip cursor={{ fill: '#F4F7FE' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="val" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', fontSize: 11, color: '#A3AED0', marginTop: 10 }}>Intraframe Scale for fee collection</div>
                        </div>

                    </div>


                    {/* ── RIGHT COLUMN ───────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        
                        {/* Notice Board */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1B254B', display:'flex', alignItems:'center', gap:8 }}>
                                    <span>📋</span> Notice Board
                                </div>
                                <span style={{ fontSize: 13, color: '#2b5fe7', fontWeight: 600, cursor: 'pointer' }}>View all &gt;</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {[
                                    { title: 'New syllabus Instructions', sub: 'Assignment: Project 1', date: 'May 12, 2024. Mark your calendars!', color: '#f59e0b', tag: 'Not Submitted', tagColor: '#fef3c7', tagText: '#d97706' },
                                    { title: 'World Environment Pro.', sub: 'Assignment: Project 2', date: 'May 12, 2024. Mark your calendars!', color: '#10b981', tag: 'Completed', tagColor: '#dcfce7', tagText: '#16a34a' },
                                    { title: 'Exam Preparation Noti...', sub: 'Assignment: Usability Testing Report', date: 'Due Date: April 15, 2024', color: '#8b5cf6', tag: 'In Progress', tagColor: '#f3e8ff', tagText: '#7e22ce' },
                                    { title: 'Online Classes Preparation', sub: 'Assignment: Photojournalism Project', date: 'Due Date: April 8, 2024', color: '#0ea5e9', tag: 'Not Started', tagColor: '#e0f2fe', tagText: '#0284c7' },
                                ].map((n, i) => (
                                    <div key={i} style={{ border: '1px solid #f1f5f9', borderLeft: `3px solid ${n.color}`, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1B254B' }}>{n.title}</div>
                                            <div style={{ background: n.tagColor, color: n.tagText, fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{n.tag}</div>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 6, fontWeight: 500 }}>{n.sub}</div>
                                        <div style={{ fontSize: 10, color: '#A3AED0' }}>{n.date}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Communication */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1B254B', display:'flex', alignItems:'center', gap:8, marginBottom: 20 }}>
                                <span>💬</span> Recent Communication
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[1,2,3,4,5,6].map((_, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: i%2===0 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                            H
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1B254B' }}>Habibur Rahman <span style={{ fontSize: 11, fontWeight: 500, color: '#A3AED0' }}>@school name</span></div>
                                            <div style={{ fontSize: 11, color: '#A3AED0' }}>2 min ago</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}
