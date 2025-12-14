const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function: Create Firebase Auth user when student document is created
 * Triggers automatically when a new student is added to Firestore
 */
exports.createStudentUser = functions.firestore
  .document('students/{studentId}')
  .onCreate(async (snap, context) => {
    const studentData = snap.data();
    const studentId = context.params.studentId;
    
    console.log(`Creating auth user for student: ${studentId}`);

    try {
      // Create Firebase Authentication user
      const userRecord = await admin.auth().createUser({
        email: studentData.email,
        password: studentData.password,
        displayName: studentData.name,
        disabled: false,
      });

      console.log('Successfully created Firebase Auth user:', userRecord.uid);

      // Set custom claims to identify user role
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'student',
        studentId: studentData.studentId,
        grade: studentData.grade,
      });

      console.log('Custom claims set for student');

      // Update student document with Firebase Auth UID
      await snap.ref.update({
        authUid: userRecord.uid,
        authCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Student document updated with authUid');

      return { success: true, uid: userRecord.uid };
    } catch (error) {
      console.error('Error creating student user:', error);
      
      // Log error to Firestore for admin visibility
      await snap.ref.update({
        authError: error.message,
        authErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError('internal', error.message);
    }
  });
