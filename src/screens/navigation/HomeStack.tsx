import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../HomeScreen';

import { ResultsScreen } from '../ResultsScreen';
import { TimetableScreen } from '../TimetableScreen';
import { AssignmentsScreen } from '../AssignmentsScreen';
import { TeachersScreen } from '../TeachersScreen';
import { AttendanceScreen } from '../AttendanceScreen';
import { StaffInfoScreen } from '../StaffInfoScreen';
import { SettingsScreen } from '../SettingsScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  ResultsScreen: undefined;
  TimetableScreen: undefined;
  AssignmentsScreen: undefined;
  TeachersScreen: undefined;
  AttendanceScreen: undefined;
  SettingsScreen: undefined;
  StaffInfoScreen: {
    teacher: {
      id: string;
      name: string;
      subject: string;
      qualification: string;
      experience: string;
      image: string;
    };
  };
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
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="StaffInfoScreen" component={StaffInfoScreen} />
    </Stack.Navigator>
  );
};
