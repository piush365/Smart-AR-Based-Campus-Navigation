import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const SCAN_LOCATIONS = [
  { id: 'gate',    name: 'Main Gate',       emoji: '🚪', desc: 'East campus entrance' },
  { id: 'lab_1',  name: 'Computer Lab',    emoji: '🖥️', desc: 'Block B' },
  { id: 'lab_2',  name: 'Science Lab',     emoji: '🔬', desc: 'Physics & Chem' },
  { id: 'lab_3',  name: 'Electronics Lab', emoji: '⚡', desc: 'Block C' },
  { id: 'lh_a',   name: 'Lecture Hall A',  emoji: '📚', desc: 'Main auditorium wing' },
  { id: 'lh_b',   name: 'Lecture Hall B',  emoji: '📖', desc: 'East lecture wing' },
  { id: 'library',name: 'Library',         emoji: '📕', desc: 'Central, 3 floors' },
  { id: 'canteen',name: 'Canteen',         emoji: '🍽️', desc: 'Block D food court' },
  { id: 'office', name: 'Admin Office',    emoji: '🏢', desc: 'Administrative block' },
];

const QRScanner = ({ setCurrentLocation }) => {
  const navigate = useNavigate();
  const [state, setState] = useState('idle'); // idle | scanning | success
  const [scannedLoc, setScannedLoc] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const scanTimer = useRef(null);
  const progressTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(scanTimer.current);
    clearInterval(progressTimer.current);
  }, []);

  const simulateScan = (loc) => {
    if (state === 'scanning') return;
    setState('scanning');
    setExpanded(false);
    setScanProgress(0);

    // Animate progress bar over 1.2s
    let progress = 0;
    progressTimer.current = setInterval(() => {
      progress += 5;
      setScanProgress(Math.min(progress, 100));
      if (progress >= 100) clearInterval(progressTimer.current);
    }, 60);

    scanTimer.current = setTimeout(() => {
      setScannedLoc(loc);
      setCurrentLocation(loc.id);
      setState('success');
      // Navigate home after showing success
      setTimeout(() => navigate('/'), 2000);
    }, 1300);
  };

  const reset = () => {
    setState('idle');
    setScannedLoc(null);
    setScanProgress(0);
    clearTimeout(scanTimer.current);
    clearInterval(progressTimer.current);
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 20px' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          QR Scanner
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
          Scan a campus QR code to set your location
        </p>
      </div>

      <div style={{ flex: 1, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Viewfinder */}
        <div style={{
          width: 220, height: 220, position: 'relative',
          borderRadius: 20, overflow: 'hidden',
          background: state === 'success' ? '#f0fdf4' : state === 'scanning' ? '#eff6ff' : 'var(--surface-2)',
          border: `2px solid ${state === 'success' ? '#86efac' : state === 'scanning' ? '#93c5fd' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.35s ease',
        }}>
          {/* Corner brackets */}
          {[
            { top:10,  left:10,  borderTop:'2.5px solid', borderLeft:'2.5px solid',  borderTopLeftRadius: 8 },
            { top:10,  right:10, borderTop:'2.5px solid', borderRight:'2.5px solid', borderTopRightRadius: 8 },
            { bottom:10, left:10,  borderBottom:'2.5px solid', borderLeft:'2.5px solid',  borderBottomLeftRadius: 8 },
            { bottom:10, right:10, borderBottom:'2.5px solid', borderRight:'2.5px solid', borderBottomRightRadius: 8 },
          ].map((style, i) => (
            <div key={i} style={{
              position:'absolute', width:20, height:20,
              borderColor: state === 'success' ? '#22c55e' : '#2563eb',
              ...style,
            }} />
          ))}

          {/* Scan line animation */}
          {state === 'scanning' && (
            <div style={{
              position:'absolute', left:16, right:16, height:2,
              background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
              animation: 'scanLine 1s linear infinite',
              top: '50%',
            }} />
          )}

          {state === 'success' ? (
            <div className="scale-in" style={{ textAlign:'center' }}>
              <CheckCircle size={52} color="#22c55e" />
              <p style={{ margin:'8px 0 0', fontSize:13, fontWeight:700, color:'#16a34a' }}>
                {scannedLoc?.name}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-3)' }}>Location set!</p>
            </div>
          ) : state === 'scanning' ? (
            <div style={{ textAlign:'center' }}>
              <div style={{
                width:40, height:40, borderRadius:'50%',
                border:'3px solid #bfdbfe', borderTop:'3px solid #2563eb',
                animation:'spin 0.7s linear infinite',
                marginBottom:10,
              }} />
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text-2)' }}>Scanning…</p>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:16 }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h1v1h-1z M16 14h1v1h-1z M14 16h1v1h-1z M16 16h1v1h-1z M18 14h3v3h-3z M14 18h3v3h-3z M18 18h1v3h-1z M21 18h1v1h-1z"/>
              </svg>
              <p style={{ margin:'10px 0 0', fontSize:12, color:'var(--text-4)' }}>Camera viewfinder</p>
            </div>
          )}
        </div>

        {/* Progress bar (visible while scanning) */}
        {state === 'scanning' && (
          <div style={{ width:'100%', maxWidth:220, height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', background:'#2563eb', borderRadius:2,
              width:`${scanProgress}%`, transition:'width 0.06s linear',
            }} />
          </div>
        )}

        {/* Instructions */}
        {state === 'idle' && (
          <p style={{ textAlign:'center', fontSize:14, color:'var(--text-3)', margin:0, maxWidth:260, lineHeight:1.5 }}>
            Point your camera at any campus QR code to instantly set your current location.
          </p>
        )}

        {/* Success CTA */}
        {state === 'success' && (
          <div className="alert alert-success fade-in" style={{ width:'100%', maxWidth:340 }}>
            <MapPin size={15} style={{ flexShrink:0 }} />
            <span>Location set to <strong>{scannedLoc?.name}</strong>. Redirecting to home…</span>
          </div>
        )}

        {/* Simulate panel */}
        {state === 'idle' && (
          <div className="card" style={{ width:'100%', maxWidth:380, overflow:'hidden' }}>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                width:'100%', padding:'14px 16px', background:'none', border:'none',
                display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="badge badge-yellow">DEV</span>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>
                  Simulate QR Scan
                </span>
              </div>
              {expanded ? <ChevronUp size={16} color="var(--text-4)" /> : <ChevronDown size={16} color="var(--text-4)" />}
            </button>

            {expanded && (
              <div className="fade-in" style={{ borderTop:'1px solid var(--border)' }}>
                {SCAN_LOCATIONS.map((loc, i) => (
                  <button
                    key={loc.id}
                    onClick={() => simulateScan(loc)}
                    style={{
                      width:'100%', padding:'12px 16px', background:'none', border:'none',
                      borderBottom:'1px solid var(--border)', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:12, textAlign:'left',
                      transition:'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--surface-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='none'; }}
                  >
                    <span style={{ fontSize:22 }}>{loc.emoji}</span>
                    <div>
                      <p style={{ margin:0, fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{loc.name}</p>
                      <p style={{ margin:0, fontSize:12, color:'var(--text-3)' }}>{loc.desc}</p>
                    </div>
                    <MapPin size={14} color="var(--text-4)" style={{ marginLeft:'auto', flexShrink:0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reset button if stuck on success */}
        {state === 'success' && (
          <button className="btn btn-ghost" onClick={reset} style={{ marginTop:-8 }}>
            Scan another
          </button>
        )}
      </div>
    </div>
  );
};

export default QRScanner;