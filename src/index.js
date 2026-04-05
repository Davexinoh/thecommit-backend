import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import authRouter from './routes/auth.js';
import articlesRouter from './routes/articles.js';
import digestRouter from './routes/digest.js';
import askRouter from './routes/ask.js';
import { runPipeline } from './services/pipeline.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Render health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/articles', articlesRouter);
app.use('/digest', digestRouter);
app.use('/ask', askRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── SERVER ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] The Commit backend running on port ${PORT}`);
  console.log(`[server] Frontend origin: ${allowedOrigins[0]}`);

  // Run pipeline once on startup (after 10s delay to let connections settle)
  setTimeout(() => {
    console.log('[pipeline] Running initial pipeline on startup...');
    runPipeline().catch((err) => console.error('[pipeline] Startup run failed:', err.message));
  }, 10_000);

  // Schedule pipeline every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('[cron] Scheduled pipeline run starting...');
    runPipeline().catch((err) => console.error('[pipeline] Cron run failed:', err.message));
  });
});
