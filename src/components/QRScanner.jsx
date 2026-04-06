/**
 * src/components/QRScanner.jsx
 *
 * Real QR code scanner using:
 *   - navigator.mediaDevices.getUserMedia  (camera access)
 *   - jsQR                                (decode QR from canvas pixels)
 *
 * Expected QR payload format (JSON string):
 *   { "nodeId": "computer-lab", "label": "Computer Lab" }
 *
 * On successful scan, sets currentLocation in context and navigates to MapScreen.
 *
 * Install jsQR:  npm install jsqr
 * Import in this file is a named import: import jsQR from 'jsqr'
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

// Map of nodeId → human-readable label (keep in sync with MapScreen nodes)
// Must exactly match the keys in MapScreen.jsx NODES
const NODE_LABELS = {
  'main-gate':        'Walchand Front Gate',
  'cse-dept':         'CSE Department',
  'electronics-dept': 'Electronics Dept',
  'electrical-dept':  'Electrical Dept',
  'mechanical-dept':  'Mechanical Dept',
  'civil-dept':       'Civil Department',
  'civil-lab':        'Civil Dept Lab',
  'mechanical-lab':   'Mechanical Lab',
  'workshop':         'Workshop Lab',
  'library':          'Library',
  'tilak-hall':       'Tilak Hall',
  'govt-canteen':     'Government Canteen',
  'back-canteen':     'Back Canteen',
  'hostel':           'Walchand Hostel',
  'exam-center':      'Exam Center',
  'polytechnic':      'Polytechnic Wing',
  'gym-khana':        'Gym Khana',
  'programming-lab':  'Programming Lab',
  'students-section': 'Students Section',
  'open-theatre':     'Open Theatre',
  'iot-hut':          'IoT Hut',
  'it-hut':           'IT Hut',
  'back-gate':        'Back Gate',
  'chinar-circle':    'Chinar Circle',
};

export default function QRScanner({ setCurrentLocation }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [status, setStatus] = useState('initializing'); // initializing | scanning | found | error
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedNode, setScannedNode] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // ── Start camera ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' }, // rear camera preferred
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.();
        setHasTorch(!!caps?.torch);

        setStatus('scanning');
        scanLoop();
      } catch (err) {
        if (cancelled) return;
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera permission denied. Allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No camera found on this device.');
        } else {
          setErrorMsg(`Camera error: ${err.message}`);
        }
        setStatus('error');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  // ── QR scan loop ───────────────────────────────────────────────────────────
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        handleScan(code.data);
        return; // stop the loop
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle a decoded QR payload ────────────────────────────────────────────
  function handleScan(raw) {
    cancelAnimationFrame(rafRef.current);

    try {
      const payload = JSON.parse(raw);
      const nodeId = payload.nodeId;

      if (!nodeId || !NODE_LABELS[nodeId]) {
        // Not a campus QR — keep scanning
        setStatus('scanning');
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }

      const label = payload.label || NODE_LABELS[nodeId];
      setScannedNode({ nodeId, label });
      setStatus('found');

      // Vibrate on success if supported
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      // Update location in parent context
      if (setCurrentLocation) setCurrentLocation(nodeId);

      // Navigate to map after a short delay so user sees the success state
      setTimeout(() => {
        stopCamera();
        navigate('/map', { state: { from: nodeId } });
      }, 1500);
    } catch {
      // Not JSON — keep scanning
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }

  // ── Torch toggle ───────────────────────────────────────────────────────────
  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      // Torch not supported in this browser — hide the button
      setHasTorch(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Video element — always present so the ref is valid */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ ...styles.video, display: status === 'error' ? 'none' : 'block' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Overlay */}
      <div style={styles.overlay}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => { stopCamera(); navigate(-1); }} style={styles.backBtn}>←</button>
          <span style={styles.headerTitle}>Scan Location QR</span>
          {hasTorch && (
            <button onClick={toggleTorch} style={styles.torchBtn}>
              {torchOn ? '🔦' : '💡'}
            </button>
          )}
        </div>

        {/* Viewfinder */}
        {status !== 'error' && (
          <div style={styles.viewfinderWrap}>
            <div style={{
              ...styles.viewfinder,
              borderColor: status === 'found' ? '#4caf50' : 'rgba(255,255,255,0.8)',
            }}>
              {/* Corner brackets */}
              {['tl','tr','bl','br'].map(c => (
                <span key={c} style={{ ...styles.corner, ...cornerPos[c] }} />
              ))}
            </div>
          </div>
        )}

        {/* Status messages */}
        <div style={styles.statusArea}>
          {status === 'initializing' && (
            <StatusPill color="#1a73e8">Starting camera…</StatusPill>
          )}
          {status === 'scanning' && (
            <StatusPill color="rgba(0,0,0,0.55)">Point at a campus QR code</StatusPill>
          )}
          {status === 'found' && scannedNode && (
            <div style={styles.foundCard}>
              <div style={styles.checkmark}>✓</div>
              <p style={styles.foundLabel}>{scannedNode.label}</p>
              <p style={styles.foundSub}>Location set — opening map…</p>
            </div>
          )}
          {status === 'error' && (
            <div style={styles.errorCard}>
              <p style={styles.errorText}>{errorMsg}</p>
              <button onClick={() => window.location.reload()} style={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ color, children }) {
  return (
    <div style={{
      background: color,
      color: '#fff',
      padding: '8px 18px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
    }}>
      {children}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100dvh',
    background: '#000',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    paddingTop: 'calc(16px + env(safe-area-inset-top))',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  torchBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  viewfinderWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: '240px',
    height: '240px',
    border: '2px solid rgba(255,255,255,0.8)',
    borderRadius: '16px',
    position: 'relative',
    transition: 'border-color 0.3s',
  },
  corner: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderColor: '#fff',
    borderStyle: 'solid',
    borderWidth: '0',
  },
  statusArea: {
    paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  foundCard: {
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '16px',
    padding: '24px 32px',
    textAlign: 'center',
    color: '#fff',
  },
  checkmark: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#4caf50',
    color: '#fff',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  foundLabel: { fontSize: '18px', fontWeight: '700', margin: '0 0 4px' },
  foundSub: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 },
  errorCard: {
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    margin: '0 24px',
  },
  errorText: { color: '#333', fontSize: '14px', marginBottom: '16px' },
  retryBtn: {
    background: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

const cornerPos = {
  tl: { top: '-2px', left: '-2px', borderTopWidth: '3px', borderLeftWidth: '3px', borderTopLeftRadius: '12px' },
  tr: { top: '-2px', right: '-2px', borderTopWidth: '3px', borderRightWidth: '3px', borderTopRightRadius: '12px' },
  bl: { bottom: '-2px', left: '-2px', borderBottomWidth: '3px', borderLeftWidth: '3px', borderBottomLeftRadius: '12px' },
  br: { bottom: '-2px', right: '-2px', borderBottomWidth: '3px', borderRightWidth: '3px', borderBottomRightRadius: '12px' },
};
