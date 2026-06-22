import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';
import type { Dispatch } from '@reduxjs/toolkit';

interface AppSettingsState {
    classes: string[];
    books: string[];
    loading: boolean;
}

const initialState: AppSettingsState = {
    classes: [],
    books: [],
    loading: true,
};

const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setClasses(state, action: PayloadAction<string[]>) {
            state.classes = action.payload;
        },
        setBooks(state, action: PayloadAction<string[]>) {
            state.books = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        }
    }
});

export const { setClasses, setBooks, setLoading } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;

export const initAppSettingsListener = (dispatch: Dispatch) => {
    const unsubClasses = onSnapshot(doc(db, 'appSettings', 'classes'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
            dispatch(setClasses(docSnap.data().list));
        }
    });

    const unsubBooks = onSnapshot(doc(db, 'appSettings', 'books'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
            dispatch(setBooks(docSnap.data().list));
        }
        dispatch(setLoading(false));
    });

    return () => {
        unsubClasses();
        unsubBooks();
    };
};
