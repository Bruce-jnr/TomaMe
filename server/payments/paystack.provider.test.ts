import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isValidPaystackSignature } from './paystack.provider.js';

describe('Paystack webhook signature verification', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'TOMA-2026-TEST' } }));
  const secret = 'sk_test_signature_fixture';

  it('accepts the HMAC-SHA512 signature for the exact raw body', () => {
    const signature = createHmac('sha512', secret).update(body).digest('hex');
    expect(isValidPaystackSignature(body, signature, secret)).toBe(true);
  });

  it('rejects missing, malformed, or mismatched signatures', () => {
    expect(isValidPaystackSignature(body, undefined, secret)).toBe(false);
    expect(isValidPaystackSignature(body, 'invalid', secret)).toBe(false);
    expect(isValidPaystackSignature(Buffer.from('{}'), createHmac('sha512', secret).update(body).digest('hex'), secret)).toBe(false);
  });
});
