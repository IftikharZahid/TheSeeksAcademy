import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';
import type { Dispatch } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Assignment {
    id: string;
    title: string;
    subject: string;
    teacherName: string;
    deadline: string;
    description: string;
    targetClass: string;
    category?: string;
    createdAt?: number;
}

interface AssignmentsState {
    data: Assignment[];
    readIds: string[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AssignmentsState = {
    data: [],
    readIds: [],
    status: 'idle',
    error: null,
};

// Admin Thunks
export const createAssignment = createAsyncThunk(
    'assignments/createAssignment',
    async (assignmentData: Omit<Assignment, 'id'>) => {
        const newRef = doc(collection(db, 'assignments'));
        const newId = newRef.id;
        const newAssignment = {
            ...assignmentData,
            id: newId,
            createdAt: Date.now(),
        };
        await setDoc(newRef, newAssignment);
        return newAssignment;
    }
);

export const removeAssignment = createAsyncThunk(
    'assignments/removeAssignment',
    async (id: string) => {
        await deleteDoc(doc(db, 'assignments', id));
        return id;
    }
);

const assignmentsSlice = createSlice({
    name: 'assignments',
    initialState,
    reducers: {
        setAssignments: (state, action: PayloadAction<Assignment[]>) => {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        setReadAssignmentIds: (state, action: PayloadAction<string[]>) => {
            state.readIds = action.payload;
        },
        markAssignmentAsRead: (state, action: PayloadAction<string>) => {
            if (!state.readIds.includes(action.payload)) {
                state.readIds.push(action.payload);
            }
        },
        setStatus: (state, action: PayloadAction<'idle' | 'loading' | 'succeeded' | 'failed'>) => {
            state.status = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.status = 'failed';
        }
    },
    extraReducers: (builder) => {
        // Create Assignment
        builder.addCase(createAssignment.fulfilled, (state, action) => {
            state.data.unshift(action.payload as Assignment);
        });
        // Remove Assignment
        builder.addCase(removeAssignment.fulfilled, (state, action) => {
            state.data = state.data.filter(a => a.id !== action.payload);
        });
    }
});

export const { setAssignments, setReadAssignmentIds, markAssignmentAsRead, setStatus, setError } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;

// Listener for real-time updates (for both Admin and Students)
export const initAssignmentsListener = (dispatch: Dispatch) => {
    // Load previously-read IDs
    AsyncStorage.getItem('read_assignments').then((stored) => {
        if (stored) {
            try { dispatch(setReadAssignmentIds(JSON.parse(stored))); } catch { }
        }
    });

    dispatch(setStatus('loading'));
    const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(
        q,
        (snapshot) => {
            const assignmentsList: Assignment[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                assignmentsList.push({
                    id: docSnap.id,
                    title: data.title || '',
                    subject: data.subject || '',
                    teacherName: data.teacherName || '',
                    deadline: data.deadline || '',
                    description: data.description || '',
                    targetClass: data.targetClass || '',
                    category: data.category || '',
                    createdAt: data.createdAt || 0,
                });
            });
            dispatch(setAssignments(assignmentsList));
        },
        (error) => {
            console.error('Assignments fetch error:', error);
            dispatch(setError(error.message));
        }
    );
};

export const persistReadAssignmentIds = async (readIds: string[]) => {
    try {
        await AsyncStorage.setItem('read_assignments', JSON.stringify(readIds));
    } catch (error) {
        console.error('Error saving assignment read status:', error);
    }
};
