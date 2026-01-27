import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoursesProvider } from './src/context/CoursesContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/screens/navigation/AppNavigator';

import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CoursesProvider>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </CoursesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}