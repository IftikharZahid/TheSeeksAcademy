/**
 * ThemeContext — Compatibility wrapper around Redux themeSlice.
 * 
 * Preserves the `useTheme()` hook API so existing screens don't need changes.
 * The actual state lives in Redux now.
 */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme as reduxToggleTheme, setThemeMode as reduxSetThemeMode, selectTheme, saveTheme } from '../store/slices/themeSlice';
import type { ThemeMode } from '../store/slices/themeSlice';
import { lightTheme } from '../config/theme';

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useTheme = (): ThemeContextType => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);
  const theme = selectTheme(mode);

  return {
    theme,
    isDark: mode === 'dark',
    toggleTheme: () => {
      const newMode = mode === 'light' ? 'dark' : 'light';
      dispatch(reduxToggleTheme());
      dispatch(saveTheme(newMode));
    },
    setThemeMode: (newMode: ThemeMode) => {
      dispatch(reduxSetThemeMode(newMode));
      dispatch(saveTheme(newMode));
    },
  };
};
