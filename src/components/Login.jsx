/**
 * src/components/Login.jsx
 *
 * Login page — supports Student (Google OAuth + email) and Visitor modes.
 */
import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginWithGoogle, loginWithEmail, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Top-level role: student | visitor
  const [role, setRole] = useState(searchParams.get('role') === 'visitor' ? 'visitor' : 'student');
  // Student sub-tab: 'google' | 'email'
  const [studentTab, setStudentTab] = useState('google');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [visitorMode, setVisitorMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVisitorLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVisitorRegister(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register({ name, email, password, role: 'visitor' });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '24px', gap: '0' }}>
      {/* Logo / Title */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '28px' }}>🎓</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Smart Campus</h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>AR Navigation</p>
      </div>

      {/* Role switcher: Student | Visitor */}
      <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: '100%', maxWidth: '340px' }}>
        {[
          { key: 'student', label: '🎓 Student', color: '#1a73e8' },
          { key: 'visitor', label: '👤 Visitor', color: '#7c3aed' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            id={`login-role-${key}`}
            onClick={() => { setRole(key); setError(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
              background: role === key ? '#fff' : 'transparent',
              fontWeight: role === key ? '700' : '400',
              cursor: 'pointer', fontSize: '13px',
              color: role === key ? color : '#666',
              boxShadow: role === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>
        {/* ── STUDENT ── */}
        {role === 'student' && (
          <>
            {/* Google | Email sub-tabs */}
            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
              {['google', 'email'].map((t) => (
                <button
                  key={t}
                  onClick={() => setStudentTab(t)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: studentTab === t ? '#fff' : 'transparent',
                    fontWeight: studentTab === t ? '600' : '400',
                    cursor: 'pointer', fontSize: '13px',
                    color: studentTab === t ? '#1a73e8' : '#666',
                    boxShadow: studentTab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'google' ? 'Google' : 'Email'}
                </button>
              ))}
            </div>

            {studentTab === 'google' ? (
              <button
                id="login-google-btn"
                onClick={loginWithGoogle}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '12px', padding: '14px 20px', borderRadius: '12px',
                  border: '1.5px solid #dadce0', background: '#fff',
                  cursor: 'pointer', fontSize: '15px', fontWeight: '500',
                  color: '#3c4043', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
              >
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>
            ) : (
              <form id="login-email-form" onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input id="login-email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input id="login-password" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                {error && <p style={{ color: '#e53935', fontSize: '13px', margin: 0, textAlign: 'center' }}>{error}</p>}
                <button id="login-submit" type="submit" disabled={loading} style={primaryBtnStyle(loading, '#1a73e8')}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '20px' }}>
              No account?{' '}
              <Link to="/register" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>Register</Link>
            </p>
          </>
        )}

        {/* ── VISITOR ── */}
        {role === 'visitor' && (
          <>
            {/* Login | Register sub-tabs */}
            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
              {['login', 'register'].map((t) => (
                <button
                  key={t}
                  id={`visitor-${t}-tab`}
                  onClick={() => { setVisitorMode(t); setError(''); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: visitorMode === t ? '#fff' : 'transparent',
                    fontWeight: visitorMode === t ? '600' : '400',
                    cursor: 'pointer', fontSize: '13px',
                    color: visitorMode === t ? '#7c3aed' : '#666',
                    boxShadow: visitorMode === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {visitorMode === 'login' ? (
              <form id="visitor-login-form" onSubmit={handleVisitorLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input id="visitor-email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input id="visitor-password" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                {error && <p style={{ color: '#e53935', fontSize: '13px', margin: 0, textAlign: 'center' }}>{error}</p>}
                <button id="visitor-login-submit" type="submit" disabled={loading} style={primaryBtnStyle(loading, '#7c3aed')}>
                  {loading ? 'Signing in…' : 'Sign in as Visitor'}
                </button>
              </form>
            ) : (
              <form id="visitor-register-form" onSubmit={handleVisitorRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input id="visitor-name" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
                <input id="visitor-reg-email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <input id="visitor-reg-password" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                {error && <p style={{ color: '#e53935', fontSize: '13px', margin: 0, textAlign: 'center' }}>{error}</p>}
                <button id="visitor-register-submit" type="submit" disabled={loading} style={primaryBtnStyle(loading, '#7c3aed')}>
                  {loading ? 'Creating account…' : 'Register as Visitor'}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '16px', lineHeight: 1.5 }}>
              Visitor accounts can browse the campus map and use AR navigation.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: '10px',
  border: '1.5px solid #e0e0e0', fontSize: '15px', outline: 'none',
  boxSizing: 'border-box', background: '#fafafa',
};

const primaryBtnStyle = (loading, color = '#1a73e8') => ({
  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
  background: loading ? '#ccc' : color, color: '#fff', fontSize: '15px',
  fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
});
