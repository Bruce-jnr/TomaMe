import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { organizerRouter } from './routes/organizer.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { voteOrdersRouter } from './routes/vote-orders.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '250kb' }), webhookRouter);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8' }));
app.use('/api/health', healthRouter);
app.use('/api/v1/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizer', organizerRouter);
app.use('/api/v1/public/candidate-images', express.static(path.resolve(process.cwd(), 'uploads', 'candidates'), { fallthrough: false, maxAge: '1d', immutable: false }));
app.use('/api/v1/public/event-images', express.static(path.resolve(process.cwd(), 'uploads', 'events'), { fallthrough: false, maxAge: '1d', immutable: false }));
app.use('/api/v1/payments', rateLimit({ windowMs: 60_000, limit: 30 }), paymentsRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/vote-orders', rateLimit({ windowMs: 60_000, limit: 20 }), voteOrdersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
