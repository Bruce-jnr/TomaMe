import { RedisStore } from 'rate-limit-redis';
import { rateLimit, type Options } from 'express-rate-limit';
import { redis } from '../state/redis.js';

export function distributedRateLimit(prefix: string, options: Partial<Options>) {
  const client = redis;
  return rateLimit({
    standardHeaders: 'draft-8',
    ...options,
    ...(client
      ? { store: new RedisStore({ prefix: `ratelimit:${prefix}:`, sendCommand: (...args: string[]) => client.sendCommand(args) }) }
      : {}),
  });
}
