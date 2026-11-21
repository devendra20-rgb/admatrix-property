import { Router, Request, Response } from 'express';
import { ensureDbSeeded } from '../seed.js';

export const seedRouter = Router();

seedRouter.get('/', async (_req: Request, res: Response) => {
  const result = await ensureDbSeeded();
  res.json(result);
});

seedRouter.post('/', async (_req: Request, res: Response) => {
  const result = await ensureDbSeeded();
  res.json(result);
});

