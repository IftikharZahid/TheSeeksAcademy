import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchBooks = createAsyncThunk('appSettings/fetchBooks', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'books'));
    if (snap.exists() && snap.data().list) return snap.data().list as string[];
    const defaults = [
        'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
        'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics',
        'Ethics', 'Chemistry', 'Biology',
    ];
    await setDoc(doc(db, 'appSettings', 'books'), { list: defaults });
    return defaults;
});

export const fetchClasses = createAsyncThunk('appSettings/fetchClasses', async () => {
    const FIRESTORE_KEY = 'classes';
    const LS_KEY = 'school_saved_classes';
    const REAL_DEFAULTS = ['9th', '10th', '1st Year', '2nd Year'];

    // 1. Try Firestore first
    const snap = await getDoc(doc(db, 'appSettings', FIRESTORE_KEY));
    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        return snap.data().list as string[];
    }

    // 2. Firestore empty — try to migrate from ExamsPage's old localStorage store
    let migrated: string[] = [];
    try {
        const lsRaw = localStorage.getItem(LS_KEY);
        if (lsRaw) {
            const parsed = JSON.parse(lsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                migrated = parsed;
            }
        }
    } catch (_) { /* ignore */ }

    const toSave = migrated.length > 0 ? migrated : REAL_DEFAULTS;

    // 3. Write to Firestore so Settings page owns it from now on
    await setDoc(doc(db, 'appSettings', FIRESTORE_KEY), { list: toSave });

    // 4. Clean up localStorage — Firestore is now the source of truth
    try { localStorage.removeItem(LS_KEY); } catch (_) { /* ignore */ }

    return toSave;
});

export const persistBooks = createAsyncThunk('appSettings/persistBooks', async (list: string[]) => {
    await setDoc(doc(db, 'appSettings', 'books'), { list });
    return list;
});

export const persistClasses = createAsyncThunk('appSettings/persistClasses', async (list: string[]) => {
    await setDoc(doc(db, 'appSettings', 'classes'), { list });
    return list;
});

export const fetchDefaultFees = createAsyncThunk('appSettings/fetchDefaultFees', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'defaultFees'));
    if (snap.exists() && snap.data().fees) return snap.data().fees as Record<string, number>;
    return {} as Record<string, number>;
});

export const persistDefaultFees = createAsyncThunk('appSettings/persistDefaultFees', async (fees: Record<string, number>) => {
    await setDoc(doc(db, 'appSettings', 'defaultFees'), { fees });
    return fees;
});

// ── Slice ─────────────────────────────────────────────────────────────────────

interface AppSettingsState {
    books: string[];
    booksStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    classes: string[];
    classesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    defaultFees: Record<string, number>;
    defaultFeesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AppSettingsState = {
    books: [],
    booksStatus: 'idle',
    classes: [],
    classesStatus: 'idle',
    defaultFees: {},
    defaultFeesStatus: 'idle',
};

const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setBooks: (state, action: PayloadAction<string[]>) => { state.books = action.payload; },
        setClasses: (state, action: PayloadAction<string[]>) => { state.classes = action.payload; },
        setDefaultFees: (state, action: PayloadAction<Record<string, number>>) => { state.defaultFees = action.payload; },
        resetStatus: (state) => {
            state.booksStatus = 'idle';
            state.classesStatus = 'idle';
            state.defaultFeesStatus = 'idle';
        },
    },
    extraReducers: (builder) => {
        builder
            // Books
            .addCase(fetchBooks.pending, (state) => { state.booksStatus = 'loading'; })
            .addCase(fetchBooks.fulfilled, (state, action) => { state.booksStatus = 'succeeded'; state.books = action.payload; })
            .addCase(fetchBooks.rejected, (state) => { state.booksStatus = 'failed'; })
            // Classes
            .addCase(fetchClasses.pending, (state) => { state.classesStatus = 'loading'; })
            .addCase(fetchClasses.fulfilled, (state, action) => { state.classesStatus = 'succeeded'; state.classes = action.payload; })
            .addCase(fetchClasses.rejected, (state) => { state.classesStatus = 'failed'; })
            // Default Fees
            .addCase(fetchDefaultFees.pending, (state) => { state.defaultFeesStatus = 'loading'; })
            .addCase(fetchDefaultFees.fulfilled, (state, action) => { state.defaultFeesStatus = 'succeeded'; state.defaultFees = action.payload; })
            .addCase(fetchDefaultFees.rejected, (state) => { state.defaultFeesStatus = 'failed'; })
            // Persist Books
            .addCase(persistBooks.fulfilled, (state, action) => { state.books = action.payload; })
            // Persist Classes
            .addCase(persistClasses.fulfilled, (state, action) => { state.classes = action.payload; })
            // Persist Default Fees
            .addCase(persistDefaultFees.fulfilled, (state, action) => { state.defaultFees = action.payload; });
    },
});

export const { setBooks, setClasses, setDefaultFees, resetStatus } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;
