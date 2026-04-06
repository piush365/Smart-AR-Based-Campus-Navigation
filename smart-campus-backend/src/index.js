import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import { scheduleRouter } from './routes/schedule.js';

const app = express();
const PORT = process.env.PORT || 8787;

// ── CORS ──────────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/schedule', scheduleRouter);

// ── Health check ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Global error handler ─────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Smart Campus backend running on http://0.0.0.0:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});
