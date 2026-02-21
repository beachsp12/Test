import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load env before anything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import extractRouter from './routes/extract';
import offersRouter from './routes/offers';
import templatesRouter from './routes/templates';
import documentsRouter from './routes/documents';
import formTemplatesRouter from './routes/formTemplates';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Increase JSON limit for large field sets
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/extract', extractRouter);
app.use('/api/offers', offersRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/form-templates', formTemplatesRouter);

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`GBBREB API server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. NLP extraction will fail.');
  }
});

export default app;
