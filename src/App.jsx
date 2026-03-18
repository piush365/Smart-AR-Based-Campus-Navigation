import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import SplashScreen  from './components/SplashScreen';
import Login         from './components/Login';
import Register      from './components/Register';
import Home          from './components/Home';
import MapScreen     from './components/MapScreen';
import QRScanner     from './components/QRScanner';
import Schedule      from './components/Schedule';
import Profile       from './components/Profile';
import ARView        from './components/ARView';
import BottomNav     from './components/BottomNav';

import 'leaflet/dist/leaflet.css';

// ─── Route Guards ─────────────────────────────────────────────
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const Public = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
};

// ─── App Shell (authenticated layout) ────────────────────────
const Shell = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination]         = useState(null);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480,
      margin: '0 auto',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
    }}>
      {/* Scrollable main content – pad bottom for nav */}
      <div id="main-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 60 }}>
        <Routes>
          <Route path="/"         element={<Home         currentLocation={currentLocation} setDestination={setDestination} />} />
          <Route path="/map"      element={<MapScreen    currentLocation={currentLocation} destination={destination} setDestination={setDestination} />} />
          <Route path="/scan"     element={<QRScanner    setCurrentLocation={setCurrentLocation} />} />
          <Route path="/schedule" element={<Schedule     setDestination={setDestination} />} />
          <Route path="/profile"  element={<Profile />} />
          <Route path="/ar"       element={<ARView />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
};

// ─── Root with Splash ─────────────────────────────────────────
const AppRoutes = () => {
  const [splashDone, setSplashDone] = useState(false);
  const { loading } = useAuth();

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (loading)     return null;

  return (
    <Routes>
      <Route path="/login"    element={<Public><Login    /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route path="/*"        element={<Protected><Shell /></Protected>} />
    </Routes>
  );
};

// ─── Root ─────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;