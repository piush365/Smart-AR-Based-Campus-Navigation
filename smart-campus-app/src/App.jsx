import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import MapScreen from './components/MapScreen';
import QRScanner from './components/QRScanner';
import BottomNav from './components/BottomNav';
import 'leaflet/dist/leaflet.css'; // Important for the map!

function App() {
  // Global State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);

  return (
    <Router>
      {/* Mobile App Container */}
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative">
        
        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-16">
          <Routes>
            <Route path="/" element={
              <Home 
                currentLocation={currentLocation} 
                setDestination={setDestination} 
              />} 
            />
            <Route path="/map" element={
              <MapScreen 
                currentLocation={currentLocation} 
                destination={destination} 
              />} 
            />
            <Route path="/scan" element={
              <QRScanner 
                setCurrentLocation={setCurrentLocation} 
              />} 
            />
          </Routes>
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;