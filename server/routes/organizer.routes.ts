import { EventStatus, OrganizationRole, PaymentStatus, RecordStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { type AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.js';

export const organizerRouter = Router();
organizerRouter.use(requireAuth);

const managerRoles = [OrganizationRole.ORGANIZATION_OWNER, OrganizationRole.EVENT_ADMIN];
const categorySchema = z.object({ eventId: z.string().cuid(), name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).optional(), votePriceOverride: z.number().int().positive().nullable().optional() });
const candidateSchema = z.object({ eventId: z.string().cuid(), categoryId: z.string().cuid(), name: z.string().trim().min(2).max(100), candidateCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/), biography: z.string().trim().max(2000).optional(), slogan: z.string().trim().max(200).optional() });

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

organizerRouter.get('/context', async (req, res, next) => {
  try {
    const { organizationId } = (req as AuthenticatedRequest).auth;
    const events = await prisma.event.findMany({ where: { organizationId, status: { not: EventStatus.ARCHIVED } }, select: { id: true, name: true, status: true }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { events } });
  } catch (error) { next(error); }
});

organizerRouter.get('/categories', async (req, res, next) => {
  try {
    const { organizationId } = (req as AuthenticatedRequest).auth;
    const eventId = z.string().cuid().optional().parse(req.query.eventId);
    const categories = await prisma.category.findMany({ where: { event: { organizationId }, ...(eventId ? { eventId } : {}), status: { not: RecordStatus.ARCHIVED } }, include: { event: { select: { name: true } }, _count: { select: { candidates: true } } }, orderBy: [{ eventId: 'asc' }, { displayOrder: 'asc' }] });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

organizerRouter.post('/categories', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const { organizationId, userId } = (req as AuthenticatedRequest).auth;
    const event = await prisma.event.findFirst({ where: { id: input.eventId, organizationId }, select: { id: true } });
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
    const current = await prisma.category.findFirst({ where: { id, event: { organizationId: auth.organizationId } } });
    if (!current) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
    const category = await prisma.category.update({ where: { id: current.id }, data: input });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

organizerRouter.delete('/categories/:id', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const current = await prisma.category.findFirst({ where: { id, event: { organizationId: auth.organizationId } }, include: { _count: { select: { candidates: true } } } });
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
    const candidates = await prisma.candidate.findMany({ where: { organizationId: auth.organizationId, ...(eventId ? { eventId } : {}), status: { not: RecordStatus.ARCHIVED } }, include: { event: { select: { name: true } }, category: { select: { name: true } } }, orderBy: [{ eventId: 'asc' }, { categoryId: 'asc' }, { displayOrder: 'asc' }] });
    res.json({ success: true, data: candidates });
  } catch (error) { next(error); }
});

organizerRouter.post('/candidates', requireRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = candidateSchema.parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, eventId: input.eventId, event: { organizationId: auth.organizationId } } });
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
    const current = await prisma.candidate.findFirst({ where: { id, organizationId: auth.organizationId } });
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
    const current = await prisma.candidate.findFirst({ where: { id, organizationId: auth.organizationId } });
    if (!current) throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate was not found.');
    await prisma.candidate.update({ where: { id: current.id }, data: { status: RecordStatus.ARCHIVED } });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

organizerRouter.get('/payments', requireRoles(OrganizationRole.ORGANIZATION_OWNER, OrganizationRole.FINANCE_ADMIN), async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const query = z.object({ search: z.string().trim().max(100).default(''), status: z.nativeEnum(PaymentStatus).optional(), page: z.coerce.number().int().positive().default(1) }).parse(req.query);
    const where = { organizationId: auth.organizationId, ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: [{ reference: { contains: query.search, mode: 'insensitive' as const } }, { order: { candidate: { name: { contains: query.search, mode: 'insensitive' as const } } } }] } : {}) };
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, include: { order: { select: { quantity: true, channel: true, voterPhone: true, candidate: { select: { name: true, candidateCode: true } }, category: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * 25, take: 25 }),
      prisma.payment.count({ where }),
    ]);
    res.json({ success: true, data: { items: payments, pagination: { page: query.page, pageSize: 25, total } } });
  } catch (error) { next(error); }
});
