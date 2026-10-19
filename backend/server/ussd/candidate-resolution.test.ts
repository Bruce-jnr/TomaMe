import { EventStatus, RecordStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  hasAmbiguousLiveCode,
  liveUssdCandidateFilter,
} from './candidate-resolution.js';

describe('live USSD candidate resolution', () => {
  it('limits a normalized code to active candidates and categories in a live USSD event', () => {
    const now = new Date('2026-10-18T12:00:00Z');

    expect(liveUssdCandidateFilter(' abc-01 ', now)).toEqual({
      candidateCode: 'ABC-01',
      status: RecordStatus.ACTIVE,
      category: { status: RecordStatus.ACTIVE },
      event: {
        status: EventStatus.ACTIVE,
        ussdVotingEnabled: true,
        startAt: { lte: now },
        endAt: { gt: now },
      },
    });
  });

  it('treats multiple live matches as ambiguous', () => {
    expect(hasAmbiguousLiveCode([{ id: 'first' }, { id: 'second' }])).toBe(
      true,
    );
    expect(hasAmbiguousLiveCode([{ id: 'only' }])).toBe(false);
  });
});
