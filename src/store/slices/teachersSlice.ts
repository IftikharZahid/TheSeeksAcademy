import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { auth, db } from '../../api/firebaseConfig';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────
export interface Teacher {
    id: string;
    name: string;
    subject: string;
    qualification: string;
    experience: string;
    image: string;
    color?: string;
    students?: string;
    courses?: number;
    rating?: number;
    booktitle?: string;
    bookimage?: string;
}

interface TeachersState {
    list: Teacher[];
    likedIds: string[];
    isLoading: boolean;
}

const initialState: TeachersState = {
    list: [],
    likedIds: [],
    isLoading: true,
};

// ── Async Thunks ───────────────────────────────────────

/** Fetch the user's liked teacher IDs from Firestore */
export const fetchLikedTeacherIds = createAsyncThunk(
    'teachers/fetchLikedTeacherIds',
    async (uid: string) => {
        const snapshot = await getDocs(
            collection(db, 'users', uid, 'favoriteTeachers')
        );
        return snapshot.docs.map((d) => d.id);
    }
);

/** Toggle a teacher's like status — optimistic in Redux, persists to Firebase */
export const toggleLikeTeacherAsync = createAsyncThunk(
    'teachers/toggleLikeTeacherAsync',
    async (
        { teacher, isCurrentlyLiked }: { teacher: Teacher; isCurrentlyLiked: boolean },
        { dispatch }
    ) => {
        const user = auth.currentUser;
        if (!user) return;

        // Optimistic update first (instant UI)
        dispatch(toggleLikeTeacher(teacher.id));

        const ref = doc(db, 'users', user.uid, 'favoriteTeachers', teacher.id);

        try {
            if (isCurrentlyLiked) {
                await deleteDoc(ref);
            } else {
                await setDoc(ref, {
                    id: teacher.id,
                    name: teacher.name,
                    subject: teacher.subject,
                    qualification: teacher.qualification,
                    experience: teacher.experience,
                    image: teacher.image,
                    likedAt: serverTimestamp(),
                });
            }
        } catch (error) {
            // Revert on failure
            console.error('Error toggling teacher like:', error);
            dispatch(toggleLikeTeacher(teacher.id));
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const teachersSlice = createSlice({
    name: 'teachers',
    initialState,
    reducers: {
        setTeachers(state, action: PayloadAction<Teacher[]>) {
            state.list = action.payload;
            state.isLoading = false;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        toggleLikeTeacher(state, action: PayloadAction<string>) {
            const id = action.payload;
            const idx = state.likedIds.indexOf(id);
            if (idx >= 0) {
                state.likedIds.splice(idx, 1);
            } else {
                state.likedIds.push(id);
            }
        },
        setLikedIds(state, action: PayloadAction<string[]>) {
            state.likedIds = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchLikedTeacherIds.fulfilled, (state, action) => {
            state.likedIds = action.payload;
        });
    },
});

export const { setTeachers, setLoading, toggleLikeTeacher, setLikedIds } = teachersSlice.actions;
export default teachersSlice.reducer;

// ── Firebase Listener (call once from App.tsx) ─────────
export const initTeachersListener = (dispatch: Dispatch) => {
    return onSnapshot(
        collection(db, 'staff'),
        (snapshot) => {
            const teachers: Teacher[] = [];
            snapshot.forEach((d) => teachers.push({ id: d.id, ...d.data() } as Teacher));
            dispatch(setTeachers(teachers));
        },
        (error) => {
            console.error('Error listening to teachers:', error);
            dispatch(setLoading(false));
        }
    );
};
