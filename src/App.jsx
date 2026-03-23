/**
 * src/App.jsx
 *
 * Fixes applied (vs original):
 *  - Added `destination` + `setDestination` shared state in AppShell
 *  - Passes destination/setDestination to Home, MapScreen, Schedule
 *  - BottomNavGuard now uses useLocation() hook (reactive) instead of
 *    window.location.pathname (not reactive — caused nav showing on camera screens)
 *  - /splash added to hiddenPaths so BottomNav is hidden on splash screen
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

import SplashScreen  from './components/SplashScreen';
import Login         from './components/Login';
import Register      from './components/Register';
import OAuthCallback from './components/OAuthCallback';
import Home          from './components/Home';
import VisitorHome   from './components/VisitorHome';
import MapScreen     from './components/MapScreen';
import QRScanner     from './components/QRScanner';
import ARView        from './components/ARView';
import Schedule      from './components/Schedule';
import Profile       from './components/Profile';
import BottomNav     from './components/BottomNav';

// ── Route guard ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px' }}>
        Loading…
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ── Visitor-only guard (redirects students away) ──────────────────────────────
function StudentRoute({ children }) {
  const { isAuthenticated, loading, isVisitor } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isVisitor) return <Navigate to="/" replace />;
  return children;
}

// ── App shell — holds all shared navigation state ────────────────────────────
function AppShell() {
  const { isAuthenticated, loading, isVisitor } = useAuth();

  // Where the user currently is (set by QR scan)
  const [currentLocation, setCurrentLocation] = useState(null);

  // Where the user wants to go (set by Home "Go" button, Schedule, or AR tap)
  const [destination, setDestination] = useState(null);

  if (loading) return null;

  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/splash"        element={<SplashScreen />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      {/* Google OAuth landing — MUST be public, user not authenticated yet */}
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* ── Protected routes (all roles) ── */}
      <Route path="/" element={
        <ProtectedRoute>
          {isVisitor
            ? <VisitorHome setDestination={setDestination} />
            : <Home currentLocation={currentLocation} setDestination={setDestination} />
          }
        </ProtectedRoute>
      } />

      <Route path="/map" element={
        <ProtectedRoute>
          <MapScreen
            currentLocation={currentLocation}
            destination={destination}
            setDestination={setDestination}
          />
        </ProtectedRoute>
      } />

      <Route path="/scan" element={
        <ProtectedRoute>
          <QRScanner setCurrentLocation={setCurrentLocation} />
        </ProtectedRoute>
      } />

      <Route path="/ar" element={
        <ProtectedRoute>
          <ARView
            currentLocation={currentLocation}
            setCurrentLocation={setCurrentLocation}
            setDestination={setDestination}
          />
        </ProtectedRoute>
      } />

      {/* ── Student-only routes ── */}
      <Route path="/schedule" element={
        <StudentRoute>
          <Schedule setDestination={setDestination} />
        </StudentRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100dvh', position: 'relative' }}>
          <AppShell />
          <BottomNavGuard />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ── Bottom nav guard ──────────────────────────────────────────────────────────
// Uses useLocation() hook so it re-renders reactively on route changes.
// window.location.pathname does NOT trigger re-renders — that was the bug.
const HIDDEN_NAV_PATHS = ['/scan', '/ar', '/splash', '/login', '/register', '/auth/callback'];

function BottomNavGuard() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation(); // reactive — updates on every navigation

  const hidden = HIDDEN_NAV_PATHS.some(p => pathname.startsWith(p));
  if (!isAuthenticated || hidden) return null;
  return <BottomNav />;
}
