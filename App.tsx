import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { initAuthListener } from './src/store/slices/authSlice';
import { loadSavedTheme } from './src/store/slices/themeSlice';
import { initCoursesListener } from './src/store/slices/coursesSlice';
import { initTeachersListener } from './src/store/slices/teachersSlice';
import { initNotificationsListener } from './src/store/slices/notificationsSlice';
import { initVideoGalleriesListener, initLikedVideosListener } from './src/store/slices/videosSlice';
import { initMessagesListener } from './src/store/slices/messagesSlice';
import { AppNavigator } from './src/screens/navigation/AppNavigator';
import { OfflineScreen, useOfflineStatus } from './src/components/OfflineBanner';

/**
 * Inner component that has access to Redux dispatch
 * and initialises all Firebase listeners once on mount.
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isOffline = useOfflineStatus();

  // ── Global Auth & Data Listeners ────────────────────
  useEffect(() => {
    dispatch(loadSavedTheme());

    const unsubAuth = initAuthListener(dispatch);
    const unsubCourses = initCoursesListener(dispatch);
    const unsubTeachers = initTeachersListener(dispatch);
    const unsubNotifications = initNotificationsListener(dispatch);
    const unsubGalleries = initVideoGalleriesListener(dispatch);
    const unsubMessages = initMessagesListener(dispatch);

    return () => {
      unsubAuth();
      unsubCourses();
      unsubTeachers();
      unsubNotifications();
      unsubGalleries();
      unsubMessages();
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

  if (isOffline) {
    return <OfflineScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}