import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../HomeScreen';

import { ResultsScreen } from '../ResultsScreen';
import { TimetableScreen } from '../TimetableScreen';
import { AssignmentsScreen } from '../AssignmentsScreen';
import { TeachersScreen } from '../TeachersScreen';
import { AttendanceScreen } from '../AttendanceScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  ResultsScreen: undefined;
  TimetableScreen: undefined;
  AssignmentsScreen: undefined;
  TeachersScreen: undefined;
  AttendanceScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
      <Stack.Screen name="TimetableScreen" component={TimetableScreen} />
      <Stack.Screen name="AssignmentsScreen" component={AssignmentsScreen} />
      <Stack.Screen name="TeachersScreen" component={TeachersScreen} />
      <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    </Stack.Navigator>
  );
};
