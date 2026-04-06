import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Navigation, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { ALL_CLASSES } from './Home';
import api from '../api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORK_DAYS = [1, 2, 3, 4, 5, 6];

function apiToDisplay(ev) {
  return {
    ...ev,
    startH: Math.floor(ev.startMins / 60),
    startM: ev.startMins % 60,
    endH: Math.floor(ev.endMins / 60),
    endM: ev.endMins % 60,
    type: ev.type || 'Lecture',
  };
}

function homeToDisplay(cls) {
  return {
    ...cls,
    id: `local-${cls.code}-${cls.day}`,
    startMins: cls.startH * 60 + cls.startM,
    endMins: cls.endH * 60 + cls.endM,
  };
}

const fmt = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

const TYPE_COLORS = {
  Lab:      { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  Lecture:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  Tutorial: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  default:  { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' },
};

// ── WeekGrid defined FIRST (before Schedule) so the const is initialized ──────
const WeekGrid = ({ classes: gridClasses, today, nowMins, onNavigate }) => {
  const START_H = 8;
  const END_H = 20;
  const ROW_PX = 56;
  const gridHeight = ((END_H - START_H) * 60 / 30) * ROW_PX;

  const byDay = useMemo(() => {
    const map = {};
    WORK_DAYS.forEach(d => { map[d] = []; });
    gridClasses.forEach(cls => { if (map[cls.day]) map[cls.day].push(cls); });
    return map;
  }, [gridClasses]);

  const positionOf = (cls) => {
    const startOffset = Math.max(0, cls.startMins - START_H * 60);
    const duration = cls.endMins - cls.startMins;
    return {
      top: (startOffset / 30) * ROW_PX,
      height: Math.max(ROW_PX * 0.8, (duration / 30) * ROW_PX - 4),
    };
  };

  const timeLabels = [];
  for (let h = START_H; h <= END_H; h++) timeLabels.push(h);

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 16 }}>
      <div style={{ minWidth: 480, display: 'flex' }}>

        {/* Time axis */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: gridHeight + 32 }}>
          <div style={{ height: 28 }} />
          {timeLabels.map(h => (
            <div key={h} style={{
              position: 'absolute',
              top: ((h - START_H) * 2) * ROW_PX + 28,
              left: 0, width: '100%',
              fontSize: 10, color: 'var(--text-4)', fontWeight: 600,
              textAlign: 'right', paddingRight: 6, lineHeight: '1',
            }}>
              {h % 12 || 12}{h < 12 ? 'a' : 'p'}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {WORK_DAYS.map(d => (
          <div key={d} style={{ flex: 1, minWidth: 70 }}>
            <div style={{
              height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: d === today ? '#2563eb' : 'var(--text-3)',
              borderBottom: d === today ? '2px solid #2563eb' : '2px solid transparent',
            }}>
              {DAY_ABBR[d]}
              {d === today && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', marginLeft: 3, display: 'inline-block' }} />
              )}
            </div>

            <div style={{ position: 'relative', height: gridHeight, background: d % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
              {/* Hour gridlines */}
              {timeLabels.map(h => (
                <div key={h} style={{
                  position: 'absolute', top: (h - START_H) * 2 * ROW_PX,
                  left: 0, right: 0, height: 1, background: 'var(--border)',
                }} />
              ))}

              {/* Class blocks */}
              {(byDay[d] || []).map(cls => {
                const { top, height } = positionOf(cls);
                const s = TYPE_COLORS[cls.type] || TYPE_COLORS.default;
                const isLive = d === today && nowMins >= cls.startMins && nowMins <= cls.endMins;
                return (
                  <div
                    key={cls.id}
                    onClick={() => onNavigate(cls.nodeId)}
                    title={`${cls.subject}\n${fmt(cls.startH, cls.startM)} – ${fmt(cls.endH, cls.endM)}\n${cls.room || ''}`}
                    style={{
                      position: 'absolute', top, left: 2, right: 2, height,
                      background: s.bg,
                      border: `1.5px solid ${isLive ? '#2563eb' : s.border}`,
                      borderRadius: 8, padding: '4px 6px', overflow: 'hidden',
                      cursor: cls.nodeId ? 'pointer' : 'default',
                      boxShadow: isLive ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => { if (cls.nodeId) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.subject}
                    </p>
                    {height > 36 && (
                      <p style={{ margin: '1px 0 0', fontSize: 9, color: s.text, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cls.room} · {fmt(cls.startH, cls.startM)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Schedule (main component) ─────────────────────────────────────────────────
const Schedule = ({ setDestination }) => {
  const navigate = useNavigate();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today === 0 ? 1 : today);
  const [view, setView] = useState('list');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/schedule');
      const mapped = (data.events || []).map(apiToDisplay);
      setClasses(mapped.length > 0 ? mapped : ALL_CLASSES.map(homeToDisplay));
    } catch {
      setClasses(ALL_CLASSES.map(homeToDisplay));
      setError('Could not load live schedule — showing sample data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const dayClasses = useMemo(() =>
    classes
      .filter(c => c.day === selectedDay)
      .sort((a, b) => a.startMins - b.startMins),
    [classes, selectedDay]
  );

  const getStatus = (cls) => {
    if (selectedDay !== today) return null;
    if (nowMins < cls.startMins) {
      const diff = cls.startMins - nowMins;
      return { type: 'upcoming', label: diff < 60 ? `in ${diff}m` : `at ${fmt(cls.startH, cls.startM)}`, urgent: diff <= 15 };
    }
    if (nowMins <= cls.endMins) return { type: 'live', label: 'Live now' };
    return { type: 'done', label: 'Done' };
  };

  // Single navigate handler shared by both list and week views
  const handleNavigate = (nodeId) => {
    if (!nodeId) return;
    setDestination(nodeId);
    navigate('/map');
  };

  const typeStyle = (type) => TYPE_COLORS[type] || TYPE_COLORS.default;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 80 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '18px 20px 12px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Class Schedule
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              id="schedule-refresh"
              onClick={fetchSchedule}
              disabled={loading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex' }}
              title="Refresh"
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 3 }}>
              {[{ key: 'list', Icon: List }, { key: 'week', Icon: LayoutGrid }].map(({ key, Icon }) => (
                <button
                  key={key}
                  id={`schedule-view-${key}`}
                  onClick={() => setView(key)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: 'none',
                    background: view === key ? '#fff' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} color={view === key ? '#2563eb' : '#9ca3af'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#92400e' }}>
            ⚠️ {error}
          </div>
        )}

        {view === 'list' && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {WORK_DAYS.map(d => {
              const isActive = selectedDay === d;
              const isToday = today === d;
              return (
                <button
                  key={d}
                  id={`schedule-day-${d}`}
                  onClick={() => setSelectedDay(d)}
                  style={{
                    flex: '0 0 auto', padding: '8px 14px', border: 'none',
                    borderBottom: isActive ? '2.5px solid #2563eb' : '2.5px solid transparent',
                    background: 'none', color: isActive ? '#2563eb' : 'var(--text-3)',
                    fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
                    position: 'relative', transition: 'color 0.15s', whiteSpace: 'nowrap',
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
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 12, background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' }} />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && (
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
              const s = typeStyle(cls.type);
              return (
                <div
                  key={cls.id || i}
                  className={`card fade-up d${Math.min(i + 1, 5)}`}
                  style={{ padding: '14px 16px', marginBottom: 10, opacity: isDone ? 0.55 : 1, borderLeft: isLive ? '3px solid #2563eb' : '3px solid transparent', transition: 'opacity 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}>
                      <Clock size={13} />
                      {fmt(cls.startH, cls.startM)} – {fmt(cls.endH, cls.endM)}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.text, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: '2px 8px' }}>
                        {cls.type}
                      </span>
                      {status && (
                        <span className={`badge ${isLive ? 'badge-blue' : status.type === 'done' ? 'badge-gray' : status.urgent ? 'badge-red' : 'badge-yellow'}`}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {cls.subject}
                    {cls.code && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 6 }}>{cls.code}</span>}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                      <MapPin size={12} /> {cls.room || 'Room TBD'}
                    </span>
                    {!isDone && cls.nodeId && (
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
      )}

      {/* Week view */}
      {!loading && view === 'week' && (
        <div style={{ padding: '12px 8px' }}>
          <WeekGrid
            classes={classes}
            today={today}
            nowMins={nowMins}
            onNavigate={handleNavigate}
          />
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>
            Tap any class block to navigate to it
          </p>
        </div>
      )}
    </div>
  );
};

export default Schedule;