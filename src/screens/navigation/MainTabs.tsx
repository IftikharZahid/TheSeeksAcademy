import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './HomeStack';
import { CoursesScreen } from '../CoursesScreen';
import { MessagesScreen } from '../MessagesScreen';
import { ProfileScreen } from '../ProfileScreen';
import { Text } from 'react-native';
import { TopHeader } from '../../components/TopHeader';
import { NoticeboardSection } from './NoticeBoard';

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
      screenOptions={{ 
        headerShown: true,
        header: () => <TopHeader />
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: () => <Text>🏠</Text>,
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
          tabBarIcon: () => <Text>💬</Text>,
        }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticeboardSection}
        options={{
          tabBarIcon: () => <Text>📢</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};