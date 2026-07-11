import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';
import type { Dispatch } from '@reduxjs/toolkit';

export interface LibraryCategory {
    name: string;
    icon: string;
    subtitle?: string;
}

interface AppSettingsState {
    classes: string[];
    books: string[];
    libraryCategories: LibraryCategory[];
    loading: boolean;
}

const initialState: AppSettingsState = {
    classes: [],
    books: [],
    libraryCategories: [],   // Empty — populated exclusively from Firebase
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
        setLibraryCategories(state, action: PayloadAction<LibraryCategory[]>) {
            state.libraryCategories = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        }
    }
});

export const { setClasses, setBooks, setLibraryCategories, setLoading } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;

export const initAppSettingsListener = (dispatch: Dispatch) => {
    let classesLoaded = false;
    let booksLoaded = false;
    let libCatsLoaded = false;

    const checkAllLoaded = () => {
        if (classesLoaded && booksLoaded && libCatsLoaded) {
            dispatch(setLoading(false));
        }
    };

    const unsubClasses = onSnapshot(doc(db, 'appSettings', 'classes'), (docSnap) => {
        if (docSnap.exists() && Array.isArray(docSnap.data().list) && docSnap.data().list.length > 0) {
            dispatch(setClasses(docSnap.data().list));
        }
        classesLoaded = true;
        checkAllLoaded();
    });

    const unsubBooks = onSnapshot(doc(db, 'appSettings', 'books'), (docSnap) => {
        if (docSnap.exists() && Array.isArray(docSnap.data().list) && docSnap.data().list.length > 0) {
            dispatch(setBooks(docSnap.data().list));
        }
        booksLoaded = true;
        checkAllLoaded();
    });

    const unsubLibCats = onSnapshot(doc(db, 'appSettings', 'libraryCategories'), (docSnap) => {
        if (docSnap.exists() && Array.isArray(docSnap.data().list) && docSnap.data().list.length > 0) {
            const list = docSnap.data().list.map((item: any) => {
                if (typeof item === 'string') return { name: item, icon: 'folder' };
                return item;
            });
            dispatch(setLibraryCategories([{ name: 'All', icon: 'layers' }, ...list]));
        } else {
            // Firebase has no categories yet — dispatch empty so skeleton stops
            dispatch(setLibraryCategories([]));
        }
        libCatsLoaded = true;
        checkAllLoaded();
    });

    // Fallback timer just in case firestore delays resolution
    setTimeout(() => {
        dispatch(setLoading(false));
    }, 5000);

    return () => {
        unsubClasses();
        unsubBooks();
        unsubLibCats();
    };
};
