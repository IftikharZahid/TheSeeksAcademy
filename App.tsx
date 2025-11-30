import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoursesProvider } from './src/context/CoursesContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/screens/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CoursesProvider>
          <AppNavigator />
        </CoursesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}