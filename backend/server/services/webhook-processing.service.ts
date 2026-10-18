import { LedgerEntryType, PaymentProviderName, WithdrawalStatus } from '@prisma/client';
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

export async function processPaystackTransferWebhook(logId: string, eventType: string, reference: string) {
  await prisma.$transaction(async (tx) => {
    const log = await tx.webhookLog.findUniqueOrThrow({ where: { id: logId } });
    if (log.processed) return;
    const withdrawal = await tx.withdrawal.findUnique({ where: { reference } });
    if (!withdrawal) {
      await tx.webhookLog.update({ where: { id: logId }, data: { processed: true, processingResult: 'WITHDRAWAL_NOT_FOUND', processedAt: new Date() } });
      return;
    }
    const status = eventType === 'transfer.success' ? WithdrawalStatus.SUCCESS : eventType === 'transfer.reversed' ? WithdrawalStatus.REVERSED : WithdrawalStatus.FAILED;
    if (withdrawal.status === WithdrawalStatus.SUCCESS || withdrawal.status === WithdrawalStatus.FAILED || withdrawal.status === WithdrawalStatus.REVERSED) {
      await tx.webhookLog.update({ where: { id: logId }, data: { processed: true, processingResult: 'ALREADY_FINALIZED', processedAt: new Date() } });
      return;
    }
    await tx.withdrawal.update({ where: { id: withdrawal.id }, data: { status, failureReason: status === WithdrawalStatus.FAILED ? 'Paystack reported transfer failure.' : null } });
    if (status !== WithdrawalStatus.SUCCESS) await tx.ledgerEntry.create({ data: { walletId: withdrawal.walletId, eventId: withdrawal.eventId, type: LedgerEntryType.WITHDRAWAL_REVERSAL, amount: withdrawal.amount, reference: `${status}-${withdrawal.reference}`, description: status === WithdrawalStatus.REVERSED ? 'Paystack transfer reversed' : 'Failed Paystack transfer released' } });
    await tx.webhookLog.update({ where: { id: logId }, data: { processed: true, processingResult: `TRANSFER_${status}`, processedAt: new Date() } });
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
