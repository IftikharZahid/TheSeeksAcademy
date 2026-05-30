import React from "react";
import { View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { useAppSelector } from "../../store/hooks";

import { LoginScreen } from "../AuthScreens/LoginScreen";
import { WelcomeScreen } from "../AuthScreens/WelcomeScreen";
import { MainTabs } from "./MainTabs";
import { AdminDashboard } from "../AdminScreens/AdminDashboard";
import { HomeScreen } from "../CoreScreens/HomeScreen";
import { AdminComplaintsScreen } from "../AdminScreens/AdminComplaintsScreen";
import { AdminTimetableScreen } from "../AdminScreens/AdminTimetableScreen";
import { AdminTeachersScreen } from "../AdminScreens/AdminTeachersScreen";
import { AdminVideoGalleryScreen } from "../AdminScreens/AdminVideoGalleryScreen";
import { AdminStudentRecordsScreen } from "../AdminScreens/AdminStudentRecordsScreen";
import { AdminExamsScreen } from "../AdminScreens/AdminExamsScreen";
import { AdminFeeScreen } from "../AdminScreens/AdminFeeScreen";
import { AdminNoticeBoardScreen } from "../AdminScreens/AdminNoticeBoardScreen";
import { AdminAttendanceScreen } from "../AdminScreens/AdminAttendanceScreen";
import { AdminAssignmentsScreen } from "../AdminScreens/AdminAssignmentsScreen";
import { StudentProfile } from "../AdminScreens/StudentProfile";

// Profile sub-screens — moved to root so they overlay cleanly (no header/tab bar flash)
import { HelpCenterScreen } from "../SettingScreens/HelpCenterScreen";
import { AboutScreen } from "../SettingScreens/AboutScreen";
import { PrivacyPolicyScreen } from "../SettingScreens/PrivacyPolicyScreen";
import ChangePasswordScreen from "../SettingScreens/ChangePasswordScreen";
import { TeacherDashboardScreen } from "../Teachers/TeacherDashboardScreen";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
  Admin: undefined;
  Home: undefined;
  AdminComplaints: undefined;
  AdminTimetable: undefined;
  AdminTeachers: undefined;
  AdminVideoGallery: undefined;
  AdminStudentRecords: undefined;
  AdminExams: undefined;
  AdminFeeScreen: undefined;
  AdminNoticeBoardScreen: undefined;
  AdminAttendanceScreen: undefined;
  AdminAssignmentsScreen: undefined;
  StudentProfile: { student: any };
  // Profile sub-screens at root level
  HelpCenterScreen: undefined;
  AboutScreen: undefined;
  PrivacyPolicyScreen: undefined;
  ChangePasswordScreen: undefined;
  TeacherDashboardScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const initializing = useAppSelector((state) => state.auth.initializing);

  // Safety timeout: stop waiting after 4 s even if Firebase hasn't responded
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  };

  // Show themed spinner while Firebase auth resolves
  if (initializing && !timedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName={user ? "Main" : "Welcome"}
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
            presentation: "card",
            animationDuration: 200,
            freezeOnBlur: true,
          }}
        >
          {!user ? (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Admin" component={AdminDashboard} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="AdminComplaints" component={AdminComplaintsScreen} />
              <Stack.Screen name="AdminTimetable" component={AdminTimetableScreen} />
              <Stack.Screen name="AdminTeachers" component={AdminTeachersScreen} />
              <Stack.Screen name="AdminVideoGallery" component={AdminVideoGalleryScreen} />
              <Stack.Screen name="AdminStudentRecords" component={AdminStudentRecordsScreen} />
              <Stack.Screen name="AdminExams" component={AdminExamsScreen} />
              <Stack.Screen name="AdminFeeScreen" component={AdminFeeScreen} />
              <Stack.Screen name="AdminNoticeBoardScreen" component={AdminNoticeBoardScreen} />
              <Stack.Screen name="AdminAttendanceScreen" component={AdminAttendanceScreen} />
              <Stack.Screen name="AdminAssignmentsScreen" component={AdminAssignmentsScreen} />
              <Stack.Screen name="StudentProfile" component={StudentProfile} />
              {/* Profile sub-screens — root level ensures no header/tab bar leak */}
              <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
              <Stack.Screen name="AboutScreen" component={AboutScreen} />
              <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
              <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
              <Stack.Screen name="TeacherDashboardScreen" component={TeacherDashboardScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};
