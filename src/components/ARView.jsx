/**
 * src/components/ARView.jsx
 *
 * Real AR overlay using:
 *   - getUserMedia (rear camera, live feed behind canvas)
 *   - DeviceOrientationEvent (compass heading for direction-aware labels)
 *   - Canvas 2D API (building labels drawn on top of the live feed)
 *
 * No external AR library required — the camera feed is the "reality" and
 * we project 2D labels based on the compass bearing to each building.
 *
 * How it works:
 *   1. Camera stream renders behind a transparent canvas.
 *   2. DeviceOrientationEvent gives us compass heading (alpha).
 *   3. Each campus node has a known bearing from a reference point (front gate).
 *   4. We compute the angular difference between the phone heading and each node's
 *      bearing, then horizontally position the label on the canvas accordingly.
 *   5. Labels closer to center (within ±30°) are shown full opacity, others fade.
 *
 * For LAN use on real devices: serve over HTTPS or use a self-signed cert.
 * DeviceOrientationEvent requires HTTPS on iOS 13+ and Chrome on Android.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Campus node definitions ───────────────────────────────────────────────────
// bearing: degrees clockwise from north, as seen from the main gate / centre of campus.
// distance: approximate walking distance in metres (for "X m away" label).
// Adjust these for your actual campus layout.
// Real WCE campus buildings — bearings are approximate degrees clockwise from north
// as seen from the main gate (16.8458, 74.6026). Distances are walking distances in metres.
const CAMPUS_NODES = [
  { id: 'programming-lab',  label: 'Programming Lab',  bearing: 220, distance: 80,  color: '#4285F4' },
  { id: 'students-section', label: 'Students Section', bearing: 230, distance: 120, color: '#34A853' },
  { id: 'cse-dept',         label: 'CSE Department',   bearing: 245, distance: 170, color: '#FBBC04' },
  { id: 'electronics-dept', label: 'Electronics Dept', bearing: 250, distance: 160, color: '#EA4335' },
  { id: 'it-hut',           label: 'IT Hut',           bearing: 248, distance: 140, color: '#9C27B0' },
  { id: 'iot-hut',          label: 'IoT Hut',          bearing: 246, distance: 150, color: '#FF6D00' },
  { id: 'library',          label: 'Library',          bearing: 260, distance: 200, color: '#00ACC1' },
  { id: 'electrical-dept',  label: 'Electrical Dept',  bearing: 265, distance: 210, color: '#F06292' },
  { id: 'tilak-hall',       label: 'Tilak Hall',       bearing: 258, distance: 195, color: '#8D6E63' },
  { id: 'govt-canteen',     label: 'Govt Canteen',     bearing: 280, distance: 300, color: '#26A69A' },
  { id: 'hostel',           label: 'Hostel',           bearing: 200, distance: 220, color: '#5C6BC0' },
  { id: 'exam-center',      label: 'Exam Center',      bearing: 238, distance: 250, color: '#EF5350' },
];

// Field of view in degrees that the camera covers horizontally
const CAMERA_HFOV = 60;

export default function ARView({ currentLocation, setCurrentLocation }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const headingRef = useRef(null); // live compass heading

  const [status, setStatus] = useState('init'); // init | running | no-sensor | error
  const [permGranted, setPermGranted] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  // Keep a ref so the canvas draw loop always reads the latest selectedNode
  // without needing to restart the loop on every selection change.
  const selectedNodeRef = useRef(null);

  // ── Camera setup ───────────────────────────────────────────────────────────
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
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPermGranted(true);
        requestOrientationPermission();
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.name === 'NotAllowedError' ? 'Camera permission denied.' : `Camera error: ${err.message}`);
          setStatus('error');
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compass / orientation ─────────────────────────────────────────────────
  function handleOrientation(event) {
    // DeviceOrientationEvent.alpha = rotation around Z axis (compass heading, 0=north)
    // absolute events give true north; non-absolute needs webkitCompassHeading on iOS
    let heading = event.webkitCompassHeading ?? (event.absolute ? (360 - event.alpha) % 360 : null);
    if (heading !== null) headingRef.current = heading;
  }

  async function requestOrientationPermission() {
    // iOS 13+ requires explicit permission for DeviceOrientationEvent
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') {
          setStatus('no-sensor');
          startRenderLoop(false);
          return;
        }
      } catch {
        setStatus('no-sensor');
        startRenderLoop(false);
        return;
      }
    }

    const hasAbsolute = 'ondeviceorientationabsolute' in window;
    if (hasAbsolute) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    setStatus('running');
    startRenderLoop(true);
  }

  // ── Render loop ────────────────────────────────────────────────────────────
  const startRenderLoop = useCallback((useCompass) => {
    function draw() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) { rafRef.current = requestAnimationFrame(draw); return; }

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const heading = headingRef.current ?? 0;

      CAMPUS_NODES.forEach((node) => {
        // In demo mode (no compass), spread nodes evenly across the visible FOV
        let angleDiff = useCompass
          ? angularDiff(node.bearing, heading)
          : ((CAMPUS_NODES.indexOf(node) / (CAMPUS_NODES.length - 1)) - 0.5) * CAMERA_HFOV;

        const xFraction = (angleDiff / CAMERA_HFOV) + 0.5; // 0=left, 1=right
        if (xFraction < -0.15 || xFraction > 1.15) return; // outside view

        const cx = xFraction * W;
        const opacity = Math.max(0, 1 - Math.abs(angleDiff) / (CAMERA_HFOV * 0.7));
        // Read from ref — never stale inside rAF loop
        const isSelected = selectedNodeRef.current?.id === node.id;

        drawARLabel(ctx, {
          x: cx,
          y: H * 0.38 + Math.sin(node.bearing * 0.04) * 60,
          label: node.label,
          distance: node.distance,
          color: node.color,
          opacity,
          isSelected,
        });
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []); // no deps — reads live values via refs

  // ── Canvas tap to select a building ───────────────────────────────────────
  function handleCanvasTap(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const tapX = (e.touches?.[0] ?? e).clientX - rect.left;
    const tapY = (e.touches?.[0] ?? e).clientY - rect.top;
    const W = rect.width;
    const H = rect.height;
    const heading = headingRef.current ?? 0;

    let hit = null;
    let minDist = Infinity;

    CAMPUS_NODES.forEach((node) => {
      const angleDiff = angularDiff(node.bearing, heading);
      const xFraction = (angleDiff / CAMERA_HFOV) + 0.5;
      const cx = xFraction * W;
      const cy = H * 0.38 + Math.sin(node.bearing * 0.04) * 60;
      const d = Math.hypot(tapX - cx, tapY - cy);
      if (d < 60 && d < minDist) { minDist = d; hit = node; }
    });

    if (hit) {
      selectedNodeRef.current = hit;
      setSelectedNode(hit);
    }
  }

  // ── Navigate to map for selected building ─────────────────────────────────
  function navigateToBuilding() {
    if (!selectedNode) return;
    if (setCurrentLocation) setCurrentLocation(selectedNode.id);
    navigate('/map', { state: { destination: selectedNode.id } });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <video ref={videoRef} playsInline muted style={styles.video} />
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onClick={handleCanvasTap}
        onTouchStart={handleCanvasTap}
      />

      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); navigate(-1); }} style={styles.backBtn}>←</button>
        <span style={styles.headerTitle}>AR Campus View</span>
        <div style={{ width: 44 }} />
      </div>

      {/* Status banners */}
      {status === 'init' && (
        <div style={styles.banner}>Starting camera…</div>
      )}
      {status === 'no-sensor' && (
        <div style={{ ...styles.banner, background: 'rgba(251,188,4,0.85)' }}>
          No compass — showing all buildings in demo layout
        </div>
      )}
      {status === 'error' && (
        <div style={{ ...styles.banner, background: 'rgba(234,67,53,0.85)' }}>{errorMsg}</div>
      )}

      {/* Selected building card */}
      {selectedNode && (
        <div style={styles.buildingCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.buildingName}>{selectedNode.label}</p>
              <p style={styles.buildingDist}>{selectedNode.distance}m away</p>
            </div>
            <button onClick={() => { selectedNodeRef.current = null; setSelectedNode(null); }} style={styles.closeBtn}>✕</button>
          </div>
          <button onClick={navigateToBuilding} style={{ ...styles.navBtn, background: selectedNode.color }}>
            Navigate here →
          </button>
        </div>
      )}

      {/* Hint */}
      {status === 'running' && !selectedNode && (
        <div style={styles.hint}>Tap a label to navigate</div>
      )}
    </div>
  );
}

