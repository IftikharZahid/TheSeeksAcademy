import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import coursesReducer from './slices/coursesSlice';
import teachersReducer from './slices/teachersSlice';
import notificationsReducer from './slices/notificationsSlice';
import videosReducer from './slices/videosSlice';
import feeReducer from './slices/feeSlice';
import resultsReducer from './slices/resultsSlice';
import attendanceReducer from './slices/attendanceSlice';
import messagesReducer from './slices/messagesSlice';
import adminReducer from './slices/adminSlice';
import complaintsReducer from './slices/complaintsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        theme: themeReducer,
        courses: coursesReducer,
        teachers: teachersReducer,
        notifications: notificationsReducer,
        videos: videosReducer,
        fee: feeReducer,
        results: resultsReducer,
        attendance: attendanceReducer,
        messages: messagesReducer,
        admin: adminReducer,
        complaints: complaintsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Firestore Timestamp objects are embedded throughout all collections
            // (courses, teachers, videos, notifications). Disabling the check
            // is the pragmatic approach — it's auto-disabled in production anyway.
            serializableCheck: false,
            immutableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
