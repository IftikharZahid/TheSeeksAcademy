import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VideoGalleryScreen } from '../Lectures/VideoGalleryScreen';
import { VideoLecturesScreen } from '../Lectures/VideoLecturesScreen';
import { LikedVideosScreen } from '../Lectures/LikedVideosScreen';

export type VideoStackParamList = {
  VideoGalleryScreen: undefined;
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
  LikedVideosScreen: undefined;
};

const Stack = createNativeStackNavigator<VideoStackParamList>();

export const VideoStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VideoGalleryScreen" component={VideoGalleryScreen} />
      <Stack.Screen name="VideoLecturesScreen" component={VideoLecturesScreen} />
      <Stack.Screen name="LikedVideosScreen" component={LikedVideosScreen} />
    </Stack.Navigator>
  );
};
