import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

import { Notice } from '../../pages/communication/NoticesPage';
import { Complaint } from '../../pages/communication/ComplaintsPage';
import { Gallery } from '../../pages/academics/VideosPage';
import { TimetableEntry } from '../../pages/academics/TimetablePage';

interface GeneralState {
    globalSearchQuery: string;
    notices: Notice[];
    noticesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    
    complaints: Complaint[];
    complaintsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    
    videos: Gallery[];
    videosStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    
    timetable: TimetableEntry[];
    timetableStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: GeneralState = {
    globalSearchQuery: '',
    notices: [], noticesStatus: 'idle',
    complaints: [], complaintsStatus: 'idle',
    videos: [], videosStatus: 'idle',
    timetable: [], timetableStatus: 'idle',
};

// --- Thunks ---
export const fetchNotices = createAsyncThunk('general/fetchNotices', async () => {
    const snap = await getDocs(collection(db, 'notices'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notice[];
});

export const fetchComplaints = createAsyncThunk('general/fetchComplaints', async () => {
    const snap = await getDocs(collection(db, 'complaints'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Complaint[];
});

export const fetchVideos = createAsyncThunk('general/fetchVideos', async () => {
    const snap = await getDocs(collection(db, 'videoGalleries'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Gallery[];
});

export const fetchTimetable = createAsyncThunk('general/fetchTimetable', async () => {
    const snap = await getDocs(collection(db, 'timetable'));
    const entries: TimetableEntry[] = [];
    snap.docs.forEach(d => {
        const data = d.data();
        const day = d.id; // doc ID is the day name e.g. "Monday"
        if (Array.isArray(data.classes)) {
            // New schema: timetable/{dayName} with classes[]
            data.classes.forEach((cls: any) => {
                entries.push({
                    id: cls.id || `${day}_${cls.subject}`,
                    day,
                    period: cls.period || '',
                    subject: cls.subject || '',
                    class: cls.class || '',
                    teacher: cls.instructor || cls.teacher || '',
                    room: cls.room || '',
                    startTime: cls.startTime || (cls.time ? cls.time.split('-')[0] : ''),
                    endTime: cls.endTime || (cls.time ? cls.time.split('-')[1] : ''),
                } as TimetableEntry);
            });
        } else if (data.day && data.subject) {
            // Old flat schema: individual docs (backward compat)
            entries.push({ id: d.id, ...data } as TimetableEntry);
        }
    });
    return entries;
});

const generalSlice = createSlice({
    name: 'general',
    initialState,
    reducers: {
        setGlobalSearchQuery: (state, action: PayloadAction<string>) => { state.globalSearchQuery = action.payload; },
        setNotices: (state, action) => { state.notices = action.payload; state.noticesStatus = 'succeeded'; },
        addOrUpdateNotice: (state, action) => {
            const idx = state.notices.findIndex(n => n.id === action.payload.id);
            if (idx !== -1) state.notices[idx] = action.payload; else state.notices.push(action.payload);
        },
        removeNotice: (state, action) => { state.notices = state.notices.filter(n => n.id !== action.payload); },
        setComplaints: (state, action) => { state.complaints = action.payload; state.complaintsStatus = 'succeeded'; },
        addOrUpdateComplaint: (state, action) => {
            const idx = state.complaints.findIndex(c => c.id === action.payload.id);
            if (idx !== -1) state.complaints[idx] = action.payload; else state.complaints.push(action.payload);
        },
        removeComplaint: (state, action) => { state.complaints = state.complaints.filter(c => c.id !== action.payload); },
        addOrUpdateGallery: (state, action) => {
            const idx = state.videos.findIndex(v => v.id === action.payload.id);
            if (idx !== -1) state.videos[idx] = action.payload; else state.videos.push(action.payload);
        },
        deleteGallery: (state, action) => { state.videos = state.videos.filter(v => v.id !== action.payload); },
        addOrUpdateTimetable: (state, action) => {
            const idx = state.timetable.findIndex(t => t.id === action.payload.id);
            if (idx !== -1) state.timetable[idx] = action.payload; else state.timetable.push(action.payload);
        },
        setTimetable: (state, action) => { state.timetable = action.payload; state.timetableStatus = 'succeeded'; },
        removeTimetable: (state, action) => { state.timetable = state.timetable.filter(t => t.id !== action.payload); },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchNotices.pending, (state) => { state.noticesStatus = 'loading'; })
            .addCase(fetchNotices.fulfilled, (state, action) => { state.noticesStatus = 'succeeded'; state.notices = action.payload; })
            .addCase(fetchComplaints.pending, (state) => { state.complaintsStatus = 'loading'; })
            .addCase(fetchComplaints.fulfilled, (state, action) => { state.complaintsStatus = 'succeeded'; state.complaints = action.payload; })
            .addCase(fetchVideos.pending, (state) => { state.videosStatus = 'loading'; })
            .addCase(fetchVideos.fulfilled, (state, action) => { state.videosStatus = 'succeeded'; state.videos = action.payload; })
            .addCase(fetchTimetable.pending, (state) => { state.timetableStatus = 'loading'; })
            .addCase(fetchTimetable.fulfilled, (state, action) => { state.timetableStatus = 'succeeded'; state.timetable = action.payload; })
    }
});

export const { 
        setGlobalSearchQuery,
        setNotices, addOrUpdateNotice, removeNotice, 
        setComplaints, addOrUpdateComplaint, removeComplaint,
        addOrUpdateGallery, deleteGallery,
        addOrUpdateTimetable, setTimetable, removeTimetable
    } = generalSlice.actions;

export default generalSlice.reducer;
