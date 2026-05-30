import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

import LoginPage from '../../pages/auth/LoginPage';
import DashboardHome from '../../pages/dashboard/DashboardHome';
import StudentsPage from '../../pages/people/StudentsPage';
import TeachersPage from '../../pages/people/TeachersPage';
import ExamsPage from '../../pages/academics/ExamsPage';
import TimetablePage from '../../pages/academics/TimetablePage';
import AttendancePage from '../../pages/academics/AttendancePage';
import AssignmentsPage from '../../pages/academics/AssignmentsPage';
import VideosPage from '../../pages/academics/VideosPage';
import FeePage from '../../pages/finance/FeePage';
import NoticesPage from '../../pages/communication/NoticesPage';
import ComplaintsPage from '../../pages/communication/ComplaintsPage';
import ChatPage from '../../pages/communication/ChatPage';
import SettingsPage from '../../pages/settings/SettingsPage';

export default function AppLayout() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    // Close mobile menu on navigation
    const location = useLocation();
    React.useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="layout" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
            <div className="no-print">
                <Sidebar
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                />
            </div>
            <div className="main-content">
                <div className="no-print">
                    <TopBar collapsed={collapsed} toggleMobile={() => setMobileOpen(prev => !prev)} />
                </div>
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/teachers" element={<TeachersPage />} />
                    <Route path="/exams" element={<ExamsPage />} />
                    <Route path="/timetable" element={<TimetablePage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/fees" element={<FeePage />} />
                    <Route path="/complaints" element={<ComplaintsPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/notices" element={<NoticesPage />} />
                    <Route path="/videos" element={<VideosPage />} />
                    <Route path="/assignments" element={<AssignmentsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
}
