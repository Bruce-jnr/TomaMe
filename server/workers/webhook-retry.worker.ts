import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { processPaystackWebhookLog, scheduleWebhookRetry } from '../services/webhook-processing.service.js';

let timer: NodeJS.Timeout | undefined;
let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const jobs = await prisma.webhookLog.findMany({
      where: { processed: false, signatureValid: true, eventType: 'charge.success', nextAttemptAt: { lte: now }, attempts: { lt: 8 } },
      orderBy: { nextAttemptAt: 'asc' },
      take: 20,
    });
    for (const job of jobs) {
      const claimed = await prisma.webhookLog.updateMany({
        where: { id: job.id, processed: false, attempts: job.attempts },
        data: { attempts: { increment: 1 }, nextAttemptAt: null, processingResult: 'RETRYING' },
      });
      if (!claimed.count) continue;
      try {
        await processPaystackWebhookLog(job.id);
      } catch (error) {
        await scheduleWebhookRetry(job.id, job.attempts + 1, error);
        logger.warn({ err: error, webhookLogId: job.id }, 'Paystack webhook retry failed');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Webhook retry worker failed');
  } finally {
    running = false;
  }
}

export function startWebhookRetryWorker() {
  timer = setInterval(() => void run(), env.WEBHOOK_RETRY_INTERVAL_MS);
  timer.unref();
  void run();
}

export function stopWebhookRetryWorker() {
  if (timer) clearInterval(timer);
}
