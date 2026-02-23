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

import { LoginScreen } from "../LoginScreen";
import { SignupScreen } from "../SignupScreen";
import { WelcomeScreen } from "../WelcomeScreen";
import { MainTabs } from "./MainTabs";
import { AdminDashboard } from "../AdminScreens/AdminDashboard";
import { HomeScreen } from "../HomeScreen";
import { AdminComplaintsScreen } from "../AdminScreens/AdminComplaintsScreen";
import { AdminTimetableScreen } from "../AdminScreens/AdminTimetableScreen";
import { AdminTeachersScreen } from "../AdminScreens/AdminTeachersScreen";
import { AdminVideoGalleryScreen } from "../AdminScreens/AdminVideoGalleryScreen";
import { AdminStudentRecordsScreen } from "../AdminScreens/AdminStudentRecordsScreen";
import { AdminExamsScreen } from "../AdminScreens/AdminExamsScreen";
import { AdminFeeScreen } from "../AdminScreens/AdminFeeScreen";
import { AdminNoticeBoardScreen } from "../AdminScreens/AdminNoticeBoardScreen";

import { StudentProfile } from "../AdminScreens/StudentProfile";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
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
  StudentProfile: { student: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  // Auth state now comes from Redux (set by initAuthListener in App.tsx)
  const user = useAppSelector((state) => state.auth.user);
  const initializing = useAppSelector((state) => state.auth.initializing);

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

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
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
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            presentation: 'card',
            animationDuration: 200,
            freezeOnBlur: true,
          }}
        >
          {!user ? (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
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
              <Stack.Screen name="StudentProfile" component={StudentProfile} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};
