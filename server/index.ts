import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './db/prisma.js';
import { connectRedis, disconnectRedis } from './state/redis.js';
import {
  startWebhookRetryWorker,
  stopWebhookRetryWorker,
} from './workers/webhook-retry.worker.js';
import {
  startAuditRetentionWorker,
  stopAuditRetentionWorker,
} from './workers/audit-retention.worker.js';

await connectRedis();
const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'TomaMe API listening');
});
startWebhookRetryWorker();
startAuditRetentionWorker();

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down API');
  server.close(async () => {
    stopWebhookRetryWorker();
    stopAuditRetentionWorker();
    await disconnectRedis();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
