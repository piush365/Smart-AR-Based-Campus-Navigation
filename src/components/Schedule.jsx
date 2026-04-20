import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Navigation, LayoutGrid, List, RefreshCw, Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WORK_DAYS = [1,2,3,4,5,6];

const TYPE_COLORS = {
  Lab:      { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  Lecture:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  Tutorial: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  default:  { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' },
};

const ROOM_TO_NODE = {
  'programming lab': 'programming-lab', 'pl-a': 'programming-lab', 'pl-b': 'programming-lab', 'pl-c': 'programming-lab',
  'mini ccf': 'programming-lab', 'ccf': 'programming-lab',
  'dbe lab': 'dbe-lab', 'dbel': 'dbe-lab', 'database': 'dbe-lab',
  'ipcv': 'ipcv-lab', 'ipcvl': 'ipcv-lab',
  'iot': 'iot-hut', 'n&iot': 'iot-hut', 'networking': 'iot-hut',
  'asel': 'programming-lab',
  'room 19': 'classroom-19', 'classroom 19': 'classroom-19', 'cr-19': 'classroom-19', '19': 'classroom-19',
  'room 18': 'classroom-complex', 'classroom 18': 'classroom-complex',
  'tilak': 'tilak-hall', 'seminar': 'tilak-hall',
  'library': 'library',
  'cse': 'cse-dept',
  'gym': 'gym-khana',
  'canteen': 'govt-canteen',
  'exam': 'exam-center',
};

function guessNodeId(room, subject) {
  const haystack = `${room} ${subject}`.toLowerCase();
  for (const [key, node] of Object.entries(ROOM_TO_NODE)) {
    if (haystack.includes(key)) return node;
  }
  return 'classroom-complex';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function apiToDisplay(ev) {
  return {
    ...ev,
    startH: Math.floor(ev.startMins / 60),
    startM: ev.startMins % 60,
    endH:   Math.floor(ev.endMins / 60),
    endM:   ev.endMins % 60,
    type:   ev.type || 'Lecture',
  };
}

const fmt = (h, m) => `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
const typeStyle = (t) => TYPE_COLORS[t] || TYPE_COLORS.default;

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  } catch {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result || '');
      reader.readAsText(file);
    });
  }
}

// ── Parse via backend Gemini route ────────────────────────────────────────────
async function parseTimetableWithAI(text) {
  const safeText = text.slice(0, 8000); // double safety
  const { data } = await api.post('api/ai/parse-timetable', { safeText });
  const clean  = data.result.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.map((cls, i) => ({
    ...cls,
    id:        `pdf-${i}-${cls.day}-${cls.startH}`,
    startMins: cls.startH * 60 + cls.startM,
    endMins:   cls.endH * 60 + cls.endM,
    nodeId:    guessNodeId(cls.room || '', cls.subject || ''),
  }));
}

// ── WeekGrid ──────────────────────────────────────────────────────────────────
const WeekGrid = ({ classes: gridClasses, today, nowMins, onNavigate }) => {
  const START_H = 8, END_H = 20, ROW_PX = 56;
  const gridHeight = ((END_H - START_H) * 60 / 30) * ROW_PX;

  const byDay = useMemo(() => {
    const map = {};
    WORK_DAYS.forEach(d => { map[d] = []; });
    gridClasses.forEach(cls => { if (map[cls.day]) map[cls.day].push(cls); });
    return map;
  }, [gridClasses]);

  const positionOf = (cls) => ({
    top:    ((Math.max(0, cls.startMins - START_H * 60)) / 30) * ROW_PX,
    height: Math.max(ROW_PX * 0.8, ((cls.endMins - cls.startMins) / 30) * ROW_PX - 4),
  });

  const timeLabels = [];
  for (let h = START_H; h <= END_H; h++) timeLabels.push(h);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ minWidth: 480, display: 'flex' }}>
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: gridHeight + 32 }}>
          <div style={{ height: 28 }} />
          {timeLabels.map(h => (
            <div key={h} style={{
              position: 'absolute', top: ((h - START_H) * 2) * ROW_PX + 28,
              left: 0, width: '100%', fontSize: 10, color: 'var(--text-4)',
              fontWeight: 600, textAlign: 'right', paddingRight: 6,
            }}>
              {h % 12 || 12}{h < 12 ? 'a' : 'p'}
            </div>
          ))}
        </div>

        {WORK_DAYS.map(d => (
          <div key={d} style={{ flex: 1, minWidth: 70 }}>
            <div style={{
              height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: d === today ? '#2563eb' : 'var(--text-3)',
              borderBottom: d === today ? '2px solid #2563eb' : '2px solid transparent',
            }}>
              {DAY_ABBR[d]}
              {d === today && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', marginLeft: 3, display: 'inline-block' }} />}
            </div>
            <div style={{ position: 'relative', height: gridHeight, background: d % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
              {timeLabels.map(h => (
                <div key={h} style={{ position: 'absolute', top: (h - START_H) * 2 * ROW_PX, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
              ))}
              {(byDay[d] || []).map(cls => {
                const { top, height } = positionOf(cls);
                const s = typeStyle(cls.type);
                const isLive = d === today && nowMins >= cls.startMins && nowMins <= cls.endMins;
                return (
                  <div key={cls.id} onClick={() => onNavigate(cls.nodeId)}
                    title={`${cls.subject}\n${fmt(cls.startH, cls.startM)} – ${fmt(cls.endH, cls.endM)}\n${cls.room || ''}`}
                    style={{
                      position: 'absolute', top, left: 2, right: 2, height,
                      background: s.bg, border: `1.5px solid ${isLive ? '#2563eb' : s.border}`,
                      borderRadius: 8, padding: '4px 6px', overflow: 'hidden',
                      cursor: cls.nodeId ? 'pointer' : 'default',
                      boxShadow: isLive ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => { if (cls.nodeId) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.subject}
                    </p>
                    {height > 36 && (
                      <p style={{ margin: '1px 0 0', fontSize: 9, color: s.text, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cls.room} · {fmt(cls.startH, cls.startM)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PDF Upload Modal ──────────────────────────────────────────────────────────
const PDFUploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview]   = useState(null);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f || f.type !== 'application/pdf') { setErrorMsg('Please select a valid PDF file.'); return; }
    if (f.size > 10 * 1024 * 1024)          { setErrorMsg('File too large. Max 10MB.');       return; }
    setFile(f); setErrorMsg(''); setStatus('idle'); setPreview(null);
  };

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const process = async () => {
    if (!file) return;
    try {
      setStatus('extracting'); setErrorMsg('');
      const text = await extractTextFromPDF(file);
      if (!text || text.trim().length < 50)
        throw new Error('Could not extract text from PDF. Make sure it has selectable text (not a scanned image).');

      setStatus('parsing');
      const classes = await parseTimetableWithAI(text);
      if (!classes || classes.length === 0)
        throw new Error('No classes found in the timetable. Please check the PDF format.');

      setPreview(classes);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process PDF. Please try again.');
      setStatus('error');
    }
  };

  const confirm = () => {
    if (preview) {
      localStorage.setItem('wce_timetable', JSON.stringify(preview));
      onSuccess(preview);
      onClose();
    }
  };

  const statusMessages = {
    extracting: '📄 Reading PDF text…',
    parsing:    '🤖 Gemini is parsing your timetable…',
    done:       `✅ Found ${preview?.length || 0} classes`,
    error:      '❌ Failed',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📄 Upload Timetable PDF</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>Works for any college, year, or division</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}>×</button>
        </div>

        {!file && (
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db', borderRadius: 14, padding: '32px 20px',
              textAlign: 'center', cursor: 'pointer', background: '#fafafa',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#fafafa'; }}
          >
            <Upload size={32} color="#9ca3af" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Drop your timetable PDF here</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9ca3af' }}>or click to browse · Max 10MB</p>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {file && status === 'idle' && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <FileText size={24} color="#2563eb" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setStatus('idle'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {status !== 'idle' && (
          <div style={{
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            background: status === 'error' ? '#fef2f2' : status === 'done' ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${status === 'error' ? '#fecaca' : status === 'done' ? '#bbf7d0' : '#bfdbfe'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {(status === 'extracting' || status === 'parsing') && (
              <div style={{ width: 16, height: 16, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            )}
            {status === 'done'  && <CheckCircle size={16} color="#16a34a" />}
            {status === 'error' && <AlertCircle  size={16} color="#dc2626" />}
            <span style={{ fontSize: 13, fontWeight: 600, color: status === 'error' ? '#dc2626' : status === 'done' ? '#16a34a' : '#1d4ed8' }}>
              {statusMessages[status]}
            </span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
            {errorMsg}
          </div>
        )}

        {status === 'done' && preview && preview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Preview (first 5 classes):</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {preview.slice(0, 5).map((cls, i) => {
                const s = typeStyle(cls.type);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.text, background: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                      {DAYS[cls.day]?.slice(0,3)}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.subject}
                    </span>
                    <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                      {fmt(cls.startH, cls.startM)}
                    </span>
                  </div>
                );
              })}
              {preview.length > 5 && (
                <p style={{ margin: 0, fontSize: 12, color: '#888', textAlign: 'center' }}>+{preview.length - 5} more classes</p>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {status !== 'done' && (
            <button onClick={process}
              disabled={!file || status === 'extracting' || status === 'parsing'}
              style={{
                flex: 1, padding: '13px', borderRadius: 10, border: 'none',
                background: !file || status === 'extracting' || status === 'parsing' ? '#e5e7eb' : '#2563eb',
                color:      !file || status === 'extracting' || status === 'parsing' ? '#9ca3af' : '#fff',
                fontSize: 14, fontWeight: 600, cursor: !file ? 'not-allowed' : 'pointer',
              }}>
              {status === 'extracting' || status === 'parsing' ? 'Processing…' : '🤖 Parse with AI'}
            </button>
          )}
          {status === 'done' && (
            <>
              <button onClick={() => { setFile(null); setStatus('idle'); setPreview(null); }}
                style={{ padding: '13px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Re-upload
              </button>
              <button onClick={confirm}
                style={{ flex: 1, padding: '13px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ✅ Use this timetable
              </button>
            </>
          )}
        </div>

        <p style={{ margin: '12px 0 0', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
          Your timetable is saved locally on this device
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Schedule (main component) ─────────────────────────────────────────────────
const Schedule = ({ setDestination }) => {
  const navigate = useNavigate();
  const today    = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today === 0 ? 1 : today);
  const [view, setView]               = useState('list');
  const [classes, setClasses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [hasCustomTT, setHasCustomTT] = useState(false);

  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const loadClasses = useCallback(async () => {
    setLoading(true); setError(null);

    // Locally saved timetable takes priority
    const saved = (() => { try { return JSON.parse(localStorage.getItem('wce_timetable')); } catch { return null; } })();
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setClasses(saved); setHasCustomTT(true); setLoading(false); return;
    }

    // Try API schedule
    try {
      const { data } = await api.get('/schedule');
      const mapped = (data.events || []).map(apiToDisplay);
      setClasses(mapped);
      if (mapped.length === 0) setError('Upload your timetable PDF to get started.');
    } catch {
      setClasses([]);
      setError('Upload your timetable PDF to get started.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const handlePDFSuccess = (parsed) => { setClasses(parsed); setHasCustomTT(true); setError(null); };

  const clearCustomTT = () => {
    localStorage.removeItem('wce_timetable');
    setHasCustomTT(false);
    loadClasses();
  };

  const dayClasses = useMemo(() =>
    classes.filter(c => c.day === selectedDay).sort((a, b) => a.startMins - b.startMins),
    [classes, selectedDay]
  );

  const getStatus = (cls) => {
    if (selectedDay !== today) return null;
    if (nowMins < cls.startMins) {
      const diff = cls.startMins - nowMins;
      return { type: 'upcoming', label: diff < 60 ? `in ${diff}m` : `at ${fmt(cls.startH, cls.startM)}`, urgent: diff <= 15 };
    }
    if (nowMins <= cls.endMins) return { type: 'live', label: 'Live now' };
    return { type: 'done', label: 'Done' };
  };

  const handleNavigate = (nodeId) => {
    if (!nodeId) return;
    setDestination(nodeId);
    navigate('/map');
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 80 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes spin    { to { transform:rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 20px 12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Class Schedule
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowUpload(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: hasCustomTT ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${hasCustomTT ? '#bbf7d0' : '#bfdbfe'}`,
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              color: hasCustomTT ? '#16a34a' : '#2563eb',
            }}>
              <Upload size={13} />
              {hasCustomTT ? 'My PDF' : 'Upload PDF'}
            </button>

            {hasCustomTT && (
              <button onClick={clearCustomTT} title="Remove timetable"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: 4, display: 'flex' }}>
                <X size={15} />
              </button>
            )}

            <button onClick={loadClasses} disabled={loading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex' }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 3 }}>
              {[{ key: 'list', Icon: List }, { key: 'week', Icon: LayoutGrid }].map(({ key, Icon }) => (
                <button key={key} onClick={() => setView(key)} style={{
                  padding: '5px 10px', borderRadius: 6, border: 'none',
                  background: view === key ? '#fff' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  <Icon size={14} color={view === key ? '#2563eb' : '#9ca3af'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasCustomTT && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={13} />
            Using your uploaded timetable — {classes.length} classes loaded
          </div>
        )}

        {error && !hasCustomTT && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {view === 'list' && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {WORK_DAYS.map(d => {
              const isActive = selectedDay === d, isToday = today === d;
              return (
                <button key={d} onClick={() => setSelectedDay(d)} style={{
                  flex: '0 0 auto', padding: '8px 14px', border: 'none',
                  borderBottom: isActive ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'none', color: isActive ? '#2563eb' : 'var(--text-3)',
                  fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
                  position: 'relative', transition: 'color 0.15s', whiteSpace: 'nowrap',
                }}>
                  {DAY_ABBR[d]}
                  {isToday && <span style={{ position: 'absolute', top: 6, right: 8, width: 5, height: 5, borderRadius: '50%', background: '#2563eb' }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 12, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty state — no timetable yet */}
      {!loading && classes.length === 0 && (
        <div style={{ padding: 24 }}>
          <button onClick={() => setShowUpload(true)} style={{
            width: '100%', padding: '24px 16px', borderRadius: 16,
            border: '2px dashed #bfdbfe', background: '#eff6ff',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <Upload size={32} color="#2563eb" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1d4ed8' }}>Upload your timetable PDF</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#3b82f6' }}>
                AI reads your college PDF and sets up your schedule automatically.<br/>
                Works for any college, year, or division.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && classes.length > 0 && (
        <div style={{ padding: 16 }}>
          {!hasCustomTT && (
            <button onClick={() => setShowUpload(true)} style={{
              width: '100%', marginBottom: 14, padding: '13px 16px', borderRadius: 12,
              border: '1.5px dashed #bfdbfe', background: '#eff6ff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Upload size={18} color="#2563eb" />
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>Upload your timetable PDF</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#3b82f6' }}>Works for any college, any year, any division</p>
              </div>
            </button>
          )}

          {dayClasses.length === 0 ? (
            <div className="card fade-up" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎉</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>No classes on {DAYS[selectedDay]}!</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-4)' }}>Enjoy your day off.</p>
            </div>
          ) : dayClasses.map((cls, i) => {
            const status = getStatus(cls);
            const isDone = status?.type === 'done';
            const isLive = status?.type === 'live';
            const s = typeStyle(cls.type);
            return (
              <div key={cls.id || i} className={`card fade-up d${Math.min(i+1,5)}`}
                style={{ padding: '14px 16px', marginBottom: 10, opacity: isDone ? 0.55 : 1, borderLeft: isLive ? '3px solid #2563eb' : '3px solid transparent', transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}>
                    <Clock size={13} />
                    {fmt(cls.startH, cls.startM)} – {fmt(cls.endH, cls.endM)}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.text, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: '2px 8px' }}>
                      {cls.type}
                    </span>
                    {status && (
                      <span className={`badge ${isLive ? 'badge-blue' : status.type === 'done' ? 'badge-gray' : status.urgent ? 'badge-red' : 'badge-yellow'}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {cls.subject}
                  {cls.code && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 6 }}>{cls.code}</span>}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                    <MapPin size={12} /> {cls.room || 'Room TBD'}
                  </span>
                  {!isDone && cls.nodeId && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleNavigate(cls.nodeId)}>
                      <Navigation size={12} /> Navigate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week view */}
      {!loading && view === 'week' && classes.length > 0 && (
        <div style={{ padding: '12px 8px' }}>
          <WeekGrid classes={classes} today={today} nowMins={nowMins} onNavigate={handleNavigate} />
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>
            Tap any class block to navigate to it
          </p>
        </div>
      )}

      {showUpload && (
        <PDFUploadModal onClose={() => setShowUpload(false)} onSuccess={handlePDFSuccess} />
      )}
    </div>
  );
};

export default Schedule;