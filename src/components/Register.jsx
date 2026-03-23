import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Hash, BookOpen, AlertCircle, ChevronLeft, Check } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics & Communication',
  'Mechanical Engineering', 'Civil Engineering', 'Business Administration',
  'Mathematics', 'Physics', 'Other',
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', studentId: '', department: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (!form.email.trim()) return 'Please enter your email.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Please enter a valid email.';
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
    if (!form.password) { setError('Please enter a password.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!form.studentId.trim()) { setError('Please enter your student ID.'); return; }
    if (!form.department) { setError('Please select your department.'); return; }
    setLoading(true);
    try {
      await register({ ...form, role: 'student' });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 380 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#2563eb', borderRadius: 16,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
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
        <div style={{ display: 'flex', align: 'center', gap: 8, marginBottom: 20 }}>
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
                    placeholder="e.g. Priya Sharma" value={form.name} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="label">Email address</label>
                <div className="input-wrap">
                  <Mail size={15} className="input-icon-left" />
                  <input className="input input-icon" type="email" name="email"
                    placeholder="your@university.edu" value={form.email} onChange={handleChange} />
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
                    style={{ paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, display: 'flex',
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="label">Confirm password</label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon-left" />
                  <input className="input input-icon" type="password"
                    name="confirmPassword" placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={handleChange} />
                </div>
              </div>

              {/* Student ID */}
              <div>
                <label className="label">Student ID</label>
                <div className="input-wrap">
                  <Hash size={15} className="input-icon-left" />
                  <input className="input input-icon" type="text"
                    name="studentId" placeholder="e.g. CS2024001"
                    value={form.studentId} onChange={handleChange} />
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
                <button type="button" className="btn btn-ghost" onClick={() => { setStep(1); setError(''); }}
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
