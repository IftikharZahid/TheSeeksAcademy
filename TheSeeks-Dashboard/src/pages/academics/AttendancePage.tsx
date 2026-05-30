import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { writeStudentAttendance, setAdminDb, subscribeAttendance } from '../../store/slices/attendanceSlice';
import { RootState } from '../../store/store';

// ── Types ──────────────────────────────────────────────────────────────────────
type StatusType = 'present' | 'absent' | 'late' | 'pending';

const STATUS_META: Record<StatusType, { label: string; color: string; bg: string; short: string }> = {
    present: { label: 'Present', color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   short: 'P' },
    absent:  { label: 'Absent',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   short: 'A' },
    late:    { label: 'Late',    color: '#d97706', bg: 'rgba(217,119,6,0.12)',   short: 'L' },
    pending: { label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.10)', short: '–' },
};

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const PAGE_SIZE  = 20;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1); }
    return days;
}

// ── Reusable style factories ───────────────────────────────────────────────────
const mkChip = (active: boolean): React.CSSProperties => ({
    padding: '3px 11px', fontSize: 11,
    fontWeight: active ? 600 : 400,
    borderRadius: 20,
    border: `1px solid ${active ? 'var(--primary,#6366f1)' : 'var(--border,rgba(255,255,255,0.1))'}`,
    background: active ? 'var(--primary,#6366f1)' : 'transparent',
    color: active ? '#fff' : 'var(--text2)',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s', flexShrink: 0,
});

const mkActionBtn = (isActive: boolean, color: string, bg: string): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: 5,
    border: `1px solid ${isActive ? color : 'var(--border,rgba(255,255,255,0.1))'}`,
    background: isActive ? bg : 'transparent',
    color: isActive ? color : 'var(--text2)',
    fontWeight: 700, fontSize: 10,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
});

// Defined outside component so object identity is stable
const TH = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: '8px 14px',
    textAlign: 'left',
    fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: 'var(--text2)',
    background: 'var(--bg3,rgba(255,255,255,0.03))',
    borderBottom: '1px solid var(--border,rgba(255,255,255,0.07))',
    whiteSpace: 'nowrap',
    ...extra,
});

const TD: React.CSSProperties = {
    padding: '7px 14px',
    borderBottom: '1px solid var(--border,rgba(255,255,255,0.04))',
    color: 'var(--text)', verticalAlign: 'middle',
};

