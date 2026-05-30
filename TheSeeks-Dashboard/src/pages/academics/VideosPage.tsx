import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchVideos, addOrUpdateGallery, deleteGallery } from '../../store/slices/generalSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';
import { RootState } from '../../store/store';

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
    targetClass?: string;
}

export default function VideosPage() {
    const dispatch = useAppDispatch();
    const { videos: galleries, videosStatus: status } = useAppSelector((s: RootState) => s.general);
    const classes = useAppSelector((s: RootState) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: RootState) => s.appSettings.classesStatus);
    const loading = status === 'loading' || status === 'idle' || classesStatus === 'loading' || classesStatus === 'idle';

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');

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
    const [gClass, setGClass] = useState('');

    // Video Form
    const [vTitle, setVTitle] = useState('');
    const [vUrl, setVUrl] = useState('');
    const [vDur, setVDur] = useState('');
    const [vChapter, setVChapter] = useState('1');

    useEffect(() => { 
        if (status === 'idle') dispatch(fetchVideos()); 
        if (classesStatus === 'idle') dispatch(fetchClasses());
    }, [dispatch, status, classesStatus]);

    useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0]); // Default to first class instead of 'All' for better UX per requirements
        }
    }, [classes]);

    const selectedGallery = useMemo(() => galleries.find((g: Gallery) => g.id === selectedGalleryId), [galleries, selectedGalleryId]);

    const filteredGalleries = galleries.filter((g: Gallery) =>
        (selectedClass === '' || g.targetClass === selectedClass) &&
        ((g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Gallery CRUD ---
    const openAddGallery = () => {
        setEditingGallery(null);
        setGName(''); setGDesc(''); setGThumb(''); setGClass(selectedClass);
        setGalleryModalOpen(true);
    };

    const openEditGallery = (g: Gallery) => {
        setEditingGallery(g);
        setGName(g.name || ''); setGDesc(g.description || ''); setGThumb(g.thumbnail || ''); setGClass(g.targetClass || selectedClass);
        setGalleryModalOpen(true);
    };

    const saveGallery = async () => {
        if (!gName) { alert('Gallery name is required.'); return; }
        if (!gClass) { alert('Target class is required.'); return; }
        setSaving(true);
        try {
            const id = editingGallery?.id || Date.now().toString();
            const payload = {
                id,
                name: gName,
                description: gDesc || '',
                thumbnail: gThumb || '',
                videos: editingGallery ? editingGallery.videos || [] : [],
                targetClass: gClass,
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
            {/* Header */}
            <div className="page-header" style={{ padding: '16px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                <div>
                    <div className="page-title" style={{ fontSize: 18 }}>Video Galleries</div>
                    <div className="page-sub" style={{ fontSize: 13, marginTop: 2 }}>Manage subject galleries and nested videos</div>
                </div>
                <button className="btn btn-primary" onClick={openAddGallery} style={{ height: 34, padding: '0 16px', fontSize: 13 }}>
                    + Add Gallery
                </button>
            </div>

            {/* Class Tabs */}
            <div style={{ padding: '0 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, overflowX: 'auto', flexShrink: 0 }}>
                <button 
                    onClick={() => setSelectedClass('')}
                    style={{ 
                        padding: '12px 16px', background: 'transparent', border: 'none', 
                        borderBottom: selectedClass === '' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: selectedClass === '' ? 'var(--primary)' : 'var(--text2)',
                        fontWeight: selectedClass === '' ? 600 : 500, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', transition: 'all 0.2s'
                    }}
                >
                    All Classes
                </button>
                {classes.map(c => (
                    <button 
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        style={{ 
                            padding: '12px 16px', background: 'transparent', border: 'none', 
                            borderBottom: selectedClass === c ? '2px solid var(--primary)' : '2px solid transparent',
                            color: selectedClass === c ? 'var(--primary)' : 'var(--text2)',
                            fontWeight: selectedClass === c ? 600 : 500, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', transition: 'all 0.2s'
                        }}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div style={{ padding: '12px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex' }}>
                <div className="search-box" style={{ width: 300, background: 'var(--bg)', margin: 0, height: 34 }}>
                    <span className="search-icon">🔍</span>
                    <input 
                        placeholder="Search galleries..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ fontSize: 13, background: 'transparent' }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {filteredGalleries.length === 0 ? (
                        <div className="table-wrap"><div className="empty" style={{ padding: 40, fontSize: 14 }}>No galleries found.</div></div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>#</th>
                                        <th style={{ width: 60 }}>Cover</th>
                                        <th>Gallery Info</th>
                                        <th style={{ width: 100 }}>Videos</th>
                                        <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGalleries.map((g: Gallery, i: number) => (
                                        <tr key={g.id} onClick={() => openVideosList(g)} style={{ cursor: 'pointer' }}>
                                            <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{i + 1}</td>
                                            <td>
                                                {g.thumbnail ? (
                                                    <img src={g.thumbnail} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                                                ) : (
                                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v12H4z" opacity="0.2"/><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM10 9l6 3-6 3V9z"/></svg>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                                                    {g.name}
                                                    {g.targetClass && selectedClass === '' && (
                                                        <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text2)' }}>
                                                            {g.targetClass}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {g.description || '--'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="badge badge-info" style={{ fontSize: 11, padding: '2px 8px' }}>
                                                    {g.videos?.length || 0} videos
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                    <button className="btn btn-ghost" style={{ padding: 4, width: 28, height: 28, minHeight: 0, color: 'var(--text2)' }} onClick={e => { e.stopPropagation(); openEditGallery(g); }}>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ padding: 4, width: 28, height: 28, minHeight: 0, color: '#ef4444' }} onClick={e => { e.stopPropagation(); removeGallery(g.id); }}>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Gallery Modal */}
            {galleryModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGalleryModalOpen(false)}>
                    <div className="modal" style={{ width: 420, borderRadius: 12, overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="modal-title" style={{ fontSize: 16, fontWeight: 600 }}>{editingGallery ? 'Edit Gallery' : 'New Gallery'}</div>
                            <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setGalleryModalOpen(false)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 24, background: 'var(--bg)' }}>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Target Class *</label>
                                <select className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} value={gClass} onChange={e => setGClass(e.target.value)}>
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Gallery Name *</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="e.g. Mathematics Lectures" value={gName} onChange={e => setGName(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Description</label>
                                <textarea className="form-input" style={{ resize: 'vertical', minHeight: 80, fontSize: 14, borderRadius: 8, padding: '12px' }} placeholder="Brief description..." value={gDesc} onChange={e => setGDesc(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Thumbnail URL</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="https://..." value={gThumb} onChange={e => setGThumb(e.target.value)} />
                                {gThumb && <img src={gThumb} alt="preview" style={{ marginTop: 12, borderRadius: 8, width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--border)' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-ghost" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} onClick={() => setGalleryModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} disabled={saving} onClick={saveGallery}>{saving ? 'Saving...' : 'Save Gallery'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Videos List within Gallery Modal */}
            {videosListOpen && selectedGallery && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideosListOpen(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal" style={{ width: 700, maxWidth: '95%', height: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', padding: 0, borderRadius: 12 }}>
                        
                        {/* Header */}
                        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v12H4z" opacity="0.2"/><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM10 9l6 3-6 3V9z"/></svg>
                                </div>
                                <div>
                                    <div className="modal-title" style={{ fontSize: 16, margin: 0 }}>{selectedGallery.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{selectedGallery.videos?.length || 0} Videos Total</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button className="btn btn-primary" style={{ height: 36, padding: '0 16px', fontSize: 13, borderRadius: 8, fontWeight: 500 }} onClick={openAddVideo}>+ Add Video</button>
                                <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setVideosListOpen(false)}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Videos Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                             {(!selectedGallery.videos || selectedGallery.videos.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 16 }}>No videos yet</h3>
                                    <p style={{ margin: '0 0 20px', color: 'var(--text2)', fontSize: 13 }}>Click the button above to add the first video.</p>
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
                                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                                                  Chapter {ch}
                                                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 12 }}></div>
                                              </div>
                                              <div className="table-wrap" style={{ margin: 0 }}>
                                                  <table className="table" style={{ margin: 0 }}>
                                                      <tbody>
                                                          {grouped[ch].map((v, idx) => (
                                                              <tr key={v.id}>
                                                                  <td style={{ width: 40, color: 'var(--text2)', fontWeight: 500, textAlign: 'center' }}>{idx + 1}</td>
                                                                  <td style={{ width: 40 }}>
                                                                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                      </div>
                                                                  </td>
                                                                  <td>
                                                                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{v.title}</div>
                                                                  </td>
                                                                  <td style={{ width: 80, fontSize: 12, color: 'var(--text2)' }}>
                                                                      {v.duration || '--:--'}
                                                                  </td>
                                                                  <td style={{ width: 80, textAlign: 'right' }}>
                                                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                                          <button className="btn btn-ghost" style={{ padding: 4, width: 26, height: 26, minHeight: 0, color: 'var(--text2)' }} onClick={() => openEditVideo(v)}>
                                                                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                                          </button>
                                                                          <button className="btn btn-ghost" style={{ padding: 4, width: 26, height: 26, minHeight: 0, color: '#ef4444' }} onClick={() => removeVideo(v.id)}>
                                                                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                          </button>
                                                                      </div>
                                                                  </td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </div>
                                      ));
                                  })()
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Video Modal */}
            {videoModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideoModalOpen(false)} style={{ zIndex: 300 }}>
                    <div className="modal" style={{ width: 460, borderRadius: 12, overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="modal-title" style={{ fontSize: 16, fontWeight: 600 }}>{editingVideo ? 'Edit Video' : 'Add Video'}</div>
                            <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setVideoModalOpen(false)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 24, background: 'var(--bg)' }}>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Video Title *</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="e.g. Lecture 1: Basics" value={vTitle} onChange={e => setVTitle(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>YouTube URL *</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="https://youtube.com/watch?v=..." value={vUrl} onChange={e => setVUrl(e.target.value)} />
                            </div>
                            <div className="form-row" style={{ marginBottom: 0, display: 'flex', gap: 16 }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Duration (opt)</label>
                                    <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="e.g. 15:30" value={vDur} onChange={e => setVDur(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Chapter No.</label>
                                    <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} type="number" min="1" placeholder="1" value={vChapter} onChange={e => setVChapter(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-ghost" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} onClick={() => setVideoModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} disabled={saving} onClick={saveVideo}>{saving ? 'Saving...' : 'Save Video'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
