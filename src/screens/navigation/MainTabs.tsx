import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Text } from 'react-native';
import { HomeStack } from './HomeStack';
import { ProfileStack } from './ProfileStack';
import { CoursesScreen } from '../CoursesScreen';
import { MessagesScreen } from '../MessagesScreen';
import { TopHeader } from '../../components/TopHeader';
import { NoticesScreen } from '../NoticesScreen';
import { CustomTabBar } from '../../components/CustomTabBar';

type TabParamList = {
  Home: undefined;
  Courses: undefined;
  Messages: undefined;
  NoticeBoard: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator 
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: true,
        header: () => <TopHeader />
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'HomeScreen';
          const hiddenRoutes = ['AssignmentsScreen', 'ResultsScreen', 'TimetableScreen', 'TeachersScreen', 'AttendanceScreen', 'CoursesScreen', 'StaffInfoScreen', 'SettingsScreen', 'SimTrackerScreen', 'ChangePasswordScreen', 'AboutScreen'];
          if (hiddenRoutes.includes(routeName)) {
            return { 
              headerShown: false,
              tabBarStyle: { display: 'none' },
              tabBarIcon: () => <Text>🏠</Text>
            };
          }
          return {
            tabBarIcon: () => <Text>🏠</Text>,
          };
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{
          tabBarIcon: () => <Text>📚</Text>,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          headerShown: false,
          tabBarIcon: () => <Text>💬</Text>,
        }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticesScreen}
        options={{
          tabBarIcon: () => <Text>📢</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProfileScreen';
          const hiddenRoutes = ['SimTrackerScreen', 'ChangePasswordScreen'];
          if (hiddenRoutes.includes(routeName)) {
            return { 
              headerShown: false,
              tabBarStyle: { display: 'none' },
              tabBarIcon: () => <Text>👤</Text>
            };
          }
          return {
            headerShown: false,
            tabBarIcon: () => <Text>👤</Text>,
          };
        }}
      />
    </Tab.Navigator>
  );
};