import { EventStatus, MembershipStatus, OrganizationRole, PaymentProviderName, PaymentStatus, Prisma, RecordStatus, VoteChannel } from '@prisma/client';
import argon2 from 'argon2';
import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { type AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.js';
import type { SessionPayload } from '../auth/session.js';
import { normalizeGhanaPhone } from '../domain/phone.js';

export const organizerRouter = Router();
organizerRouter.use(requireAuth);

const managerRoles = [OrganizationRole.ORGANIZATION_OWNER, OrganizationRole.EVENT_ADMIN];
const paymentRoles = [OrganizationRole.ORGANIZATION_OWNER, OrganizationRole.EVENT_ADMIN, OrganizationRole.FINANCE_ADMIN];

function eventAccessWhere(auth: SessionPayload): Prisma.EventWhereInput {
  return {
    organizationId: auth.organizationId,
    ...(auth.globalRole === 'SUPER_ADMIN' ? {} : { assignments: { some: { membership: { userId: auth.userId, organizationId: auth.organizationId, status: 'ACTIVE' } } } }),
  };
}

function requireSuperAdmin(req: express.Request, _res: express.Response, next: express.NextFunction) {
  if ((req as AuthenticatedRequest).auth.globalRole !== 'SUPER_ADMIN') return next(new AppError(403, 'SUPER_ADMIN_REQUIRED', 'Superadmin access is required.'));
  next();
}
const categorySchema = z.object({ eventId: z.string().cuid(), name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).optional(), votePriceOverride: z.number().int().positive().nullable().optional() });
const candidateSchema = z.object({ eventId: z.string().cuid(), categoryId: z.string().cuid(), name: z.string().trim().min(2).max(100), candidateCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/), biography: z.string().trim().max(2000).optional(), slogan: z.string().trim().max(200).optional(), photoUrl: z.string().trim().max(300).optional() });
const eventSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().trim().min(2).max(60),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  defaultVotePrice: z.number().int().positive(),
  minimumVotes: z.number().int().positive(),
  maximumVotesPerTransaction: z.number().int().positive(),
  webVotingEnabled: z.boolean(),
  ussdVotingEnabled: z.boolean(),
  resultsVisibility: z.enum(['EXACT_TOTALS', 'PERCENTAGES', 'RANKING_ONLY', 'HIDDEN_UNTIL_END', 'ADMIN_ONLY', 'MANUAL_RELEASE']),
  bannerUrl: z.string().trim().max(300).optional(),
}).superRefine((value, context) => {
  if (value.endAt <= value.startAt) context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after start time.' });
  if (value.endAt <= new Date()) context.addIssue({ code: 'custom', path: ['endAt'], message: 'Event must end in the future.' });
  if (value.maximumVotesPerTransaction < value.minimumVotes) context.addIssue({ code: 'custom', path: ['maximumVotesPerTransaction'], message: 'Maximum votes must be at least the minimum.' });
  if (!value.webVotingEnabled && !value.ussdVotingEnabled) context.addIssue({ code: 'custom', path: ['webVotingEnabled'], message: 'Enable at least one voting channel.' });
});
const eventPatchSchema = z.object({
  name: z.string().trim().min(3).max(100), description: z.string().trim().max(500),
  startAt: z.coerce.date(), endAt: z.coerce.date(), timezone: z.string().trim().min(2).max(60),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  defaultVotePrice: z.number().int().positive(), minimumVotes: z.number().int().positive(),
  maximumVotesPerTransaction: z.number().int().positive(), webVotingEnabled: z.boolean(), ussdVotingEnabled: z.boolean(),
  resultsVisibility: z.enum(['EXACT_TOTALS', 'PERCENTAGES', 'RANKING_ONLY', 'HIDDEN_UNTIL_END', 'ADMIN_ONLY', 'MANUAL_RELEASE']),
  bannerUrl: z.string().trim().max(300),
}).partial().strict();

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

organizerRouter.get('/context', async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const events = await prisma.event.findMany({ where: { ...eventAccessWhere(auth), status: { not: EventStatus.ARCHIVED } }, select: { id: true, name: true, description: true, status: true, bannerUrl: true, startAt: true, endAt: true, timezone: true, currency: true, defaultVotePrice: true, minimumVotes: true, maximumVotesPerTransaction: true, webVotingEnabled: true, ussdVotingEnabled: true, resultsVisibility: true }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { events } });
  } catch (error) { next(error); }
});

