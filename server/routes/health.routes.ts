import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { redis } from '../state/redis.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

healthRouter.get('/ready', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (redis) await redis.ping();
    res.json({ success: true, data: { status: 'ready', database: 'connected', redis: redis ? 'connected' : 'development-fallback' } });
  } catch (error) {
    next(error);
  }
});
