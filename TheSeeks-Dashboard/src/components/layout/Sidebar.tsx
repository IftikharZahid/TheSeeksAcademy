import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/teachers', label: 'Faculty', icon: '👩‍🏫' },
    { to: '/exams', label: 'Exams', icon: '🏆' },
    { to: '/timetable', label: 'Timetable', icon: '📅' },
    { to: '/attendance', label: 'Attendance', icon: '🖐️' },
    { to: '/fees', label: 'Fee Management', icon: '💰' },
    { to: '/complaints', label: 'Complaints', icon: '💬' },
    { to: '/chat', label: 'Academic Chat', icon: '🗨️' },
    { to: '/notices', label: 'Notices', icon: '🔔' },
    { to: '/assignments', label: 'Assignments', icon: '📓' },
    { to: '/videos', label: 'Video Gallery', icon: '🎥' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
}: {
    collapsed: boolean;
    setCollapsed: (val: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (val: boolean) => void;
}) {
    const { profile } = useAuth();

    return (
        <>
            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-logo" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: collapsed ? '16px 0' : '16px 14px',
                    height: 60, borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: 'center', width: '100%' }}>
                        <img src="./logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
                        {!collapsed && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                <div className="brand" style={{ fontSize: 14, lineHeight: 1.1, fontWeight: 800, letterSpacing: -0.3 }}>
                                    The Seeks <span style={{ color: 'rgba(255,255,255,0.7)' }}>Academy</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 2, letterSpacing: 0.2 }}>Fort Abbas</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {!collapsed && <div className="nav-section-label">Navigation</div>}
                    {collapsed && <div style={{ height: 20 }} />}
                    {navItems.map((item: any) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.exact}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : '8px 10px' }}
                            title={collapsed ? item.label : undefined}
                        >
                            <span className="icon" style={{ margin: collapsed ? '0' : undefined }}>{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer / Collapse toggle */}
                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="nav-link"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, width: 36, height: 36,
                            background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.15)', marginBottom: 8,
                            color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s', cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        <span style={{ fontSize: 16 }}>{collapsed ? '▶' : '◀'}</span>
                    </button>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10 }}>
                        © {new Date().getFullYear()} The Seeks Academy
                    </div>
                </div>
            </aside>
            {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        </>
    );
}