const TDm: React.CSSProperties = {
    ...TD, color: 'var(--text2)', fontSize: 11,
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
    const dispatch = useAppDispatch();
    const { data: studentsRaw, status: studentsStatus } = useAppSelector((s: RootState) => s.students);
    const adminDb: Record<string, Record<string, string>> =
        useAppSelector((s: RootState) => s.attendance?.adminDb) ?? {};
    const adminLoading = useAppSelector((s: RootState) => s.attendance?.adminLoading);

    useEffect(() => {
        if (studentsStatus === 'idle') dispatch(fetchStudents());
    }, [dispatch, studentsStatus]);

    // Resolve Auth UIDs for correct Firebase tracking
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        if (!studentsRaw || studentsRaw.length === 0) return;
        (async () => {
            const studentsNeedingLookup = studentsRaw.filter(
                (s: any) => !(s.uid || s.authUid) && s.email
            );
            
            const emailToUid: Record<string, string> = {};
            if (studentsNeedingLookup.length > 0) {
                try {
                    const snap = await getDocs(collection(db, 'studentsprofile'));
                    snap.forEach(d => {
                        const email = (d.data().email || '').toLowerCase();
                        if (email) emailToUid[email] = d.id;
                    });
                } catch (e) {
                    console.warn('UID lookup failed:', e);
                }
            }

            const resolved = studentsRaw.map((s: any) => {
                const resolvedUid =
                    s.uid?.trim() ||
                    s.authUid?.trim() ||
                    (s.email ? emailToUid[(s.email || '').toLowerCase()] : undefined) ||
                    s.id;
                    
                return { ...s, id: resolvedUid, profileDocId: s.id };
            });
            
            setStudents(resolved);
        })();
    }, [studentsRaw]);

    // ── Date / calendar ────────────────────────────────────────────────────────
    const now        = useMemo(() => new Date(), []);
    const todayStr   = useMemo(() => fmt(now), [now]);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [viewYear,  setViewYear]  = useState<number>(now.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(now.getMonth());
    const daysInMonth    = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    // Refs for auto-scroll selected date cell into view
    const dateStripRef   = useRef<HTMLDivElement>(null);
    const selectedDayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedDayRef.current) {
            selectedDayRef.current.scrollIntoView({
                behavior: 'smooth', block: 'nearest', inline: 'center',
            });
        }
    }, [selectedDate, viewMonth, viewYear]);

    // ── Filters ────────────────────────────────────────────────────────────────
    const [search,      setSearch]      = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterGender, setFilterGender] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    const STATUS_OPTIONS = ['All', 'Present', 'Absent', 'Late', 'Pending'];
    const GENDER_OPTIONS = ['All', 'Boys', 'Girls'];

    // ── Month navigation ───────────────────────────────────────────────────────
    const prevMonth = () => {
        const newM = viewMonth === 0 ? 11 : viewMonth - 1;
        const newY = viewMonth === 0 ? viewYear - 1 : viewYear;
        setViewMonth(newM); setViewYear(newY);
        const isLanding = newY === now.getFullYear() && newM === now.getMonth();
        setSelectedDate(isLanding ? todayStr : fmt(new Date(newY, newM, 1)));
    };

    const nextMonth = () => {
        if (isCurrentMonth) return;
        const newM = viewMonth === 11 ? 0 : viewMonth + 1;
        const newY = viewMonth === 11 ? viewYear + 1 : viewYear;
        setViewMonth(newM); setViewYear(newY);
        const isLanding = newY === now.getFullYear() && newM === now.getMonth();
        setSelectedDate(isLanding ? todayStr : fmt(new Date(newY, newM, 1)));
    };

    const scrollStrip = (dir: 'left' | 'right') => {
        dateStripRef.current?.scrollBy({ left: dir === 'left' ? -132 : 132, behavior: 'smooth' });
    };

    // Real-time Firestore listener — subscribe on mount, clean up on unmount
    const attendanceUnsubRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (attendanceUnsubRef.current) return; // already subscribed
        dispatch(subscribeAttendance()).then((action: any) => {
            if (typeof action.payload === 'function') {
                attendanceUnsubRef.current = action.payload;
            }
        });
        return () => {
            if (attendanceUnsubRef.current) {
                attendanceUnsubRef.current();
                attendanceUnsubRef.current = null;
            }
        };
    }, [dispatch]);

    // ── Derived lists ──────────────────────────────────────────────────────────
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        (students || []).forEach((s: any) => {
            const cls = String(s.class || s.grade || s.studentClass || '').trim();
            if (cls && cls !== 'N/A') set.add(cls);
        });
        // Natural numeric sort: "9th" before "10th" before "11th"
        const sorted = Array.from(set).sort((a, b) => {
            const na = parseInt(a, 10) || 0;
            const nb = parseInt(b, 10) || 0;
            return na !== nb ? na - nb : a.localeCompare(b);
        });
        return ['All', ...sorted];
    }, [students]);

    const globalSearchQuery = useAppSelector((s: RootState) => s.general?.globalSearchQuery || '');
    
    const filteredStudents = useMemo(() => {
        let list: any[] = students ?? [];
        if (filterClass !== 'All')
            list = list.filter((s: any) => String(s.class || s.grade || s.studentClass || '').trim() === filterClass);
        if (filterGender !== 'All') {
            list = list.filter((s: any) => {
                const g = String(s.gender || '').toLowerCase();
                if (filterGender === 'Boys') return g === 'male' || g === 'boy';
                if (filterGender === 'Girls') return g === 'female' || g === 'girl';
                return true;
            });
        }
        
        const activeSearch = search || globalSearchQuery;
        if (activeSearch.trim()) {
            const q = activeSearch.toLowerCase().trim();
            list = list.filter((s: any) =>
                String(s.fullname || s.name || '').toLowerCase().includes(q) ||
                String(s.rollno ?? '').toLowerCase().includes(q)
            );
        }
        
        if (filterStatus !== 'All' && selectedDate) {
            const loweredTarget = filterStatus.toLowerCase() as StatusType;
            list = list.filter((s: any) => {
                const currentStatus = (adminDb[s.id]?.[selectedDate] || 'pending').toLowerCase() as StatusType;
                return currentStatus === loweredTarget;
            });
        }
        
        return list;
    }, [students, filterClass, filterGender, search, globalSearchQuery, filterStatus, adminDb, selectedDate]);

    // ── Infinite scroll ────────────────────────────────────────────────────────
    const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Reset to first page whenever filters change
    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filterClass, filterGender, filterStatus]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisibleCount(prev => prev + PAGE_SIZE); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [adminLoading, filteredStudents]);  // eslint-disable-line react-hooks/exhaustive-deps

    const visibleStudents = useMemo(
        () => filteredStudents.slice(0, visibleCount),
        [filteredStudents, visibleCount]
    );
    const hasMore = visibleCount < filteredStudents.length;

    // Summary counts for selected date
    const counts = useMemo(() => {
        const c = { present: 0, absent: 0, late: 0, pending: 0 };
        if (!selectedDate) return c;
        filteredStudents.forEach((s: any) => {
            const st = ((adminDb[s.id]?.[selectedDate]) || 'pending').toLowerCase() as StatusType;
            if (st in c) (c as any)[st]++;
            else c.pending++;
        });
        return c;
    }, [filteredStudents, adminDb, selectedDate]);

    // Attendance % per day for progress bar in calendar strip
    const dayRate = useCallback((dStr: string): number => {
        if (!filteredStudents.length) return 0;
        const n = filteredStudents.filter((s: any) => adminDb[s.id]?.[dStr] === 'present').length;
        return Math.round((n / filteredStudents.length) * 100);
    }, [filteredStudents, adminDb]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const handleMark = async (studentId: string, status: StatusType) => {
        if (!selectedDate) return;
        const updated = { ...(adminDb[studentId] ?? {}), [selectedDate]: status };
        try {
            await dispatch(writeStudentAttendance({ studentId, dailyRecords: updated })).unwrap();
        } catch (err) {
            console.error('Failed to mark attendance:', err);
            alert('Failed to mark attendance. Check permissions.');
        }
    };

    const handleMarkAll = async (status: StatusType) => {
        if (!selectedDate) return;
        if (!window.confirm(`Mark all ${filteredStudents.length} students as ${status.toUpperCase()}?`)) return;
        for (const s of filteredStudents) await handleMark(s.id, status);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    const summaryItems = [
        { label: 'Students', val: filteredStudents.length, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '👥' },
        { label: 'Present',  val: counts.present,          color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   icon: '✓'  },
        { label: 'Absent',   val: counts.absent,           color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   icon: '✕'  },
        { label: 'Late',     val: counts.late,             color: '#d97706', bg: 'rgba(217,119,6,0.12)',   icon: '⏱' },
    ];

    return (
        <div style={{
            padding: '16px 18px',
            fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
            maxWidth: 1100,
            margin: '0 auto',
        }}>

            {/* ── Page Header ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div>
                    <h1 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-0.3px' }}>
                        Attendance Register
                    </h1>
                    <p style={{ fontSize:11, color:'var(--text2)', margin:'2px 0 0' }}>
                        Daily student attendance tracking
                    </p>
                </div>
                {selectedDate && (
                    <div style={{
                        fontSize:11, color:'var(--text2)', fontWeight:500,
                        background:'var(--bg3,rgba(255,255,255,0.04))',
                        border:'1px solid var(--border,rgba(255,255,255,0.08))',
                        borderRadius:7, padding:'4px 10px',
                    }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday:'short', month:'short', day:'numeric', year:'numeric',
                        })}
                    </div>
                )}
            </div>

            {/* ── Summary Cards ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {summaryItems.map(item => (
                    <div key={item.label} style={{
                        background:'var(--bg2,#1e293b)',
                        border:'1px solid var(--border,rgba(255,255,255,0.07))',
                        borderRadius:10, padding:'10px 14px',
                        display:'flex', alignItems:'center', gap:10,
                        position:'relative', overflow:'hidden',
                    }}>
                        <div style={{
                            position:'absolute', left:0, top:0, bottom:0, width:3,
                            background:item.color, borderRadius:'10px 0 0 10px',
                        }} />
                        <div style={{
                            width:30, height:30, borderRadius:8,
                            background:item.bg, color:item.color,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:14, flexShrink:0,
                        }}>{item.icon}</div>
                        <div>
                            <div style={{ fontSize:20, fontWeight:700, color:item.color, lineHeight:1 }}>
                                {item.val}
                            </div>
                            <div style={{
                                fontSize:10, color:'var(--text2)', marginTop:2,
                                textTransform:'uppercase', letterSpacing:'0.4px', fontWeight:500,
                            }}>
                                {item.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Calendar Card ── */}
            <div style={{
                background:'var(--bg2,#1e293b)',
                border:'1px solid var(--border,rgba(255,255,255,0.07))',
                borderRadius:10, marginBottom:14, overflow:'hidden',
            }}>
                {/* Month navigation bar */}
                <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'7px 12px',
                    borderBottom:'1px solid var(--border,rgba(255,255,255,0.07))',
                }}>
                    <button onClick={prevMonth} style={{
                        width:26, height:26, borderRadius:6, padding:0,
                        border:'1px solid var(--border,rgba(255,255,255,0.1))',
                        background:'var(--bg3,rgba(255,255,255,0.04))',
                        color:'var(--text)', cursor:'pointer', fontSize:16, lineHeight:1,
                        display:'flex', alignItems:'center', justifyContent:'center',
                    }}>‹</button>

                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
                        {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>

                    <button onClick={nextMonth} disabled={isCurrentMonth} style={{
                        width:26, height:26, borderRadius:6, padding:0,
                        border:'1px solid var(--border,rgba(255,255,255,0.1))',
                        background:'var(--bg3,rgba(255,255,255,0.04))',
                        color:'var(--text)',
                        cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
                        opacity: isCurrentMonth ? 0.3 : 1,
                        fontSize:16, lineHeight:1,
                        display:'flex', alignItems:'center', justifyContent:'center',
                    }}>›</button>
                </div>

                {/* Date strip with left/right scroll arrows */}
                <div style={{ display:'flex', alignItems:'center', padding:'6px 8px', gap:4 }}>

                    {/* ← strip scroll */}
                    <button onClick={() => scrollStrip('left')} style={{
                        flexShrink:0, width:24, height:24, borderRadius:6, padding:0,
                        border:'1px solid var(--border,rgba(255,255,255,0.1))',
                        background:'var(--bg3,rgba(255,255,255,0.04))',
                        color:'var(--text2)', cursor:'pointer', fontSize:14,
                        display:'flex', alignItems:'center', justifyContent:'center',
                    }}>‹</button>

                    {/* Scrollable day cells */}
                    <div
                        ref={dateStripRef}
                        style={{
                            display:'flex', gap:5, flex:1,
                            overflowX:'auto', scrollbarWidth:'none',
                            padding:'2px 0',
                        }}
                    >
                        {daysInMonth.map(day => {
                            const dStr    = fmt(day);
                            const isFuture  = day > now;
                            const isSunday  = day.getDay() === 0;
                            const blocked   = isFuture || isSunday;
                            const isSel     = dStr === selectedDate;
                            const isToday   = dStr === todayStr;
                            const pct       = dayRate(dStr);

                            return (
                                <div
                                    key={dStr}
                                    ref={isSel ? selectedDayRef : null}
                                    onClick={() => !blocked && setSelectedDate(dStr)}
                                    title={blocked ? (isSunday ? 'Sunday — off' : 'Future date') : dStr}
                                    style={{
                                        flexShrink:0, width:38,
                                        borderRadius:8, padding:'4px 0 6px',
                                        border:`1px solid ${
                                            isSel    ? 'var(--primary,#6366f1)' :
                                            isSunday ? 'rgba(220,38,38,0.25)' :
                                            isToday  ? 'rgba(99,102,241,0.35)' :
                                            'var(--border,rgba(255,255,255,0.07))'
                                        }`,
                                        background: isSel    ? 'var(--primary,#6366f1)' :
                                                    isSunday ? 'rgba(220,38,38,0.06)' :
                                                    isToday  ? 'rgba(99,102,241,0.1)' :
                                                    'var(--bg3,rgba(255,255,255,0.03))',
                                        color: isSel ? '#fff' : isSunday ? '#f87171' : 'var(--text)',
                                        textAlign:'center',
                                        cursor: blocked ? 'not-allowed' : 'pointer',
                                        opacity: isFuture ? 0.35 : 1,
                                        position:'relative', overflow:'hidden',
                                        transition:'all 0.15s',
                                    }}
                                >
                                    <div style={{ fontSize:8, fontWeight:600, opacity: isSel ? 0.85 : 0.5, letterSpacing:'0.2px' }}>
                                        {DAY_LABELS[day.getDay()]}
                                    </div>
                                    <div style={{ fontSize:14, fontWeight:700, lineHeight:1.1, marginTop:1 }}>
                                        {day.getDate()}
                                    </div>

                                    {/* Attendance progress bar at bottom */}
                                    {pct > 0 && !isSel && (
                                        <div style={{
                                            position:'absolute', bottom:0, left:0, right:0,
                                            height:2, background:'rgba(22,163,74,0.15)',
                                        }}>
                                            <div style={{ height:'100%', width:`${pct}%`, background:'#16a34a', borderRadius:1 }} />
                                        </div>
                                    )}

                                    {/* Today indicator dot */}
                                    {isToday && !isSel && (
                                        <div style={{
                                            position:'absolute', bottom:4,
                                            left:'50%', transform:'translateX(-50%)',
                                            width:3, height:3, borderRadius:'50%',
                                            background:'var(--primary,#6366f1)',
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* → strip scroll */}
                    <button onClick={() => scrollStrip('right')} style={{
                        flexShrink:0, width:24, height:24, borderRadius:6, padding:0,
                        border:'1px solid var(--border,rgba(255,255,255,0.1))',
                        background:'var(--bg3,rgba(255,255,255,0.04))',
                        color:'var(--text2)', cursor:'pointer', fontSize:14,
                        display:'flex', alignItems:'center', justifyContent:'center',
                    }}>›</button>
                </div>
            </div>

            {/* ── Table + Toolbar ── */}
            <div style={{
                background:'var(--bg2,#1e293b)',
                border:'1px solid var(--border,rgba(255,255,255,0.07))',
                borderRadius:10, overflow:'hidden',
            }}>

                {/* Toolbar */}
                <div style={{
                    display:'flex', alignItems:'center', flexWrap:'wrap',
                    gap:8, padding:'10px 14px',
                    borderBottom:'1px solid var(--border,rgba(255,255,255,0.07))',
                }}>
                    {/* Search box */}
                    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                        <span style={{
                            position:'absolute', left:9, fontSize:11,
                            color:'var(--text2)', pointerEvents:'none',
                        }}>🔍</span>
                        <input
                            placeholder="Search name or roll…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                height:30, paddingLeft:26, paddingRight:26,
                                fontSize:12, width:180,
                                background:'var(--bg3,rgba(255,255,255,0.05))',
                                border:'1px solid var(--border,rgba(255,255,255,0.1))',
                                borderRadius:7, color:'var(--text)', outline:'none',
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    position:'absolute', right:6, 
                                    background:'transparent', border:'none',
                                    color:'var(--text2)', cursor:'pointer',
                                    fontSize:12, padding:2, display:'flex',
                                    alignItems:'center', justifyContent:'center',
                                    borderRadius:'50%'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Class filter chips — horizontally scrollable */}
                    <div style={{
                        display:'flex', gap:4, minWidth:0,
                        overflowX:'auto', scrollbarWidth:'none', padding:'1px 0',
                    }}>
                        {classOptions.map(c => (
                            <button key={c} style={mkChip(filterClass === c)} onClick={() => setFilterClass(c)}>
                                {c}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: 1, height: 20, background: 'var(--border,rgba(255,255,255,0.1))', margin: '0 4px' }} />

                    {/* Gender filter chips */}
                    <div style={{
                        display:'flex', gap:4, minWidth:0,
                        overflowX:'auto', scrollbarWidth:'none', padding:'1px 0',
                    }}>
                        {GENDER_OPTIONS.map(g => (
                            <button key={g} style={mkChip(filterGender === g)} onClick={() => setFilterGender(g)}>
                                {g}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: 1, height: 20, background: 'var(--border,rgba(255,255,255,0.1))', margin: '0 4px' }} />

                    {/* Status filter chips */}
                    <div style={{
                        display:'flex', gap:4, flex:1, minWidth:0,
                        overflowX:'auto', scrollbarWidth:'none', padding:'1px 0',
                    }}>
                        {STATUS_OPTIONS.map(s => (
                            <button key={s} style={mkChip(filterStatus === s)} onClick={() => setFilterStatus(s)}>
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Bulk Actions: Mark All P, A, L */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('present')}
                            title="Mark All Present"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:12, fontWeight:800, border:'1px solid rgba(22,163,74,0.4)',
                                background:'rgba(22,163,74,0.15)', color:'#4ade80',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            P
                        </button>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('absent')}
                            title="Mark All Absent"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:12, fontWeight:800, border:'1px solid rgba(220,38,38,0.4)',
                                background:'rgba(220,38,38,0.15)', color:'#f87171',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            A
                        </button>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('late')}
                            title="Mark All Late"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:12, fontWeight:800, border:'1px solid rgba(217,119,6,0.4)',
                                background:'rgba(217,119,6,0.15)', color:'#fbbf24',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            L
                        </button>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('pending')}
                            title="Clear All Attendance"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:14, fontWeight:800, border:'1px solid rgba(100,116,139,0.4)',
                                background:'rgba(100,116,139,0.15)', color:'#64748b',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            <span style={{ marginTop: '-2px' }}>&times;</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                {adminLoading ? (
                    <div style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        gap:10, padding:'32px 16px', color:'var(--text2)', fontSize:13,
                    }}>
                        <div className="spinner" /> Loading attendance…
                    </div>

                ) : filteredStudents.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text2)', fontSize:13 }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                        No students match your filters.
                    </div>

                ) : (
                    <>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                            <thead>
                                <tr>
                                    <th style={TH({ width:36, textAlign:'center' })}>#</th>
                                    <th style={TH()}>Student</th>
                                    <th style={TH()}>Roll No</th>
                                    <th style={TH()}>Class</th>
                                    <th style={TH()}>Status</th>
                                    <th style={TH({ textAlign:'center', width:110 })}>Mark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleStudents.map((s: any, i: number) => {
                                    const rawSt = selectedDate
                                        ? (adminDb[s.id]?.[selectedDate] ?? 'pending')
                                        : 'pending';
                                    const actSt = rawSt.toLowerCase() as StatusType;
                                    const meta  = STATUS_META[actSt] ?? STATUS_META.pending;
                                    const name  = s.fullname ?? s.name ?? 'Unknown';

                                    return (
                                        <tr
                                            key={s.id}
                                            style={{ transition:'background 0.1s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                            onMouseLeave={e => (e.currentTarget.style.background  = 'transparent')}
                                        >
                                            {/* # */}
                                            <td style={{ ...TD, textAlign:'center', color:'var(--text2)', fontWeight:500 }}>
                                                {i + 1}
                                            </td>

                                            {/* Name, Father & Class combined */}
                                            <td style={TD}>
                                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                    <div style={{
                                                        width:26, height:26, borderRadius:7,
                                                        background:meta.bg, color:meta.color,
                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                        fontWeight:700, fontSize:11, flexShrink:0,
                                                    }}>
                                                        {name[0]?.toUpperCase() ?? '?'}
                                                    </div>
                                                    <div style={{ display:'flex', flexDirection:'column' }}>
                                                        <span style={{ fontWeight:600, fontSize:12, color:'var(--text)' }}>
                                                            {name}
                                                        </span>
                                                        <span style={{ fontSize:10, color:'var(--text2)', marginTop:1 }}>
                                                            S/o {s.fatherName || s.fathername || '—'} • Class {s.class || s.grade || s.studentClass || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Roll No */}
                                            <td style={TDm}>{s.rollno ?? '—'}</td>

                                            {/* Class badge */}
                                            <td style={TDm}>
                                                {(s.class || s.grade || s.studentClass) ? (
                                                    <span style={{
                                                        display:'inline-block', padding:'1px 7px',
                                                        borderRadius:4, fontSize:10, fontWeight:600,
                                                        background:'rgba(129,140,248,0.12)',
                                                        color:'#818cf8',
                                                        border:'1px solid rgba(129,140,248,0.2)',
                                                    }}>
                                                        {s.class || s.grade || s.studentClass}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            {/* Status badge */}
                                            <td style={TD}>
                                                <span style={{
                                                    display:'inline-flex', alignItems:'center',
                                                    padding:'2px 8px', borderRadius:20,
                                                    fontSize:10, fontWeight:600,
                                                    color:meta.color, background:meta.bg,
                                                    border:`1px solid ${meta.color}33`,
                                                    textTransform:'uppercase', letterSpacing:'0.3px',
                                                }}>
                                                    {meta.label}
                                                </span>
                                            </td>

                                            {/* Action buttons */}
                                            <td style={{ ...TD, textAlign:'center' }}>
                                                <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                                                    {(['present','late','absent','pending'] as StatusType[]).map(action => {
                                                        const m = STATUS_META[action];
                                                        // Override the short display icon for 'pending' to render as a distinct cross icon
                                                        const icon = action === 'pending' ? <span style={{ fontSize:14 }}>&times;</span> : m.short;
                                                        return (
                                                            <button
                                                                key={action}
                                                                title={`Mark ${m.label}`}
                                                                disabled={!selectedDate}
                                                                onClick={() => handleMark(s.id, action)}
                                                                style={mkActionBtn(actSt === action, m.color, m.bg)}
                                                            >
                                                                {icon}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* ── Infinite-scroll sentinel ── */}
                        {hasMore && (
                            <div
                                ref={sentinelRef}
                                style={{
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    gap:8, padding:'14px 16px', color:'var(--text2)', fontSize:12,
                                    borderTop:'1px solid var(--border,rgba(255,255,255,0.05))',
                                }}
                            >
                                <div className="spinner" style={{ width:14, height:14 }} />
                                Loading {Math.min(PAGE_SIZE, filteredStudents.length - visibleCount)} more…
                            </div>
                        )}

                        {/* ── Footer ── */}
                        <div style={{
                            padding:'8px 14px', fontSize:11, color:'var(--text2)',
                            borderTop:'1px solid var(--border,rgba(255,255,255,0.06))',
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                        }}>
                            <span>
                                Showing{' '}
                                <strong style={{ color:'var(--text)' }}>{visibleStudents.length}</strong>
                                {' '}of{' '}
                                <strong style={{ color:'var(--text)' }}>{filteredStudents.length}</strong>
                                {' '}student{filteredStudents.length !== 1 ? 's' : ''}
                            </span>
                            {selectedDate && (
                                <span style={{ display:'flex', gap:12 }}>
                                    {(['present','absent','late'] as StatusType[]).map(st => (
                                        <span key={st} style={{ color:STATUS_META[st].color, fontWeight:600 }}>
                                            {STATUS_META[st].short} {counts[st]}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}