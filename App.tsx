import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoursesProvider } from './src/context/CoursesContext';

import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { MainTabs } from './src/screens/navigation/MainTabs';
import { AdminDashboard } from './src/screens/AdminDashboard';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaProvider>
        <CoursesProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Admin" component={AdminDashboard} />
            </Stack.Navigator>
          </NavigationContainer>
        </CoursesProvider>
      </SafeAreaProvider>
    </>
  );
}