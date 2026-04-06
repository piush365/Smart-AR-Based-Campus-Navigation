/**
 * src/components/MapScreen.jsx
 *
 * Walchand College of Engineering, Sangli — campus map.
 *
 * All coordinates extracted directly from the uploaded map.osm file —
 * these are the exact GPS positions of every named building on campus.
 *
 * Bounds from OSM file:
 *   minlat=16.8415020  minlon=74.5974950
 *   maxlat=16.8460810  maxlon=74.6059170
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Campus nodes — coordinates from map.osm ─────────────────────────────────
const CAMPUS_CENTER = [16.8448, 74.6010];

const NODES = {
  'main-gate': {
    pos:   [16.8458771, 74.6025945],
    label: 'Walchand Front Gate',
    icon:  '🚪',
    desc:  'Main campus entrance',
  },
  'cse-dept': {
    pos:   [16.8457228, 74.6008947],
    label: 'CSE Department',
    icon:  '💻',
    desc:  'Dept of Computer Science & Engineering',
  },
  'electronics-dept': {
    pos:   [16.8456756, 74.6014655],
    label: 'Electronics Dept',
    icon:  '⚡',
    desc:  'Department of Electronics',
  },
  'electrical-dept': {
    pos:   [16.8450841, 74.6013664],
    label: 'Electrical Dept',
    icon:  '🔌',
    desc:  'Department of Electrical Engineering',
  },
  'mechanical-dept': {
    pos:   [16.8450645, 74.6002349],
    label: 'Mechanical Dept',
    icon:  '⚙️',
    desc:  'Department of Mechanical Engineering',
  },
  'civil-dept': {
    pos:   [16.8446665, 74.5999993],
    label: 'Civil Department',
    icon:  '🏗️',
    desc:  'Department of Civil Engineering',
  },
  'civil-lab': {
    pos:   [16.8446136, 74.6002719],
    label: 'Civil Dept Lab',
    icon:  '🔩',
    desc:  'Civil Department Laboratory',
  },
  'mechanical-lab': {
    pos:   [16.8453697, 74.6003016],
    label: 'Mechanical Lab',
    icon:  '🔧',
    desc:  'Mechanical Department Laboratory',
  },
  'workshop': {
    pos:   [16.8459236, 74.6000020],
    label: 'Workshop Lab',
    icon:  '🛠️',
    desc:  'Workshop Laboratory',
  },
  'library': {
    pos:   [16.8445311, 74.6018751],
    label: 'Library',
    icon:  '📚',
    desc:  'Ajit Gulabchand Central Library',
  },
  'tilak-hall': {
    pos:   [16.8444692, 74.6012421],
    label: 'Tilak Hall',
    icon:  '🎭',
    desc:  'Community centre / seminar hall',
  },
  'govt-canteen': {
    pos:   [16.8433437, 74.6019268],
    label: 'Government Canteen',
    icon:  '🍽️',
    desc:  'Main student canteen',
  },
  'back-canteen': {
    pos:   [16.8455316, 74.5997814],
    label: 'Back Canteen',
    icon:  '☕',
    desc:  'Back canteen near workshop',
  },
  'hostel': {
    pos:   [16.8443602, 74.6035270],
    label: 'Walchand Hostel',
    icon:  '🏠',
    desc:  'Student hostel block',
  },
  'exam-center': {
    pos:   [16.8439450, 74.6022995],
    label: 'Exam Center',
    icon:  '📝',
    desc:  'Examination centre',
  },
  'polytechnic': {
    pos:   [16.8441554, 74.6024772],
    label: 'Polytechnic Wing',
    icon:  '🏫',
    desc:  'Polytechnic department wing',
  },
  'gym-khana': {
    pos:   [16.8437275, 74.6015360],
    label: 'Gym Khana',
    icon:  '🏋️',
    desc:  'Fitness centre & sports facilities',
  },
  'programming-lab': {
    pos:   [16.8455684, 74.6021467],
    label: 'Programming Lab',
    icon:  '🖥️',
    desc:  'Programming Lab / Mini CCF',
  },
  'students-section': {
    pos:   [16.8451726, 74.6026443],
    label: 'Students Section',
    icon:  '🏛️',
    desc:  'Administrative students section',
  },
  'open-theatre': {
    pos:   [16.8446143, 74.6005588],
    label: 'Open Theatre',
    icon:  '🎪',
    desc:  'Open air theatre',
  },
  'iot-hut': {
    pos:   [16.8454589, 74.6010060],
    label: 'IoT Hut',
    icon:  '📡',
    desc:  'Internet of Things lab hut',
  },
  'it-hut': {
    pos:   [16.8454463, 74.6014165],
    label: 'IT Hut',
    icon:  '💡',
    desc:  'IT department hut',
  },
  'back-gate': {
    pos:   [16.8456363, 74.6002940],
    label: 'Back Gate',
    icon:  '🔓',
    desc:  'Rear campus exit',
  },
  'chinar-circle': {
    pos:   [16.8454197, 74.5953722],
    label: 'Chinar Circle',
    icon:  '🔵',
    desc:  'Junction landmark near campus',
  },
};

// ── Walkable edges matching real campus path layout ─────────────────────────
const EDGES = {
  'main-gate':        ['programming-lab', 'students-section', 'hostel', 'exam-center'],
  'programming-lab':  ['main-gate', 'electronics-dept', 'cse-dept', 'it-hut', 'iot-hut'],
  'cse-dept':         ['programming-lab', 'electronics-dept', 'iot-hut', 'back-canteen'],
  'electronics-dept': ['cse-dept', 'programming-lab', 'it-hut', 'electrical-dept'],
  'electrical-dept':  ['electronics-dept', 'mechanical-dept', 'tilak-hall', 'library'],
  'mechanical-dept':  ['electrical-dept', 'civil-dept', 'mechanical-lab', 'back-canteen', 'workshop'],
  'civil-dept':       ['mechanical-dept', 'civil-lab', 'open-theatre'],
  'civil-lab':        ['civil-dept', 'mechanical-dept'],
  'mechanical-lab':   ['mechanical-dept', 'workshop'],
  'workshop':         ['mechanical-lab', 'back-canteen', 'back-gate'],
  'back-gate':        ['workshop', 'back-canteen'],
  'back-canteen':     ['workshop', 'back-gate', 'cse-dept', 'mechanical-dept'],
  'library':          ['electrical-dept', 'tilak-hall', 'govt-canteen', 'open-theatre', 'students-section'],
  'tilak-hall':       ['library', 'electrical-dept', 'open-theatre', 'students-section'],
  'open-theatre':     ['tilak-hall', 'library', 'civil-dept'],
  'govt-canteen':     ['library', 'exam-center', 'polytechnic', 'gym-khana'],
  'students-section': ['main-gate', 'library', 'tilak-hall'],
  'exam-center':      ['main-gate', 'govt-canteen', 'polytechnic'],
  'polytechnic':      ['exam-center', 'govt-canteen', 'hostel'],
  'hostel':           ['main-gate', 'polytechnic'],
  'gym-khana':        ['govt-canteen'],
  'iot-hut':          ['cse-dept', 'programming-lab', 'it-hut'],
  'it-hut':           ['iot-hut', 'electronics-dept', 'programming-lab'],
  'chinar-circle':    [],
};

// ── Haversine distance (metres) ─────────────────────────────────────────────
function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Dijkstra ────────────────────────────────────────────────────────────────
function dijkstra(start, end) {
  if (start === end) return { path: [start], totalDist: 0 };
  const dist = {};
  const prev = {};
  const unvisited = new Set(Object.keys(NODES));
  for (const id of unvisited) dist[id] = Infinity;
  dist[start] = 0;
  while (unvisited.size) {
    let u = null;
    for (const id of unvisited) {
      if (u === null || dist[id] < dist[u]) u = id;
    }
    if (dist[u] === Infinity || u === end) break;
    unvisited.delete(u);
    for (const v of EDGES[u] || []) {
      if (!unvisited.has(v)) continue;
      const alt = dist[u] + haversine(NODES[u].pos, NODES[v].pos);
      if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    }
  }
  if (dist[end] === Infinity) return null;
  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return { path, totalDist: dist[end] };
}

// ── Leaflet icons ────────────────────────────────────────────────────────────
function nodeIcon(emoji, variant = 'default') {
  const bg     = variant === 'origin' ? '#1a73e8' : variant === 'dest' ? '#4caf50' : '#fff';
  const border = variant === 'origin' ? '#0d47a1' : variant === 'dest' ? '#2e7d32' : '#bbb';
  const pulse  = variant === 'origin' ? 'animation:nPulse 1.8s ease-in-out infinite;' : '';
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:2.5px solid ${border};${pulse}display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${emoji}</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function liveDotIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 4px rgba(26,115,232,0.3);"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const INJECTED_CSS = `
@keyframes nPulse {
  0%,100% { box-shadow:0 2px 8px rgba(0,0,0,0.25),0 0 0 0 rgba(26,115,232,0.5); }
  50%      { box-shadow:0 2px 8px rgba(0,0,0,0.25),0 0 0 10px rgba(26,115,232,0); }
}
.wce-tip { background:#fff!important;border:1.5px solid #e0e0e0!important;border-radius:8px!important;padding:4px 10px!important;font-size:12px!important;font-weight:600!important;color:#111!important;box-shadow:0 2px 8px rgba(0,0,0,0.12)!important;white-space:nowrap!important; }
.wce-tip::before { display:none!important; }
`;

// ── Component ────────────────────────────────────────────────────────────────
export default function MapScreen({ currentLocation: propLocation, destination: propDest, setDestination: propSetDest }) {
  const navigate  = useNavigate();
  const routerLoc = useLocation();
  const mapEl     = useRef(null);
  const map       = useRef(null);
  const routeLine = useRef(null);
  const markers   = useRef({});
  const gpsMark   = useRef(null);
  const gpsWatch  = useRef(null);

  const [origin,     setOrigin]     = useState(propLocation || routerLoc.state?.from || null);
  const [dest,       setDestLocal]  = useState(propDest || routerLoc.state?.destination || null);
  const [result,     setResult]     = useState(null);
  const [noPath,     setNoPath]     = useState(false);
  const [steps,      setSteps]      = useState([]);
  const [showSteps,  setShowSteps]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('origin');
  const [locating,   setLocating]   = useState(false);
  const [search,     setSearch]     = useState('');

  function setDest(id) {
    setDestLocal(id);
    propSetDest?.(id);
  }

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;

    const style = document.createElement('style');
    style.textContent = INJECTED_CSS;
    document.head.appendChild(style);

    const m = L.map(mapEl.current, {
      center: CAMPUS_CENTER,
      zoom: 17,
      zoomControl: false,
      attributionControl: true,
    });
    map.current = m;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(m);

    // Campus boundary (from OSM bounds)
    L.polygon([
      [16.8415020, 74.5974950],
      [16.8415020, 74.6059170],
      [16.8460810, 74.6059170],
      [16.8460810, 74.5974950],
    ], {
      color: '#1a73e8', weight: 2, opacity: 0.6,
      fillColor: '#1a73e8', fillOpacity: 0.04,
      dashArray: '6 4',
    }).addTo(m).bindTooltip('WCE Campus', { className: 'wce-tip', sticky: true });

    Object.entries(NODES).forEach(([id, node]) => {
      const mk = L.marker(node.pos, {
        icon: nodeIcon(node.icon, 'default'),
        title: node.label,
      }).addTo(m);

      mk.bindTooltip(node.label, {
        permanent: false, direction: 'top', offset: [0, -20], className: 'wce-tip',
      });

      mk.on('click', () => {
        setOrigin(prev => {
          if (!prev) {
            return id;
          } else {
            setDestLocal(id);
            propSetDest?.(id);
            return prev;
          }
        });
      });

      markers.current[id] = mk;
    });

    return () => {
      m.remove();
      map.current = null;
      if (gpsWatch.current) navigator.geolocation.clearWatch(gpsWatch.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    routeLine.current?.remove();
    routeLine.current = null;

    Object.entries(markers.current).forEach(([id, mk]) => {
      const v = id === origin ? 'origin' : id === dest ? 'dest' : 'default';
      mk.setIcon(nodeIcon(NODES[id].icon, v));
    });

    if (!origin || !dest || origin === dest) {
      setResult(null); setNoPath(false); setSteps([]); return;
    }

    const found = dijkstra(origin, dest);
    if (!found) {
      setResult(null); setNoPath(true); setSteps([]); return;
    }

    setResult(found);
    setNoPath(false);
    setSteps(
      found.path.slice(0, -1).map((id, i) => {
        const nxt = found.path[i + 1];
        return {
          fromLabel: NODES[id].label,
          fromIcon:  NODES[id].icon,
          toLabel:   NODES[nxt].label,
          toIcon:    NODES[nxt].icon,
          dist:      haversine(NODES[id].pos, NODES[nxt].pos),
        };
      })
    );

    const latlngs = found.path.map(id => NODES[id].pos);
    routeLine.current = L.polyline(latlngs, {
      color: '#1a73e8', weight: 5, opacity: 0.9,
      dashArray: '10 8', lineJoin: 'round', lineCap: 'round',
    }).addTo(m);

    m.fitBounds(routeLine.current.getBounds(), { padding: [80, 80], maxZoom: 20 });
  }, [origin, dest]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  const locateMe = useCallback(() => {
    const m = map.current;
    if (!m || !navigator.geolocation) return;
    setLocating(true);
    if (gpsWatch.current) navigator.geolocation.clearWatch(gpsWatch.current);
    gpsWatch.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const ll = [coords.latitude, coords.longitude];
        setLocating(false);
        if (!gpsMark.current) {
          gpsMark.current = L.marker(ll, { icon: liveDotIcon(), zIndexOffset: 1000 }).addTo(m);
        } else {
          gpsMark.current.setLatLng(ll);
        }
        m.setView(ll, 19);
      },
      (err) => { console.warn('GPS:', err.message); setLocating(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const openPicker = (mode) => { setPickerMode(mode); setSearch(''); setShowPicker(true); };
  const pickNode   = (id)   => { pickerMode === 'origin' ? setOrigin(id) : setDest(id); setShowPicker(false); };
  const clearAll   = ()     => { setOrigin(null); setDest(null); setShowSteps(false); propSetDest?.(null); };

  const filteredNodes = Object.entries(NODES).filter(([, node]) =>
    node.label.toLowerCase().includes(search.toLowerCase()) ||
    node.desc.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={c.root}>
      <div ref={mapEl} style={c.map} />

      {/* Header */}
      <div style={c.header}>
        <button onClick={() => navigate(-1)} style={c.hBtn}>←</button>
        <div>
          <div style={c.hTitle}>WCE Campus Map</div>
          <div style={c.hSub}>Walchand College of Engineering, Sangli</div>
        </div>
        <button onClick={clearAll} style={{ ...c.hBtn, color: '#e53935', fontSize: '13px' }}>Clear</button>
      </div>

      {/* Map controls */}
      <div style={c.controls}>
        <button style={c.ctrlBtn} onClick={() => map.current?.zoomIn()}>+</button>
        <button style={c.ctrlBtn} onClick={() => map.current?.zoomOut()}>−</button>
        <div style={c.divider} />
        <button style={{ ...c.ctrlBtn, color: locating ? '#1a73e8' : '#555' }} onClick={locateMe}>
          {locating ? '⟳' : '⊙'}
        </button>
      </div>

      {/* O→D bar */}
      <div style={c.odBar}>
        <button style={c.odBtn(!!origin)} onClick={() => openPicker('origin')}>
          <span style={c.dot('#1a73e8')} />
          <span style={c.odLabel}>{origin ? NODES[origin].label : 'Set start'}</span>
        </button>
        <span style={c.arrow}>→</span>
        <button style={c.odBtn(!!dest)} onClick={() => openPicker('destination')}>
          <span style={c.dot('#4caf50')} />
          <span style={c.odLabel}>{dest ? NODES[dest].label : 'Set destination'}</span>
        </button>
      </div>

      {/* Route summary */}
      {result && (
        <button style={c.strip('#e8f0fe')} onClick={() => setShowSteps(v => !v)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={c.badge}>{result.path.length - 1} hop{result.path.length > 2 ? 's' : ''}</span>
            <span style={c.stripText}>{result.totalDist}m walking</span>
          </span>
          <span style={c.stripText}>{showSteps ? '▾' : '▸'} Directions</span>
        </button>
      )}
      {noPath && (
        <div style={c.strip('#fff3cd')}>
          <span style={{ ...c.stripText, color: '#856404' }}>No path found between these locations</span>
        </div>
      )}

      {/* Directions */}
      {showSteps && steps.length > 0 && (
        <div style={c.dirPanel}>
          {steps.map((step, i) => (
            <div key={i} style={c.stepRow}>
              <div style={c.stepNum}>{i + 1}</div>
              <div style={c.stepBody}>
                <span style={{ fontWeight: 600 }}>{step.fromIcon} {step.fromLabel}</span>
                <span style={{ color: '#aaa', margin: '0 4px' }}>→</span>
                <span>{step.toIcon} {step.toLabel}</span>
                <span style={c.stepDist}>{step.dist}m</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Node picker bottom sheet */}
      {showPicker && (
        <div style={c.overlay} onClick={() => setShowPicker(false)}>
          <div style={c.sheet} onClick={e => e.stopPropagation()}>
            <div style={c.handle} />
            <p style={c.sheetTitle}>
              {pickerMode === 'origin' ? '📍 Where are you?' : '🏁 Where to go?'}
            </p>
            {/* Search box */}
            <div style={{ padding: '0 16px 10px' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search buildings…"
                autoFocus
                style={c.searchInput}
              />
            </div>
            <div style={c.list}>
              {filteredNodes.map(([id, node]) => (
                <button key={id} style={c.listItem} onClick={() => pickNode(id)}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{node.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={c.listName}>{node.label}</span>
                    <span style={c.listDesc}>{node.desc}</span>
                  </div>
                  {id === origin && <span style={c.pill('#1a73e8', '#e8f0fe')}>Start</span>}
                  {id === dest   && <span style={c.pill('#2e7d32', '#e8f5e9')}>End</span>}
                </button>
              ))}
              {filteredNodes.length === 0 && (
                <p style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: 14 }}>No buildings found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const c = {
  root:      { position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' },
  map:       { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  header:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', paddingTop: 'calc(10px + env(safe-area-inset-top))', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,0,0,0.07)' },
  hTitle:    { fontSize: '15px', fontWeight: 700, color: '#111' },
  hSub:      { fontSize: '11px', color: '#888', marginTop: 1 },
  hBtn:      { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#1a73e8', padding: '4px 8px', fontWeight: 600 },
  controls:  { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 900, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #e8e8e8' },
  ctrlBtn:   { width: 38, height: 38, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  divider:   { height: 1, background: '#e8e8e8', margin: '0 6px' },
  odBar:     { position: 'absolute', bottom: 'calc(76px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 14, padding: '10px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  odBtn:     (a) => ({ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: `1.5px solid ${a ? '#1a73e8' : '#e0e0e0'}`, borderRadius: 10, padding: '9px 11px', cursor: 'pointer', textAlign: 'left' }),
  dot:       (color) => ({ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }),
  odLabel:   { fontSize: 13, fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  arrow:     { fontSize: 16, color: '#aaa', flexShrink: 0 },
  strip:     (bg) => ({ position: 'absolute', bottom: 'calc(138px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, borderRadius: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', width: 'calc(100% - 24px)' }),
  badge:     { background: '#1a73e8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10 },
  stripText: { fontSize: 13, color: '#1a73e8', fontWeight: 600 },
  dirPanel:  { position: 'absolute', bottom: 'calc(192px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto' },
  stepRow:   { display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f0f0f0' },
  stepNum:   { width: 20, height: 20, borderRadius: '50%', background: '#1a73e8', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepBody:  { display: 'flex', flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: '#333', flex: 1 },
  stepDist:  { marginLeft: 'auto', fontSize: 11, color: '#999', paddingLeft: 8 },
  overlay:   { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  sheet:     { background: '#fff', borderRadius: '20px 20px 0 0', paddingTop: 12, maxHeight: '75dvh', display: 'flex', flexDirection: 'column' },
  handle:    { width: 40, height: 4, background: '#e0e0e0', borderRadius: 2, margin: '0 auto 10px' },
  sheetTitle:{ fontSize: 15, fontWeight: 700, color: '#111', padding: '0 20px 10px', margin: 0, borderBottom: '1px solid #f0f0f0' },
  searchInput:{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f8f9fa' },
  list:      { overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)', flex: 1 },
  listItem:  { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', textAlign: 'left' },
  listName:  { fontSize: 14, fontWeight: 600, color: '#111' },
  listDesc:  { fontSize: 12, color: '#888', marginTop: 2 },
  pill:      (color, bg) => ({ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: bg, color, whiteSpace: 'nowrap' }),
};
