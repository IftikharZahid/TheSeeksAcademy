import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../HomeScreen';

import { ResultsScreen } from '../ResultsScreen';
import { TimetableScreen } from '../TimetableScreen';
import { AssignmentsScreen } from '../AssignmentsScreen';
import { TeachersScreen } from '../TeachersScreen';
import { AttendanceScreen } from '../AttendanceScreen';
import { StaffInfoScreen } from '../StaffInfoScreen';
import { SettingsScreen } from '../SettingScreens/SettingsScreen';
import SimTrackerScreen from '../AdminScreens/SimTrackerScreen';
import ChangePasswordScreen from '../SettingScreens/ChangePasswordScreen';
import { AboutScreen } from '../SettingScreens/AboutScreen';
import { PrivacyPolicyScreen } from '../SettingScreens/PrivacyPolicyScreen';
import { HelpCenterScreen } from '../SettingScreens/HelpCenterScreen';
import { ComplaintsScreen } from '../AdminScreens/ComplaintsScreen';
import { AdminTeachersScreen } from '../AdminScreens/AdminTeachersScreen';
import { FeeDetailScreen } from '../FeeDetailScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  ResultsScreen: undefined;
  TimetableScreen: undefined;
  AssignmentsScreen: undefined;
  TeachersScreen: undefined;
  AttendanceScreen: undefined;
  SettingsScreen: undefined;
  SimTrackerScreen: undefined;
  ChangePasswordScreen: undefined;
  AboutScreen: undefined;
  PrivacyPolicyScreen: undefined;
  HelpCenterScreen: undefined;
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
  ComplaintsScreen: undefined;
  AdminTeachersScreen: undefined;
  FeeDetailScreen: undefined;
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
      <Stack.Screen name="SimTrackerScreen" component={SimTrackerScreen} />
      <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
      <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="StaffInfoScreen" component={StaffInfoScreen} />
      <Stack.Screen name="ComplaintsScreen" component={ComplaintsScreen} />
      <Stack.Screen name="AdminTeachersScreen" component={AdminTeachersScreen} />
      <Stack.Screen name="FeeDetailScreen" component={FeeDetailScreen} />
    </Stack.Navigator>
  );
};
