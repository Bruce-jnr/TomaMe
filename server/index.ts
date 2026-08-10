import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './db/prisma.js';

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'TomaMe API listening');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down API');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
