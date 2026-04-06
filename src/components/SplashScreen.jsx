import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SplashScreen = () => {
  const [fade, setFade] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800);
    const t2 = setTimeout(() => {
      if (!loading) {
        navigate(isAuthenticated ? '/' : '/login', { replace: true });
      }
    }, 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading, isAuthenticated, navigate]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
      transition: 'opacity 0.5s ease',
      opacity: fade ? 0 : 1,
    }}>
      <div style={{
        width: 72, height: 72,
        background: '#2563eb',
        borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'scaleIn 0.4s ease both',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </div>

      <div style={{ textAlign: 'center', animation: 'fadeUp 0.4s 0.15s ease both', opacity: 0 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em' }}>
          CampusAR
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          Smart Campus Navigation
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: '#f3f4f6', overflow: 'hidden',
        animation: 'fadeIn 0.3s 0.3s ease both', opacity: 0,
      }}>
        <div style={{
          height: '100%', background: '#2563eb',
          animation: 'slideRight 1.6s ease forwards',
        }} />
      </div>

      <style>{`
        @keyframes slideRight { from { width: 0; } to { width: 100%; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};

export default SplashScreen;