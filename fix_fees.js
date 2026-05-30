const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, setDoc, getDocs, collection } = require('firebase/firestore');

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
    console.log("Starting fee records database correction...");
    try {
        // 1. Correct Adan Ijaz in students collection (Doc ID: STD-123)
        const studentRef = doc(db, 'students', 'STD-123');
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            console.log("Found student record in 'students' collection. Correcting name to 'Adan Ijaz'...");
            await updateDoc(studentRef, {
                name: 'Adan Ijaz',
                fullname: 'Adan Ijaz'
            });
            console.log("Student name updated successfully.");
        } else {
            console.warn("Warning: student doc STD-123 not found.");
        }

        // 2. Correct Adan Ijaz in fees collection (Doc ID: STD-123)
        const feeRef = doc(db, 'fees', 'STD-123');
        const feeSnap = await getDoc(feeRef);
        
        if (feeSnap.exists()) {
            console.log("Found fee record in 'fees' collection. Fixing record and rebuilding history...");
            
            const rebuiltHistory = [
                {
                    id: "1779944414028",
                    date: "2026-05-28T05:00:14.028Z",
                    amountPaid: 4500,
                    months: ["May"]
                },
                {
                    id: "1779948152217",
                    date: "2026-05-28T06:02:32.217Z",
                    amountPaid: 4500,
                    months: ["June"]
                }
            ];

            const updatedFeeData = {
                id: 'STD-123',
                studentId: 'STD-123',
                studentName: 'Adan Ijaz',
                totalFee: 9000,
                paidAmount: 9000,
                pendingAmount: 0,
                amount: 9000,
                status: 'Paid',
                month: 'May, June',
                months: ['May', 'June'],
                lastUpdated: new Date().toISOString(),
                datePaid: new Date().toISOString(),
                history: rebuiltHistory,
                monthlyFees: {
                    "May": { total: 4500, paid: 4500 },
                    "June": { total: 4500, paid: 4500 }
                }
            };

            await setDoc(feeRef, updatedFeeData);
            console.log("Adan Ijaz's fee record and history updated successfully.");
        } else {
            console.warn("Warning: fee record STD-123 not found.");
        }

        // 3. Scan all fee records for paidAmount/totalFee integrity and history mismatches
        console.log("\nScanning all fee documents for history/paidAmount mismatches...");
        const feesSnap = await getDocs(collection(db, 'fees'));
        
        for (const d of feesSnap.docs) {
            const data = d.data();
            const id = d.id;
            
            // Skip Adan since we just corrected it
            if (id === 'STD-123') continue;

            let needsUpdate = false;
            const updateFields = {};

            // Rule 1: paidAmount should not be greater than totalFee
            if (typeof data.paidAmount === 'number' && typeof data.totalFee === 'number' && data.paidAmount > data.totalFee) {
                console.log(`Fixing mismatch (Paid > Total) for student ${data.studentName || id}: paidAmount=${data.paidAmount} -> totalFee=${data.totalFee}`);
                updateFields.paidAmount = data.totalFee;
                updateFields.pendingAmount = 0;
                updateFields.status = 'Paid';
                needsUpdate = true;
            }

            // Rule 2: If history exists, verify that the sum of history amounts matches paidAmount
            if (Array.isArray(data.history) && data.history.length > 0 && typeof data.paidAmount === 'number') {
                const historySum = data.history.reduce((sum, h) => sum + (h.amountPaid || 0), 0);
                if (historySum !== data.paidAmount) {
                    console.log(`Fixing history mismatch for student ${data.studentName || id}: paidAmount=${data.paidAmount}, historySum=${historySum}`);
                    
                    const diff = data.paidAmount - historySum;
                    const updatedHistory = [...data.history];
                    
                    // Add a adjustment/correction entry
                    updatedHistory.push({
                        id: Date.now().toString() + "_adj",
                        date: new Date().toISOString(),
                        amountPaid: diff,
                        months: data.months || [],
                        type: 'adjustment'
                    });
                    
                    updateFields.history = updatedHistory;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await updateDoc(doc(db, 'fees', id), updateFields);
                console.log(`Updated document ${id} successfully.`);
            }
        }
        
        console.log("\nDatabase fee integrity check and corrections complete!");

    } catch (err) {
        console.error("Error executing database correction script:", err);
    }
    process.exit(0);
}

run();
