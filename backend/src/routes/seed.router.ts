import { Router, Request, Response } from 'express';
import { ensureDbSeeded } from '../seed.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

export const seedRouter = Router();

// Protected administrative endpoint: only SUPER_ADMIN can trigger database seed
seedRouter.use(authenticate, requireRole('SUPER_ADMIN'));

seedRouter.get('/', async (_req: Request, res: Response) => {
  const result = await ensureDbSeeded();
  res.json(result);
});

seedRouter.post('/', async (_req: Request, res: Response) => {
  const result = await ensureDbSeeded();
  res.json(result);
});

