import argon2 from 'argon2';
import { MembershipStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { createSession, SESSION_COOKIE } from '../auth/session.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' };

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { memberships: { where: { status: MembershipStatus.ACTIVE }, include: { organization: true }, take: 1 } },
    });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    const membership = user.memberships[0];
    if (!membership) throw new AppError(403, 'NO_ORGANIZATION_ACCESS', 'No active organization membership was found.');
    const token = await createSession({ userId: user.id, organizationId: membership.organizationId, role: membership.role });
    res.cookie(SESSION_COOKIE, token, cookieOptions).json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email }, organization: { id: membership.organization.id, name: membership.organization.name }, role: membership.role } });
  } catch (error) { next(error); }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined }).json({ success: true, data: null });
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const [user, organization] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { id: true, name: true, email: true } }),
      prisma.organization.findUniqueOrThrow({ where: { id: auth.organizationId }, select: { id: true, name: true, slug: true } }),
    ]);
    res.json({ success: true, data: { user, organization, role: auth.role } });
  } catch (error) { next(error); }
});
