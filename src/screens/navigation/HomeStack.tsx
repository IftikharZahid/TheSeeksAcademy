import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../CoreScreens/HomeScreen';

import { ResultsScreen } from '../Academics/ResultsScreen';
import { TimetableScreen } from '../Academics/TimetableScreen';
import { AssignmentsScreen } from '../Academics/AssignmentsScreen';
import DiaryScreen from '../Academics/DiaryScreen';
import { TeachersScreen } from '../Teachers/TeachersListScreen';
import { AttendanceScreen } from '../Academics/AttendanceScreen';
import { StaffInfoScreen } from '../Teachers/TeacherDetailsScreen';
import { FeeDetailScreen } from '../Finance/FeeDetailScreen';
import { VideoLecturesScreen } from '../Lectures/VideoLecturesScreen';
import { VideoGalleryScreen } from '../Lectures/VideoGalleryScreen';

import { MessagesScreen } from '../Communication/MessagesScreen';
import { LikedVideosScreen } from '../Lectures/LikedVideosScreen';
import { LikedTeachersScreen } from '../Teachers/LikedTeachersScreen';
import { LibraryScreen } from '../Academics/LibraryScreen';

// NOTE: HelpCenterScreen, AboutScreen, PrivacyPolicyScreen,
// and TeacherDashboardScreen have been moved to the root AppNavigator stack so they
// render completely fullscreen without any tab bar or TopHeader leaking through.

export type HomeStackParamList = {
  HomeScreen: undefined;
  ResultsScreen: undefined;
  TimetableScreen: undefined;
  AssignmentsScreen: undefined;
  DiaryScreen: undefined;
  TeachersScreen: undefined;
  AttendanceScreen: undefined;
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
  FeeDetailScreen: undefined;
  VideoLecturesScreen: {
    galleryId?: string;
    galleryName?: string;
    galleryColor?: string;
    videos?: Array<{
      id: string;
      title: string;
      youtubeUrl: string;
      duration?: string;
    }>;
  };
  VideoGalleryScreen: undefined;

  MessagesScreen: undefined;
  LikedVideosScreen: undefined;
  LikedTeachersScreen: undefined;
  LibraryScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
      <Stack.Screen name="TimetableScreen" component={TimetableScreen} />
      <Stack.Screen name="AssignmentsScreen" component={AssignmentsScreen} />
      <Stack.Screen name="DiaryScreen" component={DiaryScreen} />
      <Stack.Screen name="TeachersScreen" component={TeachersScreen} />
      <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
      <Stack.Screen name="StaffInfoScreen" component={StaffInfoScreen} />
      <Stack.Screen name="FeeDetailScreen" component={FeeDetailScreen} />
      <Stack.Screen name="VideoLecturesScreen" component={VideoLecturesScreen} />
      <Stack.Screen name="VideoGalleryScreen" component={VideoGalleryScreen} />

      <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      <Stack.Screen name="LikedVideosScreen" component={LikedVideosScreen} />
      <Stack.Screen name="LikedTeachersScreen" component={LikedTeachersScreen} />
      <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
    </Stack.Navigator>
  );
};
