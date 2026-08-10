import { AppError } from '../errors/app-error.js';

export type VotingEvent = {
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED' | 'ARCHIVED';
  startAt: Date;
  endAt: Date;
  minimumVotes: number;
  maximumVotesPerTransaction: number;
  defaultVotePrice: number;
  webVotingEnabled: boolean;
  ussdVotingEnabled: boolean;
};

export function assertEventAcceptsVotes(
  event: VotingEvent,
  channel: 'WEB' | 'USSD',
  now = new Date(),
): void {
  if (event.status === 'PAUSED') throw new AppError(409, 'EVENT_PAUSED', 'Voting is paused.');
  if (event.status !== 'ACTIVE') throw new AppError(409, 'EVENT_NOT_ACTIVE', 'Voting is not active.');
  if (now < event.startAt) throw new AppError(409, 'EVENT_NOT_STARTED', 'Voting has not started.');
  if (now >= event.endAt) throw new AppError(409, 'EVENT_CLOSED', 'Voting for this event has ended.');
  if (channel === 'WEB' && !event.webVotingEnabled) {
    throw new AppError(409, 'WEB_VOTING_DISABLED', 'Web voting is disabled for this event.');
  }
  if (channel === 'USSD' && !event.ussdVotingEnabled) {
    throw new AppError(409, 'USSD_VOTING_DISABLED', 'USSD voting is disabled for this event.');
  }
}

export function calculateOrderAmount(input: {
  quantity: number;
  minimumVotes: number;
  maximumVotes: number;
  unitPrice: number;
}): number {
  const { quantity, minimumVotes, maximumVotes, unitPrice } = input;
  if (!Number.isSafeInteger(quantity) || quantity < minimumVotes || quantity > maximumVotes) {
    throw new AppError(
      400,
      'INVALID_VOTE_QUANTITY',
      `Vote quantity must be between ${minimumVotes} and ${maximumVotes}.`,
    );
  }
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) {
    throw new AppError(500, 'INVALID_VOTE_PRICE', 'The configured vote price is invalid.');
  }

  const amount = quantity * unitPrice;
  if (!Number.isSafeInteger(amount)) {
    throw new AppError(400, 'AMOUNT_OUT_OF_RANGE', 'The order amount is too large.');
  }
  return amount;
}
