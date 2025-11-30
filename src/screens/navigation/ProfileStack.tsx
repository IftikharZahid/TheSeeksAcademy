import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../ProfileScreen';
import SimTrackerScreen from '../SimTrackerScreen';
import ChangePasswordScreen from '../ChangePasswordScreen';

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  SimTrackerScreen: undefined;
  ChangePasswordScreen: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="SimTrackerScreen" component={SimTrackerScreen} />
      <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
};
