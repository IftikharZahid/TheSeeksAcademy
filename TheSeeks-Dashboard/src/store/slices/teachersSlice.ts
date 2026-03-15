import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Teacher {
    id: string;
    name: string;
    email: string;
    phone: string;
    qualifications: string;
    joinDate: string;
    status: string;
    type?: string;
    password?: string;
    [key: string]: any;
}

interface TeachersState {
    data: Teacher[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: TeachersState = {
    data: [],
    status: 'idle',
    error: null,
};

export const fetchTeachers = createAsyncThunk('teachers/fetchTeachers', async () => {
    const snap = await getDocs(collection(db, 'staff'));
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name || data.fullname || 'Unknown',
            email: data.email || '',
            phone: data.phone || '',
            qualifications: data.qualifications || data.education || '',
            joinDate: data.joinDate || data.joiningDate || '',
            status: data.status || 'Active',
            type: data.type || 'Teacher',
            password: data.password || '',
            ...data
        } as Teacher;
    }).filter(t => t.type === 'Teacher');
});

const teachersSlice = createSlice({
    name: 'teachers',
    initialState,
    reducers: {
        addOrUpdateTeacher: (state, action: PayloadAction<Teacher>) => {
            const index = state.data.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeTeacher: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(t => t.id !== action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchTeachers.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchTeachers.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchTeachers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateTeacher, removeTeacher } = teachersSlice.actions;
export default teachersSlice.reducer;
