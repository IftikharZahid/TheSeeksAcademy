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

// --- PUSH NOTIFICATION HELPERS ---
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

/**
 * Helper: Fetch push tokens for a set of users and send notifications
 */
async function sendPushNotifications(tokens, title, body, data = {}) {
  let messages = [];
  for (let pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }
}

// 1. Notice Trigger
exports.onNoticeCreated = functions.firestore
  .document('notices/{noticeId}')
  .onCreate(async (snap, context) => {
    const notice = snap.data();
    const db = admin.firestore();
    
    const usersSnap = await db.collection('users').get();
    const tokens = [];
    usersSnap.forEach(doc => {
      if (doc.data().expoPushToken) tokens.push(doc.data().expoPushToken);
    });

    if (tokens.length > 0) {
      await sendPushNotifications(tokens, 'New Notice: ' + notice.title, notice.message || 'Check out the new notice!');
    }
  });

// 2. Diary Trigger
exports.onDiaryCreated = functions.firestore
  .document('diaries/{diaryId}')
  .onCreate(async (snap, context) => {
    const diary = snap.data();
    const db = admin.firestore();
    
    const studentsSnap = await db.collection('students').where('grade', '==', diary.className).get();
    const studentUids = [];
    studentsSnap.forEach(doc => {
      if (doc.data().authUid) studentUids.push(doc.data().authUid);
    });

    if (studentUids.length === 0) return;

    const usersSnap = await db.collection('users').get();
    const tokens = [];
    usersSnap.forEach(doc => {
      if (doc.data().expoPushToken && studentUids.includes(doc.id)) {
        tokens.push(doc.data().expoPushToken);
      }
    });

    if (tokens.length > 0) {
      await sendPushNotifications(tokens, 'New Diary Entry', `${diary.subject}: ${diary.title}`);
    }
  });

// 3. Message Trigger
exports.onMessageCreated = functions.firestore
  .document('chatGroups/{groupId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const groupId = context.params.groupId;
    const db = admin.firestore();
    
    const GROUPS = [
      { id: 'g1', grade: '9', gender: 'boy' },
      { id: 'g2', grade: '9', gender: 'girl' },
      { id: 'g3', grade: '10', gender: 'boy' },
      { id: 'g4', grade: '10', gender: 'girl' },
      { id: 'g5', grade: '11', gender: 'boy' },
      { id: 'g6', grade: '11', gender: 'girl' },
      { id: 'g7', grade: '12', gender: 'boy' },
      { id: 'g8', grade: '12', gender: 'girl' },
    ];
    
    const group = GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const studentsSnap = await db.collection('students').get();
    const studentUids = [];
    studentsSnap.forEach(doc => {
      const data = doc.data();
      const sGrade = (data.grade || '').toLowerCase();
      const sGender = (data.gender || '').toLowerCase();
      
      const isBoy = sGender === 'male' || sGender === 'boy' || sGender === 'boys';
      const isGirl = sGender === 'female' || sGender === 'girl' || sGender === 'girls';
      
      const gradeMatch = sGrade.includes(group.grade);
      const genderMatch = (group.gender === 'boy' && isBoy) || (group.gender === 'girl' && isGirl);
      
      if (gradeMatch && genderMatch && data.authUid && data.authUid !== message.senderId) {
        studentUids.push(data.authUid);
      }
    });

    const usersSnap = await db.collection('users').get();
    const tokens = [];
    usersSnap.forEach(doc => {
      if (doc.data().expoPushToken && studentUids.includes(doc.id)) {
        tokens.push(doc.data().expoPushToken);
      }
    });

    if (tokens.length > 0) {
      await sendPushNotifications(tokens, `New message from ${message.senderName || 'Group'}`, message.text);
    }
  });

// 4. Assignment Trigger
exports.onAssignmentCreated = functions.firestore
  .document('assignments/{assignmentId}')
  .onCreate(async (snap, context) => {
    const assignment = snap.data();
    const db = admin.firestore();
    
    const studentsSnap = await db.collection('students').where('grade', '==', assignment.targetClass).get();
    const studentUids = [];
    studentsSnap.forEach(doc => {
      if (doc.data().authUid) studentUids.push(doc.data().authUid);
    });

    const usersSnap = await db.collection('users').get();
    const tokens = [];
    usersSnap.forEach(doc => {
      if (doc.data().expoPushToken && studentUids.includes(doc.id)) {
        tokens.push(doc.data().expoPushToken);
      }
    });

    if (tokens.length > 0) {
      await sendPushNotifications(tokens, 'New Assignment: ' + assignment.title, `Subject: ${assignment.subject}`);
    }
  });

// 5. Exam/Result Trigger
exports.onResultCreated = functions.firestore
  .document('exams/{examId}')
  .onCreate(async (snap, context) => {
    const exam = snap.data();
    const db = admin.firestore();
    
    if (exam.rollNo) {
      const studentsSnap = await db.collection('students').where('studentId', '==', exam.rollNo).get();
      let targetUid = null;
      if (!studentsSnap.empty) {
        targetUid = studentsSnap.docs[0].data().authUid;
      }
      
      if (targetUid) {
        const userDoc = await db.collection('users').doc(targetUid).get();
        if (userDoc.exists && userDoc.data().expoPushToken) {
          await sendPushNotifications([userDoc.data().expoPushToken], 'New Result Uploaded', `Result for ${exam.title} is available.`);
        }
      }
    }
  });
