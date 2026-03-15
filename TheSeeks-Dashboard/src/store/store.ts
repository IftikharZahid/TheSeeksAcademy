import { configureStore } from '@reduxjs/toolkit';
import studentsReducer from './slices/studentsSlice.ts';
import teachersReducer from './slices/teachersSlice.ts';
import examsReducer from './slices/examsSlice.ts';
import feesReducer from './slices/feesSlice.ts';
import generalReducer from './slices/generalSlice.ts';
import attendanceReducer from './slices/attendanceSlice.ts';

export const store = configureStore({
    reducer: {
        students: studentsReducer,
        teachers: teachersReducer,
        exams: examsReducer,
        fees: feesReducer,
        general: generalReducer,
        attendance: attendanceReducer,
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: false, // required since Firebase Timestamp objects might be in state
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; // Refresh Lints
