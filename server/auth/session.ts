import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'tomame_session';
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: 'ORGANIZATION_OWNER' | 'EVENT_ADMIN' | 'FINANCE_ADMIN' | 'RESULTS_VIEWER';
};

export async function createSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setSubject(payload.userId)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return {
    userId: String(payload.userId),
    organizationId: String(payload.organizationId),
    role: payload.role as SessionPayload['role'],
  };
}
