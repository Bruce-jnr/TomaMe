import { PaymentProviderName, PaymentStatus, VoteStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { paystackProvider } from '../payments/paystack.provider.js';
import { creditVerifiedPayment } from '../services/vote-credit.service.js';

export const paymentsRouter = Router();

async function creditedOrderResponse(reference: string) {
  const order = await prisma.voteOrder.findUnique({
    where: { paymentReference: reference },
    select: {
      voteStatus: true, quantity: true, amount: true, currency: true,
      candidate: { select: { name: true, candidateCode: true } },
      voteTransaction: { select: { id: true } },
    },
  });
  if (!order || order.voteStatus !== VoteStatus.CREDITED || !order.voteTransaction) return null;
  return { reference, transactionId: order.voteTransaction.id, quantity: order.quantity, amount: order.amount, currency: order.currency, candidate: order.candidate };
}

paymentsRouter.post('/:reference/initialize', async (req, res, next) => {
  try {
    const reference = z.string().regex(/^TOMA-[A-Z0-9-]+$/).parse(req.params.reference);
    const order = await prisma.voteOrder.findUnique({ where: { paymentReference: reference }, include: { organization: { select: { email: true } } } });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Vote order was not found.');
    if (order.paymentStatus === PaymentStatus.PAID) throw new AppError(409, 'ORDER_ALREADY_PAID', 'This order is already paid.');
    const initialized = await paystackProvider.initializePayment({ reference, amount: order.amount, currency: order.currency, email: order.organization.email, phone: order.voterPhone, callbackUrl: `${env.APP_URL}/payment/verify` });
    await prisma.voteOrder.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.PROCESSING, providerCheckoutUrl: initialized.authorizationUrl } });
    res.json({ success: true, data: initialized });
  } catch (error) { next(error); }
});

paymentsRouter.get('/:reference/verify', async (req, res, next) => {
  try {
    const reference = z.string().regex(/^TOMA-[A-Z0-9-]+$/).parse(req.params.reference);
    const alreadyCredited = await creditedOrderResponse(reference);
    if (alreadyCredited) {
      res.json({ success: true, data: alreadyCredited });
      return;
    }
    const verified = await paystackProvider.verifyPayment(reference);
    await creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified);
    const credited = await creditedOrderResponse(reference);
    if (!credited) throw new AppError(500, 'VOTE_CREDIT_CONFIRMATION_FAILED', 'Payment succeeded but vote confirmation is unavailable.');
    res.json({ success: true, data: credited });
  } catch (error) { next(error); }
});
