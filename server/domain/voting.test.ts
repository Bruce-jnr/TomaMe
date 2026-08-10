import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/app-error.js';
import { assertEventAcceptsVotes, calculateOrderAmount, type VotingEvent } from './voting.js';

const activeEvent: VotingEvent = {
  status: 'ACTIVE',
  startAt: new Date('2026-01-01T00:00:00Z'),
  endAt: new Date('2026-12-31T00:00:00Z'),
  minimumVotes: 1,
  maximumVotesPerTransaction: 500,
  defaultVotePrice: 100,
  webVotingEnabled: true,
  ussdVotingEnabled: true,
};

describe('calculateOrderAmount', () => {
  it('calculates money using integer minor units', () => {
    expect(calculateOrderAmount({ quantity: 50, minimumVotes: 1, maximumVotes: 500, unitPrice: 100 })).toBe(5000);
  });

  it.each([0, 501, 1.5])('rejects invalid quantity %s', (quantity) => {
    expect(() =>
      calculateOrderAmount({ quantity, minimumVotes: 1, maximumVotes: 500, unitPrice: 100 }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_VOTE_QUANTITY' }));
  });

  it('rejects unsafe monetary multiplication', () => {
    expect(() =>
      calculateOrderAmount({
        quantity: Number.MAX_SAFE_INTEGER,
        minimumVotes: 1,
        maximumVotes: Number.MAX_SAFE_INTEGER,
        unitPrice: 2,
      }),
    ).toThrowError(expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }));
  });
});

describe('assertEventAcceptsVotes', () => {
  it('accepts enabled voting during the active window', () => {
    expect(() => assertEventAcceptsVotes(activeEvent, 'WEB', new Date('2026-06-01T00:00:00Z'))).not.toThrow();
  });

  it.each([
    [{ ...activeEvent, status: 'PAUSED' as const }, 'EVENT_PAUSED'],
    [{ ...activeEvent, status: 'ENDED' as const }, 'EVENT_NOT_ACTIVE'],
    [{ ...activeEvent, webVotingEnabled: false }, 'WEB_VOTING_DISABLED'],
  ])('rejects an unavailable event', (event, code) => {
    try {
      assertEventAcceptsVotes(event, 'WEB', new Date('2026-06-01T00:00:00Z'));
      expect.fail('Expected an AppError');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(code);
    }
  });

  it('rejects voting at the exact closing time', () => {
    expect(() => assertEventAcceptsVotes(activeEvent, 'WEB', activeEvent.endAt)).toThrowError(
      expect.objectContaining({ code: 'EVENT_CLOSED' }),
    );
  });
});
