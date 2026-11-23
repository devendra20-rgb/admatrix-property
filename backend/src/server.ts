import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.router.js';
import { propertiesRouter } from './routes/properties.router.js';
import { campaignsRouter } from './routes/campaigns.router.js';
import { leadsRouter } from './routes/leads.router.js';
import { complianceRouter } from './routes/compliance.router.js';
import { aiRouter } from './routes/ai.router.js';
import { whatsappRouter } from './routes/whatsapp.router.js';
import { seedRouter } from './routes/seed.router.js';
import { mediaRouter } from './routes/media.router.js';
import { ensureDbSeeded } from './seed.js';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration: Whitelist trusted origins and prevent credentialed wildcard reflection
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser agents (server-to-server, curl, test runners)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} blocked by CORS security policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Admatrix Property Backend API',
    database: 'PostgreSQL 16',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'Admatrix Property API Gateway',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: [
      '/api/auth',
      '/api/properties',
      '/api/campaigns',
      '/api/leads',
      '/api/compliance',
      '/api/ai',
      '/api/whatsapp',
      '/api/seed',
      '/api/media',
    ],
  });
});

// Mount Routes
app.use('/api/media', mediaRouter);
app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/seed', seedRouter);

// Start Server when run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🚀 Admatrix Backend running on port ${PORT}`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`=========================================`);

    try {
      await ensureDbSeeded();
    } catch (err) {
      console.error('Initial DB seed check error:', err);
    }
  });
}
