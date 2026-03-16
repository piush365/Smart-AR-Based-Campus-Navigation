import React from 'react';
import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icons not showing in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapScreen = ({ currentLocation, destination }) => {
  // Mock Map Data (Replace with your actual X/Y coordinates later)
  const mapNodes = {
    gate: { name: "Main Gate", x: 100, y: 100 },
    lab_1: { name: "Lab 1", x: 400, y: 300 }
  };

  // Dimensions for your campus map image
  const bounds = [[0, 0], [500, 500]]; 

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white shadow-sm z-10 relative">
        <h2 className="text-xl font-bold text-gray-800">Campus Map</h2>
        <p className="text-sm text-gray-500">
          {currentLocation && destination 
            ? `Routing: ${currentLocation} ➔ ${destination}`
            : "Select a destination to route."}
        </p>
      </div>

      <div className="flex-1 bg-gray-200">
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={bounds} 
          style={{ height: "100%", width: "100%" }}
          zoom={1}
        >
          {/* Put a placeholder image in your 'public' folder named 'campus-map.png' */}
          {/* For testing, we are using a random placeholder image URL */}
          <ImageOverlay 
            url="https://via.placeholder.com/500x500.png?text=Campus+Blueprint" 
            bounds={bounds} 
          />

          {/* Marker for Current Location */}
          {currentLocation && mapNodes[currentLocation] && (
            <Marker position={[mapNodes[currentLocation].y, mapNodes[currentLocation].x]}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {/* Marker for Destination */}
          {destination && mapNodes[destination] && (
            <Marker position={[mapNodes[destination].y, mapNodes[destination].x]}>
              <Popup>Destination: {mapNodes[destination].name}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapScreen;