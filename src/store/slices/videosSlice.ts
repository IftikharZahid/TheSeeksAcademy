import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../api/firebaseConfig';
import { collection, getDocs, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Dispatch } from '@reduxjs/toolkit';

// ── Types ──────────────────────────────────────────────
export interface VideoGallery {
    id: string;
    name: string;
    color: string;
    description?: string;
    thumbnail?: string;
    videos?: Video[];
    videoCount?: number;
    [key: string]: any;
}

export interface Video {
    id: string;
    title: string;
    youtubeUrl: string;
    duration?: string;
    chapterNo?: string;
}

interface VideosState {
    galleries: VideoGallery[];
    likedVideos: any[];
    likedVideoIds: string[];
    /** Map of videoId → last watched position in seconds */
    videoProgress: Record<string, number>;
    isLoading: boolean;
    favoritesLoading: boolean;
}

const initialState: VideosState = {
    galleries: [],
    likedVideos: [],
    likedVideoIds: [],
    videoProgress: {},
    isLoading: true,
    favoritesLoading: true,
};

// ── Async Thunks ───────────────────────────────────────

export const updateGalleryVideos = createAsyncThunk(
    'videos/updateGalleryVideos',
    async ({ galleryId, videos }: { galleryId: string; videos: Video[] }) => {
        const ref = doc(db, 'videoGalleries', galleryId);
        await updateDoc(ref, {
            videos,
            updatedAt: serverTimestamp(),
        });
        return { galleryId, videos };
    }
);

// ── Slice ──────────────────────────────────────────────
const videosSlice = createSlice({
    name: 'videos',
    initialState,
    reducers: {
        setGalleries(state, action: PayloadAction<VideoGallery[]>) {
            state.galleries = action.payload;
            state.isLoading = false;
        },
        setLikedVideos(state, action: PayloadAction<any[]>) {
            state.likedVideos = action.payload;
            state.favoritesLoading = false;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        toggleLikeVideo(state, action: PayloadAction<string>) {
            const id = action.payload;
            const idx = state.likedVideoIds.indexOf(id);
            if (idx >= 0) {
                state.likedVideoIds.splice(idx, 1);
            } else {
                state.likedVideoIds.push(id);
            }
        },
        setVideoProgress(state, action: PayloadAction<{ videoId: string; position: number }>) {
            state.videoProgress[action.payload.videoId] = action.payload.position;
        },
        clearVideoProgress(state, action: PayloadAction<string>) {
            delete state.videoProgress[action.payload];
        },
    },
    extraReducers: (builder) => {
        // Optimistic update
        builder.addCase(updateGalleryVideos.pending, (state, action) => {
            const { galleryId, videos } = action.meta.arg;
            const gallery = state.galleries.find((g) => g.id === galleryId);
            if (gallery) {
                gallery.videos = videos;
                gallery.videoCount = videos.length;
            }
        });
    },
});

export const { setGalleries, setLoading, toggleLikeVideo, setVideoProgress, clearVideoProgress, setLikedVideos } =
    videosSlice.actions;
export default videosSlice.reducer;

// ── Firebase Listener (call once from App.tsx) ─────────
export const initLikedVideosListener = (dispatch: Dispatch, uid: string) => {
    const q = query(
        collection(db, 'users', uid, 'favorites'),
        orderBy('likedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const videos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        dispatch(setLikedVideos(videos));
    });
};
export const initVideoGalleriesListener = (dispatch: Dispatch) => {
    return onSnapshot(
        collection(db, 'videoGalleries'),
        (snapshot) => {
            const galleries: VideoGallery[] = [];
            snapshot.forEach((d) => galleries.push({ id: d.id, ...d.data() } as VideoGallery));
            dispatch(setGalleries(galleries));
        },
        (error) => {
            console.error('Error listening to video galleries:', error);
            dispatch(setLoading(false));
        }
    );
};
