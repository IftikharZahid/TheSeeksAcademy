import React from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { useAppSelector } from "../../store/hooks";
import { lightTheme } from "../../config/theme";

import { LoginScreen } from "../AuthScreens/LoginScreen";
import { WelcomeScreen } from "../AuthScreens/WelcomeScreen";
import { MainTabs } from "./MainTabs";
import { HomeScreen } from "../CoreScreens/HomeScreen";

// Profile sub-screens — moved to root so they overlay cleanly (no header/tab bar flash)
import { HelpCenterScreen } from "../SettingScreens/HelpCenterScreen";
import { AboutScreen } from "../SettingScreens/AboutScreen";
import { PrivacyPolicyScreen } from "../SettingScreens/PrivacyPolicyScreen";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
  Home: undefined;
  // Profile sub-screens at root level
  HelpCenterScreen: undefined;
  AboutScreen: undefined;
  PrivacyPolicyScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme: contextTheme, isDark: contextIsDark } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const initializing = useAppSelector((state) => state.auth.initializing);

  // Force light theme for auth flow since auth screens are hardcoded to white.
  // This prevents the dark theme background from flashing during screen transitions.
  const theme = user ? contextTheme : lightTheme;
  const isDark = user ? contextIsDark : false;

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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
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
              <Stack.Screen name="Home" component={HomeScreen} />
              {/* Profile sub-screens — root level ensures no header/tab bar leak */}
              <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
              <Stack.Screen name="AboutScreen" component={AboutScreen} />
              <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};
