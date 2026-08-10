import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

healthRouter.get('/ready', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ready', database: 'connected' } });
  } catch (error) {
    next(error);
  }
});
