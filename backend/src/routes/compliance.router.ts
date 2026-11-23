import { Router, Request, Response } from 'express';
import { validateTrakheesiCompliance } from '../services/compliance.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const complianceRouter = Router();

// Endpoint for checking compliance parameters
complianceRouter.post('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const result = validateTrakheesiCompliance(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Validation failed' });
  }
});
