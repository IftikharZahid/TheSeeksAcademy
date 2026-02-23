/**
 * Script to update expired profile image URLs in Firestore
 * with permanent URLs.
 * 
 * Usage: node scripts/update-profile-image.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I",
    authDomain: "theseeksacademy-66d12.firebaseapp.com",
    projectId: "theseeksacademy-66d12",
    storageBucket: "theseeksacademy-66d12.firebasestorage.app",
    messagingSenderId: "347515655236",
    appId: "1:347515655236:android:4b126cc598f047ed91d811",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Permanent GitHub avatar URL
const PERMANENT_IMAGE_URL = 'https://avatars.githubusercontent.com/u/73811545?v=4';

async function updateProfileImage(email, newImageUrl) {
    console.log(`\n🔍 Searching for profile with email: ${email}`);

    const q = query(collection(db, 'profile'), where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log(`❌ No profile found for email: ${email}`);
        return;
    }

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        console.log(`📋 Found profile: ${data.fullname || data.name || 'Unknown'}`);
        console.log(`   Current image: ${data.image ? data.image.substring(0, 80) + '...' : '(empty)'}`);

        await updateDoc(doc(db, 'profile', docSnap.id), {
            image: newImageUrl,
        });

        console.log(`✅ Updated image to: ${newImageUrl}`);
    }
}

async function main() {
    console.log('🚀 Firestore Profile Image Updater');
    console.log('===================================\n');

    // Update IftikharXahid@gmail.com profile
    await updateProfileImage('iftikharxahid@gmail.com', PERMANENT_IMAGE_URL);

    // Also update iftikharzahid@outlook.com if it has an expired URL
    await updateProfileImage('iftikharzahid@outlook.com', PERMANENT_IMAGE_URL);

    console.log('\n✅ Done! Restart the app to see the updated images.');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
