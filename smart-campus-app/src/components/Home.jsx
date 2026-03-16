import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowRight } from 'lucide-react';

const Home = ({ currentLocation, setDestination }) => {
  const navigate = useNavigate();

  // Mock Next Class Data (Later, fetch this from database based on time)
  const nextClass = {
    subject: "Data Structures & Algorithms",
    time: "10:30 AM - 11:30 AM",
    room: "Lab 1",
    nodeId: "lab_1"
  };

  const handleNavigate = () => {
    setDestination(nextClass.nodeId);
    navigate('/map');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Hello, Student! 👋</h1>
      
      {/* Current Location Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
        <MapPin className="text-blue-500" />
        <div>
          <p className="text-sm text-gray-500">Current Location</p>
          <p className="font-semibold text-blue-900">
            {currentLocation ? currentLocation : "Unknown (Scan a QR code)"}
          </p>
        </div>
      </div>

      {/* Timetable Widget */}
      <h2 className="text-lg font-bold text-gray-800 mb-3">Up Next</h2>
      <div className="bg-white border shadow-sm rounded-xl p-5 mb-6">
        <div className="flex items-center space-x-2 text-gray-500 text-sm mb-2">
          <Clock size={16} />
          <span>{nextClass.time}</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800">{nextClass.subject}</h3>
        <p className="text-gray-600 mt-1">Room: {nextClass.room}</p>
        
        <button 
          onClick={handleNavigate}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition"
        >
          <span>Navigate to Class</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Home;