import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import ical from 'node-ical';
import Papa from 'papaparse';
import { firestore } from '../db.js';
import { requireAuth as authRequired } from '../auth.js';
import { ok, badRequest } from '../lib/http.js';

export const scheduleRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function minsSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizeDay(jsDay) {
  const d = clampInt(jsDay, 0, 6);
  return d ?? 0;
}

function toEventInput(e, source) {
  const day = normalizeDay(e.day);
  const startMins = clampInt(e.startMins, 0, 24 * 60 - 1);
  const endMins = clampInt(e.endMins, 1, 24 * 60);
  if (startMins == null || endMins == null || endMins <= startMins) return null;

  return {
    subject: String(e.subject || '').trim() || 'Untitled class',
    code: e.code ? String(e.code).trim() : null,
    type: e.type ? String(e.type).trim() : null,
    room: e.room ? String(e.room).trim() : null,
    nodeId: e.nodeId ? String(e.nodeId).trim() : null,
    day,
    startMins,
    endMins,
    source,
  };
}

async function getUserEvents(userId) {
  const snap = await firestore.collection('classEvents').where('userId', '==', userId).get();
  const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  events.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.startMins - b.startMins;
  });
  return events;
}

scheduleRouter.get('/', authRequired, async (req, res) => {
  const events = await getUserEvents(req.userId);
  return ok(res, { events });
});

scheduleRouter.delete('/', authRequired, async (req, res) => {
  const snap = await firestore.collection('classEvents').where('userId', '==', req.userId).get();
  const batch = firestore.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return ok(res, {});
});

const manualSchema = z.object({
  subject: z.string().min(1).max(200),
  code: z.string().max(50).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  room: z.string().max(80).optional().nullable(),
  nodeId: z.string().max(40).optional().nullable(),
  day: z.number().int().min(0).max(6),
  startMins: z.number().int().min(0).max(24 * 60 - 1),
  endMins: z.number().int().min(1).max(24 * 60),
});

scheduleRouter.post('/manual', authRequired, async (req, res) => {
  const parsed = manualSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid input', parsed.error.flatten());
  if (parsed.data.endMins <= parsed.data.startMins) return badRequest(res, 'End time must be after start time.');

  const ref = firestore.collection('classEvents').doc();
  const data = { ...parsed.data, userId: req.userId, source: 'manual', createdAt: new Date().toISOString() };
  await ref.set(data);
  return ok(res, { event: { id: ref.id, ...data } });
});

scheduleRouter.post('/import', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return badRequest(res, 'Missing file');

  const name = (req.file.originalname || '').toLowerCase();
  const content = req.file.buffer.toString('utf8');
  const source = name.endsWith('.ics') ? 'ics' : name.endsWith('.csv') ? 'csv' : null;
  if (!source) return badRequest(res, 'Unsupported file type. Upload .ics or .csv.');

  const imported = [];
  const rejected = [];

  if (source === 'ics') {
    let parsed;
    try {
      parsed = ical.sync.parseICS(content);
    } catch {
      return badRequest(res, 'Invalid ICS file');
    }

    for (const item of Object.values(parsed)) {
      if (!item || item.type !== 'VEVENT') continue;
      const summary = item.summary || 'Class';
      const location = item.location || null;
      const dtStart = item.start instanceof Date ? item.start : null;
      const dtEnd = item.end instanceof Date ? item.end : null;
      if (!dtStart || !dtEnd) continue;

      const ev = toEventInput(
        {
          subject: summary,
          room: location,
          day: dtStart.getDay(),
          startMins: minsSinceMidnight(dtStart),
          endMins: minsSinceMidnight(dtEnd),
        },
        'ics'
      );
      if (!ev) {
        rejected.push({ reason: 'invalid_time', summary });
        continue;
      }
      imported.push(ev);
    }
  }

  if (source === 'csv') {
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    if (parsed.errors?.length) return badRequest(res, 'Invalid CSV file', parsed.errors.slice(0, 5));

    const dayMap = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };

    function parseTimeToMins(s) {
      const raw = String(s || '').trim();
      if (!raw) return null;
      const m1 = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (m1) {
        const h = clampInt(m1[1], 0, 23);
        const m = clampInt(m1[2], 0, 59);
        if (h == null || m == null) return null;
        return h * 60 + m;
      }
      const m2 = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
      if (m2) {
        let h = clampInt(m2[1], 1, 12);
        const m = clampInt(m2[2], 0, 59);
        if (h == null || m == null) return null;
        const isPm = m2[3].toLowerCase() === 'pm';
        if (h === 12) h = isPm ? 12 : 0;
        else h = isPm ? h + 12 : h;
        return h * 60 + m;
      }
      return null;
    }

    for (const row of parsed.data || []) {
      const dayRaw = row.day ?? row.Day ?? row.DAY;
      const dayNum = Number(dayRaw);
      const day = Number.isFinite(dayNum)
        ? clampInt(dayNum, 0, 6)
        : dayMap[String(dayRaw || '').trim().toLowerCase()] ?? null;

      const startMins = parseTimeToMins(row.start ?? row.Start ?? row.START);
      const endMins = parseTimeToMins(row.end ?? row.End ?? row.END);

      const ev = toEventInput(
        {
          subject: row.subject ?? row.Subject ?? row.SUBJECT,
          code: row.code ?? row.Code ?? row.CODE,
          type: row.type ?? row.Type ?? row.TYPE,
          room: row.room ?? row.Room ?? row.ROOM,
          nodeId: row.nodeId ?? row.NodeId ?? row.NODEID ?? row.node_id ?? row.NODE_ID,
          day,
          startMins,
          endMins,
        },
        'csv'
      );
      if (!ev) {
        rejected.push({ reason: 'invalid_row', row });
        continue;
      }
      imported.push(ev);
    }
  }

  if (!imported.length) return badRequest(res, 'No classes found in file.');

  // Replace existing schedule
  const oldSnap = await firestore.collection('classEvents').where('userId', '==', req.userId).get();
  
  // We can only do 500 writes per batch in Firestore. Let's do it simply, since class schedule size is small
  const batch = firestore.batch();
  
  // Delete old docs
  oldSnap.docs.forEach(doc => batch.delete(doc.ref));
  
  // Create new docs
  imported.forEach(e => {
    const ref = firestore.collection('classEvents').doc();
    batch.set(ref, { ...e, userId: req.userId, createdAt: new Date().toISOString() });
  });
  
  await batch.commit();

  const events = await getUserEvents(req.userId);
  return ok(res, { importedCount: imported.length, rejectedCount: rejected.length, events });
});
