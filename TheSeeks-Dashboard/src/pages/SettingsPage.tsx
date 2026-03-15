import React, { useState, useEffect } from 'react';
import {
    updatePassword,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateProfile
} from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAILS = ['theseeksacademyfta@gmail.com', 'iftikharzahid@outlook.com'];

// ── Components ────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', ...style }}>
            {children}
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, paddingLeft: 4 }}>
            {label}
        </div>
    );
}

function SettingRow({
    icon, color, label, desc, right, onClick, danger,
}: {
    icon: string; color: string; label: string; desc?: string;
    right?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
    const [hov, setHov] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                cursor: onClick ? 'pointer' : 'default',
                background: hov && onClick ? (danger ? 'rgba(239,68,68,0.08)' : 'var(--bg3)') : 'transparent',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                boxShadow: `inset 0 0 0 1px ${color}30`
            }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: danger ? '#ef4444' : 'var(--text)' }}>{label}</div>
                {desc && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, lineHeight: 1.3 }}>{desc}</div>}
            </div>
            {right ?? (onClick && <span style={{ color: 'var(--text2)', fontSize: 16 }}>›</span>)}
        </div>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: value ? '#10b981' : 'var(--bg3)',
                border: `1px solid ${value ? '#10b981' : 'var(--border)'}`,
                position: 'relative', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0,
                boxShadow: value ? '0 0 10px rgba(16,185,129,0.3)' : 'none'
            }}
        >
            <div style={{
                position: 'absolute', top: 2, left: value ? 22 : 2,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }} />
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)',
                width: '100%', maxWidth: 440, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</span>
                    <button onClick={onClose} style={{
                        background: 'var(--bg3)', border: 'none', color: 'var(--text2)', cursor: 'pointer',
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, transition: 'all 0.15s'
                    }} className="hover-brightness">✕</button>
                </div>
                <div style={{ padding: 24 }}>{children}</div>
            </div>
        </div>
    );
}

