import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { auth, db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, or } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

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
            // 1️⃣ Primary: direct read from 'studentsprofile/{uid}'
            try {
                const spDocRef = doc(db, 'studentsprofile', uid);
                const spSnap = await getDoc(spDocRef);
                if (spSnap.exists()) {
                    const data = spSnap.data() as UserProfile;
                    console.log('👤 Student profile fetched from studentsprofile/', uid, '- name:', data.fullname);
                    return data;
                }
            } catch (spError) {
                console.warn('⚠️ Could not read studentsprofile/', uid, spError);
            }

            // 1b️⃣ Direct read from 'profile/{uid}' — used for teacher/admin profiles
            try {
                const pDocRef = doc(db, 'profile', uid);
                const pSnap = await getDoc(pDocRef);
                if (pSnap.exists()) {
                    const data = pSnap.data() as UserProfile;
                    console.log('👤 Profile fetched from profile/', uid, '- name:', data.fullname, '| role:', data.role);
                    return data;
                }
            } catch (pUidError) {
                console.warn('⚠️ Could not read profile/', uid, pUidError);
            }

            // 2️⃣ Fallback: query 'profile' collection by email
            if (email) {
                try {
                    const q = query(collection(db, 'profile'), where('email', '==', email));
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const data = snapshot.docs[0].data() as UserProfile;
                        console.log('👤 Profile fetched - name:', data.fullname, '| image:', data.image ? 'YES' : 'EMPTY');
                        return data;
                    }
                } catch (pError) {
                    console.warn('⚠️ Could not read profile by email:', pError);
                }
            }

            // 3️⃣ Fallback: query 'students' collection by email (already created students)
            // Firebase Auth always returns lowercase emails, but the students collection
            // may store them in mixed-case academy format (STD-9002@TheSeeksAcademy.edu.pk).
            // Query with both variants to handle legacy data.
            if (email) {
                try {
                    const emailLower = email.toLowerCase();
                    // Reconstruct academy mixed-case format: std-9002@theseeksacademy.edu.pk
                    // → STD-9002@TheSeeksAcademy.edu.pk
                    const emailParts = emailLower.split('@');
                    const emailMixed = emailParts.length === 2
                        ? `${emailParts[0].toUpperCase()}@TheSeeksAcademy.edu.pk`
                        : emailLower;

                    const sq = emailMixed !== emailLower
                        ? query(collection(db, 'students'), or(where('email', '==', emailLower), where('email', '==', emailMixed)))
                        : query(collection(db, 'students'), where('email', '==', emailLower));

                    const sSnapshot = await getDocs(sq);
                    if (!sSnapshot.empty) {
                        const sData = sSnapshot.docs[0].data();
                        // Map students collection fields to UserProfile format
                        const mapped: UserProfile = {
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
                        console.log('👤 Profile built from students/ - name:', mapped.fullname);
                        return mapped;
                    }
                } catch (sError) {
                    console.warn('⚠️ Could not read students by email:', sError);
                }
            }

            // 4️⃣ Fallback: try 'users/{uid}' document
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                console.log('👤 Profile fetched from users/ - name:', data.fullname);
                return data;
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
export const initAuthListener = (dispatch: ThunkDispatch<any, any, UnknownAction>) => {
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
            } else {
                // Profile not found - User was likely deleted from dashboard
                const { signOut } = require('firebase/auth');
                await signOut(auth);
                dispatch(setUser(null));
                dispatch(clearAuth());
            }
        } else {
            dispatch(setUser(null));
            dispatch(clearAuth());
        }
    });
};
