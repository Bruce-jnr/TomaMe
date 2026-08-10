import { PaymentProviderName, PaymentStatus, Prisma, VoteStatus } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { VerifiedPayment } from '../payments/payment-provider.js';

export async function creditVerifiedPayment(
  provider: PaymentProviderName,
  verified: VerifiedPayment,
) {
  if (!verified.successful) throw new AppError(409, 'PAYMENT_NOT_SUCCESSFUL', 'Payment was not successful.');

  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.voteOrder.findUnique({ where: { paymentReference: verified.reference } });
        if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Vote order was not found.');

        // The unique order/payment/transaction constraints make provider retries idempotent.
        if (order.voteStatus === VoteStatus.CREDITED) {
          return tx.voteTransaction.findUniqueOrThrow({ where: { orderId: order.id } });
        }
        if (order.paymentProvider !== provider) {
          throw new AppError(409, 'PAYMENT_PROVIDER_MISMATCH', 'Payment provider does not match the order.');
        }
        if (verified.amount !== order.amount) {
          throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Verified payment amount does not match the order.');
        }
        if (verified.currency.toUpperCase() !== order.currency.toUpperCase()) {
          throw new AppError(409, 'PAYMENT_CURRENCY_MISMATCH', 'Verified payment currency does not match the order.');
        }

        const payment = await tx.payment.create({
          data: {
            organizationId: order.organizationId,
            orderId: order.id,
            provider,
            providerTransactionId: verified.providerTransactionId,
            reference: verified.reference,
            amount: verified.amount,
            currency: verified.currency.toUpperCase(),
            status: PaymentStatus.PAID,
            paymentMethod: verified.paymentMethod,
            providerPaidAt: verified.paidAt,
          },
        });
        const transaction = await tx.voteTransaction.create({
          data: {
            organizationId: order.organizationId,
            eventId: order.eventId,
            categoryId: order.categoryId,
            candidateId: order.candidateId,
            orderId: order.id,
            paymentId: payment.id,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            amount: order.amount,
            currency: order.currency,
            channel: order.channel,
            paymentReference: order.paymentReference,
          },
        });
        await tx.candidate.update({
          where: { id: order.candidateId },
          data: { cachedVoteCount: { increment: order.quantity } },
        });
        await tx.voteOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            voteStatus: VoteStatus.CREDITED,
            paidAt: verified.paidAt ?? new Date(),
            processedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: order.organizationId,
            action: 'VOTE_CREDITED',
            resourceType: 'VoteOrder',
            resourceId: order.id,
            newValue: { quantity: order.quantity, paymentReference: order.paymentReference },
          },
        });
        return transaction;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.voteTransaction.findUnique({ where: { paymentReference: verified.reference } });
      if (existing) return existing;
    }
    throw error;
  }
}
