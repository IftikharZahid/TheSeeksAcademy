import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ERR: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
};

export default function LoginPage() {
    const { login, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password) { setError('Please enter your password.'); return; }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation handled automatically by AuthProvider → App.tsx ProtectedRoute
        } catch (err: any) {
            setError(ERR[err.code] || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!email.trim()) { setError('Enter your email above first.'); return; }
        setError(''); setLoading(true);
        try {
            await resetPassword(email);
            setResetSent(true);
        } catch (err: any) {
            setError(ERR[err.code] || 'Could not send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, position: 'relative', overflow: 'hidden',
        }}>
            {/* Background orbs */}
            <div style={{ position: 'absolute', top: -120, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -100, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{
                width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
            }}>
                {/* Card */}
                <div style={{
                    background: 'var(--bg2)', borderRadius: 18,
                    border: '1px solid var(--border)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                }}>
                    {/* Top gradient strip */}
                    <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' }} />

                    <div style={{ padding: '32px 32px 28px' }}>
                        {/* Logo / Brand */}
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                                <img
                                    src="./logo.png"
                                    alt="The Seeks Academy"
                                    style={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, lineHeight: 1.2 }}>The Seeks Academy</div>
                                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>Fort Abbas · Admin Portal</div>
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>Sign in with your admin credentials</div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Email */}
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📧</span>
                                    <input
                                        id="login-email"
                                        className="form-input"
                                        type="email"
                                        placeholder="Email@gmail.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoComplete="email"
                                        style={{ paddingLeft: 38, width: '100%' }}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔒</span>
                                    <input
                                        id="login-password"
                                        className="form-input"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        style={{ paddingLeft: 38, paddingRight: 40, width: '100%' }}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(p => !p)}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text2)', padding: 2 }}
                                        tabIndex={-1}
                                    >{showPass ? '👁️' : '👁️‍🗨️'}</button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 8, padding: '9px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>⚠️</span>{error}
                                </div>
                            )}

                            {/* Reset success */}
                            {resetSent && (
                                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', borderRadius: 8, padding: '9px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>✅</span> Reset link sent to {email}. Check your inbox.
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                id="login-submit"
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{
                                    width: '100%', justifyContent: 'center', height: 44,
                                    fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
                                    background: loading ? '#4b4f8c' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none', borderRadius: 10, marginTop: 2,
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                                    transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                        Signing in...
                                    </span>
                                ) : 'Sign In to Dashboard'}
                            </button>
                        </form>

                        {/* Forgot password */}
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button
                                onClick={handleReset}
                                disabled={loading}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '12px 32px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
                        Made with ❤️ by Iftikhar Zahid<br /><a href="https://zahid.codes" target="_blank" rel="noopener noreferrer"> ZahidCodes </a>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text2)' }}>
                    © {new Date().getFullYear()} The Seeks Academy, Fort Abbas. All rights reserved.
                </div>
            </div>
        </div>
    );
}
