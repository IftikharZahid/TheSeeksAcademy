import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase Config (Take from Firebase Console → Project Settings)
export const firebaseConfig = {
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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);

// Initialize Firestore
export const db = getFirestore(app);
console.log('💾 Firestore initialized');

// Initialize Auth with Native Persistence
let authTemp;
try {
  authTemp = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('🔐 Firebase Auth initialized with native persistence');
} catch (error: any) {
  if (error.code === 'auth/already-initialized') {
    authTemp = getAuth(app);
    console.log('🔐 Firebase Auth already initialized, retrieving instance');
  } else {
    throw error;
  }
}
export const auth = authTemp;

// Initialize Storage
export const storage = getStorage(app);
console.log('📦 Firebase Storage initialized');
