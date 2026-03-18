import React, { useState } from 'react';
import { Zap, Layers, MapPin, Info } from 'lucide-react';

const OVERLAYS = [
  { id: 'lab_1',  name: 'Computer Lab',   emoji: '🖥️', dist: '~50m',  direction: '↗' },
  { id: 'library',name: 'Library',        emoji: '📕', dist: '~120m', direction: '→' },
  { id: 'canteen',name: 'Canteen',        emoji: '🍽️', dist: '~80m',  direction: '↘' },
  { id: 'lh_a',   name: 'Lecture Hall A', emoji: '📚', dist: '~30m',  direction: '↑' },
];

const ARView = () => {
  const [arActive, setArActive] = useState(false);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 20px' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          AR Navigation
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
          Augmented reality overlay for campus navigation
        </p>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>

        {/* AR Viewfinder */}
        <div style={{
          width: '100%', maxWidth: 340,
          aspectRatio: '3/4',
          background: arActive ? '#0f172a' : 'var(--surface-2)',
          border: `2px solid ${arActive ? '#2563eb' : 'var(--border)'}`,
          borderRadius: 20, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.4s ease',
        }}>

          {arActive ? (
            <>
              {/* Simulated camera-like grid */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />

              {/* Horizon line */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: '55%', height: 1, background: 'rgba(255,255,255,0.1)' }} />

              {/* Compass */}
              <div style={{
                position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 20,
                background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 14px',
              }}>
                {['N', 'NE', 'E', 'SE', 'S'].map(d => (
                  <span key={d} style={{ fontSize: 11, color: d === 'N' ? '#60a5fa' : 'rgba(255,255,255,0.5)', fontWeight: d === 'N' ? 700 : 400 }}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Overlay labels */}
              {OVERLAYS.map((o, i) => {
                const positions = [
                  { top: '25%', left: '55%' },
                  { top: '45%', left: '65%' },
                  { top: '35%', left: '20%' },
                  { top: '20%', left: '30%' },
                ];
                return (
                  <div key={o.id} className="fade-in" style={{
                    position: 'absolute', ...positions[i],
                    background: 'rgba(37,99,235,0.85)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 8, padding: '5px 10px',
                    animationDelay: `${i * 0.15}s`,
                    opacity: 0,
                  }}>
                    <p style={{ margin: 0, color: 'white', fontSize: 12, fontWeight: 700 }}>
                      {o.direction} {o.name}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{o.dist}</p>
                  </div>
                );
              })}

              {/* Crosshair */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div style={{ width: 48, height: 48, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.4)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.4)' }} />
                  <div style={{ position: 'absolute', inset: 8, border: '1px solid rgba(96,165,250,0.6)', borderRadius: '50%' }} />
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              }}>
                <span className="badge badge-blue" style={{ background: 'rgba(37,99,235,0.85)', color: 'white', backdropFilter: 'blur(4px)' }}>
                  AR Active · {OVERLAYS.length} nearby
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Layers size={48} color="var(--border-strong)" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-3)' }}>Camera feed</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-4)' }}>Enable AR to see overlays</p>
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="alert" style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: '100%', maxWidth: 340 }}>
          <Info size={15} color="var(--text-4)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            AR mode overlays building labels in your camera view. Scan a QR code first to calibrate your position.
          </p>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setArActive(v => !v)}
          className={arActive ? 'btn btn-ghost' : 'btn btn-primary'}
          style={{ width: '100%', maxWidth: 340, justifyContent: 'center', gap: 8, padding: '14px' }}
        >
          <Zap size={18} />
          {arActive ? 'Exit AR Mode' : 'Launch AR Mode'}
        </button>
      </div>
    </div>
  );
};

export default ARView;
