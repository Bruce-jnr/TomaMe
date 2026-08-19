import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export const SESSION_COOKIE = 'tomame_session';
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: 'ORGANIZATION_OWNER' | 'EVENT_ADMIN' | 'FINANCE_ADMIN' | 'RESULTS_VIEWER';
  sessionId: string;
  sessionVersion: number;
  globalRole: 'USER' | 'SUPER_ADMIN';
};

export async function createSession(payload: Omit<SessionPayload, 'sessionId'>) {
  const sessionId = randomUUID();
  const token = await new SignJWT({ ...payload, sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setSubject(payload.userId)
    .setJti(sessionId)
    .setIssuer('tomame-api')
    .setAudience('tomame-organizer')
    .sign(secret);
  await prisma.authSession.create({ data: { id: sessionId, userId: payload.userId, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) } });
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'tomame-api',
    audience: 'tomame-organizer',
  });
  const sessionId = String(payload.sessionId || payload.jti || '');
  const stored = sessionId ? await prisma.authSession.findUnique({ where: { id: sessionId }, select: { userId: true, expiresAt: true, revokedAt: true } }) : null;
  if (!stored || stored.userId !== String(payload.userId) || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw new Error('Session has been revoked.');
  }
  return {
    userId: String(payload.userId),
    organizationId: String(payload.organizationId),
    role: payload.role as SessionPayload['role'],
    sessionId,
    sessionVersion: Number(payload.sessionVersion),
    globalRole: payload.globalRole as SessionPayload['globalRole'],
  };
}

export async function revokeSession(sessionId: string) {
  await prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}
