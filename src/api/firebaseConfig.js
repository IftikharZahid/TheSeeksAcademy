// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase Config (Take from Firebase Console → Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I",
  authDomain: "theseeksacademy-66d12.firebaseapp.com",
  projectId: "theseeksacademy-66d12",
  storageBucket: "theseeksacademy-66d12.appspot.com",
  messagingSenderId: "347515655236",
  appId: "1:347515655236:android:4b126cc598f047ed91d811"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