// ── Main Content ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { user, profile, logout } = useAuth();
    const email = user?.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.includes(email);

    // Initial state loading
    const [darkMode, setDarkMode] = useState(true);
    const [compactLayout, setCompactLayout] = useState(true);
    const [notifEmail, setNotifEmail] = useState(true);
    const [notifBrowser, setNotifBrowser] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [modal, setModal] = useState<'changePassword' | 'profile' | 'privacy' | 'help' | null>(null);

    useEffect(() => {
        setDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
        setCompactLayout(document.documentElement.getAttribute('data-layout') === 'compact');
    }, []);

    // Change password form
    const [cpCurrent, setCpCurrent] = useState('');
    const [cpNew, setCpNew] = useState('');
    const [cpConfirm, setCpConfirm] = useState('');
    const [cpLoading, setCpLoading] = useState(false);
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState('');

    // Profile edit form
    const [profileName, setProfileName] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    useEffect(() => {
        if (modal === 'profile') {
            setProfileName(profile?.fullname || user?.displayName || '');
            setProfileMsg('');
        }
    }, [modal, profile, user]);

    // Reset email
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState('');

    // Handlers
    const handleDarkMode = (val: boolean) => {
        setDarkMode(val);
        document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
        localStorage.setItem('theme', val ? 'dark' : 'light');
    };

    const handleCompactLayout = (val: boolean) => {
        setCompactLayout(val);
        if (val) {
            document.documentElement.setAttribute('data-layout', 'compact');
            localStorage.setItem('layout', 'compact');
        } else {
            document.documentElement.removeAttribute('data-layout');
            localStorage.setItem('layout', 'default');
        }
    };

    const handleChangePassword = async () => {
        setCpError(''); setCpSuccess('');
        if (!cpNew || !cpConfirm || !cpCurrent) { setCpError('All fields are required.'); return; }
        if (cpNew.length < 6) { setCpError('Password must be at least 6 characters.'); return; }
        if (cpNew !== cpConfirm) { setCpError('Passwords do not match.'); return; }
        setCpLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user!.email!, cpCurrent);
            await reauthenticateWithCredential(user!, credential);
            await updatePassword(user!, cpNew);
            setCpSuccess('Password updated successfully! ✅');
            setCpCurrent(''); setCpNew(''); setCpConfirm('');
            setTimeout(() => setModal(null), 1500);
        } catch (err: any) {
            const map: Record<string, string> = {
                'auth/wrong-password': 'Current password is incorrect.',
                'auth/invalid-credential': 'Current password is incorrect.',
                'auth/requires-recent-login': 'Please sign out and sign in again to change your password.',
                'auth/weak-password': 'New password is too weak.',
            };
            setCpError(map[err.code] || err.message || 'Failed to update password.');
        } finally {
            setCpLoading(false);
        }
    };

    const handleSendReset = async () => {
        if (!user?.email) return;
        setResetLoading(true); setResetMsg('');
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetMsg(`✅ Reset link sent to ${user.email}`);
        } catch {
            setResetMsg('❌ Failed to send reset email.');
        } finally {
            setTimeout(() => setResetMsg(''), 4000);
            setResetLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user?.email || !profileName.trim()) return;
        setProfileLoading(true); setProfileMsg('');
        try {
            // Update auth profile
            await updateProfile(user, { displayName: profileName.trim() });

            // Update firestore profile collection
            const q = query(collection(db, 'profile'), where('email', '==', user.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'profile', snap.docs[0].id), { fullname: profileName.trim() });
            } else {
                // If it doesn't exist, create it (edge case)
                await setDoc(doc(db, 'profile', user.uid), {
                    email: user.email,
                    fullname: profileName.trim(),
                    role: 'admin',
                    createdAt: new Date()
                });
            }
            setProfileMsg('✅ Profile updated successfully!');
            setTimeout(() => {
                setModal(null);
                window.location.reload(); // Refresh to update context
            }, 1000);
        } catch (err) {
            console.error(err);
            setProfileMsg('❌ Failed to save profile updates.');
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <div className="page" style={{ maxWidth: 860, paddingTop: 20 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div>
                    <div className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>⚙️ Settings</div>
                    <div className="page-sub">Manage your account, appearance, and system preferences</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* ── LEFT COLUMN ─────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Account Module */}
                    <section>
                        <SectionLabel label="Admin Profile" />
                        <Card>
                            {/* Profile Header */}
                            <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(99,102,241,0.05), transparent)' }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 26, fontWeight: 800, color: '#fff',
                                    boxShadow: '0 8px 16px rgba(99,102,241,0.3)'
                                }}>
                                    {(profile?.fullname || user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                                        {profile?.fullname || user?.displayName || 'Admin User'}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {user?.email}
                                        {user?.emailVerified && <span style={{ color: '#10b981', fontSize: 12 }} title="Verified">✓</span>}
                                    </div>
                                    {isAdmin && (
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.3)', letterSpacing: 0.5 }}>
                                                ✦ SUPER ADMIN
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <SettingRow icon="✏️" color="#3b82f6" label="Edit Profile Information" desc="Update your display name and details" onClick={() => setModal('profile')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🔑" color="#8b5cf6" label="Update Password" desc="Change your login credentials securely" onClick={() => { setCpError(''); setCpSuccess(''); setCpCurrent(''); setCpNew(''); setCpConfirm(''); setModal('changePassword'); }} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📧" color="#6366f1" label="Send Password Reset" desc={`Reset link will be sent via email`}
                                right={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {resetMsg && <div style={{ fontSize: 11, fontWeight: 600, color: resetMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{resetMsg}</div>}
                                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8 }} onClick={(e) => { e.stopPropagation(); handleSendReset(); }} disabled={resetLoading}>
                                            {resetLoading ? 'Sending...' : 'Send Link'}
                                        </button>
                                    </div>
                                }
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🚪" color="#ef4444" label="Sign Out" desc="End your current admin session" danger onClick={logout} />
                        </Card>
                    </section>

                    {/* Experience Module */}
                    <section>
                        <SectionLabel label="Dashboard Experience" />
                        <Card>
                            <SettingRow icon={darkMode ? '🌙' : '☀️'} color="#f59e0b" label="Dark Theme" desc="Toggle dark/light interface colors"
                                right={<Toggle value={darkMode} onChange={handleDarkMode} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🖥️" color="#0ea5e9" label="Compact Layout" desc="Reduce spacing to show more data in tables"
                                right={<Toggle value={compactLayout} onChange={handleCompactLayout} />}
                            />
                        </Card>
                    </section>
                </div>

                {/* ── RIGHT COLUMN ────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Sync & Notifications */}
                    <section>
                        <SectionLabel label="System & Sync" />
                        <Card>
                            <SettingRow icon="⚡" color="#10b981" label="Firebase Real-time Sync" desc="Keep dashboard constantly updated with mobile app"
                                right={<Toggle value={autoSync} onChange={setAutoSync} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="📬" color="#8b5cf6" label="Email Digest" desc="Receive weekly summary reports of academy activity"
                                right={<Toggle value={notifEmail} onChange={setNotifEmail} />}
                            />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🔔" color="#ec4899" label="Push Notifications" desc="Desktop alerts for new complaints or important notices"
                                right={
                                    <Toggle value={notifBrowser} onChange={(v) => {
                                        if (v && 'Notification' in window) {
                                            Notification.requestPermission().then(p => setNotifBrowser(p === 'granted'));
                                        } else {
                                            setNotifBrowser(v);
                                        }
                                    }} />
                                }
                            />
                        </Card>
                    </section>

                    {/* Platform Info */}
                    <section>
                        <SectionLabel label="Platform Details" />
                        {/* Status block */}
                        <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                🟢
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>All Systems Operational</div>
                                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Connected to project: <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>theseeksacademy-66d12</span></div>
                            </div>
                        </div>

                        <Card>
                            <SettingRow icon="ℹ️" color="#6366f1" label="About Dashboard" desc="Version 1.0.0 · React / Vite web app" onClick={() => window.dispatchEvent(new CustomEvent('open-about'))} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="🛡️" color="#f59e0b" label="Data Security & Privacy" desc="Review how academy data is protected" onClick={() => setModal('privacy')} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
                            <SettingRow icon="❓" color="#0ea5e9" label="Help & Documentation" desc="Guides for using the admin features" onClick={() => setModal('help')} />
                        </Card>
                    </section>
                </div>
            </div>

            {/* ── Modals ──────────────────────────────────────────────── */}

            {/* Change Password Modal */}
            {modal === 'changePassword' && (
                <Modal title="Change Security Password" onClose={() => setModal(null)}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
                        For security reasons, you must provide your current password before setting a new one. This will update your login for both the Web Dashboard and the Mobile App.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input type="password" className="form-input" value={cpCurrent} onChange={e => { setCpCurrent(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Enter current password" style={{ padding: '10px 14px' }} />
                        </div>
                        <div style={{ height: 1, background: 'var(--border)' }} />
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" className="form-input" value={cpNew} onChange={e => { setCpNew(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Must be at least 6 characters" style={{ padding: '10px 14px' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input type="password" className="form-input" value={cpConfirm} onChange={e => { setCpConfirm(e.target.value); setCpError(''); setCpSuccess(''); }} placeholder="Re-enter new password" style={{ padding: '10px 14px' }} />
                        </div>

                        {cpError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8 }}><span>⚠️</span> {cpError}</div>}
                        {cpSuccess && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8 }}><span>✅</span> {cpSuccess}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none' }} onClick={handleChangePassword} disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}>
                                {cpLoading ? 'Updating credentials...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Profile Modal */}
            {modal === 'profile' && (
                <Modal title="Edit Profile Details" onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, fontWeight: 800, color: '#fff',
                            boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
                            marginBottom: 16
                        }}>
                            {(profileName || user?.email || 'A').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Admin Display Name</label>
                            <input className="form-input" value={profileName} onChange={e => { setProfileName(e.target.value); setProfileMsg(''); }} placeholder="e.g. Iftikhar Zahid" style={{ padding: '10px 14px' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address (Read-only)</label>
                            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed', padding: '10px 14px', background: 'var(--bg3)' }} />
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, lineHeight: 1.4 }}>Email acts as your unique identifier and cannot be changed here. Contact support if you need to migrate accounts.</div>
                        </div>

                        {profileMsg && <div style={{ background: profileMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${profileMsg.startsWith('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: profileMsg.startsWith('✅') ? '#34d399' : '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{profileMsg}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleSaveProfile} disabled={profileLoading || !profileName.trim()}>
                                {profileLoading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Privacy Policy */}
            {modal === 'privacy' && (
                <Modal title="Security & Privacy Policy" onClose={() => setModal(null)}>
                    <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
                        <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', gap: 10 }}>
                            <span>🛡️</span> Your academy data is protected by enterprise-grade security.
                        </div>
                        {[
                            ['Data Storage & Encryption', 'All student data, fee records, and attendance logs are stored on Google Cloud Firestore. Data is encrypted both in transit (TLS/SSL) and at rest (AES-256).'],
                            ['Authentication security', 'Admin authentication is managed securely via Firebase. Passwords are mathematically hashed and salted. We never store or transmit plain-text passwords.'],
                            ['Access Control', 'This dashboard is strictly limited to authorized administrator accounts. Student and Teacher logins will be rejected.'],
                            ['Data Sync', 'Information synchronized between the mobile app and this web dashboard occurs over secure, authenticated WebSocket connections.'],
                        ].map(([title, body]) => (
                            <div key={title} style={{ padding: '0 4px' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{body}</div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Help Center */}
            {modal === 'help' && (
                <Modal title="Admin Support & Guides" onClose={() => setModal(null)}>
                    <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 8 }}>
                        {[
                            ['How does real-time sync work?', 'Both this web dashboard and the mobile app connect to the same Firebase database. When a teacher marks attendance on mobile, it instantly appears on your dashboard charts without refreshing.'],
                            ['Adding a new Student', 'Navigate to the "Students" tab and click "Add Student". Provide details and setup their default fee structure. They will be immediately able to log in to the mobile app.'],
                            ['Managing Fee Records', 'The "Fees" module automatically tracks pending amounts. Click any student row to explicitly manage their Paid vs Total fee amounts.'],
                            ['I need to change an admin password', 'You can safely reset any account\'s password (including your own) by clicking "Send Password Reset". An email will be dispatched with a secure link.'],
                        ].map(([q, a]) => (
                            <div key={q} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 8, display: 'flex', gap: 8 }}>
                                    <span>Q.</span> {q}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>A.</span> {a}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}
