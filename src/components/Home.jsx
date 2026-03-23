import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, ArrowRight, QrCode, Map, Zap, Calendar, Navigation } from 'lucide-react';

// Shared schedule data — the source of truth
const ALL_CLASSES = [
  { subject: 'Data Structures & Algorithms', code: 'CS301', day: 1, startH: 10, startM: 30, endH: 12, endM: 0,  room: 'Lab 1',        nodeId: 'lab_1',  type: 'Lab' },
  { subject: 'Operating Systems',            code: 'CS302', day: 1, startH: 13, startM: 0,  endH: 14, endM: 0,  room: 'Lecture Hall A', nodeId: 'lh_a',   type: 'Lecture' },
  { subject: 'Database Management',          code: 'CS303', day: 1, startH: 15, startM: 0,  endH: 16, endM: 30, room: 'Lab 2',        nodeId: 'lab_2',  type: 'Lab' },
  { subject: 'Computer Networks',            code: 'CS304', day: 2, startH: 10, startM: 0,  endH: 11, endM: 30, room: 'Lecture Hall B', nodeId: 'lh_b',   type: 'Lecture' },
  { subject: 'Software Engineering',         code: 'CS305', day: 2, startH: 12, startM: 0,  endH: 13, endM: 0,  room: 'Classroom 3',  nodeId: 'cr_3',   type: 'Lecture' },
  { subject: 'Data Structures & Algorithms', code: 'CS301', day: 3, startH: 9,  startM: 0,  endH: 10, endM: 30, room: 'Lab 1',        nodeId: 'lab_1',  type: 'Lab' },
  { subject: 'Machine Learning',             code: 'CS401', day: 3, startH: 14, startM: 30, endH: 16, endM: 0,  room: 'Lab 3',        nodeId: 'lab_3',  type: 'Lab' },
  { subject: 'Operating Systems',            code: 'CS302', day: 4, startH: 9,  startM: 30, endH: 10, endM: 30, room: 'Lecture Hall A', nodeId: 'lh_a',   type: 'Lecture' },
  { subject: 'Computer Networks',            code: 'CS304', day: 4, startH: 11, startM: 0,  endH: 12, endM: 30, room: 'Lecture Hall B', nodeId: 'lh_b',   type: 'Lecture' },
  { subject: 'Database Management',          code: 'CS303', day: 5, startH: 10, startM: 0,  endH: 11, endM: 30, room: 'Lab 2',        nodeId: 'lab_2',  type: 'Lab' },
  { subject: 'Software Engineering',         code: 'CS305', day: 5, startH: 13, startM: 0,  endH: 14, endM: 0,  room: 'Classroom 3',  nodeId: 'cr_3',   type: 'Lecture' },
];

export { ALL_CLASSES };

const fmt = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

const QUICK_ACTIONS = [
  { label: 'Scan QR',  path: '/scan',     icon: QrCode },
  { label: 'Map',      path: '/map',      icon: Map },
  { label: 'Schedule', path: '/schedule', icon: Calendar },
  { label: 'AR View',  path: '/ar',       icon: Zap },
];

const Home = ({ currentLocation, setDestination }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const todayDay = now.getDay(); // 0=Sun, 1=Mon…

  // Compute next 2 upcoming classes for today
  const todayClasses = useMemo(() => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return ALL_CLASSES
      .filter(c => c.day === todayDay)
      .sort((a, b) => (a.startH * 60 + a.startM) - (b.startH * 60 + b.startM))
      .filter(c => c.endH * 60 + c.endM > nowMins) // not finished yet
      .slice(0, 2);
  }, [now, todayDay]);

  // Is a class currently ongoing
  const ongoingClass = useMemo(() => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return ALL_CLASSES.find(
      c => c.day === todayDay && c.startH * 60 + c.startM <= nowMins && c.endH * 60 + c.endM > nowMins
    );
  }, [now, todayDay]);

  const formatLocation = (loc) =>
    loc ? loc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;

  const handleNavigate = (nodeId) => {
    setDestination(nodeId);
    navigate('/map');
  };

  return (
    <div style={{ background: 'var(--bg)', paddingBottom: 20 }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '20px 20px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{greeting}</p>
            <h1 className="fade-up" style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              {firstName} 👋
            </h1>
          </div>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#eff6ff', border: '2px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#2563eb', flexShrink: 0,
          }}>
          {user?.name
              ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : '?'
            }
          </div>
        </div>

        {/* Date + location */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '5px 10px', fontSize: 12, color: 'var(--text-3)',
          }}>
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: currentLocation ? '#f0fdf4' : 'var(--surface-2)',
            border: `1px solid ${currentLocation ? '#bbf7d0' : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 10px', fontSize: 12,
            color: currentLocation ? '#16a34a' : 'var(--text-3)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: currentLocation ? '#16a34a' : 'var(--border-strong)' }} />
            <MapPin size={11} />
            {formatLocation(currentLocation) || 'Unknown – scan QR to locate'}
          </span>
        </div>
      </div>

      {/* Ongoing class banner */}
      {ongoingClass && (
        <div style={{ padding: '12px 16px 0' }}>
          <div className="fade-up" style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <span className="badge badge-blue" style={{ marginBottom: 6 }}>Live now</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {ongoingClass.subject}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                {ongoingClass.room} · until {fmt(ongoingClass.endH, ongoingClass.endM)}
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => handleNavigate(ongoingClass.nodeId)}
            >
              <Navigation size={14} /> Go
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ padding: '20px 16px 0' }}>
        <p className="section-title">Quick actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {QUICK_ACTIONS.map(({ label, icon: Icon, path }, i) => (
            <button
              key={label}
              className={`fade-up d${i + 1}`}
              onClick={() => navigate(path)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={17} color="#2563eb" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming classes */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p className="section-title" style={{ margin: 0 }}>
            {todayClasses.length > 0 ? 'Upcoming today' : 'Today\'s classes'}
          </p>
          <button
            onClick={() => navigate('/schedule')}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            View all →
          </button>
        </div>

        {todayClasses.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)' }}>
            <p style={{ margin: 0, fontSize: 32, marginBottom: 8 }}>🎉</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-3)' }}>No more classes today!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>Enjoy your time.</p>
          </div>
        ) : (
          todayClasses.map((cls, i) => {
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const startMins = cls.startH * 60 + cls.startM;
            const minsUntil = startMins - nowMins;
            const timeLabel = minsUntil <= 0 ? 'In progress' :
              minsUntil < 60 ? `in ${minsUntil} min` :
              `at ${fmt(cls.startH, cls.startM)}`;

            return (
              <div
                key={i}
                className={`card fade-up d${i + 1}`}
                style={{ padding: '14px 16px', marginBottom: 10 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                      <span className={`badge ${cls.type === 'Lab' ? 'badge-blue' : 'badge-gray'}`}>
                        {cls.type}
                      </span>
                      <span style={{ fontSize: 12, color: minsUntil <= 15 && minsUntil >= 0 ? '#dc2626' : 'var(--text-3)', fontWeight: 600 }}>
                        {timeLabel}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.subject}
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                        <Clock size={11} /> {fmt(cls.startH, cls.startM)} – {fmt(cls.endH, cls.endM)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                        <MapPin size={11} /> {cls.room}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 12px', fontSize: 13, flexShrink: 0 }}
                    onClick={() => handleNavigate(cls.nodeId)}
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Home;