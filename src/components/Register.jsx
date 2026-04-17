import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Hash, BookOpen, AlertCircle, ChevronLeft, Check } from 'lucide-react';

const DEPARTMENTS = [
  'Dept. of Artificial Intelligence and Machine Learning',
  'Dept. of Civil Engineering',
  'Dept. of Computer Science and Engineering',
  'Dept. of Humanities and Science',
  'Dept. of Electrical Engineering',
  'Dept. of Electronics Engineering',
  'Dept. of Mechanical Engineering',
  'Dept. of Robotics and Automation',
];

const getErrorMessage = (err) => {
  const code = err?.code || '';
  const backendMsg = err?.response?.data?.error;
  if (backendMsg) return backendMsg;
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed': return 'Network error. Check your internet connection and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/operation-not-allowed': return 'Email/password sign-up is not enabled. Contact support.';
    default: return err?.message || 'Registration failed. Please try again.';
  }
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', studentId: '', department: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!form.email.trim()) return 'Please enter your email.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Please enter a valid email address.';
    return null;
  };

  const validateStep2 = () => {
    if (!form.password) return 'Please enter a password.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.studentId.trim()) return 'Please enter your Student ID / PRN.';
    if (!/^\d{9}$/.test(form.studentId.trim())) return 'Student ID / PRN must be exactly 9 digits (e.g. 255200005).';
    if (!form.department) return 'Please select your department.';
    return null;
  };

  const handleStep1 = e => {
    e.preventDefault();
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await register({ ...form, role: 'student' });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#2563eb', borderRadius: 16,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em' }}>
            Create account
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            Join CampusAR to navigate your campus
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: step >= s ? '#2563eb' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
              <span style={{ fontSize: 12, color: step >= s ? '#2563eb' : '#9ca3af', fontWeight: 600 }}>
                {s === 1 ? 'Your info' : 'Set up account'}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {error && (
            <div className="alert alert-error fade-in" style={{ marginBottom: 20 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form key="step1" onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Full name</label>
                <div className="input-wrap">
                  <User size={15} className="input-icon-left" />
                  <input className="input input-icon" type="text" name="name"
                    placeholder="e.g. Priya Sharma" value={form.name} onChange={handleChange}
                    autoComplete="name" maxLength={80} />
                </div>
              </div>
              <div>
                <label className="label">Email address</label>
                <div className="input-wrap">
                  <Mail size={15} className="input-icon-left" />
                  <input className="input input-icon" type="email" name="email"
                    placeholder="your@university.edu" value={form.email} onChange={handleChange}
                    autoComplete="email" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
                Continue →
              </button>
            </form>
          ) : (
            <form key="step2" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon-left" />
                  <input className="input input-icon" type={showPw ? 'text' : 'password'}
                    name="password" placeholder="At least 6 characters"
                    value={form.password} onChange={handleChange}
                    autoComplete="new-password" style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, display: 'flex',
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label">Confirm password</label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon-left" />
                  <input className="input input-icon" type={showConfirmPw ? 'text' : 'password'}
                    name="confirmPassword" placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={handleChange}
                    autoComplete="new-password" style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, display: 'flex',
                  }}>
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Student ID */}
              <div>
                <label className="label">Student ID / PRN</label>
                <div className="input-wrap">
                  <Hash size={15} className="input-icon-left" />
                  <input className="input input-icon" type="text"
                    name="studentId" placeholder="e.g. 255200005 (PRN)"
                    value={form.studentId} onChange={handleChange}
                    maxLength={9} inputMode="numeric" />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="label">Department</label>
                <div className="input-wrap">
                  <BookOpen size={15} className="input-icon-left" />
                  <select className="input input-icon" name="department"
                    value={form.department} onChange={handleChange}
                    style={{ appearance: 'none', cursor: 'pointer' }}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost"
                  onClick={() => { setStep(1); setError(''); }}
                  style={{ flex: 'none', padding: '12px 16px' }}>
                  <ChevronLeft size={16} />
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}
                  style={{ flex: 1, opacity: loading ? 0.8 : 1 }}>
                  {loading ? <span className="spinner" /> : <><Check size={16} /> Create account</>}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;