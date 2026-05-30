import React, { useEffect, useState, useRef } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotices, addOrUpdateNotice, removeNotice } from '../../store/slices/generalSlice';

export interface Notice {
    id: string;
    title: string;
    content: string;
    category: string;
    target: string;
    createdAt: any;
    updatedAt: any;
}

const CATEGORIES = ['General', 'Academic', 'Exam', 'Holiday', 'Event', 'Fee', 'Other'];
const TARGETS = ['All', 'Students', 'Teachers', 'Parents'];

const emptyForm = (): Partial<Notice> => ({ title: '', content: '', category: 'General', target: 'All' });

const parseRichText = (text: string) => {
    if (!text) return '';
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    let lines = escaped.split('\n');
    let formattedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
            return `<h3 style="font-size: 1.15em; font-weight: 700; margin-top: 10px; margin-bottom: 6px; color: var(--text1); list-style-type: none;">${trimmed.substring(4)}</h3>`;
        }
        if (trimmed.startsWith('## ')) {
            return `<h2 style="font-size: 1.25em; font-weight: 700; margin-top: 12px; margin-bottom: 8px; color: var(--text1); list-style-type: none;">${trimmed.substring(3)}</h2>`;
        }
        if (trimmed.startsWith('# ')) {
            return `<h1 style="font-size: 1.4em; font-weight: 800; margin-top: 14px; margin-bottom: 8px; color: var(--text1); list-style-type: none;">${trimmed.substring(2)}</h1>`;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return `<li style="margin-left: 14px; list-style-type: disc;">${trimmed.substring(2)}</li>`;
        }
        return line;
    });
    
    let html = formattedLines.join('\n');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    const tokenRegex = /(\[(.*?)\]\(((?:https?:\/\/|www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)]*)\))|((?:https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    
    const placeholders: string[] = [];
    const processedHtml = html.replace(tokenRegex, (match, mdLink, label, url, plainUrl) => {
        const linkUrl = url || plainUrl;
        const linkLabel = label || plainUrl;
        const href = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
        const placeholder = `__LINK_PLACEHOLDER_${placeholders.length}__`;
        
        placeholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline; font-weight: 600">${linkLabel}</a>`);
        return placeholder;
    });

    let finalHtml = processedHtml;
    placeholders.forEach((anchorHtml, idx) => {
        finalHtml = finalHtml.replace(`__LINK_PLACEHOLDER_${idx}__`, anchorHtml);
    });

    return finalHtml;
};

export default function NoticesPage() {
    const dispatch = useAppDispatch();
    const { notices, noticesStatus: status } = useAppSelector((s: any) => s.general);
    const loading = status === 'loading' || status === 'idle';

    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<Partial<Notice>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    
    const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormat = (type: 'bold' | 'italic' | 'heading' | 'list' | 'link') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let replacement = '';
        let newCursorPos = start;

        if (type === 'bold') {
            replacement = `**${selected || 'bold text'}**`;
            newCursorPos = selected ? end + 4 : start + 2;
        } else if (type === 'italic') {
            replacement = `*${selected || 'italic text'}*`;
            newCursorPos = selected ? end + 2 : start + 1;
        } else if (type === 'heading') {
            replacement = `\n### ${selected || 'Heading'}\n`;
            newCursorPos = selected ? end + 6 : start + 5;
        } else if (type === 'list') {
            replacement = `\n- ${selected || 'list item'}\n`;
            newCursorPos = selected ? end + 4 : start + 3;
        } else if (type === 'link') {
            const url = prompt('Enter the link URL:', 'https://');
            if (url === null) return;
            const linkText = selected || prompt('Enter link display text:', 'Click here') || 'link';
            replacement = `[${linkText}](${url})`;
            newCursorPos = start + replacement.length;
        }

        const newValue = text.substring(0, start) + replacement + text.substring(end);
        setForm(p => ({ ...p, content: newValue }));
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 50);
    };

    const CATEGORY_COLORS: Record<string, string> = {
        General: '#6366f1', Academic: '#0ea5e9', Exam: '#ef4444',
        Holiday: '#10b981', Event: '#f59e0b', Fee: '#8b5cf6', Other: '#94a3b8'
    };

    const CATEGORY_ICONS: Record<string, { iconName: string; iconColor: string; iconBgColor: string }> = {
        General:  { iconName: 'notifications',       iconColor: '#6366f1', iconBgColor: '#e0e7ff' },
        Academic: { iconName: 'school',               iconColor: '#0ea5e9', iconBgColor: '#e0f2fe' },
        Exam:     { iconName: 'document-text',        iconColor: '#ef4444', iconBgColor: '#fee2e2' },
        Holiday:  { iconName: 'calendar',             iconColor: '#10b981', iconBgColor: '#d1fae5' },
        Event:    { iconName: 'star',                 iconColor: '#f59e0b', iconBgColor: '#fef3c7' },
        Fee:      { iconName: 'card',                 iconColor: '#8b5cf6', iconBgColor: '#ede9fe' },
        Other:    { iconName: 'information-circle',   iconColor: '#94a3b8', iconBgColor: '#f1f5f9' },
    };

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchNotices());
        }
    }, [dispatch, status]);

    const filtered = notices.filter((n: Notice) =>
        !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (n: Notice) => { setEditing(n); setForm({ ...n }); setModalOpen(true); };

    const save = async () => {
        if (!form.title || !form.content) { alert('Title and Content are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const cat = form.category || 'General';
            const iconMeta = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Other'];

            const payload = {
                id,
                title: form.title,
                content: form.content,
                category: cat,
                target: form.target || 'All',
                ...(editing ? { createdAt: editing.createdAt, updatedAt: { seconds: Date.now() / 1000 } } : { createdAt: { seconds: Date.now() / 1000 }, updatedAt: null })
            } as Notice;

            // Optimistic Redux UI Update
            dispatch(addOrUpdateNotice(payload));
            setModalOpen(false);

            // Write to Firestore — include `message` (alias for content) so the mobile app
            // NotificationsSlice (which reads `message`) displays the body correctly.
            // Also write icon metadata so mobile notice cards render the right color/icon.
            await setDoc(doc(db, 'notices', id), {
                title: form.title,
                content: form.content,
                message: form.content,          // mobile app reads `message`
                category: cat,
                target: form.target || 'All',
                type: 'icon',                   // mobile Notice type
                iconName: iconMeta.iconName,
                iconColor: iconMeta.iconColor,
                iconBgColor: iconMeta.iconBgColor,
                updatedAt: serverTimestamp(),
                ...(!editing ? { createdAt: serverTimestamp() } : {}),
            }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this notice?')) return;
        setDeleting(id);
        
        // Optimistic Redux Update
        dispatch(removeNotice(id));
        
        // Background network execution
        await deleteDoc(doc(db, 'notices', id));
        setDeleting(null);
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return '';
        return new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Notice Board</div>
                    <div className="page-sub">{notices.length} notices published</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Post Notice</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="search-box" style={{ maxWidth: 300 }}>
                    <span className="search-icon">🔍</span>
                    <input placeholder="Search notices..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? <div className="loading"><div className="spinner" />Loading...</div>
                : filtered.length === 0 ? <div className="table-wrap"><div className="empty">No notices found</div></div>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {filtered.map((n: Notice) => {
                                const cColor = CATEGORY_COLORS[n.category] || '#94a3b8';
                                return (
                                    <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderLeft: `3px solid ${cColor}` }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 9, color: cColor, background: `${cColor}18`, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{n.category}</span>
                                                    <span style={{ fontSize: 9, color: 'var(--text2)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>👥 {n.target}</span>
                                                    {n.createdAt && <span style={{ fontSize: 9, color: 'var(--text2)', marginLeft: 'auto' }}>{formatDate(n.createdAt)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div 
                                            style={{ 
                                              fontSize: 12, color: 'var(--text2)', lineHeight: 1.4, flex: 1, 
                                              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                                            }}
                                            dangerouslySetInnerHTML={{ __html: parseRichText(n.content) }}
                                        />
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                                            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, height: 24 }} onClick={() => openEdit(n)}>Edit</button>
                                            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10, height: 24, color: '#ef4444', borderColor: '#ef444422', background: '#ef444410' }} disabled={deleting === n.id} onClick={() => remove(n.id)}>Delete</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Notice' : 'Post Notice'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" placeholder="Notice title..." value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input" value={form.category || 'General'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Audience</label>
                                    <select className="form-input" value={form.target || 'All'} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>
                                        {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Content *</span>
                                    <span style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.7 }}>Supports bold, italic, headings, lists & links</span>
                                </label>
                                
                                <div className="rich-editor-toolbar" style={{ display: 'flex', gap: 6, padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderBottom: 'none', borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: 'center' }}>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('bold')} title="Bold"><strong>B</strong></button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('italic')} title="Italic"><em>I</em></button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('heading')} title="Heading">H</button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('list')} title="List">• List</button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('link')} title="Insert Link">🔗 Link</button>
                                    
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--bg2)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
                                        <button type="button" className={`btn ${editorTab === 'write' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '2px 8px', fontSize: 10, height: 22, border: 'none', borderRadius: 3 }} onClick={() => setEditorTab('write')}>Write</button>
                                        <button type="button" className={`btn ${editorTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '2px 8px', fontSize: 10, height: 22, border: 'none', borderRadius: 3 }} onClick={() => setEditorTab('preview')}>Preview</button>
                                    </div>
                                </div>
                                
                                {editorTab === 'write' ? (
                                    <textarea 
                                        ref={textareaRef}
                                        className="form-input" 
                                        style={{ resize: 'vertical', minHeight: 120, borderTopLeftRadius: 0, borderTopRightRadius: 0 }} 
                                        placeholder="Write the notice content here..." 
                                        value={form.content || ''} 
                                        onChange={e => setForm(p => ({ ...p, content: e.target.value }))} 
                                    />
                                ) : (
                                    <div 
                                        className="form-input" 
                                        style={{ minHeight: 120, background: 'var(--bg2)', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflowY: 'auto', padding: '10px 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                                        dangerouslySetInnerHTML={{ __html: parseRichText(form.content || '') || '<em style="color: var(--text3)">No content preview available</em>' }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Publishing...' : 'Publish Notice'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
