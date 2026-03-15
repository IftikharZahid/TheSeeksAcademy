import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchVideos, addOrUpdateGallery, deleteGallery } from '../store/slices/generalSlice';
import { RootState } from '../store/store';

export interface Video {
    id: string;
    title: string;
    youtubeUrl: string;
    duration?: string;
    chapterNo?: string;
}

export interface Gallery {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    videos: Video[];
}

export default function VideosPage() {
    const dispatch = useAppDispatch();
    const { videos: galleries, videosStatus: status } = useAppSelector((s: RootState) => s.general);
    const loading = status === 'loading' || status === 'idle';

    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);
    const [videosListOpen, setVideosListOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    // Edit states
    const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
    const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);

    const [saving, setSaving] = useState(false);

    // Gallery Form
    const [gName, setGName] = useState('');
    const [gDesc, setGDesc] = useState('');
    const [gThumb, setGThumb] = useState('');

    // Video Form
    const [vTitle, setVTitle] = useState('');
    const [vUrl, setVUrl] = useState('');
    const [vDur, setVDur] = useState('');
    const [vChapter, setVChapter] = useState('1');

    useEffect(() => { 
        if (status === 'idle') dispatch(fetchVideos()); 
    }, [dispatch, status]);

    const selectedGallery = useMemo(() => galleries.find((g: Gallery) => g.id === selectedGalleryId), [galleries, selectedGalleryId]);

    const filteredGalleries = galleries.filter((g: Gallery) =>
        (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Gallery CRUD ---
    const openAddGallery = () => {
        setEditingGallery(null);
        setGName(''); setGDesc(''); setGThumb('');
        setGalleryModalOpen(true);
    };

    const openEditGallery = (g: Gallery) => {
        setEditingGallery(g);
        setGName(g.name || ''); setGDesc(g.description || ''); setGThumb(g.thumbnail || '');
        setGalleryModalOpen(true);
    };

    const saveGallery = async () => {
        if (!gName) { alert('Gallery name is required.'); return; }
        setSaving(true);
        try {
            const id = editingGallery?.id || Date.now().toString();
            const payload = {
                id,
                name: gName,
                description: gDesc || '',
                thumbnail: gThumb || '',
                videos: editingGallery ? editingGallery.videos || [] : [],
            } as Gallery;

            dispatch(addOrUpdateGallery(payload));
            setGalleryModalOpen(false);

            await setDoc(doc(db, 'videoGalleries', id), {
                ...payload,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            alert('Failed to save gallery');
        }
        setSaving(false);
    };

    const removeGallery = async (id: string) => {
        if (!confirm('Are you sure you want to delete this gallery and all its videos?')) return;
        try {
            dispatch(deleteGallery(id));
            await deleteDoc(doc(db, 'videoGalleries', id));
        } catch (e) { alert('Failed to delete.'); }
    };

    // --- Video CRUD ---
    const openVideosList = (g: Gallery) => {
        setSelectedGalleryId(g.id);
        setVideosListOpen(true);
    };

    const openAddVideo = () => {
        setEditingVideo(null);
        setVTitle(''); setVUrl(''); setVDur('');
        
        const lastVideo = selectedGallery?.videos?.[selectedGallery.videos.length - 1];
        setVChapter(lastVideo?.chapterNo || '1');
        
        setVideoModalOpen(true);
    };

    const openEditVideo = (v: Video) => {
        setEditingVideo(v);
        setVTitle(v.title || ''); setVUrl(v.youtubeUrl || ''); setVDur(v.duration || ''); setVChapter(v.chapterNo || '1');
        setVideoModalOpen(true);
    };

    const saveVideo = async () => {
        if (!vTitle || !vUrl || !selectedGallery) { alert('Title and URL required.'); return; }

        const isDup = selectedGallery.videos?.some((v: Video) => v.youtubeUrl === vUrl && v.id !== editingVideo?.id);
        if (isDup) { alert('This video URL already exists in this gallery.'); return; }

        setSaving(true);
        try {
            const newVideo: Video = {
                id: editingVideo?.id || Date.now().toString(),
                title: vTitle,
                youtubeUrl: vUrl,
                duration: vDur || '',
                chapterNo: vChapter || '1'
            };

            let updated;
            if (editingVideo) {
                updated = (selectedGallery.videos || []).map((v: Video) => v.id === editingVideo.id ? newVideo : v);
            } else {
                updated = [...(selectedGallery.videos || []), newVideo];
            }

            dispatch(addOrUpdateGallery({ ...selectedGallery, videos: updated }));
            setVideoModalOpen(false);

            await setDoc(doc(db, 'videoGalleries', selectedGallery.id), { videos: updated }, { merge: true });
        } catch (e) {
            alert('Failed to save video');
        }
        setSaving(false);
    };

    const removeVideo = async (vId: string) => {
        if (!selectedGallery) return;
        if (!confirm('Remove this video?')) return;
        try {
            const updated = (selectedGallery.videos || []).filter((v: Video) => v.id !== vId);
            dispatch(addOrUpdateGallery({ ...selectedGallery, videos: updated }));
            await setDoc(doc(db, 'videoGalleries', selectedGallery.id), { videos: updated }, { merge: true });
        } catch (e) { alert('Failed to delete video'); }
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ padding: '24px 32px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, marginBottom: 0 }}>
                <div>
                    <div className="page-title">Video Galleries</div>
                    <div className="page-sub">Manage subject galleries and nested videos</div>
                </div>
                <button className="btn btn-primary" onClick={openAddGallery} style={{ display: 'flex', gap: 6 }}>
                    <span>➕</span> Add Gallery
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{ padding: '12px 32px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: 400, background: 'var(--bg3)', margin: 0, height: 38 }}>
                    <span className="search-icon">🔍</span>
                    <input 
                        placeholder="Search galleries..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ background: 'transparent' }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                    
                    {filteredGalleries.length === 0 ? (
                        <div className="table-wrap"><div className="empty" style={{ padding: 60 }}>No galleries found.</div></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {filteredGalleries.map((g: Gallery, i: number) => (
                                <div key={g.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', padding: 12, gap: 14, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    onClick={() => openVideosList(g)}
                                >
                                    <div style={{ width: 24, height: 24, borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                        {i + 1}
                                    </div>
                                    
                                    {g.thumbnail ? (
                                        <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                                            <img src={g.thumbnail} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                                        </div>
                                    ) : (
                                        <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                                            🎬
                                        </div>
                                    )}

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15, marginBottom: 4 }}>{g.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {g.description || 'No description'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="badge badge-info" style={{ gap: 4 }}>
                                                ▶ {g.videos?.length || 0} videos
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <button className="btn btn-ghost" style={{ padding: '6px', borderRadius: 6, minWidth: 32 }} onClick={e => { e.stopPropagation(); openEditGallery(g); }}>✏️</button>
                                        <button className="btn btn-ghost" style={{ padding: '6px', borderRadius: 6, minWidth: 32, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={e => { e.stopPropagation(); removeGallery(g.id); }}>🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Gallery Modal */}
            {galleryModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGalleryModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{editingGallery ? 'Edit Gallery' : 'New Gallery'}</div>
                            <button className="modal-close" onClick={() => setGalleryModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Gallery Name *</label>
                                <input className="form-input" placeholder="e.g. Mathematics Lectures" value={gName} onChange={e => setGName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" style={{ resize: 'vertical', minHeight: 70 }} placeholder="Brief description..." value={gDesc} onChange={e => setGDesc(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Thumbnail URL</label>
                                <input className="form-input" placeholder="https://..." value={gThumb} onChange={e => setGThumb(e.target.value)} />
                                {gThumb && <img src={gThumb} alt="preview" style={{ marginTop: 8, borderRadius: 8, width: 80, height: 80, objectFit: 'cover' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setGalleryModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={saveGallery}>{saving ? 'Saving...' : 'Save Gallery'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Videos List within Gallery Modal */}
            {videosListOpen && selectedGallery && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideosListOpen(false)} style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="modal" style={{ width: 700, maxWidth: '100%', margin: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, height: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                        
                        {/* Header */}
                        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                            <button className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, marginRight: 12, borderRadius: 18 }} onClick={() => setVideosListOpen(false)}>←</button>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{selectedGallery.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{selectedGallery.videos?.length || 0} Videos Total</div>
                            </div>
                            <button className="btn btn-primary" onClick={openAddVideo}>+ Add Video</button>
                        </div>

                        {/* Videos Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                             {(!selectedGallery.videos || selectedGallery.videos.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                                    <div style={{ fontSize: 50, marginBottom: 16 }}>🎬</div>
                                    <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>No videos yet</h3>
                                    <p style={{ margin: '0 0 20px', color: 'var(--text2)' }}>Click the button above to add the first video.</p>
                                    <button className="btn btn-primary" onClick={openAddVideo}>Add First Video</button>
                                </div>
                             ) : (
                                 (() => {
                                     // Group videos by chapter
                                     const grouped: { [key: number]: Video[] } = {};
                                     selectedGallery.videos.forEach(v => {
                                         const ch = parseInt(v.chapterNo || '1') || 1;
                                         if (!grouped[ch]) grouped[ch] = [];
                                         grouped[ch].push(v);
                                     });

                                     const sortedChapters = Object.keys(grouped).map(Number).sort((a,b) => a - b);

                                     return sortedChapters.map(ch => (
                                         <div key={ch} style={{ marginBottom: 24 }}>
                                             <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
                                                 <span style={{ color: 'var(--primary)', marginRight: 8 }}>📖</span>
                                                 <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Chapter {ch}</span>
                                                 <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 12 }}></div>
                                             </div>

                                             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                 {grouped[ch].map((v, idx) => (
                                                     <div key={v.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                                                         <div style={{ width: 26, height: 26, borderRadius: 13, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                                             {idx + 1}
                                                         </div>
                                                         
                                                         <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                             <span style={{ fontSize: 20 }}>▶️</span>
                                                         </div>

                                                         <div style={{ flex: 1 }}>
                                                             <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{v.title}</div>
                                                             {v.duration && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{v.duration} duration</div>}
                                                         </div>

                                                         <div style={{ display: 'flex', gap: 6 }}>
                                                             <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openEditVideo(v)}>Edit</button>
                                                             <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => removeVideo(v.id)}>🗑</button>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     ));
                                 })()
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Video Modal (Nested over List) */}
            {videoModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideoModalOpen(false)} style={{ zIndex: 300 }}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{editingVideo ? 'Edit Video' : 'Add Video'}</div>
                            <button className="modal-close" onClick={() => setVideoModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Video Title *</label>
                                <input className="form-input" placeholder="e.g. Lecture 1: Basics" value={vTitle} onChange={e => setVTitle(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">YouTube URL *</label>
                                <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={vUrl} onChange={e => setVUrl(e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Duration (opt)</label>
                                    <input className="form-input" placeholder="e.g. 15:30" value={vDur} onChange={e => setVDur(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Chapter No.</label>
                                    <input className="form-input" type="number" min="1" placeholder="1" value={vChapter} onChange={e => setVChapter(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setVideoModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={saveVideo}>{saving ? 'Saving...' : 'Save Video'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
