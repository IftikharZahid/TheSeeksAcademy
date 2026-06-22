import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../api/firebaseConfig';

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
      if (!projectId) {
         console.warn('⚠️ No EAS Project ID found in app.json. Run "npx eas init" to generate one. Push notifications require an EAS Project ID.');
         // We cannot get a token without a projectId in SDK 50+
         return undefined;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push Token:', token);
    } catch (e: any) {
      console.warn('⚠️ Error getting push token:', e.message);
      console.warn('NOTE: Expo Go no longer supports Push Notifications on SDK 53+. You MUST build a Development Build (npx expo run:android) or use EAS Build to test push notifications.');
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushTokenToFirestore(uid: string, token: string) {
  try {
    // We save the token directly on the user's document
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { expoPushToken: token }, { merge: true });
    console.log('Push token saved for user:', uid);
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
  }
}
