/**
 * src/components/VisitorHome.jsx
 *
 * Simplified home screen for visitor users.
 * Provides campus navigation without student-specific features.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, Zap, MapPin, QrCode, Search, Navigation, Info } from 'lucide-react';

// Key campus POIs visitors commonly need
const CAMPUS_POIS = [
  { label: 'Main Gate',         nodeId: 'main-gate',       icon: '🚪', desc: 'Primary campus entrance' },
  { label: 'Library',           nodeId: 'library',          icon: '📚', desc: 'Ajit Gulabchand Library' },
  { label: 'Government Canteen',nodeId: 'govt-canteen',     icon: '🍽️', desc: 'Main student canteen' },
  { label: 'CSE Department',    nodeId: 'cse-dept',         icon: '💻', desc: 'Computer Science & Engg' },
  { label: 'Exam Center',       nodeId: 'exam-center',      icon: '📝', desc: 'Examination centre' },
  { label: 'Hostel',            nodeId: 'hostel',           icon: '🏠', desc: 'Student hostel block' },
  { label: 'Gym Khana',         nodeId: 'gym-khana',        icon: '🏋️', desc: 'Fitness & sports facilities' },
  { label: 'Tilak Hall',        nodeId: 'tilak-hall',       icon: '🎭', desc: 'Seminar / community hall' },
];

const VisitorHome = ({ setDestination }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
    now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Visitor';

  const filtered = CAMPUS_POIS.filter(p =>
    p.label.toLowerCase().includes(query.toLowerCase()) ||
    p.desc.toLowerCase().includes(query.toLowerCase())
  );

  const handleNavigate = (nodeId) => {
    setDestination(nodeId);
    navigate('/map');
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        padding: '28px 20px 24px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px',
              }}>VISITOR</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{greeting}</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em' }}>
              {firstName} 👋
            </h1>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 10, padding: '7px 13px', color: '#fff', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            Sign out
          </button>
        </div>

        {/* Campus name pill */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} color="rgba(255,255,255,0.75)" />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            Smart Campus — AR Navigation
          </span>
        </div>
      </div>

      {/* Primary action buttons */}
      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          id="visitor-open-map"
          onClick={() => navigate('/map')}
          style={{
            background: '#fff', border: '1.5px solid #e0e7ff',
            borderRadius: 16, padding: '20px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', boxShadow: '0 2px 12px rgba(79,70,229,0.08)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,70,229,0.08)'; }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
          }}>
            <Map size={20} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Campus Map</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Explore &amp; navigate</p>
          </div>
        </button>

        <button
          id="visitor-open-ar"
          onClick={() => navigate('/ar')}
          style={{
            background: '#fff', border: '1.5px solid #fef3c7',
            borderRadius: 16, padding: '20px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', boxShadow: '0 2px 12px rgba(245,158,11,0.08)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(245,158,11,0.08)'; }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>AR Navigate</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Live directions</p>
          </div>
        </button>
      </div>

      {/* QR Scan shortcut */}
      <div style={{ padding: '12px 16px 0' }}>
        <button
          id="visitor-scan-qr"
          onClick={() => navigate('/scan')}
          style={{
            width: '100%', background: '#f9fafb', border: '1.5px dashed #d1d5db',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QrCode size={18} color="#2563eb" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>Scan QR Code</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Find your current location</p>
          </div>
          <Navigation size={15} color="#9ca3af" style={{ marginLeft: 'auto' }} />
        </button>
      </div>

      {/* POI search + grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Find a location
        </p>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            id="visitor-poi-search"
            type="text"
            placeholder="Search buildings, cafeteria, library…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 38px',
              borderRadius: 12, border: '1.5px solid #e5e7eb',
              fontSize: 14, outline: 'none', background: '#fff',
              boxSizing: 'border-box', color: '#111827',
            }}
          />
        </div>

        {/* POI cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((poi) => (
            <div
              key={poi.nodeId}
              className="card"
              style={{
                padding: '12px 14px', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: '#f3f4f6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>
                  {poi.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{poi.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{poi.desc}</p>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '7px 13px', fontSize: 12, flexShrink: 0 }}
                onClick={() => handleNavigate(poi.nodeId)}
              >
                <Navigation size={12} /> Go
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
              <Info size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No locations match "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitorHome;