organizerRouter.get('/event-administrators', requireSuperAdmin, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: auth.organizationId, role: { in: [OrganizationRole.EVENT_ADMIN, OrganizationRole.FINANCE_ADMIN, OrganizationRole.RESULTS_VIEWER] } },
      select: { id: true, role: true, status: true, user: { select: { id: true, name: true, username: true, email: true, phone: true } }, eventAssignments: { select: { event: { select: { id: true, name: true, status: true } } }, orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: memberships.map((item) => ({ ...item, events: item.eventAssignments.map((assignment) => assignment.event), eventAssignments: undefined })) });
  } catch (error) { next(error); }
});

organizerRouter.post('/event-administrators', requireSuperAdmin, async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(2).max(100), username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/), email: z.string().email(), phone: z.string().trim().optional(),
      password: z.string().min(6, 'Password must contain at least 6 characters.').max(200),
      eventIds: z.array(z.string().cuid()).min(1, 'Select at least one event.'),
    }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const eventCount = await prisma.event.count({ where: { id: { in: input.eventIds }, organizationId: auth.organizationId } });
    if (eventCount !== new Set(input.eventIds).size) throw new AppError(400, 'INVALID_EVENT_ASSIGNMENT', 'One or more selected events are unavailable.');
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const phone = input.phone ? normalizeGhanaPhone(input.phone) : null;
    const membership = await prisma.$transaction(async (tx) => {
      const existingUsername = await tx.user.findUnique({ where: { username: input.username } });
      if (existingUsername) throw new AppError(409, 'USERNAME_TAKEN', 'This administrator username is already in use.');
      const existing = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (existing?.globalRole === 'SUPER_ADMIN') throw new AppError(409, 'ADMIN_ALREADY_PRIVILEGED', 'This account already has superadmin access.');
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { name: input.name, username: input.username, phone, passwordHash, sessionVersion: { increment: 1 } } })
        : await tx.user.create({ data: { name: input.name, username: input.username, email: input.email.toLowerCase(), phone, passwordHash } });
      const access = await tx.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: auth.organizationId, userId: user.id } },
        create: { organizationId: auth.organizationId, userId: user.id, role: OrganizationRole.EVENT_ADMIN, status: MembershipStatus.ACTIVE },
        update: { role: OrganizationRole.EVENT_ADMIN, status: MembershipStatus.ACTIVE },
      });
      await tx.eventAssignment.deleteMany({ where: { membershipId: access.id } });
      await tx.eventAssignment.createMany({ data: [...new Set(input.eventIds)].map((eventId) => ({ eventId, membershipId: access.id })) });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: 'EVENT_ADMIN_ASSIGNED', resourceType: 'OrganizationMembership', resourceId: access.id, newValue: { administratorUsername: input.username, eventIds: input.eventIds } } });
      return access;
    });
    res.status(201).json({ success: true, data: { id: membership.id }, message: 'Event administrator created and assigned.' });
  } catch (error) { next(error); }
});

organizerRouter.patch('/event-administrators/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const { eventIds, status } = z.object({ eventIds: z.array(z.string().cuid()).min(1), status: z.nativeEnum(MembershipStatus) }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const membership = await prisma.organizationMembership.findFirst({ where: { id, organizationId: auth.organizationId, role: OrganizationRole.EVENT_ADMIN } });
    if (!membership) throw new AppError(404, 'EVENT_ADMIN_NOT_FOUND', 'Event administrator was not found.');
    const eventCount = await prisma.event.count({ where: { id: { in: eventIds }, organizationId: auth.organizationId } });
    if (eventCount !== new Set(eventIds).size) throw new AppError(400, 'INVALID_EVENT_ASSIGNMENT', 'One or more selected events are unavailable.');
    await prisma.$transaction(async (tx) => {
      await tx.organizationMembership.update({ where: { id }, data: { status } });
      await tx.eventAssignment.deleteMany({ where: { membershipId: id } });
      await tx.eventAssignment.createMany({ data: [...new Set(eventIds)].map((eventId) => ({ eventId, membershipId: id })) });
      if (status !== MembershipStatus.ACTIVE) await tx.user.update({ where: { id: membership.userId }, data: { sessionVersion: { increment: 1 } } });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: 'EVENT_ADMIN_ACCESS_UPDATED', resourceType: 'OrganizationMembership', resourceId: id, newValue: { eventIds, status } } });
    });
    res.json({ success: true, data: null, message: 'Administrator access updated.' });
  } catch (error) { next(error); }
});

