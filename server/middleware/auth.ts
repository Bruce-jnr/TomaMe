import { MembershipStatus, OrganizationRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { SESSION_COOKIE, type SessionPayload, verifySession } from '../auth/session.js';

export type AuthenticatedRequest = Request & { auth: SessionPayload };

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
    const session = await verifySession(token);
    const membership = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } },
      select: { role: true, status: true },
    });
    if (!membership || membership.status !== MembershipStatus.ACTIVE || membership.role !== session.role) {
      throw new AppError(403, 'MEMBERSHIP_REQUIRED', 'Organization access is not available.');
    }
    (req as AuthenticatedRequest).auth = session;
    next();
  } catch (error) {
    if (error instanceof AppError) next(error);
    else next(new AppError(401, 'INVALID_SESSION', 'Your session is invalid or expired.'));
  }
}

export function requireRoles(...roles: OrganizationRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes((req as AuthenticatedRequest).auth.role as OrganizationRole)) {
      next(new AppError(403, 'FORBIDDEN', 'Your role cannot perform this action.'));
      return;
    }
    next();
  };
}
