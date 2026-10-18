import { EventStatus, RecordStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const eventQuerySchema = z.object({
  status: z.enum(['all', 'live', 'upcoming', 'ended']).default('all'),
  search: z.string().trim().max(100).default(''),
});

function publicEventStatus(event: { status: EventStatus; startAt: Date; endAt: Date }) {
  const now = new Date();
  if (event.status === EventStatus.ENDED || event.endAt <= now) return 'ended';
  if (event.status === EventStatus.SCHEDULED || event.startAt > now) return 'upcoming';
  if (event.status === EventStatus.PAUSED) return 'paused';
  if (event.status === EventStatus.ACTIVE) return 'live';
  return 'unavailable';
}

export const publicRouter = Router();

publicRouter.get('/events', async (req, res, next) => {
  try {
    const query = eventQuerySchema.parse(req.query);
    const now = new Date();
    const statusWhere =
      query.status === 'live'
        ? { status: { in: [EventStatus.ACTIVE, EventStatus.PAUSED] }, startAt: { lte: now }, endAt: { gt: now } }
        : query.status === 'upcoming'
          ? { OR: [{ status: EventStatus.SCHEDULED }, { startAt: { gt: now } }] }
          : query.status === 'ended'
            ? { OR: [{ status: EventStatus.ENDED }, { endAt: { lte: now } }] }
            : { status: { in: [EventStatus.ACTIVE, EventStatus.PAUSED, EventStatus.SCHEDULED, EventStatus.ENDED] } };

    const events = await prisma.event.findMany({
      where: {
        ...statusWhere,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' as const } },
                { organization: { name: { contains: query.search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        bannerUrl: true,
        startAt: true,
        endAt: true,
        status: true,
        organization: { select: { name: true, logoUrl: true } },
        _count: { select: { categories: true, candidates: true } },
      },
      orderBy: [{ status: 'asc' }, { endAt: 'asc' }],
      take: 50,
    });

    res.json({
      success: true,
      data: events.map((event) => ({ ...event, publicStatus: publicEventStatus(event) })),
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/events/:slug', async (req, res, next) => {
  try {
    const slug = z.string().trim().min(1).max(160).parse(req.params.slug);
    const event = await prisma.event.findFirst({
      where: { slug, status: { in: [EventStatus.ACTIVE, EventStatus.PAUSED, EventStatus.SCHEDULED, EventStatus.ENDED] } },
      select: {
        id: true, name: true, slug: true, description: true, bannerUrl: true, startAt: true, endAt: true,
        timezone: true, currency: true, defaultVotePrice: true, minimumVotes: true, maximumVotesPerTransaction: true, status: true, resultsVisibility: true,
        webVotingEnabled: true, ussdVotingEnabled: true,
        organization: { select: { name: true, logoUrl: true } },
        categories: {
          where: { status: RecordStatus.ACTIVE }, orderBy: { displayOrder: 'asc' },
          select: { id: true, name: true, slug: true, description: true, votePriceOverride: true, _count: { select: { candidates: { where: { status: RecordStatus.ACTIVE } } } } },
        },
      },
    });
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event was not found.' } });
      return;
    }
    const [candidates, voteGroups, adjustmentGroups] = await Promise.all([
      prisma.candidate.findMany({
        where: { eventId: event.id, status: RecordStatus.ACTIVE },
        select: { id: true, name: true, slug: true, candidateCode: true, photoUrl: true, biography: true, slogan: true, categoryId: true, category: { select: { name: true, slug: true } } },
        orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      }),
      prisma.voteTransaction.groupBy({ by: ['candidateId'], where: { eventId: event.id }, _sum: { quantity: true } }),
      prisma.voteAdjustment.groupBy({ by: ['candidateId'], where: { candidate: { eventId: event.id } }, _sum: { quantity: true } }),
    ]);
    const totals = new Map<string, number>();
    for (const group of voteGroups) totals.set(group.candidateId, group._sum.quantity ?? 0);
    for (const group of adjustmentGroups) totals.set(group.candidateId, (totals.get(group.candidateId) ?? 0) + (group._sum.quantity ?? 0));
    const visibility = event.resultsVisibility === 'HIDDEN_UNTIL_END' && event.endAt <= new Date() ? 'EXACT_TOTALS' : event.resultsVisibility;
    const publiclyVisible = ['EXACT_TOTALS', 'PERCENTAGES', 'RANKING_ONLY'].includes(visibility);
    const categoryResults = event.categories.map((category) => {
      const categoryCandidates = candidates.filter((candidate) => candidate.categoryId === category.id);
      const ranked = categoryCandidates.map((candidate) => ({ candidate, votes: totals.get(candidate.id) ?? 0 })).sort((left, right) => right.votes - left.votes || left.candidate.name.localeCompare(right.candidate.name));
      const totalVotes = ranked.reduce((sum, item) => sum + item.votes, 0);
      return {
        categoryId: category.id,
        visibility: publiclyVisible ? visibility : 'HIDDEN',
        ...(visibility === 'EXACT_TOTALS' ? { totalVotes } : {}),
        ...(publiclyVisible && ranked[0] ? { leader: { name: ranked[0].candidate.name, candidateCode: ranked[0].candidate.candidateCode, ...(visibility === 'EXACT_TOTALS' ? { votes: ranked[0].votes } : {}), ...(visibility === 'PERCENTAGES' ? { percentage: totalVotes ? Math.round((ranked[0].votes / totalVotes) * 1000) / 10 : 0 } : {}) } } : {}),
      };
    });
    const publicCandidates = candidates.map((candidate) => {
      const categoryCandidates = candidates.filter((item) => item.categoryId === candidate.categoryId).sort((left, right) => (totals.get(right.id) ?? 0) - (totals.get(left.id) ?? 0) || left.name.localeCompare(right.name));
      const categoryTotal = categoryCandidates.reduce((sum, item) => sum + (totals.get(item.id) ?? 0), 0);
      const votes = totals.get(candidate.id) ?? 0;
      const rank = categoryCandidates.findIndex((item) => item.id === candidate.id) + 1;
      return { ...candidate, result: visibility === 'EXACT_TOTALS' ? { votes, rank } : visibility === 'PERCENTAGES' ? { percentage: categoryTotal ? Math.round((votes / categoryTotal) * 1000) / 10 : 0, rank } : visibility === 'RANKING_ONLY' ? { rank } : null };
    });
    res.json({ success: true, data: { ...event, publicStatus: publicEventStatus(event), candidates: publicCandidates, categoryResults } });
  } catch (error) { next(error); }
});

publicRouter.get('/candidates/featured', async (_req, res, next) => {
  try {
    const now = new Date();
    const candidates = await prisma.candidate.findMany({
      where: {
        status: RecordStatus.ACTIVE,
        event: { status: EventStatus.ACTIVE, startAt: { lte: now }, endAt: { gt: now } },
      },
      select: {
        id: true,
        name: true,
        candidateCode: true,
        photoUrl: true,
        slogan: true,
        category: { select: { name: true } },
        event: { select: { name: true, slug: true } },
      },
      orderBy: [{ cachedVoteCount: 'desc' }, { displayOrder: 'asc' }],
      take: 6,
    });
    res.json({ success: true, data: candidates });
  } catch (error) {
    next(error);
  }
});
