import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();

router.post('/parse-timetable', requireAuth, async (req, res, next) => {
  try {
    const text = req.body?.text;
    if (!text) {
    return res.status(400).json({ error: 'Text is required' });
    }
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Text too short' });
    }

    const prompt = `You are a timetable parser. Extract all class schedules from the following timetable text and return ONLY a JSON array. No explanation, no markdown, just the JSON array.

Each object must have these fields:
- subject: string
- code: string (or "")
- day: number (1=Monday through 6=Saturday)
- startH: number (24h)
- startM: number
- endH: number
- endM: number
- room: string (or "")
- type: string ("Lecture", "Lab", or "Tutorial")

Rules:
- Skip "Self Learning", "Lunch", "Tea Break" slots
- For afternoon slots 01:xx–06:xx, add 12 to hour (01:15 = 13:15)
- Lab slots (e.g. "DBE-DBEL"): type = "Lab"

Timetable text:
${text.slice(0, 6000)}

Return ONLY the JSON array:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'AI response failed' });
    }

    const data = await response.json();
    if (!data.candidates) {
      return res.status(500).json({ error: 'AI response failed' });
    }
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    
    res.json({ result: clean });
  } catch (err) { next(err); }
});

export default router;