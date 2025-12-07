import React from "react";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../api/firebaseConfig";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";

import { LoginScreen } from "../LoginScreen";
import { SignupScreen } from "../SignupScreen";
import { WelcomeScreen } from "../WelcomeScreen";
import { MainTabs } from "./MainTabs";
import { AdminDashboard } from "../AdminScreens/AdminDashboard";
import { HomeScreen } from "../HomeScreen";
import { AdminComplaintsScreen } from "../AdminScreens/AdminComplaintsScreen";
import { AdminTimetableScreen } from "../AdminScreens/AdminTimetableScreen";
import { AdminTeachersScreen } from "../AdminScreens/AdminTeachersScreen";
import { AdminCoursesScreen } from "../AdminScreens/AdminCoursesScreen";
import { AdminStudentRecordsScreen } from "../AdminScreens/AdminStudentRecordsScreen";
import { AdminExamsScreen } from "../AdminScreens/AdminExamsScreen";
import { AdminFeeScreen } from "../AdminScreens/AdminFeeScreen";

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
  AdminCourses: undefined;
  AdminStudentRecords: undefined;
  AdminExams: undefined;
  AdminFeeScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [initializing, setInitializing] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return subscriber; // unsubscribe on unmount
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
          screenOptions={{ headerShown: false }}
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
              <Stack.Screen name="AdminCourses" component={AdminCoursesScreen} />
              <Stack.Screen name="AdminStudentRecords" component={AdminStudentRecordsScreen} />
              <Stack.Screen name="AdminExams" component={AdminExamsScreen} />
              <Stack.Screen name="AdminFeeScreen" component={AdminFeeScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};
