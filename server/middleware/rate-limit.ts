import { rateLimit, type Options } from 'express-rate-limit';

export function apiRateLimit(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-8',
    ...options,
  });
}
