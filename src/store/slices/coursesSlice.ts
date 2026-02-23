import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../api/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { Course, courses as localCourses } from '../../data/courses';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────
interface CoursesState {
    list: Course[];
    likedIds: string[];
    isLoading: boolean;
}

const initialState: CoursesState = {
    list: [],
    likedIds: [],
    isLoading: true,
};

// ── Slice ──────────────────────────────────────────────
const coursesSlice = createSlice({
    name: 'courses',
    initialState,
    reducers: {
        setCourses(state, action: PayloadAction<Course[]>) {
            state.list = action.payload;
            state.isLoading = false;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        toggleLike(state, action: PayloadAction<string>) {
            const id = action.payload;
            const idx = state.likedIds.indexOf(id);
            if (idx >= 0) {
                state.likedIds.splice(idx, 1);
            } else {
                state.likedIds.push(id);
            }
        },
    },
});

export const { setCourses, setLoading, toggleLike } = coursesSlice.actions;
export default coursesSlice.reducer;

// ── Selectors ──────────────────────────────────────────
export const selectLikedCoursesSet = (likedIds: string[]) => new Set(likedIds);

// ── Firebase Listener (call once from App.tsx) ─────────
export const initCoursesListener = (dispatch: Dispatch) => {
    // Load cache first for instant display
    AsyncStorage.getItem('courses_cache').then((cached) => {
        if (cached) {
            try { dispatch(setCourses(JSON.parse(cached))); } catch { }
        }
    });

    return onSnapshot(
        collection(db, 'courses'),
        async (snapshot) => {
            try {
                if (snapshot.empty) {
                    dispatch(setCourses(localCourses));
                    await AsyncStorage.setItem('courses_cache', JSON.stringify(localCourses));
                } else {
                    const fetched: Course[] = [];
                    snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() } as Course));
                    dispatch(setCourses(fetched));
                    await AsyncStorage.setItem('courses_cache', JSON.stringify(fetched));
                }
            } catch (err) {
                console.error('Error processing courses snapshot:', err);
            }
        },
        (error) => {
            console.error('Error listening to courses:', error);
            dispatch(setCourses(localCourses));
        }
    );
};