// ── Canvas drawing helper ──────────────────────────────────────────────────
function drawARLabel(ctx, { x, y, label, distance, color, opacity, isSelected }) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.15, opacity);

  const padding = { x: 14, y: 8 };
  ctx.font = isSelected ? 'bold 15px sans-serif' : '13px sans-serif';
  const labelW = ctx.measureText(label).width;
  const distText = distance > 0 ? `${distance}m` : 'You are here';
  ctx.font = '11px sans-serif';
  const distW = ctx.measureText(distText).width;
  const boxW = Math.max(labelW, distW) + padding.x * 2;
  const boxH = 54;
  const boxX = x - boxW / 2;
  const boxY = y - boxH / 2;

  // Card background
  ctx.fillStyle = isSelected ? color : 'rgba(0,0,0,0.65)';
  roundRect(ctx, boxX, boxY, boxW, boxH, 10);
  ctx.fill();

  // Colour accent strip on left
  if (!isSelected) {
    ctx.fillStyle = color;
    roundRect(ctx, boxX, boxY, 4, boxH, [10, 0, 0, 10]);
    ctx.fill();
  }

  // Label text
  ctx.fillStyle = '#fff';
  ctx.font = isSelected ? 'bold 15px sans-serif' : '600 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, boxY + 24);

  // Distance text
  ctx.font = '11px sans-serif';
  ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)';
  ctx.fillText(distText, x, boxY + 40);

  // Pointer triangle
  ctx.fillStyle = isSelected ? color : 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.moveTo(x - 7, boxY + boxH);
  ctx.lineTo(x + 7, boxY + boxH);
  ctx.lineTo(x, boxY + boxH + 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radii = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.arcTo(x + w, y, x + w, y + h, radii[1]);
  ctx.arcTo(x + w, y + h, x, y + h, radii[2]);
  ctx.arcTo(x, y + h, x, y, radii[3]);
  ctx.arcTo(x, y, x + w, y, radii[0]);
  ctx.closePath();
}

// ── Maths ──────────────────────────────────────────────────────────────────
function angularDiff(bearing, heading) {
  let diff = bearing - heading;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  container: { position: 'relative', width: '100%', height: '100dvh', background: '#000', overflow: 'hidden' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', paddingTop: 'calc(16px + env(safe-area-inset-top))', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' },
  headerTitle: { color: '#fff', fontSize: '16px', fontWeight: '600' },
  backBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  banner: { position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' },
  buildingCard: { position: 'absolute', bottom: 'calc(90px + env(safe-area-inset-bottom))', left: '16px', right: '16px', background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '16px 20px', backdropFilter: 'blur(8px)' },
  buildingName: { fontSize: '18px', fontWeight: '700', margin: '0 0 4px', color: '#111' },
  buildingDist: { fontSize: '13px', color: '#666', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999', padding: '0 4px' },
  navBtn: { width: '100%', padding: '12px', borderRadius: '10px', border: 'none', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '12px' },
  hint: { position: 'absolute', bottom: 'calc(110px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', whiteSpace: 'nowrap' },
};
