import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../state/redis.js';

export const SESSION_COOKIE = 'tomame_session';
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: 'ORGANIZATION_OWNER' | 'EVENT_ADMIN' | 'FINANCE_ADMIN' | 'RESULTS_VIEWER';
  sessionId: string;
  sessionVersion: number;
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
  if (redis) await redis.set(`session:${sessionId}`, payload.userId, { EX: 8 * 60 * 60 });
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'tomame-api',
    audience: 'tomame-organizer',
  });
  const sessionId = String(payload.sessionId || payload.jti || '');
  if (!sessionId || (redis && !(await redis.exists(`session:${sessionId}`)))) {
    throw new Error('Session has been revoked.');
  }
  return {
    userId: String(payload.userId),
    organizationId: String(payload.organizationId),
    role: payload.role as SessionPayload['role'],
    sessionId,
    sessionVersion: Number(payload.sessionVersion),
  };
}

export async function revokeSession(sessionId: string) {
  if (redis) await redis.del(`session:${sessionId}`);
}