organizerRouter.post('/events', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = eventSchema.parse(req.body);
    const { organizationId, userId } = (req as AuthenticatedRequest).auth;
    const now = new Date();
    const status = input.startAt > now ? EventStatus.SCHEDULED : EventStatus.ACTIVE;
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: { ...input, organizationId, slug: `${slugify(input.name)}-${Date.now().toString(36)}`, description: input.description || null, status },
      });
      if ((req as AuthenticatedRequest).auth.globalRole !== 'SUPER_ADMIN') {
        const membership = await tx.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId, userId } } });
        await tx.eventAssignment.create({ data: { eventId: created.id, membershipId: membership.id } });
      }
      await tx.auditLog.create({ data: { organizationId, userId, action: 'EVENT_PUBLISHED', resourceType: 'Event', resourceId: created.id, newValue: { name: created.name, status: created.status } } });
      return created;
    });
    res.status(201).json({ success: true, data: event, message: 'Event published.' });
  } catch (error) { next(error); }
});

organizerRouter.patch('/events/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const input = eventPatchSchema.parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const current = await prisma.event.findFirst({ where: { id, ...eventAccessWhere(auth) } });
    if (!current) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found.');
    const merged = {
      name: input.name ?? current.name, description: input.description ?? current.description ?? undefined,
      startAt: input.startAt ?? current.startAt, endAt: input.endAt ?? current.endAt,
      timezone: input.timezone ?? current.timezone, currency: input.currency ?? current.currency,
      defaultVotePrice: input.defaultVotePrice ?? current.defaultVotePrice,
      minimumVotes: input.minimumVotes ?? current.minimumVotes,
      maximumVotesPerTransaction: input.maximumVotesPerTransaction ?? current.maximumVotesPerTransaction,
      webVotingEnabled: input.webVotingEnabled ?? current.webVotingEnabled,
      ussdVotingEnabled: input.ussdVotingEnabled ?? current.ussdVotingEnabled,
      resultsVisibility: input.resultsVisibility ?? current.resultsVisibility,
      bannerUrl: input.bannerUrl ?? current.bannerUrl ?? undefined,
    };
    if (merged.endAt <= merged.startAt) throw new AppError(400, 'INVALID_EVENT_WINDOW', 'End time must be after start time.');
    if (input.endAt && input.endAt <= new Date()) throw new AppError(400, 'INVALID_EVENT_END', 'The new end time must be in the future.');
    if (merged.maximumVotesPerTransaction < merged.minimumVotes) throw new AppError(400, 'INVALID_VOTE_LIMITS', 'Maximum votes must be at least the minimum.');
    if (!merged.webVotingEnabled && !merged.ussdVotingEnabled) throw new AppError(400, 'VOTING_CHANNEL_REQUIRED', 'Enable at least one voting channel.');
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.event.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: 'EVENT_UPDATED', resourceType: 'Event', resourceId: id, oldValue: { name: current.name, startAt: current.startAt, endAt: current.endAt }, newValue: { name: changed.name, startAt: changed.startAt, endAt: changed.endAt } } });
      return changed;
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

organizerRouter.patch('/events/:id/voting-status', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const { action } = z.object({ action: z.enum(['pause', 'resume']) }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const event = await prisma.event.findFirst({ where: { id, ...eventAccessWhere(auth) } });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found.');
    if (action === 'pause' && event.status !== EventStatus.ACTIVE) {
      throw new AppError(409, 'EVENT_NOT_ACTIVE', 'Only active voting can be paused.');
    }
    if (action === 'resume') {
      if (event.status !== EventStatus.PAUSED) throw new AppError(409, 'EVENT_NOT_PAUSED', 'This event is not paused.');
      const now = new Date();
      if (event.startAt > now || event.endAt <= now) throw new AppError(409, 'EVENT_OUTSIDE_VOTING_WINDOW', 'Voting can only resume during the event voting period.');
    }
    const nextStatus = action === 'pause' ? EventStatus.PAUSED : EventStatus.ACTIVE;
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.event.update({ where: { id: event.id }, data: { status: nextStatus }, select: { id: true, name: true, status: true } });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: action === 'pause' ? 'EVENT_VOTING_PAUSED' : 'EVENT_VOTING_RESUMED', resourceType: 'Event', resourceId: event.id, oldValue: { status: event.status }, newValue: { status: nextStatus } } });
      return changed;
    });
    res.json({ success: true, data: updated, message: action === 'pause' ? 'Voting paused.' : 'Voting resumed.' });
  } catch (error) { next(error); }
});

