/**
 * Firebase Connection Test Utility
 * 
 * This file helps you verify your Firebase configuration is working correctly.
 * 
 * USAGE:
 * 1. Make sure your firebaseConfig.ts has real credentials (not ******)
 * 2. Run this file from a test screen or add console logs
 * 3. Check the console output
 */

import { auth, db } from '../api/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

/**
 * Test Firebase Authentication Connection
 */
export const testFirebaseAuth = () => {
  console.log('\n🧪 ===== TESTING FIREBASE AUTHENTICATION =====');
  
  try {
    const authInstance = getAuth();
    console.log('✅ Auth instance created successfully');
    console.log('📋 Auth config:', {
      currentUser: authInstance.currentUser ? 'Logged in' : 'Not logged in',
      languageCode: authInstance.languageCode,
      tenantId: authInstance.tenantId || 'default',
    });
    
    // Check if auth is properly initialized
    if (auth) {
      console.log('✅ Firebase Auth is initialized');
      return true;
    } else {
      console.error('❌ Firebase Auth is NOT initialized');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Firebase Auth test failed:', error);
    console.error('Error message:', error.message);
    return false;
  }
};

/**
 * Test Firestore Connection
 */
export const testFirestore = async () => {
  console.log('\n🧪 ===== TESTING FIRESTORE =====');
  
  try {
    const firestoreInstance = getFirestore();
    console.log('✅ Firestore instance created successfully');
    
    // Try to access a collection (this won't create it)
    const testCollection = collection(db, 'profile');
    console.log('✅ Can create collection reference');
    
    // Try to read from Firestore (tests connection)
    console.log('📥 Attempting to read from Firestore...');
    const snapshot = await getDocs(testCollection);
    console.log(`✅ Firestore connection successful! Found ${snapshot.size} documents in 'profile' collection`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Firestore test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Permission denied - Check Firestore security rules');
    }
    if (error.code === 'unavailable') {
      console.warn('⚠️ Firestore unavailable - Check internet connection or Firebase config');
    }
    
    return false;
  }
};

/**
 * Run All Firebase Tests
 */
export const runFirebaseTests = async () => {
  console.log('\n\n🔥 ===== FIREBASE CONFIGURATION TEST =====\n');
  console.log('This will test if your Firebase is properly configured.');
  console.log('Check the console output below:\n');
  
  const authTest = testFirebaseAuth();
  const firestoreTest = await testFirestore();
  
  console.log('\n\n📊 ===== TEST RESULTS =====');
  console.log(`Firebase Auth: ${authTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Firestore: ${firestoreTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (authTest && firestoreTest) {
    console.log('\n🎉 ALL TESTS PASSED! Firebase is configured correctly.');
    console.log('You can now use login and signup features.');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED!');
    console.log('Please check the errors above and:');
    console.log('1. Verify Firebase credentials in firebaseConfig.ts');
    console.log('2. Enable Email/Password authentication in Firebase Console');
    console.log('3. Create Firestore database in Firebase Console');
    console.log('4. Check internet connection');
  }
  
  console.log('\n=======================================\n\n');
  
  return authTest && firestoreTest;
};

/**
 * Quick Firebase Status Check
 */
export const getFirebaseStatus = () => {
  return {
    authInitialized: !!auth,
    dbInitialized: !!db,
    currentUser: auth?.currentUser?.email || 'Not logged in',
  };
};
