import { PaymentProviderName } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { paystackProvider } from '../payments/paystack.provider.js';
import { creditVerifiedPayment } from './vote-credit.service.js';

export async function processPaystackWebhookLog(id: string) {
  const log = await prisma.webhookLog.findUniqueOrThrow({ where: { id } });
  if (log.processed) return;
  if (!log.signatureValid || log.eventType !== 'charge.success' || !log.reference) return;
  const verified = await paystackProvider.verifyPayment(log.reference);
  await creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified);
  await prisma.webhookLog.update({
    where: { id },
    data: { processed: true, processingResult: 'VOTE_CREDITED', processedAt: new Date(), nextAttemptAt: null, lastError: null },
  });
}

export function retryDelay(attempt: number) {
  return Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

export async function scheduleWebhookRetry(id: string, attempt: number, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown processing error';
  await prisma.webhookLog.update({
    where: { id },
    data: {
      attempts: attempt,
      processingResult: attempt >= 8 ? 'RETRY_EXHAUSTED' : 'RETRY_SCHEDULED',
      nextAttemptAt: attempt >= 8 ? null : new Date(Date.now() + retryDelay(attempt)),
      lastError: message.slice(0, 300),
    },
  });
}
