import argon2 from 'argon2';
import { MembershipStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { createSession, SESSION_COOKIE } from '../auth/session.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { normalizeGhanaPhone } from '../domain/phone.js';
import { sendPasswordResetOtp, verifyPasswordResetOtp } from '../messaging/arkesel-otp.provider.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
const newPasswordSchema = z.string().min(10).max(200).regex(/[a-z]/, 'Include a lowercase letter.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/\d/, 'Include a number.');
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
    res.cookie(SESSION_COOKIE, token, cookieOptions).json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, organization: { id: membership.organization.id, name: membership.organization.name }, role: membership.role } });
  } catch (error) { next(error); }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined }).json({ success: true, data: null });
});

authRouter.post('/password-reset/request', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { where: { status: MembershipStatus.ACTIVE }, take: 1 } } });
    const challengeId = user?.phone && user.memberships.length ? undefined : randomUUID();
    if (!user?.phone || !user.memberships.length) {
      res.json({ success: true, data: { challengeId }, message: 'If the account has a recovery phone, a code has been sent.' });
      return;
    }
    await prisma.passwordResetChallenge.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } });
    const challenge = await prisma.passwordResetChallenge.create({ data: { userId: user.id, phone: user.phone, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    try { await sendPasswordResetOtp(user.phone); }
    catch (error) { await prisma.passwordResetChallenge.delete({ where: { id: challenge.id } }); throw error; }
    res.json({ success: true, data: { challengeId: challenge.id }, message: 'If the account has a recovery phone, a code has been sent.' });
  } catch (error) { next(error); }
});

authRouter.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const input = z.object({ challengeId: z.string().min(10).max(100), otp: z.string().regex(/^\d{6}$/), password: newPasswordSchema }).parse(req.body);
    const challenge = await prisma.passwordResetChallenge.findFirst({ where: { id: input.challengeId, consumedAt: null }, include: { user: { include: { memberships: { where: { status: MembershipStatus.ACTIVE }, take: 1 } } } } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) throw new AppError(400, 'INVALID_RESET_CHALLENGE', 'The reset code is invalid or has expired.');
    await prisma.passwordResetChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    if (!(await verifyPasswordResetOtp(challenge.phone, input.otp))) throw new AppError(400, 'INVALID_RESET_OTP', 'The reset code is invalid or has expired.');
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const membership = challenge.user.memberships[0];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: challenge.userId }, data: { passwordHash } });
      await tx.passwordResetChallenge.updateMany({ where: { userId: challenge.userId, consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.auditLog.create({ data: { organizationId: membership?.organizationId, userId: challenge.userId, action: 'PASSWORD_RESET_COMPLETED', resourceType: 'User', resourceId: challenge.userId } });
    });
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined }).json({ success: true, data: null, message: 'Password reset successfully.' });
  } catch (error) { next(error); }
});

authRouter.patch('/me/phone', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ phone: z.string().min(7).max(20), password: z.string().min(8).max(200) }).parse(req.body);
    const auth = (req as AuthenticatedRequest).auth;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!(await argon2.verify(user.passwordHash, input.password))) throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect.');
    const phone = normalizeGhanaPhone(input.phone);
    const updated = await prisma.user.update({ where: { id: user.id }, data: { phone }, select: { phone: true } });
    res.json({ success: true, data: updated, message: 'Recovery phone updated.' });
  } catch (error) { next(error); }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const [user, organization] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: auth.userId }, select: { id: true, name: true, email: true, phone: true } }),
      prisma.organization.findUniqueOrThrow({ where: { id: auth.organizationId }, select: { id: true, name: true, slug: true } }),
    ]);
    res.json({ success: true, data: { user, organization, role: auth.role } });
  } catch (error) { next(error); }
});
