import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, QrCode, Calendar, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_NAV_ITEMS = [
  { name: 'Home',     path: '/',         icon: Home,     roles: ['student', 'visitor'] },
  { name: 'Schedule', path: '/schedule', icon: Calendar, roles: ['student'] },
  { name: 'Scan',     path: '/scan',     icon: QrCode,   accent: true, roles: ['student', 'visitor'] },
  { name: 'Map',      path: '/map',      icon: Map,      roles: ['student', 'visitor'] },
  { name: 'Profile',  path: '/profile',  icon: User,     roles: ['student', 'visitor'] },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const role = user?.role || 'student';
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <nav style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 60,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(({ name, path, icon: Icon, accent }) => {
        const active = pathname === path;

        if (accent) {
          // Center QR button — raised, solid blue
          return (
            <Link
              key={name}
              to={path}
              id={`nav-${name.toLowerCase()}`}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                top: -16,
                width: 50, height: 50, borderRadius: 16,
                background: active ? '#1d4ed8' : '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.45)',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                transform: active ? 'scale(0.95)' : 'scale(1)',
              }}>
                <Icon size={22} color="white" />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? '#2563eb' : 'var(--text-4)',
                marginTop: 32,
              }}>{name}</span>
            </Link>
          );
        }

        return (
          <Link
            key={name}
            to={path}
            id={`nav-${name.toLowerCase()}`}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, textDecoration: 'none',
              height: '100%', position: 'relative',
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{
              width: 34, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: active ? '#eff6ff' : 'transparent',
              transition: 'background 0.15s',
            }}>
              <Icon size={19} color={active ? '#2563eb' : '#9ca3af'} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#2563eb' : 'var(--text-4)',
              letterSpacing: '-0.01em',
            }}>
              {name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;