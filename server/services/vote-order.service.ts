import { randomBytes } from 'node:crypto';
import { PaymentProviderName, RecordStatus, VoteChannel } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { assertEventAcceptsVotes, calculateOrderAmount } from '../domain/voting.js';

export const createVoteOrderSchema = z.object({
  candidateId: z.string().cuid(),
  quantity: z.number().int().positive(),
  phone: z.string().trim().min(7).max(20),
  email: z.string().email().optional(),
  channel: z.enum(['WEB', 'USSD']).default('WEB'),
});

function createPaymentReference(): string {
  const year = new Date().getUTCFullYear();
  return `TOMA-${year}-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export async function createVoteOrder(rawInput: unknown) {
  const input = createVoteOrderSchema.parse(rawInput);
  const candidate = await prisma.candidate.findUnique({
    where: { id: input.candidateId },
    include: { event: true, category: true },
  });

  if (!candidate || candidate.status !== RecordStatus.ACTIVE) {
    throw new AppError(404, 'CANDIDATE_NOT_AVAILABLE', 'Candidate is not available for voting.');
  }
  if (candidate.category.eventId !== candidate.eventId) {
    throw new AppError(409, 'INVALID_CANDIDATE_CONFIGURATION', 'Candidate category is invalid.');
  }

  assertEventAcceptsVotes(candidate.event, input.channel);
  const unitPrice = candidate.category.votePriceOverride ?? candidate.event.defaultVotePrice;
  const amount = calculateOrderAmount({
    quantity: input.quantity,
    minimumVotes: candidate.event.minimumVotes,
    maximumVotes: candidate.event.maximumVotesPerTransaction,
    unitPrice,
  });

  return prisma.voteOrder.create({
    data: {
      organizationId: candidate.organizationId,
      eventId: candidate.eventId,
      categoryId: candidate.categoryId,
      candidateId: candidate.id,
      quantity: input.quantity,
      unitPrice,
      amount,
      currency: candidate.event.currency,
      voterPhone: input.phone,
      voterEmail: input.email,
      channel: input.channel === 'WEB' ? VoteChannel.WEB : VoteChannel.USSD,
      paymentProvider: PaymentProviderName.PAYSTACK,
      paymentReference: createPaymentReference(),
    },
    select: {
      id: true,
      paymentReference: true,
      quantity: true,
      unitPrice: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      createdAt: true,
    },
  });
}
