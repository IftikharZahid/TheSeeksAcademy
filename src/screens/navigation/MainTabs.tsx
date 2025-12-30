import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
          const hiddenRoutes = ['AssignmentsScreen', 'ResultsScreen', 'TimetableScreen', 'TeachersScreen', 'AttendanceScreen', 'CoursesScreen', 'StaffInfoScreen', 'SettingsScreen', 'SimTrackerScreen', 'ChangePasswordScreen', 'AboutScreen', 'PrivacyPolicyScreen', 'HelpCenterScreen', 'ComplaintsScreen', 'AdminTeachersScreen', 'FeeDetailScreen'];

          const isHidden = hiddenRoutes.includes(routeName);

          return {
            headerShown: !isHidden,
            tabBarStyle: isHidden ? { display: 'none' } : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProfileScreen';
          const hiddenRoutes = ['HelpCenterScreen'];
          const isHidden = hiddenRoutes.includes(routeName);

          return {
            headerShown: false,
            tabBarStyle: isHidden ? { display: 'none' } : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          };
        }}
      />
    </Tab.Navigator>
  );
};