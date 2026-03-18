import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { scheduleRouter } from './routes/schedule.js';
import { ok } from './lib/http.js';

const app = express();

const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: false,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => ok(res, { status: 'ok' }));
app.use('/auth', authRouter);
app.use('/schedule', scheduleRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

