import { createHash } from 'node:crypto';
import { PaymentProviderName } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { paystackProvider } from '../payments/paystack.provider.js';
import { processPaystackWebhookLog, scheduleWebhookRetry } from '../services/webhook-processing.service.js';

export const webhookRouter = Router();

webhookRouter.post('/paystack', async (req, res, next) => {
  const rawBody = req.body as Buffer;
  const signature = req.header('x-paystack-signature');
  const signatureValid = paystackProvider.verifyWebhook(rawBody, signature);
  let event: { event?: string; data?: { reference?: string } } = {};
  try { event = JSON.parse(rawBody.toString('utf8')); } catch { /* logged below */ }
  const log = await prisma.webhookLog.create({ data: { provider: PaymentProviderName.PAYSTACK, eventType: event.event || 'unknown', reference: event.data?.reference, signatureValid, payloadDigest: createHash('sha256').update(rawBody).digest('hex') } });
  if (!signatureValid) {
    await prisma.webhookLog.update({ where: { id: log.id }, data: { processed: true, processingResult: 'INVALID_SIGNATURE', processedAt: new Date() } });
    res.status(401).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature.' } });
    return;
  }
  if (event.event !== 'charge.success' || !event.data?.reference) {
    await prisma.webhookLog.update({ where: { id: log.id }, data: { processed: true, processingResult: 'IGNORED_EVENT', processedAt: new Date() } });
    res.sendStatus(200);
    return;
  }
  try {
    await processPaystackWebhookLog(log.id);
    res.sendStatus(200);
  } catch (error) {
    await scheduleWebhookRetry(log.id, 1, error);
    res.sendStatus(200);
  }
});
