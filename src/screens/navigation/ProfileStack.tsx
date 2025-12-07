import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../ProfileScreen';


import { HelpCenterScreen } from '../SettingScreens/HelpCenterScreen';

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  HelpCenterScreen: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
};
