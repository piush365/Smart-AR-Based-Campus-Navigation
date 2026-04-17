import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VISIT_PURPOSES = [
  'Campus Tour',
  'Attending Event',
  'Meeting Faculty',
  'Admission Enquiry',
  'Job / Internship',
  'Research Visit',
  'Other',
];

const getErrorMessage = (err) => {
  const code = err?.code || '';
  const backendMsg = err?.response?.data?.error;
  if (backendMsg) return backendMsg;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Incorrect email or password. Please try again.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
    case 'auth/too-many-requests': return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked': return 'Pop-up blocked by browser. Please allow pop-ups and try again.';
    case 'auth/operation-not-allowed': return 'This sign-in method is not enabled. Contact support.';
    default: return err?.message || 'Something went wrong. Please try again.';
  }
};

export default function Login() {
  // Added isAuthenticated here
  const { loginWithGoogle, loginWithEmail, loginAsVisitor, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [role, setRole] = useState(searchParams.get('role') === 'visitor' ? 'visitor' : 'student');
  const [studentTab, setStudentTab] = useState('google');

  // Student
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Visitor
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');

  // Automatically navigate when authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSwitch = (r) => {
    setRole(r);
    clearError();
  };

  async function handleGoogleLogin(e) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await loginWithGoogle();
      // Removed manual navigation here
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false); // Only set loading to false on error to prevent UI flashing
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    clearError();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      // Removed manual navigation here
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  async function handleVisitorEnter(e) {
    e.preventDefault();
    if (!visitorName.trim()) { setError('Please enter your name.'); return; }
    if (visitorName.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }
    if (!visitorPhone.trim()) { setError('Please enter your phone number.'); return; }
    if (!/^\d{10}$/.test(visitorPhone.trim())) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!purpose) { setError('Please select your purpose of visit.'); return; }
    clearError();
    setLoading(true);
    try {
      await loginAsVisitor({
        name: visitorName.trim(),
        phone: visitorPhone.trim(),
        purpose,
      });
      // Removed manual navigation here
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '28px' }}>🎓</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Smart Campus</h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>AR Navigation</p>
      </div>

      {/* Role switcher */}
      <div style={{
        display: 'flex', background: '#f0f0f0', borderRadius: '12px',
        padding: '4px', marginBottom: '24px', width: '100%', maxWidth: '340px',
      }}>
        {[
          { key: 'student', label: '🎓 Student', color: '#1a73e8' },
          { key: 'visitor', label: '👤 Visitor', color: '#7c3aed' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => handleRoleSwitch(key)} style={{
            flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
            background: role === key ? '#fff' : 'transparent',
            fontWeight: role === key ? '700' : '400',
            cursor: 'pointer', fontSize: '13px',
            color: role === key ? color : '#666',
            boxShadow: role === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '340px' }}>

        {/* ── STUDENT ── */}
        {role === 'student' && (
          <>
            <div style={{
              display: 'flex', background: '#f0f0f0', borderRadius: '10px',
              padding: '4px', marginBottom: '20px',
            }}>
              {['google', 'email'].map(t => (
                <button key={t} onClick={() => { setStudentTab(t); clearError(); }} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  background: studentTab === t ? '#fff' : 'transparent',
                  fontWeight: studentTab === t ? '600' : '400',
                  cursor: 'pointer', fontSize: '13px',
                  color: studentTab === t ? '#1a73e8' : '#666',
                  boxShadow: studentTab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {t === 'google' ? 'Google' : 'Email'}
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>
                {error}
              </p>
            )}

            {studentTab === 'google' ? (
              <button onClick={handleGoogleLogin} disabled={loading} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px', padding: '14px 20px', borderRadius: '12px',
                border: '1.5px solid #dadce0', background: loading ? '#f5f5f5' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '500',
                color: '#3c4043', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'box-shadow 0.15s',
              }}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {loading ? 'Signing in…' : 'Sign in with Google'}
              </button>
            ) : (
              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input
                  type="email" placeholder="Email" value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  required autoComplete="email" style={inputStyle}
                />
                <input
                  type="password" placeholder="Password" value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  required autoComplete="current-password" style={inputStyle}
                />
                <button type="submit" disabled={loading} style={primaryBtnStyle(loading, '#1a73e8')}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '20px' }}>
              No account?{' '}
              <Link to="/register" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>
                Register
              </Link>
            </p>
          </>
        )}

        {/* ── VISITOR ── */}
        {role === 'visitor' && (
          <>
            {error && (
              <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <form onSubmit={handleVisitorEnter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text" placeholder="Your full name"
                value={visitorName}
                onChange={e => { setVisitorName(e.target.value); clearError(); }}
                required autoComplete="name" style={inputStyle}
              />

              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: '14px', color: '#444', pointerEvents: 'none', userSelect: 'none',
                }}>
                  🇮🇳 +91
                </span>
                <input
                  type="tel" placeholder="98765 43210"
                  value={visitorPhone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setVisitorPhone(digits);
                    clearError();
                  }}
                  required inputMode="numeric" maxLength={10}
                  style={{ ...inputStyle, paddingLeft: '76px' }}
                />
              </div>

              <select
                value={purpose}
                onChange={e => { setPurpose(e.target.value); clearError(); }}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              >
                <option value="">Purpose of visit</option>
                {VISIT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <button type="submit" disabled={loading} style={primaryBtnStyle(loading, '#7c3aed')}>
                {loading ? 'Please wait…' : 'Enter Campus →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '16px', lineHeight: 1.5 }}>
              No account needed. Your details are stored for campus access only.
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