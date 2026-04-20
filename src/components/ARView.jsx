/**
 * ARView.jsx — WCE Campus AR Navigation
 *
 * Architecture:
 *  1. GPS (watchPosition) → user's real lat/lon
 *  2. DeviceOrientationEvent → compass heading
 *  3. For each campus node: compute bearing & distance from user's GPS position
 *  4. Angular diff between node bearing and compass heading → screen X position
 *  5. Canvas labels drawn on top of live camera feed
 *  6. Destination mode: shows step-by-step arrow navigation overlay
 *
 * Falls back gracefully:
 *  - No GPS → uses main gate as reference position
 *  - No compass → demo mode (nodes spread across screen)
 *  - No camera → black background with overlay
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Campus nodes — exact GPS coords from map.osm ─────────────────────────────
const CAMPUS_NODES = [
  { id: 'main-gate',        label: 'Front Gate',       icon: '🚪', lat: 16.8458580, lon: 74.6026025, color: '#1a73e8' },
  { id: 'programming-lab',  label: 'Programming Lab',  icon: '🖥️', lat: 16.8455398, lon: 74.6021954, color: '#34a853' },
  { id: 'students-section', label: 'Students Section', icon: '🏛️', lat: 16.8451671, lon: 74.6026252, color: '#34a853' },
  { id: 'cse-dept',         label: 'CSE Dept',         icon: '💻', lat: 16.8458265, lon: 74.6009176, color: '#4285F4' },
  { id: 'dbe-lab',          label: 'DBE Lab',          icon: '🗄️', lat: 16.8457900, lon: 74.6009899, color: '#4285F4' },
  { id: 'electronics-dept', label: 'Electronics Dept', icon: '⚡', lat: 16.8456315, lon: 74.6012167, color: '#FBBC04' },
  { id: 'it-hut',           label: 'IT Hut',           icon: '💡', lat: 16.8454468, lon: 74.6014169, color: '#FBBC04' },
  { id: 'iot-hut',          label: 'IoT Hut',          icon: '📡', lat: 16.8454590, lon: 74.6010059, color: '#FF6D00' },
  { id: 'electrical-dept',  label: 'Electrical Dept',  icon: '🔌', lat: 16.8450496, lon: 74.6014291, color: '#9C27B0' },
  { id: 'library',          label: 'Library',          icon: '📚', lat: 16.8445278, lon: 74.6018749, color: '#00ACC1' },
  { id: 'ganpati-mandir',   label: 'Ganpati Mandir',   icon: '🛕', lat: 16.8449039, lon: 74.6018448, color: '#E91E63' },
  { id: 'tilak-hall',       label: 'Tilak Hall',       icon: '🎭', lat: 16.8444313, lon: 74.6013102, color: '#8D6E63' },
  { id: 'classroom-complex',label: 'Academic Complex', icon: '🏢', lat: 16.8448709, lon: 74.6006618, color: '#607D8B' },
  { id: 'classroom-19',     label: 'Class Room 19',    icon: '🏫', lat: 16.8444950, lon: 74.6005203, color: '#607D8B' },
  { id: 'open-theatre',     label: 'Open Theatre',     icon: '🎪', lat: 16.8446228, lon: 74.6005734, color: '#26A69A' },
  { id: 'civil-dept',       label: 'Civil Dept',       icon: '🏗️', lat: 16.8446620, lon: 74.6000100, color: '#795548' },
  { id: 'mechanical-dept',  label: 'Mechanical Dept',  icon: '⚙️', lat: 16.8451780, lon: 74.6002689, color: '#F44336' },
  { id: 'back-canteen',     label: 'Back Canteen',     icon: '☕', lat: 16.8455316, lon: 74.5997814, color: '#FF5722' },
  { id: 'back-gate',        label: 'Back Gate',        icon: '🔓', lat: 16.8459208, lon: 74.6000001, color: '#9E9E9E' },
  { id: 'govt-canteen',     label: 'Govt Canteen',     icon: '🍽️', lat: 16.8433600, lon: 74.6019048, color: '#26A69A' },
  { id: 'lipton',           label: 'Lipton Café',      icon: '☕', lat: 16.8444630, lon: 74.6023384, color: '#795548' },
  { id: 'exam-center',      label: 'Exam Center',      icon: '📝', lat: 16.8439450, lon: 74.6022995, color: '#EF5350' },
  { id: 'polytechnic',      label: 'Polytechnic',      icon: '🏫', lat: 16.8441554, lon: 74.6024772, color: '#5C6BC0' },
  { id: 'gym-khana',        label: 'Gym Khana',        icon: '🏋️', lat: 16.8437275, lon: 74.6015360, color: '#43A047' },
  { id: 'hostel',           label: 'Hostel',           icon: '🏠', lat: 16.8452651, lon: 74.6033729, color: '#5C6BC0' },
];

// Campus centre fallback when GPS unavailable
const CAMPUS_CENTER = { lat: 16.8448, lon: 74.6010 };

// Horizontal field-of-view assumed for rear camera
const HFOV = 65;

// ── Geo math ─────────────────────────────────────────────────────────────────
function toRad(d) { return d * Math.PI / 180; }

function getBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function angularDiff(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function getDirectionArrow(bearing) {
  const dirs = ['↑','↗','→','↘','↓','↙','←','↖'];
  return dirs[Math.round(bearing / 45) % 8];
}

function getCardinalLabel(bearing) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(bearing / 45) % 8];
}

// ── Canvas drawing ────────────────────────────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawLabel(ctx, { x, y, node, dist, opacity, isSelected, isDest }) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, opacity);

  const PAD = 12;
  const isHighlight = isSelected || isDest;
  const mainFont = isHighlight ? 'bold 14px system-ui,sans-serif' : '600 13px system-ui,sans-serif';
  const subFont  = '11px system-ui,sans-serif';

  ctx.font = mainFont;
  const labelW = ctx.measureText(node.label).width;
  ctx.font = subFont;
  const distStr = dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`;
  const distW = ctx.measureText(distStr).width;

  const boxW = Math.max(labelW, distW) + PAD * 2 + 28; // 28 for icon
  const boxH = 58;
  const boxX = Math.max(4, Math.min(ctx.canvas.width - boxW - 4, x - boxW/2));
  const boxY = y - boxH;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  // Background
  ctx.fillStyle = isDest ? node.color
    : isSelected ? 'rgba(255,255,255,0.96)'
    : 'rgba(0,0,0,0.72)';
  drawRoundRect(ctx, boxX, boxY, boxW, boxH, 12);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Colour accent left bar (when not selected/dest)
  if (!isHighlight) {
    ctx.fillStyle = node.color;
    drawRoundRect(ctx, boxX, boxY, 4, boxH, [12,0,0,12]);
    ctx.fill();
  }

  // Icon
  ctx.font = '18px system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.icon, boxX + PAD, boxY + 22);

  // Label
  ctx.font = mainFont;
  ctx.fillStyle = isDest || isSelected ? (isDest ? '#fff' : '#111') : '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(node.label, boxX + PAD + 24, boxY + 22);

  // Distance + direction
  ctx.font = subFont;
  ctx.fillStyle = isDest ? 'rgba(255,255,255,0.85)' : isSelected ? '#555' : 'rgba(255,255,255,0.6)';
  ctx.fillText(distStr, boxX + PAD + 24, boxY + 42);

  // Pointer triangle
  ctx.fillStyle = isDest ? node.color
    : isSelected ? 'rgba(255,255,255,0.96)'
    : 'rgba(0,0,0,0.72)';
  const midX = boxX + boxW / 2;
  ctx.beginPath();
  ctx.moveTo(midX - 7, boxY + boxH);
  ctx.lineTo(midX + 7, boxY + boxH);
  ctx.lineTo(midX, boxY + boxH + 9);
  ctx.closePath();
  ctx.fill();

  // Dest star
  if (isDest) {
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText('★ DEST', boxX + boxW - PAD, boxY + 42);
  }

  ctx.restore();
}

function drawCompass(ctx, heading, W) {
  ctx.save();
  const cx = W - 44, cy = 54, r = 28;
  ctx.globalAlpha = 0.85;

  // Circle bg
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // N needle
  const angle = toRad(-heading);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#EA4335';
  ctx.beginPath();
  ctx.moveTo(0, -r + 6);
  ctx.lineTo(4, 0);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, r - 6);
  ctx.lineTo(4, 0);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.font = 'bold 10px system-ui,sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r + 10);
  ctx.fillText(Math.round(heading) + '°', cx, cy + r - 10);
  ctx.restore();
}

function drawDestArrow(ctx, W, H, bearing, heading, dist) {
  const diff = angularDiff(bearing, heading);
  const cx = W / 2, cy = H * 0.72;
  const r = 52;

  ctx.save();
  ctx.globalAlpha = 0.9;

  // Ring
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI*2); ctx.stroke();

  // Arrow
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(toRad(diff));

  ctx.fillStyle = '#34a853';
  ctx.shadowColor = 'rgba(52,168,83,0.6)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(0, -(r + 14));
  ctx.lineTo(14, -r + 10);
  ctx.lineTo(6, -r + 10);
  ctx.lineTo(6, r - 20);
  ctx.lineTo(-6, r - 20);
  ctx.lineTo(-6, -r + 10);
  ctx.lineTo(-14, -r + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Distance label
  const distStr = dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`;
  ctx.font = 'bold 22px system-ui,sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(distStr, cx, cy);

  ctx.font = '12px system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('to destination', cx, cy + 22);

  // Turn indicator
  const turnLabel = Math.abs(diff) < 15 ? 'Straight ahead'
    : diff < 0 ? `Turn left ${Math.abs(Math.round(diff))}°`
    : `Turn right ${Math.round(diff)}°`;
  ctx.font = 'bold 13px system-ui,sans-serif';
  ctx.fillStyle = '#34a853';
  ctx.fillText(turnLabel, cx, cy - 26);

  ctx.restore();
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ARView({ currentLocation, setCurrentLocation, setDestination: propSetDest }) {
  const navigate   = useNavigate();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const headingRef = useRef(null);   // live compass (degrees)
  const gpsRef     = useRef(null);   // { lat, lon } live GPS
  const gpsWatchId = useRef(null);
  const selectedRef = useRef(null);  // avoids stale closure in rAF

  const [status,       setStatus]       = useState('init');
  const [gpsStatus,    setGpsStatus]    = useState('waiting'); // waiting|ok|denied|unavail
  const [sensorStatus, setSensorStatus] = useState('waiting'); // waiting|ok|demo
  const [selectedNode, setSelectedNode] = useState(null);
  const [destNode,     setDestNode]     = useState(null);
  const destRef = useRef(null);
  const [showNodeList, setShowNodeList] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');

  // ── Camera ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('camera-ok');
        startGPS();
        requestCompass();
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.name === 'NotAllowedError'
            ? 'Camera denied — AR needs camera access.' : `Camera: ${err.message}`);
          setStatus('no-camera');
          startGPS();
          requestCompass();
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []); // eslint-disable-line

  // ── GPS ─────────────────────────────────────────────────────────────────────
  function startGPS() {
    if (!navigator.geolocation) {
      setGpsStatus('unavail');
      gpsRef.current = CAMPUS_CENTER;
      startRenderLoop();
      return;
    }
    gpsWatchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        gpsRef.current = { lat: coords.latitude, lon: coords.longitude };
        setGpsStatus('ok');
      },
      (err) => {
        if (!gpsRef.current) {
          gpsRef.current = CAMPUS_CENTER;
          setGpsStatus(err.code === 1 ? 'denied' : 'unavail');
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
    );
  }

  // ── Compass ─────────────────────────────────────────────────────────────────
  function handleOrientation(e) {
    let h = e.webkitCompassHeading ?? (e.absolute ? (360 - (e.alpha ?? 0)) % 360 : null);
    if (h !== null) {
      headingRef.current = h;
      setSensorStatus('ok');
    }
  }

  async function requestCompass() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') { setSensorStatus('demo'); startRenderLoop(); return; }
      } catch { setSensorStatus('demo'); startRenderLoop(); return; }
    }

    const hasAbs = 'ondeviceorientationabsolute' in window;
    window.addEventListener(hasAbs ? 'deviceorientationabsolute' : 'deviceorientation', handleOrientation);

    // Give sensor 2s to fire; if it doesn't, go demo mode
    setTimeout(() => {
      if (headingRef.current === null) setSensorStatus('demo');
    }, 2000);

    startRenderLoop();
  }

  // ── Render loop ──────────────────────────────────────────────────────────────
  const startRenderLoop = useCallback(() => {
    let frameCount = 0;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      frameCount++;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const W = canvas.offsetWidth || window.innerWidth;
      const H = canvas.offsetHeight || window.innerHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const userPos  = gpsRef.current || CAMPUS_CENTER;
      const heading  = headingRef.current;
      const demoMode = heading === null;

      // Compute per-node bearing & distance from user GPS
      const enriched = CAMPUS_NODES.map(node => ({
        ...node,
        bearing:  getBearing(userPos.lat, userPos.lon, node.lat, node.lon),
        distance: getDistance(userPos.lat, userPos.lon, node.lat, node.lon),
      })).filter(n => n.distance > 3); // hide nodes we're standing on

      // Sort far→near so near nodes render on top
      const sorted = [...enriched].sort((a, b) => b.distance - a.distance);

      // Draw destination navigation arrow if set
      const dest = destRef.current;
      if (dest) {
        const dn = enriched.find(n => n.id === dest.id);
        if (dn && !demoMode) {
          drawDestArrow(ctx, W, H, dn.bearing, heading, dn.distance);
        }
      }

      sorted.forEach((node, idx) => {
        const isDest = dest?.id === node.id;
        const isSelected = selectedRef.current?.id === node.id;

        let angleDiff, xFrac;

        if (demoMode) {
          // Demo: spread nodes in a fan across the screen
          const i = CAMPUS_NODES.findIndex(n => n.id === node.id);
          const total = CAMPUS_NODES.length;
          xFrac = (i + 0.5) / total;
          angleDiff = (xFrac - 0.5) * HFOV;
        } else {
          angleDiff = angularDiff(node.bearing, heading);
          xFrac = angleDiff / HFOV + 0.5;
        }

        if (xFrac < -0.2 || xFrac > 1.2) return;

        const cx = xFrac * W;

        // Vertical: closer nodes lower on screen (simulating ground plane)
        const maxDist = 400;
        const depthFrac = Math.min(node.distance / maxDist, 1);
        // Further = higher on screen (horizon)
        const cy = H * (0.55 - depthFrac * 0.20);

        // Opacity: full when within ±20°, fades toward edges
        const opacity = demoMode ? 0.85
          : Math.max(0.1, 1 - Math.abs(angleDiff) / (HFOV * 0.65));

        drawLabel(ctx, { x: cx, y: cy, node, dist: node.distance, opacity, isSelected, isDest });
      });

      // Compass rose
      if (!demoMode) drawCompass(ctx, heading, W);

      // GPS indicator dot
      const gpsColor = gpsStatus === 'ok' ? '#34a853' : '#FBBC04';
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = gpsColor;
      ctx.beginPath(); ctx.arc(20, 54, 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '10px system-ui,sans-serif';
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(gpsStatus === 'ok' ? 'GPS' : 'GPS est.', 29, 54);
      ctx.restore();
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [gpsStatus]); // eslint-disable-line

  // Re-kick render loop when gpsStatus changes (so GPS dot colour updates)
  useEffect(() => {
    if (status !== 'init') startRenderLoop();
  }, [gpsStatus]); // eslint-disable-line

  // ── Canvas tap ───────────────────────────────────────────────────────────────
  function handleTap(e) {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const pt = e.touches?.[0] ?? e;
    const tapX = pt.clientX - rect.left;
    const tapY = pt.clientY - rect.top;
    const W = rect.width, H = rect.height;

    const userPos = gpsRef.current || CAMPUS_CENTER;
    const heading = headingRef.current;
    const demoMode = heading === null;

    let best = null, bestDist = Infinity;

    CAMPUS_NODES.forEach((node, idx) => {
      const bearing  = getBearing(userPos.lat, userPos.lon, node.lat, node.lon);
      const distance = getDistance(userPos.lat, userPos.lon, node.lat, node.lon);
      if (distance <= 3) return;

      let xFrac;
      if (demoMode) {
        xFrac = (idx + 0.5) / CAMPUS_NODES.length;
      } else {
        const diff = angularDiff(bearing, heading);
        xFrac = diff / HFOV + 0.5;
      }
      if (xFrac < -0.2 || xFrac > 1.2) return;

      const maxDist = 400;
      const depthFrac = Math.min(distance / maxDist, 1);
      const cx = xFrac * W;
      const cy = H * (0.55 - depthFrac * 0.20);

      const d = Math.hypot(tapX - cx, tapY - cy);
      if (d < 70 && d < bestDist) { bestDist = d; best = { ...node, bearing, distance }; }
    });

    if (best) {
      selectedRef.current = best;
      setSelectedNode(best);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function setAsDestination(node) {
    destRef.current = node;
    setDestNode(node);
    setSelectedNode(null);
    selectedRef.current = null;
    setShowNodeList(false);
  }

  function clearDest() {
    destRef.current = null;
    setDestNode(null);
  }

  function goToMap(node) {
    if (propSetDest) propSetDest(node.id);
    navigate('/map', { state: { destination: node.id } });
  }

  function handleBack() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    window.removeEventListener('deviceorientation', handleOrientation);
    navigate(-1);
  }

  const userPos = gpsRef.current || CAMPUS_CENTER;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* Camera */}
      <video ref={videoRef} playsInline muted style={S.video} />

      {/* AR Canvas */}
      <canvas ref={canvasRef} style={S.canvas} onClick={handleTap} onTouchStart={handleTap} />

      {/* Header */}
      <div style={S.header}>
        <button onClick={handleBack} style={S.backBtn}>←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AR Campus View</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
            {sensorStatus === 'demo' ? '📲 Demo mode — no compass' : sensorStatus === 'ok' ? '🧭 Compass active' : '🧭 Calibrating…'}
          </div>
        </div>
        <button onClick={() => setShowNodeList(v => !v)} style={{ ...S.backBtn, fontSize: 20 }}>
          🔍
        </button>
      </div>

      {/* Status banners */}
      {status === 'init' && <div style={S.banner()}>Starting camera…</div>}
      {status === 'no-camera' && <div style={S.banner('#EA4335')}>{errorMsg || 'No camera — overlay only'}</div>}
      {sensorStatus === 'demo' && status !== 'init' && (
        <div style={{ ...S.banner('#FBBC04'), color: '#000' }}>
          No compass sensor — buildings shown in demo layout. Point your phone around campus.
        </div>
      )}

      {/* Destination bar */}
      {destNode && (
        <div style={S.destBar}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Navigating to</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {destNode.icon} {destNode.label}
            </div>
            <div style={{ fontSize: 12, color: '#34a853', marginTop: 2 }}>
              {getDistance(userPos.lat, userPos.lon, destNode.lat, destNode.lon)}m away
              {headingRef.current !== null && (
                <> · {getDirectionArrow(getBearing(userPos.lat, userPos.lon, destNode.lat, destNode.lon))} {getCardinalLabel(getBearing(userPos.lat, userPos.lon, destNode.lat, destNode.lon))}</>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => goToMap(destNode)} style={S.destBtn('#1a73e8')}>Map</button>
            <button onClick={clearDest} style={S.destBtn('rgba(255,255,255,0.2)')}>✕</button>
          </div>
        </div>
      )}

      {/* Selected building card */}
      {selectedNode && !destNode && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{selectedNode.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{selectedNode.label}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>
                {getDistance(userPos.lat, userPos.lon, selectedNode.lat, selectedNode.lon)}m away
                {headingRef.current !== null && (
                  <> · {getCardinalLabel(getBearing(userPos.lat, userPos.lon, selectedNode.lat, selectedNode.lon))}</>
                )}
              </div>
            </div>
            <button onClick={() => { selectedRef.current = null; setSelectedNode(null); }}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', padding: '0 4px' }}>
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setAsDestination(selectedNode)} style={S.actionBtn('#34a853')}>
              🎯 AR Navigate
            </button>
            <button onClick={() => goToMap(selectedNode)} style={S.actionBtn('#1a73e8')}>
              🗺️ Map
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      {!selectedNode && !destNode && status !== 'init' && (
        <div style={S.hint}>Tap a building label to navigate</div>
      )}

      {/* Node search list */}
      {showNodeList && (
        <div style={S.nodeListBg} onClick={() => setShowNodeList(false)}>
          <div style={S.nodeList} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>All Buildings</span>
              <button onClick={() => setShowNodeList(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            {CAMPUS_NODES
              .map(n => ({ ...n, dist: getDistance(userPos.lat, userPos.lon, n.lat, n.lon) }))
              .sort((a, b) => a.dist - b.dist)
              .map(n => (
                <button key={n.id} onClick={() => { setAsDestination(n); }}
                  style={S.nodeListItem}>
                  <span style={{ fontSize: 20 }}>{n.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{n.label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{n.dist}m away</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600 }}>AR →</span>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root:    { position: 'relative', width: '100%', height: '100dvh', background: '#000', overflow: 'hidden' },
  video:   { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  canvas:  { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' },
  header:  { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top))', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)', zIndex: 10 },
  backBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 16, backdropFilter: 'blur(6px)' },
  banner:  (bg = 'rgba(0,0,0,0.7)') => ({ position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', background: bg, color: '#fff', padding: '8px 18px', borderRadius: 20, fontSize: 12, whiteSpace: 'nowrap', zIndex: 20, maxWidth: '90vw', textAlign: 'center' }),
  destBar: { position: 'absolute', top: 'calc(72px + env(safe-area-inset-top))', left: 12, right: 12, background: 'rgba(0,0,0,0.8)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(10px)', border: '1px solid rgba(52,168,83,0.4)', zIndex: 20 },
  destBtn: (bg) => ({ background: bg, border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  card:    { position: 'absolute', bottom: 'calc(90px + env(safe-area-inset-bottom))', left: 16, right: 16, background: 'rgba(255,255,255,0.96)', borderRadius: 18, padding: '18px 20px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 20 },
  actionBtn:(bg) => ({ flex: 1, background: bg, border: 'none', color: '#fff', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }),
  hint:    { position: 'absolute', bottom: 'calc(110px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '7px 18px', borderRadius: 18, fontSize: 12, whiteSpace: 'nowrap', zIndex: 20, backdropFilter: 'blur(6px)' },
  nodeListBg: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex', alignItems: 'flex-end' },
  nodeList:   { background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px', width: '100%', maxHeight: '70dvh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' },
  nodeListItem:{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' },
};