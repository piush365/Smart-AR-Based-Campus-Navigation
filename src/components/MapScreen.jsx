import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Search, X, Navigation2, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Custom markers
const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const BLUE_ICON  = makeIcon('#2563eb');
const GREEN_ICON = makeIcon('#16a34a');
const RED_ICON   = makeIcon('#dc2626');

export const MAP_NODES = {
  gate:    { name: 'Main Gate',       x: 55,  y: 45,  emoji: '🚪', desc: 'East campus entrance' },
  lab_1:   { name: 'Computer Lab',    x: 200, y: 120, emoji: '🖥️', desc: 'CS lab, Block B' },
  lab_2:   { name: 'Science Lab',     x: 360, y: 130, emoji: '🔬', desc: 'Physics & Chem lab' },
  lab_3:   { name: 'Electronics Lab', x: 200, y: 310, emoji: '⚡', desc: 'ECE lab, Block C' },
  lh_a:    { name: 'Lecture Hall A',  x: 130, y: 220, emoji: '📚', desc: 'Main auditorium wing' },
  lh_b:    { name: 'Lecture Hall B',  x: 305, y: 260, emoji: '📖', desc: 'East lecture wing' },
  cr_3:    { name: 'Classroom 3',     x: 420, y: 340, emoji: '🏫', desc: 'General classroom block' },
  library: { name: 'Library',         x: 250, y: 70,  emoji: '📕', desc: 'Central library, 3 floors' },
  canteen: { name: 'Canteen',         x: 385, y: 420, emoji: '🍽️', desc: 'Food court, Block D' },
  office:  { name: 'Admin Office',    x: 75,  y: 400, emoji: '🏢', desc: 'Administrative block' },
};

const BOUNDS = [[0, 0], [500, 500]];

// Simple BFS pathfinding through a grid of connections
const EDGES = [
  ['gate', 'lh_a'], ['gate', 'office'], ['gate', 'library'],
  ['library', 'lab_1'], ['library', 'lab_2'], ['library', 'lh_a'],
  ['lh_a', 'lab_1'], ['lh_a', 'lh_b'], ['lh_a', 'lab_3'],
  ['lab_1', 'lh_b'], ['lab_2', 'lh_b'], ['lab_2', 'cr_3'],
  ['lh_b', 'cr_3'], ['lh_b', 'canteen'], ['cr_3', 'canteen'],
  ['lab_3', 'office'], ['office', 'canteen'],
];

const buildPath = (from, to) => {
  if (!from || !to || from === to) return [];
  // BFS
  const adj = {};
  EDGES.forEach(([a, b]) => { adj[a] = adj[a] || []; adj[b] = adj[b] || []; adj[a].push(b); adj[b].push(a); });
  const visited = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    (adj[cur] || []).forEach(nb => { if (!(nb in visited)) { visited[nb] = cur; queue.push(nb); } });
  }
  if (!(to in visited)) return []; // no path
  const path = [];
  let cur = to;
  while (cur) { path.unshift(cur); cur = visited[cur]; }
  return path;
};

const MapScreen = ({ currentLocation, destination, setDestination }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const fromNode = currentLocation && MAP_NODES[currentLocation];
  const toNode   = destination   && MAP_NODES[destination];

  // Compute route path
  const routePath = buildPath(currentLocation, destination);
  const routePositions = routePath.map(id => [MAP_NODES[id].y, MAP_NODES[id].x]);

  const filtered = search.trim().length > 0
    ? Object.entries(MAP_NODES).filter(([, n]) =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.desc.toLowerCase().includes(search.toLowerCase())
      )
    : Object.entries(MAP_NODES);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const selectDest = (id) => {
    setDestination(id);
    setSearch('');
    setSearchOpen(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 16px',
        position: 'relative', zIndex: 20,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: searchOpen ? 10 : 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Campus Map
            </h2>
            {!searchOpen && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                {routePath.length > 1
                  ? `Route: ${routePath.length - 1} stops · tap marker for info`
                  : 'Tap a marker · search to set destination'}
              </p>
            )}
          </div>
          <button
            className="btn-icon"
            onClick={() => { setSearchOpen(v => !v); setSearch(''); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {searchOpen ? <X size={17} /> : <Search size={17} />}
          </button>
        </div>

        {/* Search */}
        {searchOpen && (
          <div style={{ position: 'relative' }}>
            <div className="input-wrap">
              <Search size={15} className="input-icon-left" />
              <input
                ref={searchRef}
                className="input input-icon"
                style={{ paddingTop: 10, paddingBottom: 10, fontSize: 14 }}
                placeholder="Search building, lab, hall…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Dropdown */}
            <div className="slide-down card" style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              maxHeight: 230, overflowY: 'auto', zIndex: 50, padding: 0, overflow: 'hidden',
            }}>
              {filtered.map(([id, node]) => (
                <button
                  key={id}
                  onClick={() => selectDest(id)}
                  style={{
                    width: '100%', padding: '11px 14px', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{node.emoji}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{node.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>{node.desc}</p>
                  </div>
                  {destination === id && <ArrowRight size={14} color="#2563eb" style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route info chips */}
        {!searchOpen && (fromNode || toNode) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {fromNode && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#16a34a', fontWeight: 500,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                {fromNode.name}
              </span>
            )}
            {fromNode && toNode && <ArrowRight size={12} color="var(--text-4)" />}
            {toNode && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#2563eb', fontWeight: 500,
              }}>
                <MapPin size={11} />
                {toNode.name}
              </span>
            )}
            {toNode && (
              <button
                onClick={() => setDestination(null)}
                style={{
                  background: 'none', border: '1px solid var(--border-strong)',
                  borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                  fontSize: 12, color: 'var(--text-3)',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapContainer
          crs={L.CRS.Simple}
          bounds={BOUNDS}
          style={{ height: '100%', width: '100%' }}
          zoom={0}
          minZoom={-1}
          maxZoom={3}
        >
          {/* Campus blueprint placeholder – light bg grid */}
          <ImageOverlay
            url="https://placehold.co/500x500/f3f4f6/d1d5db?text=·"
            bounds={BOUNDS}
          />

          {/* Route polyline */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              color="#2563eb"
              weight={3}
              opacity={0.85}
              dashArray="10 6"
            />
          )}

          {/* All markers */}
          {Object.entries(MAP_NODES).map(([id, node]) => {
            const isCurrent = id === currentLocation;
            const isDest    = id === destination;
            const isOnRoute = routePath.includes(id) && !isCurrent && !isDest;
            const icon = isCurrent ? GREEN_ICON : isDest ? RED_ICON : BLUE_ICON;
            return (
              <Marker key={id} position={[node.y, node.x]} icon={icon}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', padding: '10px 12px', minWidth: 140 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 15 }}>{node.emoji}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#111827' }}>{node.name}</p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>{node.desc}</p>
                    {isCurrent && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>📍 You are here</span>}
                    {!isDest && !isCurrent && (
                      <button
                        onClick={() => selectDest(id)}
                        style={{
                          display: 'block', width: '100%',
                          padding: '7px 0', border: '1px solid #bfdbfe',
                          borderRadius: 8, background: '#eff6ff', color: '#2563eb',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Set as destination
                      </button>
                    )}
                    {isDest && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>🎯 Destination</span>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating "Set location" prompt if no current location */}
        {!currentLocation && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 500,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              📍 Scan a QR code to set your location
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => navigate('/scan')}
            >
              Scan QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapScreen;