import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, QrCode, Calendar } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation(); // Gets current route path

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={24} /> },
    { name: 'Scan', path: '/scan', icon: <QrCode size={24} /> },
    { name: 'Map', path: '/map', icon: <Map size={24} /> },
    { name: 'Schedule', path: '/schedule', icon: <Calendar size={24} /> },
  ];

  return (
    <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.name} 
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;