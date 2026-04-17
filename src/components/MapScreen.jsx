/**
 * MapScreen.jsx — WCE Campus Map
 * - Real OSM road network rendered as polylines
 * - Dijkstra routing snapped to actual campus roads
 * - Timetable integration (SY CSE Div A Even Sem 2025-26)
 * - All building nodes from map.osm centroids
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Timetable: SY B.Tech CSE Div A Even Sem 2025-26 ─────────────────────────
// Maps subject code → location node id
const SUBJECT_LOCATION = {
  'MDM':  'classroom-complex',   // Multidisciplinary Minor
  'ES':   'classroom-complex',   // Employability Skills
  'FLAT': 'classroom-19',        // Formal Language & Automata — room 19
  'DBE':  'classroom-19',        // Database Engineering — room 19
  'PIS':  'classroom-19',        // Probability & Inferential Statistics — room 19
  'OS':   'classroom-19',        // Operating Systems — room 19
  'VE':   'classroom-complex',   // Value Education
  // Labs (batch-wise slots)
  'DBEL':  'dbe-lab',            // DBE Lab
  'WDD':   'programming-lab',    // Web Design & Dev Lab = Programming Lab
  'IPCVL': 'ipcv-lab',           // IPCV Lab
  'NIOT':  'iot-hut',            // Networking & IoT Lab
  'ASEL':  'programming-lab',    // Advanced Software Engg Lab
  'PL':    'programming-lab',    // Programming Lab
  'IDT':   'classroom-complex',  // Innovation & Design Thinking
};

const TIMETABLE = {
  Monday: [
    { time: '10:15–12:15', subject: 'Self Learning', loc: null },
    { time: '01:15–02:15', subject: 'FLAT', loc: 'classroom-19' },
    { time: '02:15–03:15', subject: 'PIS', loc: 'classroom-19' },
    { time: '03:30–05:30', subject: 'Labs (S1-S8)', loc: 'programming-lab', note: 'DBE/WDD/IDT labs batch-wise' },
  ],
  Tuesday: [
    { time: '10:15–12:15', subject: 'Self Learning', loc: null },
    { time: '01:15–02:15', subject: 'FLAT', loc: 'classroom-19' },
    { time: '02:15–03:15', subject: 'OS', loc: 'classroom-19' },
    { time: '03:30–05:30', subject: 'Labs (S1-S8)', loc: 'programming-lab', note: 'IDT/DBE/WDD labs batch-wise' },
  ],
  Wednesday: [
    { time: '09:00–10:00', subject: 'MDM', loc: 'classroom-complex' },
    { time: '10:15–11:15', subject: 'ES', loc: 'classroom-complex' },
    { time: '11:15–12:15', subject: 'ES', loc: 'classroom-complex' },
    { time: '01:15–02:15', subject: 'DBE', loc: 'classroom-19' },
    { time: '02:15–03:15', subject: 'OS', loc: 'classroom-19' },
    { time: '03:30–05:30', subject: 'Labs (S1-S8)', loc: 'programming-lab', note: 'WDD/IDT/DBE labs batch-wise' },
  ],
  Thursday: [
    { time: '09:00–10:00', subject: 'MDM', loc: 'classroom-complex' },
    { time: '10:15–11:15', subject: 'FLAT', loc: 'classroom-19' },
    { time: '11:15–12:15', subject: 'DBE', loc: 'classroom-19' },
    { time: '01:15–02:15', subject: 'PIS', loc: 'classroom-19' },
    { time: '02:15–03:15', subject: 'Self Learning', loc: null },
    { time: '03:30–05:30', subject: 'Labs (S1-S8)', loc: 'programming-lab', note: 'IDT/WDD/DBE labs batch-wise' },
  ],
  Friday: [
    { time: '09:00–10:00', subject: 'MDM', loc: 'classroom-complex' },
    { time: '10:15–11:15', subject: 'PIS', loc: 'classroom-19' },
    { time: '11:15–12:15', subject: 'VE', loc: 'classroom-complex' },
    { time: '01:15–02:15', subject: 'DBE', loc: 'classroom-19' },
    { time: '02:15–03:15', subject: 'OS', loc: 'classroom-19' },
    { time: '03:30–05:30', subject: 'Labs (S1-S8)', loc: 'programming-lab', note: 'IDT/WDD labs batch-wise' },
  ],
  Saturday: [],
};

function getCurrentClass() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const hm = now.getHours() * 60 + now.getMinutes();
  const slots = TIMETABLE[day] || [];
  for (const slot of slots) {
    if (!slot.time) continue;
    const [start, end] = slot.time.split('–').map(t => {
      const [h, m] = t.replace(/\s/g,'').split(':').map(Number);
      return h * 60 + (m || 0);
    });
    if (hm >= start && hm < end) return slot;
  }
  return null;
}

function getNextClass() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const hm = now.getHours() * 60 + now.getMinutes();
  const slots = TIMETABLE[day] || [];
  for (const slot of slots) {
    if (!slot.time || !slot.loc) continue;
    const [start] = slot.time.split('–').map(t => {
      const [h, m] = t.replace(/\s/g,'').split(':').map(Number);
      return h * 60 + (m || 0);
    });
    if (start > hm) return slot;
  }
  return null;
}

// ── Campus road network polylines (from map.osm) ────────────────────────────
const OSM_ROADS = [
  { name: 'Back Gate Road', coords: [[16.8458289,74.5990136],[16.8455918,74.6000895],[16.8455905,74.6001509],[16.8455111,74.6005075],[16.8453309,74.601122],[16.8453169,74.6011573],[16.8451514,74.6017719]] },
  { name: 'College Grounds Road', coords: [[16.8458289,74.5990136],[16.844772,74.5987305],[16.8444604,74.5986739],[16.8443046,74.5987305],[16.8442066,74.5997949],[16.844203,74.5998347],[16.8440878,74.6000542],[16.8440743,74.6002807],[16.8440607,74.6007124],[16.8439659,74.6011725],[16.843899,74.6014336],[16.8438902,74.6014679],[16.8438344,74.602027],[16.8436203,74.6021564],[16.8433155,74.6024042],[16.8428074,74.6025811]] },
  { name: 'Parking Lot1 Road', coords: [[16.8442066,74.5997949],[16.8455905,74.6001509]] },
  { name: 'Library Road', coords: [[16.8449003,74.6010548],[16.8447517,74.6016397],[16.843899,74.6014336]] },
  { name: 'Boys Hostel Road', coords: [[16.8438344,74.602027],[16.8435587,74.6029669],[16.8434149,74.6036027],[16.8433102,74.6039132]] },
  { name: 'Hostel Shortcut Road', coords: [[16.8446299,74.6022766],[16.8444435,74.6029925]] },
  { name: 'Main Gate Road', coords: [[16.8451077,74.6023186],[16.8438344,74.602027]] },
  { name: 'Front Gate Road', coords: [[16.8455526,74.6024664],[16.8453932,74.6024134],[16.8451077,74.6023186]] },
  { name: 'Entrance Road', coords: [[16.845858,74.6026025],[16.8455526,74.6024664]] },
  { name: 'Front Parking Road', coords: [[16.8459146,74.6013397],[16.8455526,74.6024664]] },
  { name: 'Parking-Backgate Road', coords: [[16.8459146,74.6013397],[16.8461745,74.6003205]] },
  { name: 'Engine Gate 2 Road', coords: [[16.8459146,74.6013397],[16.8462575,74.6014273]] },
  { name: 'Parking Lot2 Road', coords: [[16.8455905,74.6001509],[16.8461745,74.6003205]] },
  { name: 'Ele-CSE dept road', coords: [[16.8453169,74.6011573],[16.8455595,74.6012246]] },
  { name: 'Main Bldg-Classroom Complex Rd', coords: [[16.8453169,74.6011573],[16.8449003,74.6010548]] },
  { name: 'Civil Dept entrance road', coords: [[16.8449003,74.6010548],[16.8450238,74.6006139],[16.8448294,74.6005519],[16.8446849,74.6005108],[16.8445606,74.6004811],[16.8444775,74.6004618],[16.8444261,74.6004477]] },
  { name: 'Civil-Academic Complex Road', coords: [[16.8445322,74.6000543],[16.8444261,74.6004477]] },
  { name: 'Mini CCF-Front Gate Road', coords: [[16.8455222,74.6019011],[16.8453932,74.6024134]] },
  { name: 'Mini CFF road', coords: [[16.845264,74.6018109],[16.8455222,74.6019011]] },
  { name: 'Inner road (via library)', coords: [[16.8451514,74.6017719],[16.845264,74.6018109],[16.8451077,74.6023186]] },
  { name: 'Inner road 2', coords: [[16.8451514,74.6017719],[16.8447517,74.6016397]] },
  { name: 'Hostel connector', coords: [[16.8428074,74.6025811],[16.8424738,74.6037547],[16.8412137,74.6034432]] },
  { name: 'College Grounds connector', coords: [[16.8440878,74.6000542],[16.8421643,74.5995016]] },
  { name: 'Footway shortcut', coords: [[16.8449003,74.6010548],[16.8443003,74.600903]] },
];

// ── All campus nodes (centroids from map.osm) ────────────────────────────────
const NODES = {
  'main-gate':        { pos: [16.8458580, 74.6026025], label: 'Walchand Front Gate', icon: '🚪', desc: 'Main campus entrance', snap: [16.845858,74.6026025] },
  'back-gate':        { pos: [16.8459208, 74.6000001], label: 'Back Gate', icon: '🔓', desc: 'Rear campus exit / Workshop area', snap: [16.8461745,74.6003205] },
  'cse-dept':         { pos: [16.8458265, 74.6009176], label: 'CSE Department', icon: '💻', desc: 'Dept of Computer Science & Engg — CSE HOD, DBE Lab, IPCV Lab', snap: [16.8453169,74.6011573] },
  'electronics-dept': { pos: [16.8456315, 74.6012167], label: 'Electronics Dept', icon: '⚡', desc: 'Department of Electronics Engineering', snap: [16.8455595,74.6012246] },
  'electrical-dept':  { pos: [16.8450496, 74.6014291], label: 'Electrical Dept', icon: '🔌', desc: 'Department of Electrical Engineering', snap: [16.8449003,74.6010548] },
  'mechanical-dept':  { pos: [16.8451780, 74.6002689], label: 'Mechanical Dept', icon: '⚙️', desc: 'Department of Mechanical Engineering', snap: [16.8455905,74.6001509] },
  'civil-dept':       { pos: [16.8446620, 74.6000100], label: 'Civil Department', icon: '🏗️', desc: 'Department of Civil Engineering', snap: [16.8444261,74.6004477] },
  'library':          { pos: [16.8445278, 74.6018749], label: 'Library', icon: '📚', desc: 'Ajit Gulabchand Central Library', snap: [16.8447517,74.6016397] },
  'tilak-hall':       { pos: [16.8444313, 74.6013102], label: 'Tilak Hall', icon: '🎭', desc: 'Community centre / seminar hall', snap: [16.843899,74.6014336] },
  'govt-canteen':     { pos: [16.8433600, 74.6019048], label: 'Government Canteen', icon: '🍽️', desc: 'Main student canteen', snap: [16.8436203,74.6021564] },
  'back-canteen':     { pos: [16.8455316, 74.5997814], label: 'Back Canteen', icon: '☕', desc: 'Back canteen near workshop', snap: [16.8455905,74.6001509] },
  'hostel':           { pos: [16.8452651, 74.6033729], label: 'Walchand Hostel (D1)', icon: '🏠', desc: 'Student hostel D1-D4 blocks', snap: [16.8433102,74.6039132] },
  'exam-center':      { pos: [16.8439450, 74.6022995], label: 'Exam Center', icon: '📝', desc: 'Examination centre', snap: [16.8438344,74.602027] },
  'polytechnic':      { pos: [16.8441554, 74.6024772], label: 'Polytechnic Wing', icon: '🏫', desc: 'Polytechnic department wing', snap: [16.8438344,74.602027] },
  'gym-khana':        { pos: [16.8437275, 74.6015360], label: 'Gym Khana', icon: '🏋️', desc: 'Fitness centre & sports facilities', snap: [16.843899,74.6014336] },
  'programming-lab':  { pos: [16.8455398, 74.6021954], label: 'Programming Lab / Mini CCF', icon: '🖥️', desc: 'Programming Lab (PL-A/B/C), WDD Lab, ASEL Lab', snap: [16.8455222,74.6019011] },
  'students-section': { pos: [16.8451671, 74.6026252], label: 'Students Section', icon: '🏛️', desc: 'Administrative students section', snap: [16.8451077,74.6023186] },
  'open-theatre':     { pos: [16.8446228, 74.6005734], label: 'Open Theatre', icon: '🎪', desc: 'Open air theatre', snap: [16.8444261,74.6004477] },
  'iot-hut':          { pos: [16.8454590, 74.6010059], label: 'IoT Hut', icon: '📡', desc: 'Networking & IoT Lab (N&IoT)', snap: [16.8453169,74.6011573] },
  'it-hut':           { pos: [16.8454468, 74.6014169], label: 'IT Hut', icon: '💡', desc: 'IT department hut', snap: [16.8455595,74.6012246] },
  'classroom-19':     { pos: [16.8444950, 74.6005203], label: 'Class Room 19', icon: '🏫', desc: 'Main lecture room — OS, DBE, FLAT, PIS classes', snap: [16.8449003,74.6010548] },
  'classroom-complex':{ pos: [16.8448709, 74.6006618], label: 'Academic Complex', icon: '🏢', desc: 'Main academic complex — MDM, ES, VE, IDT classes', snap: [16.8449003,74.6010548] },
  'dbe-lab':          { pos: [16.8457900, 74.6009899], label: 'DBE Lab', icon: '🗄️', desc: 'Database Engineering Lab (DBEL)', snap: [16.8453169,74.6011573] },
  'ipcv-lab':         { pos: [16.8457788, 74.6010729], label: 'IPCV Lab', icon: '📷', desc: 'Image Processing & Computer Vision Lab', snap: [16.8453169,74.6011573] },
  'mechanical-lab':   { pos: [16.8453766, 74.6002962], label: 'Mechanical Lab', icon: '🔧', desc: 'Mechanical Department Laboratory', snap: [16.8455905,74.6001509] },
  'workshop':         { pos: [16.8459208, 74.6000001], label: 'Workshop Lab', icon: '🛠️', desc: 'Workshop Laboratory No. 2', snap: [16.8461745,74.6003205] },
  'lipton':           { pos: [16.8444630, 74.6023384], label: 'Lipton Café', icon: '☕', desc: 'Café near Rector office', snap: [16.8438344,74.602027] },
  'saraswati':        { pos: [16.8440936, 74.6018128], label: 'Saraswati Idol', icon: '🙏', desc: 'Saraswati statue / campus landmark', snap: [16.843899,74.6014336] },
  'globe':            { pos: [16.8443251, 74.6017402], label: 'Walchand Globe', icon: '🌍', desc: 'Campus globe landmark', snap: [16.843899,74.6014336] },
  'security-post':    { pos: [16.8455580, 74.6028013], label: 'Security Post', icon: '💂', desc: 'Campus security post near main gate', snap: [16.845858,74.6026025] },
  'chinar-circle':    { pos: [16.8454197, 74.5953722], label: 'Chinar Circle', icon: '🔵', desc: 'Junction landmark near campus', snap: null },
  'cyber-hostel':     { pos: [16.8453677, 74.6021563], label: 'Cyber Hostel', icon: '🏠', desc: 'Cyber hostel block', snap: [16.8455222,74.6019011] },
  'running-track':    { pos: [16.8429887, 74.6008334], label: 'Running Track / Cricket Ground', icon: '🏏', desc: 'Sports ground, cricket, running track', snap: [16.8440878,74.6000542] },
  'ganpati-mandir':   { pos: [16.8449039, 74.6018448], label: 'Ganpati Mandir', icon: '🛕', desc: 'Temple on campus', snap: [16.8447517,74.6016397] },
};

// ── Road graph for Dijkstra — key intersections / waypoints ─────────────────
// Each entry: [lat, lon] with adjacency to others via real road segments
const ROAD_GRAPH = {
  'rg-main-gate':    { pos: [16.845858,74.6026025],  adj: ['rg-entrance','rg-security'] },
  'rg-security':     { pos: [16.8459851,74.6026565], adj: ['rg-main-gate','rg-kishanali'] },
  'rg-kishanali':    { pos: [16.8460975,74.6027237], adj: ['rg-security'] },
  'rg-entrance':     { pos: [16.8455526,74.6024664], adj: ['rg-main-gate','rg-front-gate-mid','rg-front-parking'] },
  'rg-front-gate-mid':{ pos: [16.8453932,74.6024134],adj: ['rg-entrance','rg-students-section','rg-minicff-fg'] },
  'rg-students-section':{ pos: [16.8451077,74.6023186],adj: ['rg-front-gate-mid','rg-main-gate-road','rg-inner-lib'] },
  'rg-main-gate-road':  { pos: [16.8438344,74.602027], adj: ['rg-students-section','rg-exam','rg-cgrounds-end','rg-hostel-road'] },
  'rg-exam':         { pos: [16.8436203,74.6021564], adj: ['rg-main-gate-road','rg-canteen','rg-hostel-shortcut-top'] },
  'rg-canteen':      { pos: [16.8433155,74.6024042], adj: ['rg-exam','rg-cgrounds-end2'] },
  'rg-cgrounds-end2':{ pos: [16.8428074,74.6025811], adj: ['rg-canteen','rg-hostel-connector'] },
  'rg-hostel-connector':{ pos: [16.8424738,74.6037547],adj: ['rg-cgrounds-end2','rg-hostel-end'] },
  'rg-hostel-end':   { pos: [16.8412137,74.6034432], adj: ['rg-hostel-connector'] },
  'rg-hostel-road':  { pos: [16.8435587,74.6029669], adj: ['rg-main-gate-road','rg-hostel-road2'] },
  'rg-hostel-road2': { pos: [16.8434149,74.6036027], adj: ['rg-hostel-road','rg-hostel-road3'] },
  'rg-hostel-road3': { pos: [16.8433102,74.6039132], adj: ['rg-hostel-road2'] },
  'rg-hostel-shortcut-top':{ pos: [16.8446299,74.6022766],adj: ['rg-exam','rg-hostel-shortcut-bot'] },
  'rg-hostel-shortcut-bot':{ pos: [16.8444435,74.6029925],adj: ['rg-hostel-shortcut-top'] },
  'rg-minicff-fg':   { pos: [16.8455222,74.6019011], adj: ['rg-front-gate-mid','rg-minicff-road','rg-inner-lib'] },
  'rg-minicff-road': { pos: [16.845264,74.6018109],  adj: ['rg-minicff-fg','rg-inner-lib'] },
  'rg-inner-lib':    { pos: [16.8451514,74.6017719], adj: ['rg-minicff-road','rg-minicff-fg','rg-lib-road','rg-backgate-road-end','rg-inner2'] },
  'rg-inner2':       { pos: [16.8447517,74.6016397], adj: ['rg-inner-lib','rg-lib-road-mid','rg-cgrounds-lib'] },
  'rg-lib-road':     { pos: [16.8449003,74.6010548], adj: ['rg-inner-lib','rg-inner2','rg-main-bldg','rg-civil-entrance','rg-footway'] },
  'rg-lib-road-mid': { pos: [16.8447517,74.6016397], adj: ['rg-inner2','rg-lib-road'] },
  'rg-cgrounds-lib': { pos: [16.843899,74.6014336],  adj: ['rg-inner2','rg-cgrounds-gym','rg-main-gate-road'] },
  'rg-cgrounds-gym': { pos: [16.8439659,74.6011725], adj: ['rg-cgrounds-lib','rg-cgrounds-civil'] },
  'rg-cgrounds-civil':{ pos: [16.8440607,74.6007124],adj: ['rg-cgrounds-gym','rg-cgrounds-mech','rg-footway-end'] },
  'rg-footway-end':  { pos: [16.8443003,74.600903],  adj: ['rg-cgrounds-civil','rg-lib-road'] },
  'rg-cgrounds-mech':{ pos: [16.8440878,74.6000542], adj: ['rg-cgrounds-civil','rg-cgrounds-parking','rg-cgrounds-south'] },
  'rg-cgrounds-south':{ pos: [16.8421643,74.5995016],adj: ['rg-cgrounds-mech'] },
  'rg-cgrounds-parking':{ pos: [16.8442066,74.5997949],adj: ['rg-cgrounds-mech','rg-parking1'] },
  'rg-parking1':     { pos: [16.8455905,74.6001509], adj: ['rg-cgrounds-parking','rg-backgate-road1','rg-parking2','rg-mech-lab-road'] },
  'rg-mech-lab-road':{ pos: [16.8461745,74.6003205], adj: ['rg-parking1','rg-gate2-road','rg-parking-backgate'] },
  'rg-parking-backgate':{ pos: [16.8459146,74.6013397],adj: ['rg-mech-lab-road','rg-gate2-road','rg-front-parking'] },
  'rg-gate2-road':   { pos: [16.8462575,74.6014273], adj: ['rg-parking-backgate','rg-mech-lab-road'] },
  'rg-front-parking':{ pos: [16.8459146,74.6013397], adj: ['rg-entrance','rg-parking-backgate'] },
  'rg-backgate-road1':{ pos: [16.8458289,74.5990136],adj: ['rg-parking1','rg-backgate-road-end'] },
  'rg-backgate-road-end':{ pos: [16.8453169,74.6011573],adj: ['rg-backgate-road1','rg-inner-lib','rg-main-bldg','rg-ele-cse'] },
  'rg-ele-cse':      { pos: [16.8455595,74.6012246], adj: ['rg-backgate-road-end'] },
  'rg-main-bldg':    { pos: [16.8453169,74.6011573], adj: ['rg-backgate-road-end','rg-lib-road'] },
  'rg-civil-entrance':{ pos: [16.8444261,74.6004477],adj: ['rg-lib-road','rg-civil-complex','rg-open-theatre'] },
  'rg-civil-complex':{ pos: [16.8445322,74.6000543], adj: ['rg-civil-entrance'] },
  'rg-open-theatre': { pos: [16.8449003,74.6010548], adj: ['rg-civil-entrance','rg-lib-road'] },
  'rg-footway':      { pos: [16.8449003,74.6010548], adj: ['rg-lib-road'] },
  'rg-parking2':     { pos: [16.8455905,74.6001509], adj: ['rg-parking1'] },
  'rg-cgrounds-end': { pos: [16.8438902,74.6014679], adj: ['rg-cgrounds-lib','rg-main-gate-road'] },
};

// ── Snap each building node to nearest road graph node ───────────────────────
function nearestRoadNode(pos) {
  let best = null, bestD = Infinity;
  for (const [id, rg] of Object.entries(ROAD_GRAPH)) {
    const d = haversine(pos, rg.pos);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

// ── Haversine ────────────────────────────────────────────────────────────────
function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ── Dijkstra on road graph ───────────────────────────────────────────────────
function dijkstra(startNodeId, endNodeId) {
  const startRG = NODES[startNodeId]?.snap
    ? nearestRoadNode(NODES[startNodeId].snap)
    : nearestRoadNode(NODES[startNodeId].pos);
  const endRG = NODES[endNodeId]?.snap
    ? nearestRoadNode(NODES[endNodeId].snap)
    : nearestRoadNode(NODES[endNodeId].pos);

  if (!startRG || !endRG) return null;
  if (startRG === endRG) return { path: [startRG], coords: [ROAD_GRAPH[startRG].pos], totalDist: 0 };

  const dist = {}, prev = {};
  const unvisited = new Set(Object.keys(ROAD_GRAPH));
  for (const id of unvisited) dist[id] = Infinity;
  dist[startRG] = 0;

  while (unvisited.size) {
    let u = null;
    for (const id of unvisited) if (u === null || dist[id] < dist[u]) u = id;
    if (dist[u] === Infinity || u === endRG) break;
    unvisited.delete(u);
    for (const v of ROAD_GRAPH[u].adj || []) {
      if (!unvisited.has(v)) continue;
      const alt = dist[u] + haversine(ROAD_GRAPH[u].pos, ROAD_GRAPH[v].pos);
      if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    }
  }

  if (dist[endRG] === Infinity) return null;
  const path = [];
  let cur = endRG;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return {
    path,
    coords: path.map(id => ROAD_GRAPH[id].pos),
    totalDist: dist[endRG],
  };
}

// ── Leaflet icon helpers ─────────────────────────────────────────────────────
function nodeIcon(emoji, variant = 'default') {
  const configs = {
    default: { bg: '#fff', border: '#bbb', shadow: '0 2px 8px rgba(0,0,0,0.2)', pulse: false },
    origin:  { bg: '#1a73e8', border: '#0d47a1', shadow: '0 2px 8px rgba(26,115,232,0.4)', pulse: true },
    dest:    { bg: '#34a853', border: '#1e7e34', shadow: '0 2px 8px rgba(52,168,83,0.4)', pulse: false },
    class:   { bg: '#f57c00', border: '#e65100', shadow: '0 2px 8px rgba(245,124,0,0.4)', pulse: true },
  };
  const { bg, border, shadow, pulse } = configs[variant] || configs.default;
  const animation = pulse ? 'animation:pulse 1.8s ease-in-out infinite;' : '';
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${bg};border:2.5px solid ${border};${animation}display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:${shadow};">${emoji}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
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

const CSS = `
@keyframes pulse {
  0%,100% { box-shadow:0 2px 8px rgba(26,115,232,0.4),0 0 0 0 rgba(26,115,232,0.5); }
  50%      { box-shadow:0 2px 8px rgba(26,115,232,0.4),0 0 0 10px rgba(26,115,232,0); }
}
.wce-tip { background:#fff!important;border:1.5px solid #e0e0e0!important;border-radius:8px!important;padding:4px 10px!important;font-size:12px!important;font-weight:600!important;color:#111!important;box-shadow:0 2px 8px rgba(0,0,0,0.1)!important;white-space:nowrap!important; }
.wce-tip::before { display:none!important; }
.leaflet-attribution-flag { display:none!important; }
`;

const CAMPUS_CENTER = [16.8448, 74.6010];

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapScreen({ currentLocation: propLoc, destination: propDest, setDestination: propSetDest }) {
  const navigate  = useNavigate();
  const routerLoc = useLocation();
  const mapEl     = useRef(null);
  const mapRef    = useRef(null);
  const routeLine = useRef(null);
  const markers   = useRef({});
  const roadLines = useRef([]);
  const gpsMark   = useRef(null);
  const gpsWatch  = useRef(null);

  const [origin,      setOrigin]     = useState(propLoc || routerLoc.state?.from || null);
  const [dest,        setDestLocal]  = useState(propDest || routerLoc.state?.destination || null);
  const [result,      setResult]     = useState(null);
  const [noPath,      setNoPath]     = useState(false);
  const [showPicker,  setShowPicker] = useState(false);
  const [pickerMode,  setPickerMode] = useState('origin');
  const [locating,    setLocating]   = useState(false);
  const [search,      setSearch]     = useState('');
  const [showTT,      setShowTT]     = useState(false);
  const [currentClass,setCurrentClass] = useState(null);
  const [nextClass,   setNextClass]    = useState(null);

  const setDest = id => { setDestLocal(id); propSetDest?.(id); };

  // Check timetable
  useEffect(() => {
    const update = () => { setCurrentClass(getCurrentClass()); setNextClass(getNextClass()); };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  // ── Init map ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const m = L.map(mapEl.current, {
      center: CAMPUS_CENTER, zoom: 17,
      zoomControl: false, attributionControl: true,
    });
    mapRef.current = m;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(m);

    // Campus boundary
    L.polygon([
      [16.8420360, 74.5976720], [16.8420360, 74.6060510],
      [16.8465380, 74.6060510], [16.8465380, 74.5976720],
    ], {
      color: '#1a73e8', weight: 2, opacity: 0.5,
      fillColor: '#1a73e8', fillOpacity: 0.03, dashArray: '6 4',
    }).addTo(m).bindTooltip('WCE Campus', { className: 'wce-tip', sticky: true });

    // Draw all OSM roads
    OSM_ROADS.forEach(road => {
      const line = L.polyline(road.coords, {
        color: '#888', weight: 3, opacity: 0.55,
        lineJoin: 'round', lineCap: 'round',
      }).addTo(m);
      if (road.name) line.bindTooltip(road.name, { className: 'wce-tip', sticky: true });
      roadLines.current.push(line);
    });

    // Place building markers
    Object.entries(NODES).forEach(([id, node]) => {
      const mk = L.marker(node.pos, {
        icon: nodeIcon(node.icon, 'default'),
        title: node.label,
      }).addTo(m);

      mk.bindTooltip(`<b>${node.icon} ${node.label}</b><br><span style="color:#666;font-weight:400">${node.desc}</span>`, {
        permanent: false, direction: 'top', offset: [0, -22], className: 'wce-tip',
      });

      mk.on('click', () => {
        if (!origin) { setOrigin(id); }
        else { setDest(id); }
      });

      markers.current[id] = mk;
    });

    return () => {
      m.remove();
      mapRef.current = null;
      if (gpsWatch.current) navigator.geolocation.clearWatch(gpsWatch.current);
    };
  }, []); // eslint-disable-line

  // ── Routing ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    routeLine.current?.remove();
    routeLine.current = null;

    // Reset marker icons
    Object.entries(markers.current).forEach(([id, mk]) => {
      const v = id === origin ? 'origin' : id === dest ? 'dest' : 'default';
      mk.setIcon(nodeIcon(NODES[id].icon, v));
    });

    if (!origin || !dest || origin === dest) {
      setResult(null); setNoPath(false); return;
    }

    const found = dijkstra(origin, dest);
    if (!found) { setResult(null); setNoPath(true); return; }

    setResult(found);
    setNoPath(false);

    // Draw route along real roads
    routeLine.current = L.polyline(found.coords, {
      color: '#1a73e8', weight: 6, opacity: 0.9,
      dashArray: '12 8', lineJoin: 'round', lineCap: 'round',
    }).addTo(m);

    // Add animated arrow decorators if plugin available, else just fit bounds
    m.fitBounds(routeLine.current.getBounds(), { padding: [80, 80], maxZoom: 20 });
  }, [origin, dest]); // eslint-disable-line

  // ── GPS ──────────────────────────────────────────────────────────────────────
  const locateMe = useCallback(() => {
    const m = mapRef.current;
    if (!m || !navigator.geolocation) return;
    setLocating(true);
    if (gpsWatch.current) navigator.geolocation.clearWatch(gpsWatch.current);
    gpsWatch.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const ll = [coords.latitude, coords.longitude];
        setLocating(false);
        if (!gpsMark.current) gpsMark.current = L.marker(ll, { icon: liveDotIcon(), zIndexOffset: 1000 }).addTo(m);
        else gpsMark.current.setLatLng(ll);
        m.setView(ll, 19);
      },
      err => { console.warn('GPS:', err.message); setLocating(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const clearAll  = () => { setOrigin(null); setDest(null); setResult(null); setNoPath(false); propSetDest?.(null); };
  const openPicker = mode => { setPickerMode(mode); setSearch(''); setShowPicker(true); };
  const pickNode   = id   => { pickerMode === 'origin' ? setOrigin(id) : setDest(id); setShowPicker(false); };

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = days[new Date().getDay()];
  const todayTT = TIMETABLE[today] || [];

  const filtered = Object.entries(NODES).filter(([, n]) =>
    n.label.toLowerCase().includes(search.toLowerCase()) ||
    n.desc.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <div ref={mapEl} style={s.map} />

      {/* Header */}
      <div style={s.header}>
        <button onClick={() => navigate(-1)} style={s.hBtn}>←</button>
        <div>
          <div style={s.hTitle}>WCE Campus Map</div>
          <div style={s.hSub}>Walchand College of Engineering, Sangli</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowTT(v => !v)} style={{ ...s.hBtn, fontSize: '15px' }}>📅</button>
          <button onClick={clearAll} style={{ ...s.hBtn, color: '#e53935', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {/* Timetable pill — current/next class */}
      {(currentClass || nextClass) && (
        <div style={s.classBanner} onClick={() => setShowTT(v => !v)}>
          {currentClass ? (
            <>
              <span style={s.classDot('#34a853')} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1b5e20' }}>NOW: </span>
              <span style={{ fontSize: 12, color: '#333' }}>{currentClass.subject}</span>
              {currentClass.loc && (
                <button onClick={e => { e.stopPropagation(); setDest(currentClass.loc); }} style={s.classNavBtn}>
                  Navigate →
                </button>
              )}
            </>
          ) : nextClass ? (
            <>
              <span style={s.classDot('#f57c00')} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e65100' }}>NEXT: </span>
              <span style={{ fontSize: 12, color: '#333' }}>{nextClass.time} · {nextClass.subject}</span>
              {nextClass.loc && (
                <button onClick={e => { e.stopPropagation(); setDest(nextClass.loc); }} style={s.classNavBtn}>
                  Navigate →
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Map controls */}
      <div style={s.controls}>
        <button style={s.ctrlBtn} onClick={() => mapRef.current?.zoomIn()}>+</button>
        <button style={s.ctrlBtn} onClick={() => mapRef.current?.zoomOut()}>−</button>
        <div style={s.divider} />
        <button style={{ ...s.ctrlBtn, color: locating ? '#1a73e8' : '#555', fontSize: 18 }} onClick={locateMe}>
          {locating ? '⟳' : '⊙'}
        </button>
      </div>

      {/* O→D bar */}
      <div style={s.odBar}>
        <button style={s.odBtn(!!origin)} onClick={() => openPicker('origin')}>
          <span style={s.dot('#1a73e8')} />
          <span style={s.odLabel}>{origin ? NODES[origin]?.label : 'Set start'}</span>
        </button>
        <span style={s.arrow}>→</span>
        <button style={s.odBtn(!!dest)} onClick={() => openPicker('destination')}>
          <span style={s.dot('#34a853')} />
          <span style={s.odLabel}>{dest ? NODES[dest]?.label : 'Set destination'}</span>
        </button>
      </div>

      {/* Route result */}
      {result && (
        <div style={s.resultBar}>
          <span style={s.badge}>{result.totalDist}m</span>
          <span style={{ fontSize: 13, color: '#1a73e8', fontWeight: 600 }}>
            ~{Math.ceil(result.totalDist / 80)} min walk
          </span>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>
            via {result.path.length - 1} waypoints
          </span>
        </div>
      )}
      {noPath && (
        <div style={{ ...s.resultBar, background: '#fff3cd' }}>
          <span style={{ fontSize: 13, color: '#856404' }}>⚠️ No path found — try different locations</span>
        </div>
      )}

      {/* Timetable panel */}
      {showTT && (
        <div style={s.ttPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>📅 {today}'s Timetable — SY CSE Div A</span>
            <button onClick={() => setShowTT(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999' }}>×</button>
          </div>
          {todayTT.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', margin: '12px 0' }}>No classes today 🎉</p>
          ) : todayTT.map((slot, i) => (
            <div key={i} style={s.ttRow(slot.loc)}>
              <div style={{ fontSize: 12, color: '#888', width: 90, flexShrink: 0 }}>{slot.time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{slot.subject}</div>
                {slot.note && <div style={{ fontSize: 11, color: '#888' }}>{slot.note}</div>}
                {slot.loc && NODES[slot.loc] && (
                  <div style={{ fontSize: 11, color: '#1a73e8' }}>📍 {NODES[slot.loc].label}</div>
                )}
              </div>
              {slot.loc && (
                <button onClick={() => { setDest(slot.loc); setShowTT(false); }} style={s.ttNavBtn}>
                  Go
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Node picker */}
      {showPicker && (
        <div style={s.overlay} onClick={() => setShowPicker(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.handle} />
            <p style={s.sheetTitle}>
              {pickerMode === 'origin' ? '📍 Where are you?' : '🏁 Where to go?'}
            </p>
            <div style={{ padding: '0 16px 10px' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search buildings, labs, rooms…"
                autoFocus style={s.searchInput}
              />
            </div>
            <div style={s.list}>
              {filtered.map(([id, node]) => (
                <button key={id} style={s.listItem} onClick={() => pickNode(id)}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{node.icon}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={s.listName}>{node.label}</span>
                    <span style={s.listDesc}>{node.desc}</span>
                  </div>
                  {id === origin && <span style={s.pill('#1a73e8','#e8f0fe')}>Start</span>}
                  {id === dest   && <span style={s.pill('#2e7d32','#e8f5e9')}>End</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: '#aaa', padding: 24, fontSize: 14 }}>No results</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root:      { position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' },
  map:       { position: 'absolute', inset: 0 },
  header:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', paddingTop: 'calc(10px + env(safe-area-inset-top))', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,0,0,0.06)' },
  hTitle:    { fontSize: 15, fontWeight: 700, color: '#111' },
  hSub:      { fontSize: 11, color: '#888', marginTop: 1 },
  hBtn:      { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#1a73e8', padding: '4px 8px', fontWeight: 600 },
  classBanner:{ position: 'absolute', top: 'calc(58px + env(safe-area-inset-top))', left: 12, right: 12, zIndex: 999, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.97)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer' },
  classDot:  (c) => ({ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }),
  classNavBtn:{ marginLeft: 'auto', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  controls:  { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 900, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #e8e8e8' },
  ctrlBtn:   { width: 38, height: 38, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  divider:   { height: 1, background: '#e8e8e8', margin: '0 6px' },
  odBar:     { position: 'absolute', bottom: 'calc(20px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 14, padding: '10px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  odBtn:     (a) => ({ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: `1.5px solid ${a ? '#1a73e8' : '#e0e0e0'}`, borderRadius: 10, padding: '9px 11px', cursor: 'pointer', textAlign: 'left' }),
  dot:       (c) => ({ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0 }),
  odLabel:   { fontSize: 13, fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  arrow:     { fontSize: 16, color: '#aaa', flexShrink: 0 },
  resultBar: { position: 'absolute', bottom: 'calc(88px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10, background: '#e8f0fe', borderRadius: 10, padding: '10px 14px' },
  badge:     { background: '#1a73e8', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10 },
  ttPanel:   { position: 'absolute', bottom: 'calc(88px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 1000, background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: '55vh', overflowY: 'auto' },
  ttRow:     (hasLoc) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f0f0f0', background: hasLoc ? '#fafffe' : 'transparent' }),
  ttNavBtn:  { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  overlay:   { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  sheet:     { background: '#fff', borderRadius: '20px 20px 0 0', paddingTop: 12, maxHeight: '78dvh', display: 'flex', flexDirection: 'column' },
  handle:    { width: 40, height: 4, background: '#e0e0e0', borderRadius: 2, margin: '0 auto 10px' },
  sheetTitle:{ fontSize: 15, fontWeight: 700, color: '#111', padding: '0 20px 10px', margin: 0, borderBottom: '1px solid #f0f0f0' },
  searchInput:{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f8f9fa' },
  list:      { overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)', flex: 1 },
  listItem:  { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', textAlign: 'left' },
  listName:  { fontSize: 14, fontWeight: 600, color: '#111' },
  listDesc:  { fontSize: 12, color: '#888', marginTop: 2 },
  pill:      (c, bg) => ({ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: bg, color: c, whiteSpace: 'nowrap' }),
};