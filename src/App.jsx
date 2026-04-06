import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

import SplashScreen  from './components/SplashScreen';
import Login         from './components/Login';
import Register      from './components/Register';
import Home          from './components/Home';
import VisitorHome   from './components/VisitorHome';
import MapScreen     from './components/MapScreen';
import QRScanner     from './components/QRScanner';
import ARView        from './components/ARView';
import Schedule      from './components/Schedule';
import Profile       from './components/Profile';
import BottomNav     from './components/BottomNav';

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

function StudentRoute({ children }) {
  const { isAuthenticated, loading, isVisitor } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isVisitor) return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  const { isAuthenticated, loading, isVisitor } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

const HIDDEN_NAV_PATHS = ['/scan', '/ar', '/splash', '/login', '/register'];

function BottomNavGuard() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const hidden = HIDDEN_NAV_PATHS.some(p => pathname.startsWith(p));
  if (!isAuthenticated || hidden) return null;
  return <BottomNav />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Outer container centers on desktop, fills on mobile */}
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
          <AppShell />
          <BottomNavGuard />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}