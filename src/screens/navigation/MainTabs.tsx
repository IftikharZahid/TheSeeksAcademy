import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { ProfileStack } from './ProfileStack';
import { VideoGalleryScreen } from '../Lectures/VideoGalleryScreen';
import { MessagesScreen } from '../Communication/MessagesScreen';
import { TopHeader } from '../../components/TopHeader';
import { NoticesScreen } from '../Communication/NoticeScreen';
import { EducationalTabBar } from '../../components/CustomTabBar';

type TabParamList = {
  Home: undefined;
  VideoGallery: undefined;
  Messages: undefined;
  NoticeBoard: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
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
          const hiddenRoutes = ['AssignmentsScreen', 'ResultsScreen', 'TimetableScreen', 'TeachersScreen', 'AttendanceScreen', 'StaffInfoScreen', 'ComplaintsScreen', 'AdminTeachersScreen', 'FeeDetailScreen', 'VideoLecturesScreen', 'VideoGalleryScreen', 'NoticesScreen', 'SearchScreen', 'LikedVideosScreen', 'LikedTeachersScreen', 'MessagesScreen'];

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
        name="VideoGallery"
        component={VideoGalleryScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
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
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
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