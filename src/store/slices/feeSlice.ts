import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────
export interface FeeBreakdown {
    tuition: number;
    books: number;
    labs: number;
    exam: number;
}

export interface FeePayment {
    date: string;
    amount: number;
    method: string;
}

export interface FeeDetail {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    breakdown: FeeBreakdown;
    payments: FeePayment[];
}

interface FeeState {
    details: FeeDetail | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: FeeState = {
    details: null,
    isLoading: false,
    error: null,
};

// ── Thunks ─────────────────────────────────────────────
export const fetchFeeDetails = createAsyncThunk(
    'fee/fetchDetails',
    async (uid: string, { rejectWithValue }) => {
        try {
            const docRef = doc(db, 'fees', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as FeeDetail;
            }
            return rejectWithValue('Fee details not found');
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch fee details');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const feeSlice = createSlice({
    name: 'fee',
    initialState,
    reducers: {
        clearFee(state) {
            state.details = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFeeDetails.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchFeeDetails.fulfilled, (state, action) => {
                state.details = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchFeeDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearFee } = feeSlice.actions;
export default feeSlice.reducer;
