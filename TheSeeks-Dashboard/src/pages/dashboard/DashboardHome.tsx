import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchExams } from '../../store/slices/examsSlice';
import { fetchFees } from '../../store/slices/feesSlice';
import { fetchComplaints, fetchNotices, fetchVideos } from '../../store/slices/generalSlice';
import { fetchDefaultFees } from '../../store/slices/appSettingsSlice';

import { Icons } from './DashboardIcons';
import DashboardHeader from './DashboardHeader';
import DashboardKPIs, { KPICard } from './DashboardKPIs';
import DashboardHero from './DashboardHero';
import DashboardFeeCards, { FeeCard } from './DashboardFeeCards';
import DashboardLeftColumn from './DashboardLeftColumn';
import DashboardRightColumn from './DashboardRightColumn';

export default function DashboardHome() {
    const dispatch = useAppDispatch();
    const [cardsFilter, setCardsFilter] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
    const [graphFilter, setGraphFilter] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Yearly');
    
    // Selectors
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const { data: exams, status: examsStatus } = useAppSelector((s: any) => s.exams);
    const { data: fees, status: feesStatus } = useAppSelector((s: any) => s.fees);
    const { complaints, notices, videos, complaintsStatus, noticesStatus, videosStatus } = useAppSelector((s: any) => s.general);
    const { data: assignments, status: assignmentsStatus } = useAppSelector((s: any) => s.assignments);
    const { defaultFees, defaultFeesStatus } = useAppSelector((s: any) => s.appSettings);
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
        if (assignmentsStatus === 'idle') dispatch({ type: 'assignments/fetchAssignments' } as any);
        if (defaultFeesStatus === 'idle') dispatch(fetchDefaultFees());
    }, [dispatch, studentsStatus, teachersStatus, examsStatus, feesStatus, videosStatus, complaintsStatus, noticesStatus, assignmentsStatus, defaultFeesStatus]);

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

    const loading = studentsStatus === 'loading' || teachersStatus === 'loading' || feesStatus === 'loading' || defaultFeesStatus === 'loading';

    // Recent Students computed from Redux
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

        return students.map((s: any) => {
            const fee = feesMap[s.id];
            const grade = s.grade || s.class || '';
            const defaultFee = defaultFees[grade] || 0;
            
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
    }, [students, fees, defaultFees]);

    const feePendingCount = feeRecords.filter((r: any) => r.pendingAmount > 0).length;
    const totalReceived = feeRecords.reduce((sum: number, r: any) => sum + (r.paidAmount || 0), 0);
    const totalFeeAmount = feeRecords.reduce((sum: number, r: any) => sum + (r.totalFee || 0), 0);
    const totalPendingAmount = feeRecords.reduce((sum: number, r: any) => sum + (r.pendingAmount || 0), 0);

    const today = new Date();
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0,0,0,0);

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    startOfYear.setHours(0,0,0,0);
    
    const filteredReceived = fees.reduce((sum: number, f: any) => {
        let dailySum = 0;
        if (f.history && f.history.length > 0) {
            f.history.forEach((h: any) => {
                try {
                    const date = new Date(h.date);
                    if (cardsFilter === 'Weekly' && date >= startOfWeek) {
                        dailySum += Number(h.amountPaid || 0);
                    } else if (cardsFilter === 'Monthly' && date >= startOfMonth) {
                        dailySum += Number(h.amountPaid || 0);
                    } else if (cardsFilter === 'Yearly' && date >= startOfYear) {
                        dailySum += Number(h.amountPaid || 0);
                    }
                } catch { /* skip */ }
            });
        } else if (f.datePaid) {
            try {
                const date = new Date(f.datePaid);
                if (cardsFilter === 'Weekly' && date >= startOfWeek) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                } else if (cardsFilter === 'Monthly' && date >= startOfMonth) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                } else if (cardsFilter === 'Yearly' && date >= startOfYear) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                }
            } catch { /* skip */ }
        }
        return sum + dailySum;
    }, 0);

    const fmtRs = (n: number) => n >= 1000 ? `Rs ${(n / 1000).toFixed(1)}k` : `Rs ${n}`;

    // Fee Chart Data
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthWeeksNames = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
    const yearMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const feeDataMap: Record<string, number> = {};
    if (graphFilter === 'Weekly') {
        weekNames.forEach(d => feeDataMap[d] = 0);
    } else if (graphFilter === 'Monthly') {
        monthWeeksNames.forEach(w => feeDataMap[w] = 0);
    } else {
        yearMonthNames.forEach(m => feeDataMap[m] = 0);
    }

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); // start on Monday
    currentWeekStart.setHours(0,0,0,0);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23,59,59,999);
    
    fees.forEach((f: any) => {
        const processDate = (dateStr: string, amount: number) => {
            try {
                const pd = new Date(dateStr);
                if (graphFilter === 'Yearly' && pd.getFullYear() === currentYear) {
                    const month = yearMonthNames[pd.getMonth()];
                    feeDataMap[month] += amount;
                } else if (graphFilter === 'Monthly' && pd.getFullYear() === currentYear && pd.getMonth() === currentMonth) {
                    const dayOfMonth = pd.getDate();
                    const weekIdx = Math.floor((dayOfMonth - 1) / 7);
                    const weekName = monthWeeksNames[Math.min(weekIdx, 4)];
                    feeDataMap[weekName] += amount;
                } else if (graphFilter === 'Weekly' && pd >= currentWeekStart && pd <= currentWeekEnd) {
                    let dayIdx = pd.getDay() - 1;
                    if (dayIdx === -1) dayIdx = 6; // Sunday
                    const dayName = weekNames[dayIdx];
                    feeDataMap[dayName] += amount;
                }
            } catch { /* skip */ }
        };

        if (f.history && f.history.length > 0) {
            f.history.forEach((h: any) => {
                processDate(h.date, Number(h.amountPaid || 0));
            });
        } else if (f.datePaid) {
            processDate(f.datePaid, Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0));
        }
    });

    let activeKeys: string[] = [];
    if (graphFilter === 'Weekly') activeKeys = weekNames;
    else if (graphFilter === 'Monthly') activeKeys = monthWeeksNames;
    else activeKeys = yearMonthNames;

    const feeChartData = activeKeys.map(k => ({ name: k, val: feeDataMap[k] }));

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
    );

    // KPI card config
    const kpiCards: KPICard[] = [
        { label: 'Students', value: studentCount, icon: Icons.students, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', link: '/students' },
        { label: 'Faculty', value: teacherCount, icon: Icons.faculty, gradient: 'linear-gradient(135deg, #10b981, #059669)', link: '/teachers' },
        { label: 'Exams', value: examCount, icon: Icons.exams, gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', link: '/exams' },
        { label: 'Notices', value: noticeCount, icon: Icons.notices, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', link: '/notices' },
        { label: 'Pending Fees', value: feePendingCount, icon: Icons.money, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', link: '/fees' },
        { label: 'Complaints', value: pendingComplaints, icon: Icons.message, gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', link: '/complaints' },
    ];

    // Fee card config
    const feeCards: FeeCard[] = [
        { label: 'Total Received', value: fmtRs(totalReceived), sub: 'All time collected', accent: '#10b981' },
        { label: 'Pending Dues', value: fmtRs(totalPendingAmount), sub: 'Unpaid amounts', accent: '#ef4444' },
        { label: cardsFilter === 'Weekly' ? 'Weekly Received' : cardsFilter === 'Monthly' ? 'Monthly Received' : 'Yearly Received', value: fmtRs(filteredReceived), sub: cardsFilter === 'Weekly' ? 'Collected this week' : cardsFilter === 'Monthly' ? 'Collected this month' : 'Collected this year', accent: '#3b82f6' },
        { label: 'Total Fee Amount', value: fmtRs(totalFeeAmount), sub: 'Expected revenue', accent: '#8b5cf6' },
    ];

    return (
        <div className="page" style={{ maxWidth: 1600, padding: '16px 24px', background: 'var(--bg)', minHeight: '100vh' }}>
            <DashboardHeader todayLabel={todayLabel} greeting={greeting} />

            {loading ? (
                <div className="loading"><div className="spinner" />Loading live data...</div>
            ) : (
                <>
                    <DashboardKPIs kpiCards={kpiCards} />
                    <DashboardHero />
                    <DashboardFeeCards feeCards={feeCards} filter={cardsFilter} setFilter={setCardsFilter} />

                    <div className="responsive-main-sidebar" style={{ alignItems: 'start' }}>
                        <DashboardLeftColumn 
                            feeChartData={feeChartData} 
                            globalSearchQuery={globalSearchQuery} 
                            filteredRecent={filteredRecent} 
                            graphFilter={graphFilter}
                            setGraphFilter={setGraphFilter}
                        />
                        <DashboardRightColumn 
                            filteredNotices={filteredNotices} 
                            filteredComplaints={filteredComplaints} 
                            assignmentCount={assignmentCount} 
                            galleryCount={galleryCount} 
                        />
                    </div>
                </>
            )}
        </div>
    );
}
