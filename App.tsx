import React, { useEffect } from 'react';
import * as SplashScreenNative from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  LogBox.ignoreAllLogs(true);
}
SplashScreenNative.preventAutoHideAsync().catch(() => {});
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { initAuthListener } from './src/store/slices/authSlice';
import { loadSavedTheme } from './src/store/slices/themeSlice';
import { initCoursesListener } from './src/store/slices/coursesSlice';
import { initTeachersListener } from './src/store/slices/teachersSlice';
import { initNotificationsListener, initDiariesListener } from './src/store/slices/notificationsSlice';
import { initVideoGalleriesListener, initLikedVideosListener } from './src/store/slices/videosSlice';
import { initMessagesListener, loadLastReadTimestamp } from './src/store/slices/messagesSlice';
import { initAssignmentsListener } from './src/store/slices/assignmentsSlice';
import { initTimetableListener } from './src/store/slices/timetableSlice';
import { initAttendanceListener } from './src/store/slices/attendanceSlice';
import { initAppSettingsListener } from './src/store/slices/appSettingsSlice';
import { loadReadResultIds } from './src/store/slices/resultsSlice';
import { AppNavigator } from './src/screens/navigation/AppNavigator';
import { Audio } from 'expo-av';

// Notification Module
import { initPushNotificationsListener } from './src/features/notification/redux/pushNotificationsSlice';
import { registerForPushNotificationsAsync } from './src/features/notification/services/fcmService';

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
    // Configure audio to play even if the device is on silent mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Dismiss the native Expo splash screen once our app is ready
    SplashScreenNative.hideAsync().catch(() => {});

    dispatch(loadSavedTheme());
    dispatch(loadLastReadTimestamp());
    dispatch(loadReadResultIds());

    const unsubAuth = initAuthListener(dispatch, store.getState);
    const unsubCourses = initCoursesListener(dispatch);
    const unsubTeachers = initTeachersListener(dispatch);
    const unsubNotifications = initNotificationsListener(dispatch);
    const unsubGalleries = initVideoGalleriesListener(dispatch);
    const unsubAssignments = initAssignmentsListener(dispatch);
    const unsubTimetable = initTimetableListener(dispatch);
    const unsubAppSettings = initAppSettingsListener(dispatch);

    return () => {
      unsubAuth();
      unsubCourses();
      unsubTeachers();
      unsubNotifications();
      unsubGalleries();
      unsubAssignments();
      unsubTimetable();
      unsubAppSettings();
    };
  }, [dispatch]);

  // ── User-Specific Data Listeners (keyed by Firebase Auth UID) ────────────────────
  useEffect(() => {
    if (user && user.uid) {
      const unsubLikedVideos = initLikedVideosListener(dispatch, user.uid);
      // Attendance listener: Teacher/Dashboard writes to attendance/{auth_uid}
      // We MUST use user.uid (Firebase Auth UID), NOT any Firestore doc ID
      const unsubAttendance = initAttendanceListener(dispatch, user.uid);
      
      // Register for FCM Push Notifications
      registerForPushNotificationsAsync(user.uid, profile);

      return () => {
        unsubLikedVideos();
        unsubAttendance();
      };
    }
  }, [dispatch, user?.uid]);

  // ── Profile-Dependent Global Listeners ────────────────
  useEffect(() => {
    if (profile) {
      const unsubMessages = initMessagesListener(dispatch, profile);
      const unsubDiaries = initDiariesListener(dispatch, profile.class);
      const unsubPushNotifications = initPushNotificationsListener(dispatch, profile);
      return () => {
        unsubMessages();
        unsubDiaries();
        unsubPushNotifications();
      };
    }
  }, [dispatch, profile]);

  return <AppNavigator />;
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}