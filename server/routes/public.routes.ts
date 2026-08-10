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
        ? { status: EventStatus.ACTIVE, startAt: { lte: now }, endAt: { gt: now } }
        : query.status === 'upcoming'
          ? { OR: [{ status: EventStatus.SCHEDULED }, { startAt: { gt: now } }] }
          : query.status === 'ended'
            ? { OR: [{ status: EventStatus.ENDED }, { endAt: { lte: now } }] }
            : { status: { in: [EventStatus.ACTIVE, EventStatus.SCHEDULED, EventStatus.ENDED] } };

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