organizerRouter.delete('/events/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const auth = (req as AuthenticatedRequest).auth;
    const event = await prisma.event.findFirst({ where: { id, ...eventAccessWhere(auth) } });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found.');
    if (event.status === EventStatus.ACTIVE) throw new AppError(409, 'ACTIVE_EVENT_ARCHIVE_BLOCKED', 'Pause voting before archiving an active event.');
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: { status: EventStatus.ARCHIVED } });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: 'EVENT_ARCHIVED', resourceType: 'Event', resourceId: id, oldValue: { status: event.status }, newValue: { status: EventStatus.ARCHIVED } } });
    });
    res.json({ success: true, data: null, message: 'Event archived.' });
  } catch (error) { next(error); }
});

organizerRouter.get('/categories', async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const eventId = z.string().cuid().optional().parse(req.query.eventId);
    const categories = await prisma.category.findMany({ where: { event: eventAccessWhere(auth), ...(eventId ? { eventId } : {}), status: { not: RecordStatus.ARCHIVED } }, include: { event: { select: { name: true } }, _count: { select: { candidates: true } } }, orderBy: [{ eventId: 'asc' }, { displayOrder: 'asc' }] });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

organizerRouter.post('/categories', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const { organizationId, userId } = (req as AuthenticatedRequest).auth;
    const event = await prisma.event.findFirst({ where: { id: input.eventId, ...eventAccessWhere((req as AuthenticatedRequest).auth) }, select: { id: true } });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found.');
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data: { ...input, slug: `${slugify(input.name)}-${Date.now().toString(36)}`, description: input.description || null } });
      await tx.auditLog.create({ data: { organizationId, userId, action: 'CATEGORY_CREATED', resourceType: 'Category', resourceId: created.id, newValue: { name: created.name } } });
      return created;
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

organizerRouter.patch('/categories/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = categorySchema.partial().omit({ eventId: true }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const current = await prisma.category.findFirst({ where: { id, event: eventAccessWhere(auth) } });
    if (!current) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
    const category = await prisma.category.update({ where: { id: current.id }, data: input });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

organizerRouter.delete('/categories/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const current = await prisma.category.findFirst({ where: { id, event: eventAccessWhere(auth) }, include: { _count: { select: { candidates: true } } } });
    if (!current) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
    if (current._count.candidates) throw new AppError(409, 'CATEGORY_NOT_EMPTY', 'Move or archive its candidates first.');
    await prisma.category.update({ where: { id: current.id }, data: { status: RecordStatus.ARCHIVED } });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

organizerRouter.get('/candidates', async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const eventId = z.string().cuid().optional().parse(req.query.eventId);
    const candidates = await prisma.candidate.findMany({ where: { organizationId: auth.organizationId, event: eventAccessWhere(auth), ...(eventId ? { eventId } : {}), status: { not: RecordStatus.ARCHIVED } }, include: { event: { select: { name: true } }, category: { select: { name: true } } }, orderBy: [{ eventId: 'asc' }, { categoryId: 'asc' }, { displayOrder: 'asc' }] });
    res.json({ success: true, data: candidates });
  } catch (error) { next(error); }
});

const candidateImageTypes = new Map([
  ['image/jpeg', { extension: 'jpg', signature: (data: Buffer) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff }],
  ['image/png', { extension: 'png', signature: (data: Buffer) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', signature: (data: Buffer) => data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP' }],
]);

