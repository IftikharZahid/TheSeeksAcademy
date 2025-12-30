import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase Config (Take from Firebase Console → Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I",
  authDomain: "theseeksacademy-66d12.firebaseapp.com",
  projectId: "theseeksacademy-66d12",
  storageBucket: "theseeksacademy-66d12.firebasestorage.app",
  messagingSenderId: "347515655236",
  appId: "1:347515655236:android:4b126cc598f047ed91d811",
};

// Validate Firebase configuration
const isCensored = Object.values(firebaseConfig).some(value =>
  typeof value === 'string' && value.includes('*')
);

if (isCensored) {
  console.warn('⚠️⚠️⚠️ FIREBASE CONFIGURATION WARNING ⚠️⚠️⚠️');
  console.warn('Firebase credentials appear to be censored or missing!');
  console.warn('Please update firebaseConfig.ts with your actual Firebase credentials.');
  console.warn('Get credentials from: Firebase Console → Project Settings → General');
  console.warn('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);

// Initialize Firestore
export const db = getFirestore(app);
console.log('💾 Firestore initialized');

// Initialize Auth with Native Persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
console.log('🔐 Firebase Auth initialized with native persistence');
