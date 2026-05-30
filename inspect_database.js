const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, getDocs, updateDoc, collection } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    authDomain: 'theseeksacademy-66d12.firebaseapp.com',
    projectId: 'theseeksacademy-66d12',
    storageBucket: 'theseeksacademy-66d12.firebasestorage.app',
    messagingSenderId: '347515655236',
    appId: '1:347515655236:android:4b126cc598f047ed91d811',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Connecting to Firestore and fetching collections...");
    try {
        const studentsSnap = await getDocs(collection(db, 'students'));
        console.log(`Found ${studentsSnap.size} students in 'students' collection.`);
        
        const feesSnap = await getDocs(collection(db, 'fees'));
        console.log(`Found ${feesSnap.size} records in 'fees' collection.`);

        console.log("\n=== ALL FEE RECORDS IN DATABASE ===");
        feesSnap.forEach(d => {
            console.log(`Doc ID: ${d.id}`);
            console.log(JSON.stringify(d.data(), null, 2));
            console.log("-----------------------------------------");
        });

        console.log("\n=== SEARCHING FOR NAME CONTAINS 'adan' OR ROLL CONTAINS '123' ===");
        studentsSnap.forEach(d => {
            const data = d.data();
            const roll = String(data.rollno || data.studentId || "");
            const name = String(data.name || data.fullname || "");
            const grade = String(data.grade || data.class || "");
            if (name.toLowerCase().includes("adan") || name.toLowerCase().includes("ijaz") || roll.toLowerCase().includes("123") || roll.toLowerCase().includes("std-123")) {
                console.log(`Match: Doc ID: ${d.id}, Name: ${name}, Roll: ${roll}, Class: ${grade}, Email: ${data.email}`);
            }
        });

    } catch (err) {
        console.error("Error running script:", err);
    }
    process.exit(0);
}

run();
