import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Hash, BookOpen, LogOut, Bell, Moon, Shield,
  ChevronRight, Edit2, Check, X
} from 'lucide-react';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [notifs, setNotifs] = useState(true);
  const [darkPref, setDarkPref] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user?.name) { setEditingName(false); return; }
    try {
      await updateProfile({ name: trimmed });
      setEditingName(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch {
      setEditingName(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const Toggle = ({ value, onChange }) => (
    <label className="toggle" style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <div style={{
        width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
        background: value ? '#2563eb' : '#e5e7eb',
        transition: 'background 0.2s', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 0.2s',
        }} />
      </div>
    </label>
  );

  const InfoRow = ({ Icon, label, value }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} color="var(--text-3)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );

  const SettingRow = ({ Icon, label, sub, value, onChange }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--surface-2)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color="var(--text-3)" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-4)' }}>{sub}</p>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 28 }}>

      {/* Profile header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '28px 20px 24px', textAlign: 'center',
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#eff6ff', border: '3px solid #bfdbfe',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#2563eb',
          marginBottom: 14,
        }}>
          {user?.name
            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '?'
          }
        </div>

        {/* Name (editable) */}
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <input
              className="input"
              style={{ maxWidth: 200, textAlign: 'center', padding: '8px 12px', fontSize: 16, fontWeight: 700 }}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
            />
            <button onClick={handleSaveName} className="btn-icon" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
              <Check size={16} />
            </button>
            <button onClick={() => setEditingName(false)} className="btn-icon">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {user?.name}
            </h2>
            <button onClick={() => { setEditingName(true); setNameValue(user?.name || ''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2, display: 'flex' }}>
              <Edit2 size={14} />
            </button>
          </div>
        )}

        {savedMsg && (
          <p className="fade-in" style={{ margin: '2px 0 4px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            ✓ Name updated
          </p>
        )}

        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
          {user?.role === 'visitor' ? 'Visitor' : (user?.department || 'Computer Science')}
        </p>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Account info */}
        <p className="section-title" style={{ marginBottom: 8 }}>Account</p>
        <div className="card" style={{ padding: '0 16px', marginBottom: 20 }}>
          <InfoRow Icon={Mail} label="Email" value={user?.email} />
          <InfoRow Icon={Hash} label="Student ID" value={user?.studentId} />
          <InfoRow Icon={BookOpen} label="Department" value={user?.department} />
          <InfoRow Icon={User} label="Role" value={user?.role === 'visitor' ? 'Visitor 👤' : 'Student 🎓'} />
        </div>

        {/* Settings */}
        <p className="section-title" style={{ marginBottom: 8 }}>Preferences</p>
        <div className="card" style={{ padding: '0 16px', marginBottom: 20 }}>
          <SettingRow Icon={Bell} label="Class reminders" sub="15 min before class" value={notifs} onChange={setNotifs} />
          <SettingRow Icon={Moon} label="Dark mode" sub="Coming soon" value={darkPref} onChange={setDarkPref} />
          <SettingRow Icon={Shield} label="Privacy mode" sub="Hide location from peers" value={privacy} onChange={setPrivacy} />
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', margin: '0 0 16px' }}>
          CampusAR v1.0.0
        </p>

        {/* Logout */}
        <button
          id="logout-btn"
          className="btn btn-danger"
          onClick={handleLogout}
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
};

export default Profile;