organizerRouter.post('/event-images', requireRoles(...managerRoles), express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), async (req, res, next) => {
  try {
    const contentType = req.headers['content-type']?.split(';')[0] || '';
    const imageType = candidateImageTypes.get(contentType);
    const data = req.body as Buffer;
    if (!imageType || !Buffer.isBuffer(data) || data.length === 0 || !imageType.signature(data)) {
      throw new AppError(400, 'INVALID_EVENT_IMAGE', 'Upload a valid JPEG, PNG, or WebP image.');
    }
    const directory = path.resolve(process.cwd(), 'uploads', 'events');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${imageType.extension}`;
    await writeFile(path.join(directory, filename), data, { flag: 'wx' });
    res.status(201).json({ success: true, data: { bannerUrl: `/api/v1/public/event-images/${filename}` } });
  } catch (error) { next(error); }
});

organizerRouter.patch('/events/:id/banner', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const id = z.string().cuid().parse(req.params.id);
    const { bannerUrl } = z.object({ bannerUrl: z.string().trim().max(300) }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const event = await prisma.event.findFirst({ where: { id, ...eventAccessWhere(auth) }, select: { id: true, bannerUrl: true } });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found.');
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.event.update({ where: { id }, data: { bannerUrl }, select: { id: true, name: true, status: true, bannerUrl: true } });
      await tx.auditLog.create({ data: { organizationId: auth.organizationId, userId: auth.userId, action: 'EVENT_BANNER_UPDATED', resourceType: 'Event', resourceId: id, oldValue: { bannerUrl: event.bannerUrl }, newValue: { bannerUrl } } });
      return changed;
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

organizerRouter.post('/candidate-images', requireRoles(...managerRoles), express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), async (req, res, next) => {
  try {
    const contentType = req.headers['content-type']?.split(';')[0] || '';
    const imageType = candidateImageTypes.get(contentType);
    const data = req.body as Buffer;
    if (!imageType || !Buffer.isBuffer(data) || data.length === 0 || !imageType.signature(data)) {
      throw new AppError(400, 'INVALID_CANDIDATE_IMAGE', 'Upload a valid JPEG, PNG, or WebP image.');
    }
    const directory = path.resolve(process.cwd(), 'uploads', 'candidates');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${imageType.extension}`;
    await writeFile(path.join(directory, filename), data, { flag: 'wx' });
    res.status(201).json({ success: true, data: { photoUrl: `/api/v1/public/candidate-images/${filename}` } });
  } catch (error) { next(error); }
});

organizerRouter.post('/candidates', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = candidateSchema.parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, eventId: input.eventId, event: eventAccessWhere(auth) } });
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found for this event.');
    const candidate = await prisma.candidate.create({ data: { ...input, organizationId: auth.organizationId, slug: `${slugify(input.name)}-${Date.now().toString(36)}`, biography: input.biography || null, slogan: input.slogan || null } });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

organizerRouter.patch('/candidates/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = candidateSchema.partial().omit({ eventId: true }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const current = await prisma.candidate.findFirst({ where: { id, organizationId: auth.organizationId, event: eventAccessWhere(auth) } });
    if (!current) throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate was not found.');
    if (input.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: input.categoryId, eventId: current.eventId } });
      if (!category) throw new AppError(409, 'INVALID_CATEGORY', 'Category does not belong to the candidate event.');
    }
    const candidate = await prisma.candidate.update({ where: { id: current.id }, data: input });
    res.json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

