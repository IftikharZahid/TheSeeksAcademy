import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { auth, db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, or } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ──────────────────────────────────────────────
export interface UserProfile {
    fullname: string;
    email: string;
    fathername?: string;
    phone: string;
    rollno: string;
    class: string;
    section: string;
    session: string;
    image: string;
    role?: string;
    gender?: string;
    studentId?: string;
}

// We can't store Firebase User directly (not serializable), so we extract what we need
export interface SerializableUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthState {
    user: SerializableUser | null;
    profile: UserProfile | null;
    initializing: boolean;
    profileLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    profile: null,
    initializing: true,
    profileLoading: false,
    error: null,
};

// ── Thunks ─────────────────────────────────────────────

/**
 * Fetch the user profile.
 * 1. Check `studentsprofile/{uid}` document (students created with new flow).
 * 2. Fallback: `profile` collection by email (admin/teacher or old student profiles).
 * 3. Fallback: `students` collection by email (already created students).
 * 4. Fallback: `users/{uid}` document.
 */
export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async ({ uid, email }: { uid: string; email: string | null }, { rejectWithValue }) => {
        try {
            let profileData: UserProfile | null = null;
            
            // 1️⃣ Primary: direct read from 'studentsprofile/{uid}'
            try {
                const spDocRef = doc(db, 'studentsprofile', uid);
                const spSnap = await getDoc(spDocRef);
                if (spSnap.exists()) {
                    profileData = spSnap.data() as UserProfile;
                    console.log('👤 Student profile fetched from studentsprofile/', uid, '- name:', profileData.fullname);
                }
            } catch (spError) {
                console.warn('⚠️ Could not read studentsprofile/', uid, spError);
            }

            // 1b️⃣ Direct read from 'profile/{uid}' — used for teacher/admin profiles
            if (!profileData) {
                try {
                    const pDocRef = doc(db, 'profile', uid);
                    const pSnap = await getDoc(pDocRef);
                    if (pSnap.exists()) {
                        profileData = pSnap.data() as UserProfile;
                        console.log('👤 Profile fetched from profile/', uid, '- name:', profileData.fullname, '| role:', profileData.role);
                    }
                } catch (pUidError) {
                    console.warn('⚠️ Could not read profile/', uid, pUidError);
                }
            }

            // 2️⃣ Fallback: query 'profile' collection by email
            if (!profileData && email) {
                try {
                    const q = query(collection(db, 'profile'), where('email', '==', email));
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        profileData = snapshot.docs[0].data() as UserProfile;
                        console.log('👤 Profile fetched - name:', profileData.fullname, '| image:', profileData.image ? 'YES' : 'EMPTY');
                    }
                } catch (pError) {
                    console.warn('⚠️ Could not read profile by email:', pError);
                }
            }

            // 3️⃣ Fallback: query 'students' collection by email (already created students)
            if (!profileData && email) {
                try {
                    const emailLower = email.toLowerCase();
                    const emailParts = emailLower.split('@');
                    const emailMixed = emailParts.length === 2
                        ? `${emailParts[0].toUpperCase()}@TheSeeksAcademy.edu.pk`
                        : emailLower;

                    const sq = emailMixed !== emailLower
                        ? query(collection(db, 'students'), or(where('email', '==', emailLower), where('email', '==', emailMixed)))
                        : query(collection(db, 'students'), where('email', '==', emailLower));

                    const sSnapshot = await getDocs(sq);
                    if (!sSnapshot.empty) {
                        const sDoc = sSnapshot.docs[0];
                        const sData = sDoc.data();
                        profileData = {
                            fullname: sData.name || '',
                            email: sData.email || '',
                            fathername: sData.fatherName || '',
                            phone: sData.phone || '',
                            rollno: sData.studentId || '',
                            class: sData.grade || '',
                            section: sData.section || '',
                            session: sData.session || '',
                            image: sData.profileImage || '',
                            role: 'student',
                            gender: sData.gender || '',
                        };
                        console.log('✅  Profile built from students/ - name:', profileData.fullname);
                    }
                } catch (sError) {
                    console.warn('❌  Could not read students by email:', sError);
                }
            }

            // 4️⃣ Fallback: try 'users/{uid}' document
            if (!profileData) {
                const docRef = doc(db, 'users', uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    profileData = docSnap.data() as UserProfile;
                    console.log('✅  Profile fetched from users/ - name:', profileData.fullname);
                }
            }

            if (profileData) {
                // Fetch studentId from students collection if missing
                if (!profileData.studentId || profileData.studentId === '') {
                    try {
                        const qUid = query(collection(db, 'students'), where('uid', '==', uid));
                        const snapUid = await getDocs(qUid);
                        if (!snapUid.empty) {
                            profileData.studentId = snapUid.docs[0].data().studentId || snapUid.docs[0].id;
                        } else if (email) {
                            const emailLower = email.toLowerCase();
                            const qEmail = query(collection(db, 'students'), where('email', '==', emailLower));
                            const snapEmail = await getDocs(qEmail);
                            if (!snapEmail.empty) {
                                profileData.studentId = snapEmail.docs[0].data().studentId || snapEmail.docs[0].id;
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ Could not fetch studentId from students collection', e);
                    }
                }

                try {
                    const localImage = await AsyncStorage.getItem(`profile_picture_${uid}`);
                    if (localImage) {
                        profileData.image = localImage;
                        console.log('🖼️ Applied local cache profile picture to global state');
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to load local profile picture', e);
                }
                return profileData;
            }

            return rejectWithValue('User profile not found');
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch profile');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<SerializableUser | null>) {
            state.user = action.payload;
            state.initializing = false;
        },
        clearAuth(state) {
            state.user = null;
            state.profile = null;
            state.error = null;
        },
        setInitializing(state, action: PayloadAction<boolean>) {
            state.initializing = action.payload;
        },
        setProfile(state, action: PayloadAction<UserProfile>) {
            state.profile = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.profileLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.profile = action.payload;
                state.profileLoading = false;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setUser, clearAuth, setInitializing, setProfile } = authSlice.actions;
export default authSlice.reducer;

// ── Listener Setup (call once from App.tsx) ────────────
/**
 * Initializes Firebase auth listener and dispatches to Redux.
 * Returns the unsubscribe function.
 */
export const initAuthListener = (dispatch: ThunkDispatch<any, any, UnknownAction>, getState: () => any) => {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
            const actionResult = await dispatch(fetchUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email }));
            if (fetchUserProfile.fulfilled.match(actionResult)) {
                const serializable: SerializableUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                };
                dispatch(setUser(serializable));
                // Load liked teachers so StaffInfoScreen has instant access
                const { fetchLikedTeacherIds } = require('./teachersSlice');
                dispatch(fetchLikedTeacherIds(firebaseUser.uid));

                // Register for Push Notifications and save token
                const { registerForPushNotificationsAsync, savePushTokenToFirestore } = require('../../services/PushNotificationService');
                registerForPushNotificationsAsync().then((token: string | undefined) => {
                    if (token) savePushTokenToFirestore(firebaseUser.uid, token);
                }).catch((e: any) => console.log('Push Token Error:', e));
            } else {
                // Profile fetch failed (Likely due to no internet connection)
                const state = getState();
                if (state.auth && state.auth.profile) {
                    console.log('🌐 Offline fallback: Using persisted profile for user', firebaseUser.uid);
                    // User is offline, but we have their cached profile. Keep them logged in!
                    const serializable: SerializableUser = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                    };
                    dispatch(setUser(serializable));
                } else {
                    // Profile truly not found and no offline cache - User was likely deleted from dashboard
                    const { signOut } = require('firebase/auth');
                    await signOut(auth);
                    dispatch(setUser(null));
                    dispatch(clearAuth());
                }
            }
        } else {
            dispatch(setUser(null));
            dispatch(clearAuth());
        }
    });
};
