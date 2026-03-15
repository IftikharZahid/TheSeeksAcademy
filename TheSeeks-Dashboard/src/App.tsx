import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import StudentsPage from './pages/StudentsPage';
import FeePage from './pages/FeePage';
import TeachersPage from './pages/TeachersPage';
import ExamsPage from './pages/ExamsPage';
import TimetablePage from './pages/TimetablePage';
import AttendancePage from './pages/AttendancePage';
import ComplaintsPage from './pages/ComplaintsPage';
import NoticesPage from './pages/NoticesPage';
import VideosPage from './pages/VideosPage';
import SettingsPage from './pages/SettingsPage';

// ── Nav items (match AdminDashboard.tsx adminActions exactly) ──────────────────
const navItems = [
    { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/teachers', label: 'Faculty', icon: '👩‍🏫' },
    { to: '/exams', label: 'Exams', icon: '🏆' },
    { to: '/timetable', label: 'Timetable', icon: '📅' },
    { to: '/attendance', label: 'Attendance', icon: '🖐️' },
    { to: '/fees', label: 'Fee Management', icon: '💰' },
    { to: '/complaints', label: 'Complaints', icon: '💬' },
    { to: '/notices', label: 'Notices', icon: '🔔' },
    { to: '/videos', label: 'Video Gallery', icon: '🎥' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
];

// ── Protected route wrapper ────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 14 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Checking session...</div>
            </div>
        );
    }
    return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: { collapsed: boolean, setCollapsed: (val: boolean) => void, mobileOpen: boolean, setMobileOpen: (val: boolean) => void }) {
    const { profile, logout } = useAuth();

    return (
        <>
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
            {/* Brand */}
            <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: collapsed ? '16px 0' : '16px 14px', height: 60, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: 'center', width: '100%' }}>
                    <img
                        src="/logo.png"
                        alt="Logo"
                        style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                    />
                    {!collapsed && (
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            <div className="brand" style={{ fontSize: 14, lineHeight: 1.1, fontWeight: 800, letterSpacing: -0.3 }}>The Seeks <span style={{ color: 'var(--primary-light,#818cf8)' }}>Academy</span></div>
                            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, marginTop: 2, letterSpacing: 0.2 }}>Fort Abbas</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {!collapsed && <div className="nav-section-label">Navigation</div>}
                {collapsed && <div style={{ height: 20 }}></div>}
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px 0' : '9px 12px' }}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="icon" style={{ margin: collapsed ? '0' : undefined }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User footer / Collapse toggle */}
            <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="nav-link"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, width: 36, height: 36, background: 'var(--bg3)', borderRadius: 10,
                        border: '1px solid var(--border)', marginBottom: 8, color: 'var(--text2)',
                        transition: 'all 0.2s', cursor: 'pointer'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--border)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--bg3)' }}
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <span style={{ fontSize: 16 }}>{collapsed ? '▶' : '◀'}</span>
                </button>

                <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'center', marginTop: 10 }}>
                    © {new Date().getFullYear()} The Seeks Academy
                </div>
            </div>
        </aside>
        {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        </>
    );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ collapsed, toggleMobile }: { collapsed: boolean, toggleMobile: () => void }) {
    const { profile } = useAuth();

    return (
        <header className="topbar" style={{ padding: '0 30px', height: 70, background: '#fff', borderBottom: 'none' }}>
            <button className="mobile-toggle-btn" onClick={toggleMobile}>
                ☰
            </button>
            
            {/* Search Bar matching screenshot */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', background: '#f4f7fe',
                    borderRadius: 30, padding: '10px 18px', width: '100%', maxWidth: 400,
                    gap: 10
                }}>
                    <span style={{ fontSize: 14, color: '#A3AED0' }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search" 
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--text)', width: '100%' }}
                    />
                </div>
            </div>

            <div className="topbar-spacer" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingLeft: 20 }}>
                {/* Message Icon */}
                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#A3AED0', position: 'relative' }}>
                    💬
                    <div style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />
                </button>

                {/* Notification Icon */}
                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#A3AED0', position: 'relative' }}>
                    🔔
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />
                </button>

                {/* Profile Avatar */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                    {(profile?.fullname || 'A').charAt(0).toUpperCase()}
                </div>
            </div>
        </header>
    );
}

// ── Global About Modal Component ──────────────────────────────────────────────
export function GlobalAboutModal() {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('open-about', handler);
        return () => window.removeEventListener('open-about', handler);
    }, []);

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            backdropFilter: 'blur(4px)'
        }} onClick={() => setOpen(false)}>
            <div style={{
                background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)',
                width: '100%', maxWidth: 400, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>About Platform</span>
                    <button onClick={() => setOpen(false)} style={{
                        background: 'var(--bg3)', border: 'none', color: 'var(--text2)', cursor: 'pointer',
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, transition: 'all 0.15s'
                    }}>✕</button>
                </div>
                <div style={{ padding: 24 }}>
                    <div style={{ textAlign: 'center', marginBottom: 24, padding: '20px', background: 'var(--bg3)', borderRadius: 16 }}>
                        <img src="/logo.png" alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }} />
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>The Seeks Academy</div>
                        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Web Admin Dashboard</div>
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        {[
                            ['Version', '1.0.0 (Latest)'],
                            ['Framework', 'React 18 + Vite'],
                            ['Database', 'Firebase Firestore (Real-time)'],
                            ['Mobile Companion', 'React Native (Expo)'],
                        ].map(([k, v], i) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg3)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{k}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
                        © {new Date().getFullYear()} The Seeks Academy, Fort Abbas.<br />All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── App Layout (protected) ────────────────────────────────────────────────────
function AppLayout() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    
    // Close mobile menu on navigation
    const location = useLocation();
    React.useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="layout" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <div className="main-content">
                <TopBar collapsed={collapsed} toggleMobile={() => setMobileOpen(prev => !prev)} />
                <GlobalAboutModal />
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/teachers" element={<TeachersPage />} />
                    <Route path="/exams" element={<ExamsPage />} />
                    <Route path="/timetable" element={<TimetablePage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/fees" element={<FeePage />} />
                    <Route path="/complaints" element={<ComplaintsPage />} />
                    <Route path="/notices" element={<NoticesPage />} />
                    <Route path="/videos" element={<VideosPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                    {/* Protected */}
                    <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

/** Redirect already-logged-in users away from /login */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? <Navigate to="/" replace /> : <>{children}</>;
}