organizerRouter.delete('/candidates/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const current = await prisma.candidate.findFirst({ where: { id, organizationId: auth.organizationId, event: eventAccessWhere(auth) } });
    if (!current) throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate was not found.');
    await prisma.candidate.update({ where: { id: current.id }, data: { status: RecordStatus.ARCHIVED } });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

organizerRouter.get('/payments', requireRoles(...paymentRoles), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const query = z.object({ search: z.string().trim().max(100).default(''), eventId: z.string().cuid().optional(), status: z.nativeEnum(PaymentStatus).optional(), channel: z.nativeEnum(VoteChannel).optional(), provider: z.nativeEnum(PaymentProviderName).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(10).max(100).default(25) }).parse(req.query);
    const to = query.to ? new Date(query.to) : undefined;
    if (to) to.setUTCHours(23, 59, 59, 999);
    const where: Prisma.PaymentWhereInput = {
      organizationId: auth.organizationId,
      order: { event: eventAccessWhere(auth), ...(query.eventId ? { eventId: query.eventId } : {}), ...(query.channel ? { channel: query.channel } : {}) },
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.from || to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query.search ? { OR: [{ reference: { contains: query.search, mode: 'insensitive' } }, { providerTransactionId: { contains: query.search, mode: 'insensitive' } }, { order: { candidate: { name: { contains: query.search, mode: 'insensitive' } } } }, { order: { candidate: { candidateCode: { contains: query.search, mode: 'insensitive' } } } }] } : {}),
    };
    const [payments, total, paid, failed, revenueByCurrency, voteAggregate, eventPayments] = await Promise.all([
      prisma.payment.findMany({ where, include: { order: { select: { quantity: true, channel: true, voterPhone: true, event: { select: { id: true, name: true } }, candidate: { select: { name: true, candidateCode: true } }, category: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.payment.count({ where }),
      prisma.payment.count({ where: { ...where, status: PaymentStatus.PAID } }),
      prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
      prisma.payment.groupBy({ by: ['currency'], where: { ...where, status: PaymentStatus.PAID }, _sum: { amount: true } }),
      prisma.voteTransaction.aggregate({ where: { payment: { is: where } }, _sum: { quantity: true } }),
      prisma.payment.findMany({
        where,
        select: { amount: true, currency: true, status: true, order: { select: { voteTransaction: { select: { quantity: true } }, event: { select: { id: true, name: true } } } } },
      }),
    ]);
    const eventSummaryMap = new Map<string, { eventId: string; eventName: string; transactions: number; paid: number; revenueByCurrency: Map<string, number>; creditedVotes: number }>();
    for (const payment of eventPayments) {
      const event = payment.order.event;
      const summary = eventSummaryMap.get(event.id) ?? { eventId: event.id, eventName: event.name, transactions: 0, paid: 0, revenueByCurrency: new Map(), creditedVotes: 0 };
      summary.transactions += 1;
      if (payment.status === PaymentStatus.PAID) {
        summary.paid += 1;
        summary.creditedVotes += payment.order.voteTransaction?.quantity ?? 0;
        summary.revenueByCurrency.set(payment.currency, (summary.revenueByCurrency.get(payment.currency) ?? 0) + payment.amount);
      }
      eventSummaryMap.set(event.id, summary);
    }
    res.json({ success: true, data: {
      items: payments.map((payment) => ({ ...payment, order: { ...payment.order, voterPhone: payment.order.voterPhone.replace(/.(?=.{4})/g, '•') } })),
      summary: { total, paid, failed, successRate: total ? Math.round((paid / total) * 1000) / 10 : 0, creditedVotes: voteAggregate._sum.quantity ?? 0, revenueByCurrency: revenueByCurrency.map((item) => ({ currency: item.currency, amount: item._sum.amount ?? 0 })) },
      eventSummaries: Array.from(eventSummaryMap.values(), (item) => ({ ...item, revenueByCurrency: Array.from(item.revenueByCurrency, ([currency, amount]) => ({ currency, amount })) })).sort((left, right) => left.eventName.localeCompare(right.eventName)),
      pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    } });
  } catch (error) { next(error); }
});

organizerRouter.get('/payments/:id', requireRoles(...paymentRoles), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: auth.organizationId, order: { event: eventAccessWhere(auth) } },
      include: { order: { include: { event: { select: { name: true } }, category: { select: { name: true } }, candidate: { select: { name: true, candidateCode: true } }, voteTransaction: { select: { id: true, quantity: true, createdAt: true } } } } },
    });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found.');
    res.json({ success: true, data: { ...payment, order: { ...payment.order, voterPhone: payment.order.voterPhone.replace(/.(?=.{4})/g, '•'), voterEmail: payment.order.voterEmail ? 'Provided' : null } } });
  } catch (error) { next(error); }
});

organizerRouter.get('/audit-logs', requireSuperAdmin, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const query = z.object({
      search: z.string().trim().max(100).default(''),
      action: z.string().trim().max(100).optional(),
      resourceType: z.string().trim().max(100).optional(),
      retention: z.enum(['active', 'archived', 'all']).default('active'),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(10).max(100).default(25),
    }).parse(req.query);
    const to = query.to ? new Date(query.to) : undefined;
    if (to) to.setUTCHours(23, 59, 59, 999);
    const retentionWhere: Prisma.AuditLogWhereInput = query.retention === 'active'
      ? { archivedAt: null }
      : query.retention === 'archived' ? { archivedAt: { not: null } } : {};
    const where: Prisma.AuditLogWhereInput = {
      organizationId: auth.organizationId,
      ...retentionWhere,
      ...(query.action ? { action: query.action } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.from || to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query.search ? { OR: [
        { action: { contains: query.search, mode: 'insensitive' } },
        { resourceType: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } },
        { user: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
      ] } : {}),
    };
    const [items, total, actions, resourceTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: { id: true, action: true, resourceType: true, resourceId: true, oldValue: true, newValue: true, ipAddress: true, userAgent: true, createdAt: true, archivedAt: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where: { organizationId: auth.organizationId, ...retentionWhere }, distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      prisma.auditLog.findMany({ where: { organizationId: auth.organizationId, ...retentionWhere }, distinct: ['resourceType'], select: { resourceType: true }, orderBy: { resourceType: 'asc' } }),
    ]);
    res.json({ success: true, data: {
      items,
      filters: { actions: actions.map((item) => item.action), resourceTypes: resourceTypes.map((item) => item.resourceType) },
      pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    } });
  } catch (error) { next(error); }
});
