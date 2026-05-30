import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAppDispatch } from './store/hooks';

import { ProtectedRoute, PublicOnlyRoute } from './components/common/ProtectedRoute';
import { GlobalAboutModal } from './components/common/GlobalAboutModal';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';

// Slices
import { fetchStudents } from './store/slices/studentsSlice';
import { fetchTeachers } from './store/slices/teachersSlice';
import { fetchFees } from './store/slices/feesSlice';
import { fetchExams } from './store/slices/examsSlice';
import { fetchNotices, fetchComplaints, fetchVideos, fetchTimetable } from './store/slices/generalSlice';
import { fetchClasses } from './store/slices/appSettingsSlice';
import { fetchAssignments } from './store/slices/assignmentsSlice';
import { fetchAttendance } from './store/slices/attendanceSlice';

/** Pre-fetch all Firestore data once user is authenticated */
function DataLoader({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { user } = useAuth();

    React.useEffect(() => {
        if (!user) return;
        dispatch(fetchStudents() as any);
        dispatch(fetchTeachers() as any);
        dispatch(fetchFees() as any);
        dispatch(fetchExams() as any);
        dispatch(fetchNotices() as any);
        dispatch(fetchComplaints() as any);
        dispatch(fetchClasses() as any);
        dispatch(fetchVideos() as any);
        dispatch(fetchTimetable() as any);
        dispatch(fetchAssignments() as any);
        dispatch(fetchAttendance() as any);
    }, [user, dispatch]);

    return <>{children}</>;
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <HashRouter>
                    <GlobalAboutModal />
                    <DataLoader>
                        <Routes>
                            {/* Public */}
                            <Route
                                path="/login"
                                element={
                                    <PublicOnlyRoute>
                                        <LoginPage />
                                    </PublicOnlyRoute>
                                }
                            />
                            {/* Protected */}
                            <Route
                                path="/*"
                                element={
                                    <ProtectedRoute>
                                        <AppLayout />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </DataLoader>
                </HashRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}
