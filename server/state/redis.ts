import { createClient } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const redis = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : null;

if (redis) {
  redis.on('error', (error) => logger.error({ err: error }, 'Redis connection error'));
}

export async function connectRedis() {
  if (!redis || redis.isOpen) return;
  await redis.connect();
}

export async function disconnectRedis() {
  if (redis?.isOpen) await redis.quit();
}
