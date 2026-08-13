import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { matchesSharedSecret } from './shared-secret.js';
import { retryDelay } from '../services/webhook-processing.service.js';
import { verifySession } from '../auth/session.js';
import { HSTS_MAX_AGE_SECONDS, strictTransportSecurity } from './http-headers.js';

describe('security controls', () => {
  it('enables a two-year HSTS policy only in production', () => {
    expect(strictTransportSecurity('development')).toBe(false);
    expect(strictTransportSecurity('production')).toEqual({
      maxAge: HSTS_MAX_AGE_SECONDS,
      includeSubDomains: true,
      preload: true,
    });
  });
  it('compares callback secrets without accepting prefixes or suffixes', () => {
    const secret = 'a-secure-callback-secret-value';
    expect(matchesSharedSecret(secret, secret)).toBe(true);
    expect(matchesSharedSecret(`${secret}x`, secret)).toBe(false);
    expect(matchesSharedSecret(secret.slice(0, -1), secret)).toBe(false);
  });

  it('backs webhook retries off and caps the delay', () => {
    expect(retryDelay(1)).toBe(30_000);
    expect(retryDelay(2)).toBe(60_000);
    expect(retryDelay(20)).toBe(30 * 60_000);
  });

  it('does not treat an attacker-created JWT as an application session', async () => {
    const attackerToken = await new SignJWT({ userId: 'victim' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('attacker-controlled-secret-value'));
    await expect(verifySession(attackerToken)).rejects.toThrow();
  });
});
