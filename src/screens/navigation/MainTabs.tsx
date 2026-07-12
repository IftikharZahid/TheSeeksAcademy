import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { ProfileStack } from './ProfileStack';
import { VideoStack } from './VideoStack';
import { MessagesScreen } from '../Communication/MessagesScreen';
import { TopHeader } from '../../components/TopHeader';
import { LibraryScreen } from '../Academics/StudentLibraryScreen';
import { EducationalTabBar } from '../../components/CustomTabBar';

type TabParamList = {
  Home: undefined;
  VideoGallery: undefined;
  Messages: undefined;
  ELibrary: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      backBehavior="initialRoute"
      tabBar={props => <EducationalTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'Messages',
        header: () => <TopHeader />
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'HomeScreen';
          const hiddenRoutes = ['AssignmentsScreen', 'ResultsScreen', 'TimetableScreen', 'TeachersScreen', 'AttendanceScreen', 'StaffInfoScreen', 'HelpCenterScreen', 'AdminTeachersScreen', 'FeeDetailScreen', 'DiaryScreen', 'MessagesScreen', 'LibraryScreen', 'DocumentsScreen'];

          const isHidden = hiddenRoutes.includes(routeName);

          return {
            headerShown: !isHidden,
            headerTransparent: true,
            tabBarStyle: isHidden ? { display: 'none' } : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="VideoGallery"
        component={VideoStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'VideoGalleryScreen';
          const isInLectures = routeName === 'VideoLecturesScreen';
          return {
            headerShown: false,
            tabBarStyle: isInLectures ? { display: 'none' } : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="videocam" size={size} color={color} />
            ),
          };
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
        name="ELibrary"
        component={LibraryScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          return {
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          };
        }}
      />
    </Tab.Navigator>
  );
};