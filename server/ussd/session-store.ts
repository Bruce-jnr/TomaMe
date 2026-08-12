import { env } from '../config/env.js';
import { redis } from '../state/redis.js';

export type UssdStep =
  'MAIN_MENU' | 'ENTER_CODE' | 'ENTER_QUANTITY' | 'CONFIRM_ORDER';
export type UssdSession = {
  step: UssdStep;
  phone: string;
  network: string;
  candidateId?: string;
  candidateName?: string;
  categoryName?: string;
  quantity?: number;
  amount?: number;
};

const memory = new Map<string, UssdSession & { expiresAt: number }>();
const ttlSeconds = 120;

export async function saveUssdSession(id: string, session: UssdSession) {
  if (redis) {
    await redis.set(`ussd:${id}`, JSON.stringify(session), { EX: ttlSeconds });
    return;
  }
  if (env.NODE_ENV === 'production')
    throw new Error('Redis is required for production USSD sessions.');
  memory.set(id, { ...session, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getUssdSession(id: string): Promise<UssdSession | null> {
  if (redis) {
    const value = await redis.get(`ussd:${id}`);
    return value ? (JSON.parse(value) as UssdSession) : null;
  }
  const value = memory.get(id);
  if (!value || value.expiresAt <= Date.now()) {
    memory.delete(id);
    return null;
  }
  const { expiresAt: _expiresAt, ...session } = value;
  return session;
}

export async function deleteUssdSession(id: string) {
  if (redis) await redis.del(`ussd:${id}`);
  else memory.delete(id);
}
