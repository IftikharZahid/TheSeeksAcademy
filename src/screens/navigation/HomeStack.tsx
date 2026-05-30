import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../CoreScreens/HomeScreen';

import { ResultsScreen } from '../Academics/ResultsScreen';
import { TimetableScreen } from '../Academics/TimetableScreen';
import { AssignmentsScreen } from '../Academics/AssignmentsScreen';
import { TeachersScreen } from '../Teachers/TeachersListScreen';
import { AttendanceScreen } from '../Academics/AttendanceScreen';
import { StaffInfoScreen } from '../Teachers/TeacherDetailsScreen';
import { ComplaintsScreen } from '../AdminScreens/ComplaintsScreen';
import { AdminTeachersScreen } from '../AdminScreens/AdminTeachersScreen';
import { FeeDetailScreen } from '../Finance/FeeDetailScreen';
import { VideoLecturesScreen } from '../Lectures/VideoLecturesScreen';
import { VideoGalleryScreen } from '../Lectures/VideoGalleryScreen';
import { SearchScreen } from '../CoreScreens/SearchScreen';
import { NoticesScreen } from '../Communication/NoticeScreen';
import { AdminNoticeBoardScreen } from '../AdminScreens/AdminNoticeBoardScreen';
import { MessagesScreen } from '../Communication/MessagesScreen';
import { LikedVideosScreen } from '../Lectures/LikedVideosScreen';
import { LikedTeachersScreen } from '../Teachers/LikedTeachersScreen';

// NOTE: HelpCenterScreen, AboutScreen, PrivacyPolicyScreen, ChangePasswordScreen,
// and TeacherDashboardScreen have been moved to the root AppNavigator stack so they
// render completely fullscreen without any tab bar or TopHeader leaking through.

export type HomeStackParamList = {
  HomeScreen: undefined;
  ResultsScreen: undefined;
  TimetableScreen: undefined;
  AssignmentsScreen: undefined;
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
  ComplaintsScreen: undefined;
  AdminTeachersScreen: undefined;
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
  SearchScreen: undefined;
  NoticesScreen: undefined;
  AdminNoticeBoardScreen: undefined;
  MessagesScreen: undefined;
  LikedVideosScreen: undefined;
  LikedTeachersScreen: undefined;
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
      <Stack.Screen name="StaffInfoScreen" component={StaffInfoScreen} />
      <Stack.Screen name="ComplaintsScreen" component={ComplaintsScreen} />
      <Stack.Screen name="AdminTeachersScreen" component={AdminTeachersScreen} />
      <Stack.Screen name="FeeDetailScreen" component={FeeDetailScreen} />
      <Stack.Screen name="VideoLecturesScreen" component={VideoLecturesScreen} />
      <Stack.Screen name="VideoGalleryScreen" component={VideoGalleryScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="NoticesScreen" component={NoticesScreen} />
      <Stack.Screen name="AdminNoticeBoardScreen" component={AdminNoticeBoardScreen} />
      <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
      <Stack.Screen name="LikedVideosScreen" component={LikedVideosScreen} />
      <Stack.Screen name="LikedTeachersScreen" component={LikedTeachersScreen} />
    </Stack.Navigator>
  );
};
