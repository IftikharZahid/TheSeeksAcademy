// Barrel export for convenient imports
export { store } from './store';
export type { RootState, AppDispatch } from './store';
export { useAppDispatch, useAppSelector } from './hooks';

// Re-export slice actions and thunks
export { setUser, clearAuth, fetchUserProfile, initAuthListener } from './slices/authSlice';
export type { UserProfile, SerializableUser } from './slices/authSlice';

export { toggleTheme, setThemeMode, loadSavedTheme, selectTheme } from './slices/themeSlice';
export type { ThemeMode, Theme } from './slices/themeSlice';

export { setCourses, toggleLike, initCoursesListener } from './slices/coursesSlice';

export { setTeachers, toggleLikeTeacher, toggleLikeTeacherAsync, fetchLikedTeacherIds, setLikedIds, initTeachersListener } from './slices/teachersSlice';
export type { Teacher } from './slices/teachersSlice';

export { setNotices, markAsRead, initNotificationsListener, persistReadIds } from './slices/notificationsSlice';
export type { Notice } from './slices/notificationsSlice';

export { setGalleries, toggleLikeVideo, setVideoProgress, clearVideoProgress, initVideoGalleriesListener } from './slices/videosSlice';
export type { VideoGallery, Video } from './slices/videosSlice';

export { fetchFeeDetails, clearFee } from './slices/feeSlice';
export type { FeeDetail } from './slices/feeSlice';

export { fetchResults, clearResults } from './slices/resultsSlice';
export type { ExamEntry, BookEntry } from './slices/resultsSlice';

export { fetchAttendance, clearAttendance } from './slices/attendanceSlice';

export { setMessages, addMessage, clearMessages, initMessagesListener } from './slices/messagesSlice';

export {
    setStudents as setAdminStudents,
    setExams as setAdminExams,
    setComplaints as setAdminComplaints,
    setTimetable as setAdminTimetable,
    setFeeRecords as setAdminFeeRecords,
    clearAdmin,
    fetchAdminFeeRecords,
    initStudentsListener,
    initExamsListener,
    initComplaintsListener,
    initTimetableListener,
} from './slices/adminSlice';
export type {
    AdminStudent,
    AdminExam,
    AdminComplaint,
    ClassSession,
    AdminFeeRecord,
    BookEntry as AdminBookEntry,
} from './slices/adminSlice';
