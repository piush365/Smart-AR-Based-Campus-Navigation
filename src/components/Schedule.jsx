import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { ALL_CLASSES } from './Home';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmt = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

const Schedule = ({ setDestination }) => {
  const navigate = useNavigate();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today === 0 || today === 7 ? 1 : today);

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const dayClasses = useMemo(() =>
    ALL_CLASSES
      .filter(c => c.day === selectedDay)
      .sort((a, b) => (a.startH * 60 + a.startM) - (b.startH * 60 + b.startM)),
    [selectedDay]
  );

  const getStatus = (cls) => {
    const startMins = cls.startH * 60 + cls.startM;
    const endMins   = cls.endH   * 60 + cls.endM;
    if (selectedDay !== today) return null;
    if (nowMins < startMins) {
      const diff = startMins - nowMins;
      return { type: 'upcoming', label: diff < 60 ? `in ${diff}m` : `at ${fmt(cls.startH, cls.startM)}`, urgent: diff <= 15 };
    }
    if (nowMins <= endMins) return { type: 'live', label: 'Live now' };
    return { type: 'done', label: 'Done' };
  };

  const handleNavigate = (nodeId) => {
    setDestination(nodeId);
    navigate('/map');
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '18px 20px 0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Class Schedule
        </h2>

        {/* Day tabs */}
        <div style={{
          display: 'flex', gap: 4, overflowX: 'auto',
          paddingBottom: 0, scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {[1, 2, 3, 4, 5, 6].map(d => {
            const isActive = selectedDay === d;
            const isToday  = today === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                style={{
                  flex: '0 0 auto',
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: isActive ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'none',
                  color: isActive ? '#2563eb' : 'var(--text-3)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13, cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {DAY_ABBR[d]}
                {isToday && (
                  <span style={{
                    position: 'absolute', top: 6, right: 8,
                    width: 5, height: 5, borderRadius: '50%', background: '#2563eb',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Classes */}
      <div style={{ padding: '16px' }}>
        {dayClasses.length === 0 ? (
          <div className="card fade-up" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎉</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>No classes on {DAYS[selectedDay]}!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-4)' }}>Enjoy your day off.</p>
          </div>
        ) : (
          dayClasses.map((cls, i) => {
            const status = getStatus(cls);
            const isDone = status?.type === 'done';
            const isLive = status?.type === 'live';

            return (
              <div
                key={i}
                className={`card fade-up d${Math.min(i + 1, 5)}`}
                style={{
                  padding: '14px 16px', marginBottom: 10,
                  opacity: isDone ? 0.55 : 1,
                  borderLeft: isLive ? '3px solid #2563eb' : '3px solid transparent',
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Time + status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}>
                    <Clock size={13} />
                    {fmt(cls.startH, cls.startM)} – {fmt(cls.endH, cls.endM)}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${cls.type === 'Lab' ? 'badge-blue' : 'badge-gray'}`}>{cls.type}</span>
                    {status && (
                      <span className={`badge ${
                        isLive ? 'badge-blue' :
                        status.type === 'done' ? 'badge-gray' :
                        status.urgent ? 'badge-red' : 'badge-yellow'
                      }`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject + Room */}
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {cls.subject}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                    <MapPin size={12} /> {cls.room} · {cls.code}
                  </span>
                  {!isDone && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleNavigate(cls.nodeId)}
                    >
                      <Navigation size={12} /> Navigate
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Schedule;
