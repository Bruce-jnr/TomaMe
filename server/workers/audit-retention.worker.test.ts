import { describe, expect, it } from 'vitest';
import { auditRetentionCutoffs } from './audit-retention.worker.js';

describe('audit log retention', () => {
  it('archives after 90 days and deletes after one archived year', () => {
    const now = new Date('2026-08-12T12:00:00.000Z');
    const cutoffs = auditRetentionCutoffs(now);

    expect(cutoffs.archiveBefore.toISOString()).toBe('2026-05-14T12:00:00.000Z');
    expect(cutoffs.deleteBefore.toISOString()).toBe('2025-08-12T12:00:00.000Z');
  });
});
