import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../../config/theme';
import { StatusBar } from 'react-native';

// ── Types ──────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';
export type Theme = typeof lightTheme;

interface ThemeState {
    mode: ThemeMode;
    isLoading: boolean;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

const initialState: ThemeState = {
    mode: 'light',
    isLoading: true,
};

// ── Thunks ─────────────────────────────────────────────
export const loadSavedTheme = createAsyncThunk(
    'theme/loadSaved',
    async (_, { rejectWithValue }) => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            return (savedTheme === 'dark' ? 'dark' : 'light') as ThemeMode;
        } catch (error) {
            return rejectWithValue('Failed to load theme');
        }
    }
);

export const saveTheme = createAsyncThunk(
    'theme/save',
    async (mode: ThemeMode) => {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        return mode;
    }
);

// ── Slice ──────────────────────────────────────────────
const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme(state) {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
            StatusBar.setBarStyle(state.mode === 'dark' ? 'light-content' : 'dark-content');
        },
        setThemeMode(state, action: PayloadAction<ThemeMode>) {
            state.mode = action.payload;
            StatusBar.setBarStyle(action.payload === 'dark' ? 'light-content' : 'dark-content');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSavedTheme.fulfilled, (state, action) => {
                state.mode = action.payload;
                state.isLoading = false;
                StatusBar.setBarStyle(action.payload === 'dark' ? 'light-content' : 'dark-content');
            })
            .addCase(loadSavedTheme.rejected, (state) => {
                state.isLoading = false;
            });
    },
});

export const { toggleTheme, setThemeMode } = themeSlice.actions;
export default themeSlice.reducer;

// ── Selectors ──────────────────────────────────────────
/** Derive the full theme object from the mode. Not stored in state to keep it serializable. */
export const selectTheme = (mode: ThemeMode): Theme =>
    mode === 'dark' ? darkTheme : lightTheme;
