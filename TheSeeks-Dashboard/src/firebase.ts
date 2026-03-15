import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    authDomain: 'theseeksacademy-66d12.firebaseapp.com',
    projectId: 'theseeksacademy-66d12',
    storageBucket: 'theseeksacademy-66d12.firebasestorage.app',
    messagingSenderId: '347515655236',
    appId: '1:347515655236:android:4b126cc598f047ed91d811',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
