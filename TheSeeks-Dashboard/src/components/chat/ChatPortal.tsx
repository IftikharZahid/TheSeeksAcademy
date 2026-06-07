import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./ChatPortal.css";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, deleteDoc, doc,
  getDocs, writeBatch, updateDoc, getDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../../firebase";

/* ── Groups ────────────────────────────────────────────────────────────────── */
const GROUPS = [
  { id:"g1", name:"9th — Boys",   short:"9B",  grade:"9th",  gender:"Boys",  type:"boys",  members:31 },
  { id:"g2", name:"9th — Girls",  short:"9G",  grade:"9th",  gender:"Girls", type:"girls", members:28 },
  { id:"g3", name:"10th — Boys",  short:"10B", grade:"10th", gender:"Boys",  type:"boys",  members:29 },
  { id:"g4", name:"10th — Girls", short:"10G", grade:"10th", gender:"Girls", type:"girls", members:25 },
  { id:"g5", name:"1st Year — Boys",    short:"1YB", grade:"1st Year",   gender:"Boys",  type:"boys",  members:27 },
  { id:"g6", name:"1st Year — Girls",   short:"1YG", grade:"1st Year",   gender:"Girls", type:"girls", members:22 },
  { id:"g7", name:"2nd Year — Boys",    short:"2YB", grade:"2nd Year",   gender:"Boys",  type:"boys",  members:24 },
  { id:"g8", name:"2nd Year — Girls",   short:"2YG", grade:"2nd Year",   gender:"Girls", type:"girls", members:20 },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

const parseRichText = (text: string) => {
    if (!text) return '';
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    let lines = html.split('\n');
    let formattedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
            return `<h3 style="font-size: 1.1em; font-weight: 700; margin-top: 6px; margin-bottom: 4px; color: inherit; list-style-type: none;">${trimmed.substring(4)}</h3>`;
        }
        if (trimmed.startsWith('## ')) {
            return `<h2 style="font-size: 1.15em; font-weight: 700; margin-top: 8px; margin-bottom: 4px; color: inherit; list-style-type: none;">${trimmed.substring(3)}</h2>`;
        }
        if (trimmed.startsWith('# ')) {
            return `<h1 style="font-size: 1.2em; font-weight: 800; margin-top: 10px; margin-bottom: 4px; color: inherit; list-style-type: none;">${trimmed.substring(2)}</h1>`;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return `<li style="margin-left: 14px; list-style-type: disc;">${trimmed.substring(2)}</li>`;
        }
        return line;
    });
    
    html = formattedLines.join('\n');

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
        
        placeholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--primary, #3b82f6); text-decoration: underline; font-weight: 600">${linkLabel}</a>`);
        return placeholder;
    });

    let finalHtml = processedHtml;
    placeholders.forEach((anchorHtml, idx) => {
        finalHtml = finalHtml.replace(`__LINK_PLACEHOLDER_${idx}__`, anchorHtml);
    });

    return finalHtml;
};

const ROLE_COLORS: Record<string, { bg:string; col:string }> = {
  admin:   { bg:"rgba(239,68,68,0.1)",   col:"#dc2626" },
  teacher: { bg:"rgba(37,99,235,0.1)",   col:"#2563eb" },
  staff:   { bg:"rgba(139,92,246,0.1)",  col:"#7c3aed" },
  student: { bg:"rgba(16,185,129,0.1)",  col:"#059669" },
};

const EMOJI_LIST = [
  "😊","😂","❤️","👍","🎉","🔥","👋","💪","🙏","✨",
  "😍","🤔","👏","💯","🎓","📚","✅","⭐","🏆","💡",
  "😎","🥳","💐","🌟","📝","✍️","🤝","🙌","💬","📢",
];

// Quick subset for the reaction bubble pop-up
const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏", "🎉"];

/* ── SVG Icons (all 14×14) ─────────────────────────────────────────────────── */
const Ico = {
  Search: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Trash: () => (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  Users: () => (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Magnify: () => (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Close: () => (
    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  Check2: () => (
    <svg width="14" height="9" fill="none" viewBox="0 0 22 13" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round">
      <path d="M2 7l4 4L14 2"/><path d="M8 11l6-9"/>
    </svg>
  ),
  Announce: () => (
    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  ChevUp: () => (
    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  ),
  ChevDown: () => (
    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  Pin: () => (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2v8m-4-4l4 4 4-4M5 14h14M7 14v7h10v-7"/>
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════════
   TOP BAR
══════════════════════════════════════════════════════════════════════════════ */
function TopBar({ onClose, hideClose }: { onClose:()=>void; hideClose?:boolean }) {
  return (
    <header className="cp-bar">
      <div className="cp-bar-logo">S</div>
      <div>
        <div className="cp-bar-title">The Seeks Academy</div>
        <div className="cp-bar-sub">Fort Abbas · Chat Portal</div>
      </div>
      <div className="cp-bar-end">
        <div className="cp-bar-live">
          <div className="cp-live-dot"/>
          Live
        </div>
        {!hideClose && (
          <button className="cp-bar-close" onClick={onClose} title="Close">
            <Ico.Close/>
          </button>
        )}
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GROUP ROW
══════════════════════════════════════════════════════════════════════════════ */
function GroupRow({ group, isActive, peek, badge, onClick }: any) {
  return (
    <div
      className={`cp-grp${isActive ? " active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={`cp-gav cp-gav-${group.type === "girls" ? "g" : "b"}`}>
        {group.short}
      </div>
      <div className="cp-grp-body">
        <div className="cp-grp-name">{group.name}</div>
        <div className="cp-grp-peek">
          {peek || `${group.members} students`}
        </div>
      </div>
      {badge > 0 && (
        <div className="cp-grp-badge">{Math.min(badge, 99)}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TOP MENU BAR (Replacing Sidebar)
══════════════════════════════════════════════════════════════════════════════ */
function TopMenuBar({ activeGroup, messages, lastReadTimes, onSelect }: any) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--n2)',
      padding: '10px 14px',
      gap: '12px',
      overflowX: 'auto',
      borderBottom: '1px solid var(--bdrw)',
      flexShrink: 0
    }} className="hide-scrollbar">
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>
        Groups
      </div>
      {GROUPS.map(g => {
        const isActive = activeGroup?.id === g.id;
        const lastRead = lastReadTimes?.[g.id] || 0;
        const unreadCount = messages[g.id]?.filter((m: any) => m.rawTime > lastRead && !m.isMine).length || 0;
        
        return (
          <div
            key={g.id}
            onClick={() => onSelect(g)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '20px',
              background: isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
              border: isActive ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <div className={`cp-gav cp-gav-${g.type === "girls" ? "g" : "b"}`} style={{ width: 22, height: 22, fontSize: 9 }}>
              {g.short}
            </div>
            <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap' }}>
              {g.name}
            </span>
            {unreadCount > 0 && !isActive && (
              <div style={{
                background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800,
                padding: '2px 6px', borderRadius: '10px', marginLeft: 2
              }}>
                {Math.min(unreadCount, 99)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
══════════════════════════════════════════════════════════════════════════════ */
function MsgBubble({ 
  msg, 
  highlight, 
  isHovered, 
  onEdit, 
  onDelete,
  onReact,
  currentUid,
}: { 
  msg: any; 
  highlight?: string; 
  isHovered: boolean; 
  onEdit: () => void; 
  onDelete: () => void;
  onReact: (msgId: string, x: number, y: number) => void;
  currentUid: string;
}) {
  const isOut = msg.isMine;
  const rc    = ROLE_COLORS[msg.role?.toLowerCase()] || ROLE_COLORS.student;
  const label = msg.role ? msg.role[0].toUpperCase() + msg.role.slice(1) : null;
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Detect double click to open reaction picker
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top - 8;
    onReact(msg.id, x, y);
  };

  // Aggregate reactions: { emoji => {uid,name}[] }
  const reactionMap: Record<string, { uid: string; name: string }[]> = msg.reactions || {};
  const hasReactions = Object.keys(reactionMap).filter(e => reactionMap[e]?.length > 0).length > 0;

  // Local state: which pill's names tooltip is open
  const [namesTooltipEmoji, setNamesTooltipEmoji] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!namesTooltipEmoji) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node))
        setNamesTooltipEmoji(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [namesTooltipEmoji]);

  // Highlight matching text
  const renderText = (text: string) => {
    if (!text) return "";
    return (
      <div 
        className="cp-msg-rich-text" 
        dangerouslySetInnerHTML={{ __html: parseRichText(text) }} 
        style={{ wordBreak: 'break-word', lineHeight: '1.5' }}
      />
    );
  };

  return (
    <div className={`cp-msg ${isOut ? "out" : "in"}`}>
      {!isOut && (
        msg.avatar
          ? <img src={msg.avatar} className="cp-m-av-img" alt={msg.sender}/>
          : <div className="cp-m-av">{(msg.sender?.[0] || "?").toUpperCase()}</div>
      )}

      <div className="cp-m-body">
        {!isOut && (
          <div className="cp-m-hdr">
            <span className="cp-m-name">{msg.sender}</span>
            {label && (
              <span className="cp-role-tag" style={{ background:rc.bg, color:rc.col }}>
                {label}
              </span>
            )}
          </div>
        )}
        <div
          className="cp-bubble"
          ref={bubbleRef}
          style={{ position: 'relative' }}
          onDoubleClick={handleDoubleClick}
          title="Double-click to react"
        >
          {renderText(msg.text)}
          <div className="cp-m-time" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {msg.isEdited && (
              <span style={{ fontSize: '8.5px', fontStyle: 'italic', opacity: 0.6, marginRight: 2 }}>(edited)</span>
            )}
            {msg.time}
            {isOut && <Ico.Check2/>}
          </div>

          {/* Floating Actions Pill inside the chat boxy */}
          {isHovered && (
            <div
              className="cp-bubble-actions-pill"
              style={{
                position: "absolute",
                top: "-12px",
                [isOut ? "left" : "right"]: "12px",
                display: "flex",
                background: "var(--sur)",
                border: "1.5px solid var(--bdr)",
                borderRadius: "6px",
                padding: "2px",
                gap: "2px",
                zIndex: 10,
                boxShadow: "var(--s2)",
                alignItems: "center"
              }}
            >
              {/* Quick React button */}
              <button
                className="cp-bubble-act react"
                title="React to message"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = bubbleRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  onReact(msg.id, rect.left + rect.width / 2, rect.top - 8);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "13px",
                  padding: "3px 5px",
                  cursor: "pointer",
                  display: "flex",
                  borderRadius: "4px",
                  lineHeight: 1,
                }}
              >
                😊
              </button>
              {isOut && (
                <button
                  className="cp-bubble-act edit"
                  title="Edit message"
                  onClick={onEdit}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--t2)",
                    padding: "3px 6px",
                    cursor: "pointer",
                    display: "flex",
                    borderRadius: "4px"
                  }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
                  </svg>
                </button>
              )}
              <button
                className="cp-bubble-act delete"
                title="Delete message"
                onClick={onDelete}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--t2)",
                  padding: "3px 6px",
                  cursor: "pointer",
                  display: "flex",
                  borderRadius: "4px"
                }}
              >
                <Ico.Trash />
              </button>
            </div>
          )}
        </div>

        {/* Reaction pills — click to see who reacted */}
        {hasReactions && (
          <div className={`cp-reaction-row ${isOut ? 'out' : 'in'}`}>
            {Object.entries(reactionMap)
              .filter(([, users]) => users.length > 0)
              .map(([emoji, users]) => {
                const myReaction = users.some(u => u.uid === currentUid);
                const isOpen = namesTooltipEmoji === emoji;
                return (
                  <div key={emoji} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                      className={`cp-reaction-pill${myReaction ? ' active' : ''}`}
                      title={`Click to see who reacted`}
                      onClick={() => setNamesTooltipEmoji(isOpen ? null : emoji)}
                    >
                      <span className="cp-rp-emoji">{emoji}</span>
                      <span className="cp-rp-count">{users.length}</span>
                    </button>

                    {/* Names popover */}
                    {isOpen && (
                      <div
                        ref={tooltipRef}
                        className={`cp-names-popover ${isOut ? 'out' : 'in'}`}
                      >
                        <div className="cp-np-title">{emoji} Reacted</div>
                        {users.map((u, i) => (
                          <div key={u.uid} className="cp-np-row">
                            <div className="cp-np-av">{(u.name?.[0] || '?').toUpperCase()}</div>
                            <span className="cp-np-name">{u.name}</span>
                            {u.uid === currentUid && <span className="cp-np-you">you</span>}
                          </div>
                        ))}
                        <div className="cp-np-hint">Long-press or double-click to change</div>
                      </div>
                    )}
                  </div>
                );
              })}
            <button
              className="cp-reaction-pill add-btn"
              title="Add / change reaction"
              onClick={(e) => {
                e.stopPropagation();
                const rect = bubbleRef.current?.getBoundingClientRect();
                if (!rect) return;
                onReact(msg.id, rect.left + rect.width / 2, rect.top - 8);
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.5 }}>+😊</span>
            </button>
          </div>
        )}
      </div>

      {isOut && (
        msg.avatar
          ? <img src={msg.avatar} className="cp-m-av-img" alt={msg.sender}/>
          : <div className="cp-m-av">{(msg.sender?.[0] || "U").toUpperCase()}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ANNOUNCEMENT BUBBLE
══════════════════════════════════════════════════════════════════════════════ */
function AnnBubble({ msg }: { msg: any }) {
  return (
    <div className="cp-ann">
      <div className="cp-ann-box">
        <div className="cp-ann-lbl"><Ico.Announce/> Announcement</div>
        <div className="cp-ann-txt">{msg.text}</div>
        <div className="cp-ann-meta">{msg.sender} · {msg.time}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TYPING INDICATOR
══════════════════════════════════════════════════════════════════════════════ */
function Typing() {
  return (
    <div className="cp-typing">
      <div className="cp-m-av" style={{ opacity:.55 }}>…</div>
      <div className="cp-typing-bub">
        <div className="cp-t-dot"/><div className="cp-t-dot"/><div className="cp-t-dot"/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SEARCH BAR (in-chat search)
══════════════════════════════════════════════════════════════════════════════ */
function SearchBar({
  query, setQuery, matchCount, activeMatch, onPrev, onNext, onClose
}: {
  query: string;
  setQuery: (v: string) => void;
  matchCount: number;
  activeMatch: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="cp-search-bar">
      <div className="cp-search-bar-inner">
        <Ico.Search />
        <input
          ref={inputRef}
          placeholder="Search in conversation…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') onNext(); }}
        />
        {query && (
          <span className="cp-search-count">
            {matchCount > 0 ? `${activeMatch + 1} of ${matchCount}` : 'No results'}
          </span>
        )}
      </div>
      {query && matchCount > 0 && (
        <div className="cp-search-nav">
          <button onClick={onPrev} title="Previous"><Ico.ChevUp /></button>
          <button onClick={onNext} title="Next"><Ico.ChevDown /></button>
        </div>
      )}
      <button className="cp-search-close" onClick={onClose} title="Close search">
        <Ico.Close />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MEMBERS PANEL
══════════════════════════════════════════════════════════════════════════════ */
function MembersPanel({ group, messages, onClose }: { group: any; messages: any[]; onClose: () => void }) {
  // Extract unique senders from messages
  const senders = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null; role: string; count: number }>();
    messages.forEach(m => {
      if (m.isAnnouncement) return;
      const key = m.senderId || m.sender;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { name: m.sender, avatar: m.avatar, role: m.role || 'student', count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [messages]);

  const isG = group.type === "girls";

  return (
    <div className="cp-members-panel">
      <div className="cp-members-header">
        <span className="cp-members-title">Group Info</span>
        <button className="cp-members-close" onClick={onClose}><Ico.Close /></button>
      </div>

      {/* Group avatar */}
      <div className="cp-members-hero">
        <div className={`cp-members-av ${isG ? 'g' : 'b'}`}>{group.short}</div>
        <div className="cp-members-name">{group.name}</div>
        <div className="cp-members-meta">
          <span className={`cp-gender-tag ${isG ? 'g' : 'b'}`}>{isG ? '♀ Girls' : '♂ Boys'}</span>
          <span className="cp-dot" />
          <span>{group.grade}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="cp-members-stats">
        <div className="cp-members-stat">
          <div className="cp-members-stat-val">{group.members}</div>
          <div className="cp-members-stat-lbl">Members</div>
        </div>
        <div className="cp-members-stat">
          <div className="cp-members-stat-val">{messages.length}</div>
          <div className="cp-members-stat-lbl">Messages</div>
        </div>
        <div className="cp-members-stat">
          <div className="cp-members-stat-val">{senders.length}</div>
          <div className="cp-members-stat-lbl">Active</div>
        </div>
      </div>

      {/* Active participants */}
      <div className="cp-members-section-title">Active Participants</div>
      <div className="cp-members-list">
        {senders.length === 0 && (
          <div className="cp-members-empty">No messages yet</div>
        )}
        {senders.map((s, i) => {
          const rc = ROLE_COLORS[s.role] || ROLE_COLORS.student;
          return (
            <div key={i} className="cp-member-row">
              {s.avatar
                ? <img src={s.avatar} className="cp-member-av-img" alt={s.name} />
                : <div className="cp-member-av">{(s.name?.[0] || '?').toUpperCase()}</div>
              }
              <div className="cp-member-info">
                <div className="cp-member-name">{s.name}</div>
                <div className="cp-member-role" style={{ color: rc.col }}>{s.role}</div>
              </div>
              <div className="cp-member-count">{s.count} msgs</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EMOJI PICKER PANEL
══════════════════════════════════════════════════════════════════════════════ */
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="cp-emoji-panel" ref={ref}>
      <div className="cp-emoji-grid">
        {EMOJI_LIST.map(e => (
          <button key={e} className="cp-emoji-item" onClick={() => onSelect(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CONFIRM BAR (replaces window.confirm)
══════════════════════════════════════════════════════════════════════════════ */
function ConfirmBar({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="cp-confirm-bar">
      <span className="cp-confirm-msg">{message}</span>
      <div className="cp-confirm-btns">
        <button className="cp-confirm-yes" onClick={onConfirm}>Yes, Clear All</button>
        <button className="cp-confirm-no" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ANNOUNCEMENT INPUT
══════════════════════════════════════════════════════════════════════════════ */
function AnnouncementInput({ onSend, onCancel }: { onSend: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="cp-announce-input">
      <div className="cp-announce-label">
        <Ico.Announce /> Send Announcement
        <button className="cp-announce-cancel" onClick={onCancel}><Ico.Close /></button>
      </div>
      <div className="cp-announce-row">
        <input
          ref={inputRef}
          className="cp-announce-field"
          placeholder="Type your announcement…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onSend(text.trim()); setText(''); } if (e.key === 'Escape') onCancel(); }}
        />
        <button
          className="cp-announce-send"
          disabled={!text.trim()}
          onClick={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
        >
          Send <Ico.Send />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CHAT WINDOW
══════════════════════════════════════════════════════════════════════════════ */
function ChatWindow({ group, messages, onSend, loading, onDeleteMsg, onClearAll, onSendAnnouncement, onReact, currentUid }: any) {
  const [input, setInput]               = useState("");
  const [hovId, setHovId]               = useState<string|null>(null);
  const [typing, setTyping]             = useState(false);
  const [showSearch, setShowSearch]      = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [showMembers, setShowMembers]   = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);

  // Reaction overlay state
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [reactionPickerPos, setReactionPickerPos] = useState({ x: 0, y: 0 });
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const [editorTab, setEditorTab]       = useState<'write' | 'preview'>('write');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const insertFormat = (type: 'bold' | 'italic' | 'heading' | 'list' | 'link') => {
    const textarea = inpRef.current;
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
    setInput(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  useEffect(() => {
    if (!input) return;
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 1800);
    return () => clearTimeout(t);
  }, [input]);

  // Search matches
  const matchedIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .filter((m: any) => m.text?.toLowerCase().includes(q) || m.sender?.toLowerCase().includes(q))
      .map((m: any) => m.id);
  }, [searchQuery, messages]);

  // Scroll to match
  useEffect(() => {
    if (matchedIds.length > 0 && matchedIds[activeMatchIdx]) {
      const el = msgRefs.current.get(matchedIds[activeMatchIdx]);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeMatchIdx, matchedIds]);

  const send = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    onSend(t, editingMessageId || undefined);
    setInput("");
    setEditingMessageId(null);
    setEditorTab('write'); // Reset to write tab after sending
    setShowEmoji(false);
    inpRef.current?.focus();
  }, [input, onSend, editingMessageId]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactionPickerId) return;
    const handler = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setReactionPickerId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reactionPickerId]);

  const handleOpenReactionPicker = (msgId: string, x: number, y: number) => {
    setReactionPickerId(prev => prev === msgId ? null : msgId);
    setReactionPickerPos({ x, y });
  };

  const handleSearchPrev = () => {
    setActiveMatchIdx(prev => prev > 0 ? prev - 1 : matchedIds.length - 1);
  };

  const handleSearchNext = () => {
    setActiveMatchIdx(prev => prev < matchedIds.length - 1 ? prev + 1 : 0);
  };

  const isG = group.type === "girls";
  const avStyle = isG
    ? { background:"rgba(157,23,77,0.08)", color:"#f9a8d4", border:"1px solid rgba(157,23,77,0.18)" }
    : { background:"rgba(12,74,110,0.08)",  color:"#7dd3fc", border:"1px solid rgba(12,74,110,0.2)" };

  return (
    <div className="cp-pane">

      {/* Header */}
      <div className="cp-head">
        <div className="cp-head-av" style={avStyle}>{group.short}</div>
        <div className="cp-head-meta">
          <div className="cp-head-name">{group.name}</div>
          <div className="cp-head-sub">
            <span className={`cp-gender-tag ${isG ? "g" : "b"}`}>
              {isG ? "♀ Girls" : "♂ Boys"}
            </span>
            <span className="cp-dot"/>
            <span className="cp-head-sub-txt">{group.members} members</span>
            <span className="cp-dot"/>
            <span className="cp-head-sub-txt">Fort Abbas</span>
          </div>
        </div>
        <div className="cp-head-acts">
          <button
            className={`cp-act-btn${showSearch ? ' active' : ''}`}
            title="Search messages"
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); setActiveMatchIdx(0); }}
          >
            <Ico.Magnify/>
          </button>
          <button
            className={`cp-act-btn${showMembers ? ' active' : ''}`}
            title="Group info"
            onClick={() => setShowMembers(!showMembers)}
          >
            <Ico.Users/>
          </button>
          <button
            className="cp-act-btn del"
            title="Clear all messages"
            onClick={() => setShowClearConfirm(true)}
          >
            <Ico.Trash/>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <SearchBar
          query={searchQuery}
          setQuery={(v) => { setSearchQuery(v); setActiveMatchIdx(0); }}
          matchCount={matchedIds.length}
          activeMatch={activeMatchIdx}
          onPrev={handleSearchPrev}
          onNext={handleSearchNext}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        />
      )}

      {/* Clear confirmation */}
      {showClearConfirm && (
        <ConfirmBar
          message={`Clear ALL messages in "${group.name}"?`}
          onConfirm={() => { onClearAll(); setShowClearConfirm(false); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* Main content area with optional members panel */}
      <div className="cp-main-area">
        {/* Messages */}
        <div className="cp-msgs">
          <div className="cp-divider"><span>Today</span></div>

          {loading && (
            <div className="cp-state">
              <div className="cp-spin"/>
              <span>Loading messages…</span>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="cp-state">
              <span style={{ fontSize:20 }}>💬</span>
              <span style={{ fontWeight:600 }}>No messages yet</span>
              <span style={{ fontSize:10.5 }}>Be the first to start the conversation.</span>
            </div>
          )}

          {messages.map((msg: any) =>
            msg.isAnnouncement ? (
              <AnnBubble key={msg.id} msg={msg}/>
            ) : (
              <div
                key={msg.id}
                ref={(el) => { if (el) msgRefs.current.set(msg.id, el); }}
                className={matchedIds.includes(msg.id) ? (matchedIds[activeMatchIdx] === msg.id ? 'cp-msg-match active' : 'cp-msg-match') : ''}
                style={{ position:"relative" }}
                onMouseEnter={() => setHovId(msg.id)}
                onMouseLeave={() => setHovId(null)}
              >
                <MsgBubble
                  msg={msg}
                  highlight={searchQuery}
                  isHovered={hovId === msg.id}
                  currentUid={currentUid || ''}
                  onEdit={() => {
                    setInput(msg.text);
                    setEditingMessageId(msg.id);
                    setEditorTab('write');
                    setTimeout(() => inpRef.current?.focus(), 50);
                  }}
                  onDelete={() => {
                    if (window.confirm("Delete this message?")) onDeleteMsg(msg.id);
                  }}
                  onReact={(msgId, x, y) => handleOpenReactionPicker(msgId, x, y)}
                />
              </div>
            )
          )}

          {/* Floating Reaction Picker */}
          {reactionPickerId && (() => {
            const pickerMsg = messages.find((m: any) => m.id === reactionPickerId);
            return (
              <div
                ref={reactionPickerRef}
                className="cp-reaction-picker"
                style={{
                  position: 'fixed',
                  left: Math.max(12, Math.min(reactionPickerPos.x - 140, window.innerWidth - 300)),
                  top: Math.max(12, reactionPickerPos.y - 60),
                  zIndex: 9999,
                }}
              >
                <div className="cp-rp-title">React to message</div>
                <div className="cp-rp-grid">
                  {QUICK_REACTIONS.map(emoji => {
                    const myReacted = pickerMsg?.reactions?.[emoji]?.includes(currentUid);
                    return (
                      <button
                        key={emoji}
                        className={`cp-rp-btn${myReacted ? ' active' : ''}`}
                        onClick={() => {
                          onReact(reactionPickerId, emoji);
                          setReactionPickerId(null);
                        }}
                        title={myReacted ? 'Remove reaction' : 'Add reaction'}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="cp-rp-hint">Double-click any message to react · Click again to remove</div>
              </div>
            );
          })()}

          {typing && <Typing/>}
          <div ref={endRef}/>
        </div>

        {/* Members panel */}
        {showMembers && (
          <MembersPanel
            group={group}
            messages={messages}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>

      {/* Announcement input */}
      {showAnnounce && (
        <AnnouncementInput
          onSend={(text) => { onSendAnnouncement(text); setShowAnnounce(false); }}
          onCancel={() => setShowAnnounce(false)}
        />
      )}

      {/* Edit Message Banner */}
      {editingMessageId && (
        <div className="cp-edit-banner" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          background: 'var(--gd)',
          borderTop: '1px solid var(--g1)',
          borderBottom: '1px solid var(--g1)',
          fontSize: '11.5px',
          color: 'var(--g)',
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
            </svg>
            <span>Editing message...</span>
          </div>
          <button
            onClick={() => {
              setEditingMessageId(null);
              setInput('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--t2)',
              cursor: 'pointer',
              display: 'flex',
              padding: 2,
              borderRadius: 4
            }}
            title="Cancel editing"
          >
            <Ico.Close />
          </button>
        </div>
      )}

      {/* Rich Text Editor Toolbar */}
      <div className="cp-rich-toolbar">
        <button type="button" className="cp-tb-btn" onClick={() => insertFormat('bold')} title="Bold"><strong>B</strong></button>
        <button type="button" className="cp-tb-btn" onClick={() => insertFormat('italic')} title="Italic"><em>I</em></button>
        <button type="button" className="cp-tb-btn" onClick={() => insertFormat('heading')} title="Heading">H</button>
        <button type="button" className="cp-tb-btn" onClick={() => insertFormat('list')} title="List">• List</button>
        <button type="button" className="cp-tb-btn" onClick={() => insertFormat('link')} title="Insert Link">🔗 Link</button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--bg2)', padding: 2, borderRadius: 4 }}>
          <button type="button" className={`cp-tb-tab ${editorTab === 'write' ? 'active' : ''}`} style={{ background: editorTab === 'write' ? 'var(--n2)' : 'transparent', border: 'none', color: editorTab === 'write' ? '#fff' : 'var(--t2)', padding: '2px 8px', fontSize: 9.5, borderRadius: 2, cursor: 'pointer' }} onClick={() => setEditorTab('write')}>Write</button>
          <button type="button" className={`cp-tb-tab ${editorTab === 'preview' ? 'active' : ''}`} style={{ background: editorTab === 'preview' ? 'var(--n2)' : 'transparent', border: 'none', color: editorTab === 'preview' ? '#fff' : 'var(--t2)', padding: '2px 8px', fontSize: 9.5, borderRadius: 2, cursor: 'pointer' }} onClick={() => setEditorTab('preview')}>Preview</button>
        </div>
      </div>

      {/* Input */}
      <div className="cp-input" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%' }}>
          <button
            className={`cp-att-btn${showAnnounce ? ' active' : ''}`}
            title="Send announcement"
            onClick={() => setShowAnnounce(!showAnnounce)}
            style={{ marginBottom: 4 }}
          >
            📢
          </button>
          <div className="cp-inp-wrap" style={{ flex: 1, minHeight: 40, maxHeight: 120, background: 'var(--sur)' }}>
            {editorTab === 'write' ? (
              <textarea
                ref={inpRef}
                className="cp-inp"
                placeholder={`Message ${group.name}…`}
                value={input}
                onChange={e => { setInput(e.target.value); }}
                onKeyDown={onKey}
                style={{ resize: 'none', flex: 1, border: 'none', background: 'transparent', color: 'var(--t0)', padding: '8px 4px', fontSize: 13, outline: 'none', minHeight: 32, fontFamily: 'inherit' }}
              />
            ) : (
              <div
                className="cp-inp-preview"
                style={{ flex: 1, padding: '8px 4px', fontSize: 13, overflowY: 'auto', maxHeight: 100, minHeight: 32, color: 'var(--t0)', whiteSpace: 'pre-wrap', textAlign: 'left' }}
                dangerouslySetInnerHTML={{ __html: parseRichText(input) || '<em style="color: var(--t3)">Message preview...</em>' }}
              />
            )}
            <button
              className="cp-emoji-btn"
              title="Emoji"
              onClick={() => setShowEmoji(!showEmoji)}
              style={{ alignSelf: 'flex-end', marginBottom: 4 }}
            >
              😊
            </button>
          </div>
          <button
            className="cp-send"
            onClick={send}
            title="Send (Enter)"
            disabled={!input.trim()}
            style={{ alignSelf: 'flex-end', marginBottom: 4 }}
          >
            <Ico.Send/>
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <EmojiPicker
          onSelect={(emoji) => { setInput(prev => prev + emoji); inpRef.current?.focus(); }}
          onClose={() => setShowEmoji(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════════════════════════ */
function EmptyState() {
  const chips = [
    { short:"9G",  type:"girls", label:"9th Girls" },
    { short:"10B", type:"boys",  label:"10th Boys" },
    { short:"1YG", type:"girls", label:"1st Girls" },
  ];

  return (
    <div className="cp-empty">
      <div className="cp-empty-wrap">
        <div className="cp-empty-ring"/>
        <div className="cp-empty-ring r2"/>
        <div className="cp-empty-logo">S</div>
      </div>
      <h3>The Seeks Academy</h3>
      <div className="cp-empty-line"/>
      <p>Select a class group from the sidebar to start the conversation.</p>
      <div className="cp-empty-chips">
        {chips.map(c => (
          <div key={c.short} className="cp-chip">
            <span
              className="cp-chip-av"
              style={{
                background: c.type === "girls" ? "rgba(157,23,77,0.1)" : "rgba(12,74,110,0.1)",
                color:      c.type === "girls" ? "#9d174d"              : "#0c4a6e",
              }}
            >
              {c.short}
            </span>
            {c.label}
          </div>
        ))}
        <div className="cp-chip" style={{ color:"#94a3b8" }}>+5 more…</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */
export default function ChatPortal({
  onClose,
  inPage,
}: {
  onClose?: () => void;
  inPage?: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [messages, setMessages]       = useState<Record<string, any[]>>({});
  const [loading, setLoading]         = useState(false);
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored: Record<string, number> = {};
    GROUPS.forEach(g => {
      stored[g.id] = parseInt(localStorage.getItem(`chat_last_read_${g.id}`) || '0', 10);
    });
    setLastReadTimes(stored);
  }, []);

  useEffect(() => {
    if (activeGroup) {
      const now = Date.now();
      localStorage.setItem(`chat_last_read_${activeGroup.id}`, now.toString());
      setLastReadTimes(prev => ({ ...prev, [activeGroup.id]: now }));
    }
  }, [activeGroup, messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('group');
    if (gid) {
      const g = GROUPS.find(x => x.id === gid);
      if (g) setActiveGroup(g);
    }
  }, []);

  /* Firestore real-time listener */
  useEffect(() => {
    setLoading(true);
    let loadedCount = 0;

    const unsubs = GROUPS.map(g => {
      const ref = collection(db, "chatGroups", g.id, "messages");
      const q   = query(ref, orderBy("timestamp", "asc"));

      return onSnapshot(q, snap => {
        const uid = auth.currentUser?.uid;
        const fetched = snap.docs.map(d => {
          const data = d.data();
          const time = data.timestamp
            ? data.timestamp.toDate().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
            : nowTime();
          const rawTime = data.timestamp ? data.timestamp.toMillis() : Date.now();
          return {
            id:             d.id,
            rawTime,
            text:           data.text,
            sender:         data.sender,
            senderId:       data.senderId,
            avatar:         data.avatar || null,
            role:           data.role || "student",
            time,
            isMine:         data.senderId === uid,
            isAnnouncement: data.isAnnouncement || false,
            isEdited:       data.isEdited || false,
            reactions: (() => {
              // Normalize: support both old string[] and new {uid,name}[] formats
              const raw: Record<string, any[]> = data.reactions || {};
              const out: Record<string, { uid: string; name: string }[]> = {};
              Object.keys(raw).forEach(e => {
                const arr = (raw[e] || []).map((r: any) =>
                  typeof r === 'string' ? { uid: r, name: 'Unknown' } : r
                ).filter((r: any) => r.uid);
                if (arr.length > 0) out[e] = arr;
              });
              return out;
            })(),
          };
        });
        setMessages(prev => ({ ...prev, [g.id]: fetched }));
        
        loadedCount++;
        if (loadedCount >= GROUPS.length) setLoading(false);
      }, err => {
        console.error("Firestore error:", err);
      });
    });

    return () => unsubs.forEach(u => u());
  }, []);

  const handleSend = async (text: string, editingId?: string) => {
    if (!activeGroup || !auth.currentUser) return;
    try {
      if (editingId) {
        const docRef = doc(db, "chatGroups", activeGroup.id, "messages", editingId);
        await updateDoc(docRef, {
          text,
          updatedAt: serverTimestamp(),
          isEdited: true
        });
      } else {
        await addDoc(collection(db, "chatGroups", activeGroup.id, "messages"), {
          text,
          sender:         auth.currentUser.displayName || auth.currentUser.email || "Staff",
          senderId:       auth.currentUser.uid,
          avatar:         auth.currentUser.photoURL || null,
          role:           "admin",
          timestamp:      serverTimestamp(),
          isAnnouncement: false,
        });
      }
    } catch (e) { console.error("Send failed:", e); }
  };

  const handleSendAnnouncement = async (text: string) => {
    if (!activeGroup || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "chatGroups", activeGroup.id, "messages"), {
        text,
        sender:         auth.currentUser.displayName || auth.currentUser.email || "Admin",
        senderId:       auth.currentUser.uid,
        avatar:         auth.currentUser.photoURL || null,
        role:           "admin",
        timestamp:      serverTimestamp(),
        isAnnouncement: true,
      });
    } catch (e) { console.error("Announcement failed:", e); }
  };

  const handleDelete = async (msgId: string) => {
    if (!activeGroup) return;
    try {
      await deleteDoc(doc(db, "chatGroups", activeGroup.id, "messages", msgId));
    } catch (e) { console.error("Delete failed:", e); }
  };

  const handleClear = async () => {
    if (!activeGroup) return;
    try {
      const snap  = await getDocs(collection(db, "chatGroups", activeGroup.id, "messages"));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { console.error("Clear failed:", e); }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!activeGroup || !auth.currentUser) return;
    const uid  = auth.currentUser.uid;
    const name = auth.currentUser.displayName || auth.currentUser.email || 'Admin';
    try {
      const msgDocRef = doc(db, 'chatGroups', activeGroup.id, 'messages', msgId);
      const msgSnap = await getDoc(msgDocRef);
      if (!msgSnap.exists()) return;

      // Normalize: support both old string[] and new {uid,name}[] formats
      const rawReactions: Record<string, any[]> = msgSnap.data().reactions || {};
      const existing: Record<string, { uid: string; name: string }[]> = {};
      Object.keys(rawReactions).forEach(e => {
        existing[e] = (rawReactions[e] || []).map((r: any) =>
          typeof r === 'string' ? { uid: r, name: 'Unknown' } : r
        );
      });

      // Find which emoji (if any) the user already reacted with (one per user)
      const previousEmoji = Object.keys(existing).find(e =>
        existing[e].some(r => r.uid === uid)
      );

      // Build fresh reactions map
      const newReactions: Record<string, { uid: string; name: string }[]> = {};
      Object.keys(existing).forEach(e => {
        if (e === previousEmoji) {
          const filtered = existing[e].filter(r => r.uid !== uid);
          if (filtered.length > 0) newReactions[e] = filtered;
        } else {
          newReactions[e] = existing[e];
        }
      });

      if (previousEmoji !== emoji) {
        // Switch to new emoji
        newReactions[emoji] = [
          ...(newReactions[emoji] || []),
          { uid, name },
        ];
      }
      // (if previousEmoji === emoji → toggled off, already removed above)

      await updateDoc(msgDocRef, { reactions: newReactions });
    } catch (e) { console.error('Reaction failed:', e); }
  };

  const content = (
    <div className={`cp ${inPage ? 'in-page' : ''}`} style={{ height: inPage ? '100%' : '80vh', maxWidth: inPage ? 'none' : 900, margin: inPage ? 0 : 'auto', borderRadius: inPage ? 0 : undefined }}>
        {!inPage && <TopBar onClose={onClose || (() => {})} hideClose={inPage}/>}
      <div className="cp-body" style={{ flexDirection: 'column' }}>
        <TopMenuBar
          activeGroup={activeGroup}
          messages={messages}
          lastReadTimes={lastReadTimes}
          onSelect={(g: any) => setActiveGroup(g)}
        />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {activeGroup ? (
            <ChatWindow
              group={activeGroup}
              messages={messages[activeGroup.id] || []}
              onSend={handleSend}
              loading={loading}
              onDeleteMsg={handleDelete}
              onClearAll={handleClear}
              onSendAnnouncement={handleSendAnnouncement}
              onReact={handleReaction}
              currentUid={auth.currentUser?.uid || ''}
            />
          ) : (
            <EmptyState/>
          )}
        </div>
      </div>
    </div>
  );

  if (inPage) return content;

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}