import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, CheckCircle } from 'lucide-react';

const QRScanner = ({ setCurrentLocation }) => {
  const [scanResult, setScanResult] = useState(null);
  const navigate = useNavigate();

  // Simulate a successful QR scan
  const simulateScan = () => {
    const simulatedNode = "gate"; // Let's pretend we scanned the Main Gate QR
    setScanResult("Main Gate");
    setCurrentLocation(simulatedNode);
    
    // Auto-redirect to home after 2 seconds
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Scan Location QR</h2>
      
      {/* Mock Camera Viewfinder */}
      <div className="w-64 h-64 border-4 border-dashed border-blue-400 rounded-3xl flex items-center justify-center bg-gray-50 mb-8 relative">
        {scanResult ? (
          <div className="text-green-500 flex flex-col items-center">
            <CheckCircle size={64} className="mb-2" />
            <p className="font-bold">Location Identified!</p>
          </div>
        ) : (
          <QrCode size={64} className="text-gray-300" />
        )}
      </div>

      <p className="text-gray-500 mb-8">
        Point your camera at any campus QR code to set your current location.
      </p>

      {/* Dev Tool: Simulate Scan Button */}
      <button 
        onClick={simulateScan}
        className="bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold w-full max-w-xs shadow-lg"
      >
        Simulate QR Scan (Dev Mode)
      </button>
    </div>
  );
};

export default QRScanner;