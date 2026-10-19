import { EventStatus, Prisma, RecordStatus } from '@prisma/client';

export function liveUssdCandidateFilter(
  candidateCode: string,
  now = new Date(),
): Prisma.CandidateWhereInput {
  return {
    candidateCode: candidateCode.trim().toUpperCase(),
    status: RecordStatus.ACTIVE,
    category: { status: RecordStatus.ACTIVE },
    event: {
      status: EventStatus.ACTIVE,
      ussdVotingEnabled: true,
      startAt: { lte: now },
      endAt: { gt: now },
    },
  };
}

export function hasAmbiguousLiveCode(matches: readonly unknown[]) {
  return matches.length > 1;
}
