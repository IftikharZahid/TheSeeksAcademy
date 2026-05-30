import React, { useEffect } from 'react';
import * as SplashScreenNative from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreenNative.preventAutoHideAsync().catch(() => {});
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { initAuthListener } from './src/store/slices/authSlice';
import { loadSavedTheme } from './src/store/slices/themeSlice';
import { initCoursesListener } from './src/store/slices/coursesSlice';
import { initTeachersListener } from './src/store/slices/teachersSlice';
import { initNotificationsListener } from './src/store/slices/notificationsSlice';
import { initVideoGalleriesListener, initLikedVideosListener } from './src/store/slices/videosSlice';
import { initMessagesListener, loadLastReadTimestamp } from './src/store/slices/messagesSlice';
import { AppNavigator } from './src/screens/navigation/AppNavigator';

/**
 * Inner component that has access to Redux dispatch
 * and initialises all Firebase listeners once on mount.
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  // ── Global Auth & Data Listeners ────────────────────
  useEffect(() => {
    // Dismiss the native Expo splash screen once our app is ready
    SplashScreenNative.hideAsync().catch(() => {});

    dispatch(loadSavedTheme());
    dispatch(loadLastReadTimestamp());

    const unsubAuth = initAuthListener(dispatch);
    const unsubCourses = initCoursesListener(dispatch);
    const unsubTeachers = initTeachersListener(dispatch);
    const unsubNotifications = initNotificationsListener(dispatch);
    const unsubGalleries = initVideoGalleriesListener(dispatch);

    return () => {
      unsubAuth();
      unsubCourses();
      unsubTeachers();
      unsubNotifications();
      unsubGalleries();
    };
  }, [dispatch]);

  // ── User-Specific Data Listeners ────────────────────
  useEffect(() => {
    if (user && user.uid) {
      const unsubLikedVideos = initLikedVideosListener(dispatch, user.uid);
      return () => {
        unsubLikedVideos();
      };
    }
  }, [dispatch, user?.uid]);

  // ── Profile-Dependent Global Listeners ────────────────
  useEffect(() => {
    if (profile) {
      const unsubMessages = initMessagesListener(dispatch, profile);
      return () => {
        unsubMessages();
      };
    }
  }, [dispatch, profile]);

  return <AppNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}