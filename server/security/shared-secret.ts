import { timingSafeEqual } from 'node:crypto';

export function matchesSharedSecret(supplied: string, configured: string) {
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
