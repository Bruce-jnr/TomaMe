import {
  PaymentProviderName,
  PaymentStatus,
  RecordStatus,
} from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { normalizeGhanaPhone } from '../domain/phone.js';
import { paystackProvider } from '../payments/paystack.provider.js';
import { createVoteOrder } from '../services/vote-order.service.js';
import { creditVerifiedPayment } from '../services/vote-credit.service.js';
import type { ArkeselRequest } from './arkesel.js';

type Step = 'MAIN_MENU' | 'ENTER_CODE' | 'ENTER_QUANTITY' | 'CONFIRM_ORDER';
type Session = {
  step: Step;
  phone: string;
  network: string;
  candidateId?: string;
  candidateName?: string;
  categoryName?: string;
  quantity?: number;
  amount?: number;
  expiresAt: number;
};
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 2 * 60 * 1000;

function save(id: string, session: Omit<Session, 'expiresAt'>) {
  sessions.set(id, { ...session, expiresAt: Date.now() + SESSION_TTL_MS });
}
function providerFor(network: string): 'mtn' | 'atl' | 'vod' {
  const value = network.toLowerCase();
  if (value.includes('mtn')) return 'mtn';
  if (
    value.includes('airtel') ||
    value.includes('tigo') ||
    value.includes('at ')
  )
    return 'atl';
  if (value.includes('vod') || value.includes('telecel')) return 'vod';
  throw new AppError(
    400,
    'UNSUPPORTED_MOMO_NETWORK',
    'Your mobile money network is not supported.',
  );
}

export async function handleUssd(
  request: ArkeselRequest,
): Promise<{ message: string; continueSession: boolean }> {
  const phone = normalizeGhanaPhone(request.msisdn);
  if (request.newSession) {
    save(request.sessionID, {
      step: 'MAIN_MENU',
      phone,
      network: request.network,
    });
    return {
      message: 'Welcome to TomaMe\n1. Vote\n0. Exit',
      continueSession: true,
    };
  }
  const session = sessions.get(request.sessionID);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(request.sessionID);
    return {
      message: 'Session expired. Try Again',
      continueSession: false,
    };
  }
  const input = request.userData.trim();
  if (session.step === 'MAIN_MENU') {
    if (input !== '1') {
      sessions.delete(request.sessionID);
      return {
        message:
          input === '0' ? 'Thank you for using TomaMe.' : 'Invalid option.',
        continueSession: false,
      };
    }
    save(request.sessionID, { ...session, step: 'ENTER_CODE' });
    return { message: 'Enter nominee code:', continueSession: true };
  }
  if (session.step === 'ENTER_CODE') {
    const candidate = await prisma.candidate.findFirst({
      where: {
        candidateCode: input.toUpperCase(),
        status: RecordStatus.ACTIVE,
      },
      include: { event: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!candidate)
      return {
        message: 'Nominee code not found. Enter nominee code:',
        continueSession: true,
      };
    if (!candidate.event.ussdVotingEnabled)
      return {
        message: 'USSD voting is unavailable for this event.',
        continueSession: false,
      };
    save(request.sessionID, {
      ...session,
      step: 'ENTER_QUANTITY',
      candidateId: candidate.id,
      candidateName: candidate.name,
      categoryName: candidate.category.name,
    });
    return {
      message: `${candidate.name}\n${candidate.category.name}\nEnter number of votes:`,
      continueSession: true,
    };
  }
  if (session.step === 'ENTER_QUANTITY') {
    const quantity = Number(input);
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      return {
        message: 'Enter a valid number of votes:',
        continueSession: true,
      };
    const candidate = await prisma.candidate.findUnique({
      where: { id: session.candidateId! },
      include: { event: true, category: true },
    });
    if (!candidate)
      return {
        message: 'Nominee is no longer available.',
        continueSession: false,
      };
    const unitPrice =
      candidate.category.votePriceOverride ?? candidate.event.defaultVotePrice;
    const amount = quantity * unitPrice;
    save(request.sessionID, {
      ...session,
      step: 'CONFIRM_ORDER',
      quantity,
      amount,
    });
    return {
      message: `${session.candidateName}\n${quantity} vote${quantity === 1 ? '' : 's'}\nTotal: ${candidate.event.currency} ${(amount / 100).toFixed(2)}\n1. Accept\n2. Cancel`,
      continueSession: true,
    };
  }
  if (input !== '1') {
    sessions.delete(request.sessionID);
    return { message: 'Vote cancelled.', continueSession: false };
  }
  const order = await createVoteOrder({
    candidateId: session.candidateId,
    quantity: session.quantity,
    phone,
    channel: 'USSD',
  });
  const savedOrder = await prisma.voteOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { organization: { select: { email: true } } },
  });
  const charge = await paystackProvider.initializeMobileMoney({
    reference: order.paymentReference,
    amount: order.amount,
    currency: order.currency,
    email: savedOrder.organization.email,
    phone,
    provider: providerFor(session.network),
  });
  await prisma.voteOrder.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.PROCESSING },
  });
  sessions.delete(request.sessionID);
  if (charge.status === 'success') {
    const verified = await paystackProvider.verifyPayment(
      order.paymentReference,
    );
    await creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified);
    return {
      message: `Payment confirmed. ${order.quantity} vote${order.quantity === 1 ? '' : 's'} credited to ${session.candidateName}.\nRef: ${order.paymentReference}`,
      continueSession: false,
    };
  }
  return {
    message: `${charge.displayText}\nEnter your Mobile Money PIN on the authorization prompt. Votes are credited after payment confirmation.\nRef: ${order.paymentReference}`,
    continueSession: false,
  };
}
