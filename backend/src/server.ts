import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { propertiesRouter } from './routes/properties.router.js';
import { campaignsRouter } from './routes/campaigns.router.js';
import { leadsRouter } from './routes/leads.router.js';
import { complianceRouter } from './routes/compliance.router.js';
import { aiRouter } from './routes/ai.router.js';
import { whatsappRouter } from './routes/whatsapp.router.js';
import { seedRouter } from './routes/seed.router.js';
import { ensureDbSeeded } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Admatrix Property Backend API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'Admatrix Property API Gateway',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: [
      '/api/properties',
      '/api/campaigns',
      '/api/leads',
      '/api/compliance',
      '/api/ai',
      '/api/whatsapp',
      '/api/seed',
    ],
  });
});

// Mount Routes
app.use('/api/properties', propertiesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/seed', seedRouter);

// Start Server
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

