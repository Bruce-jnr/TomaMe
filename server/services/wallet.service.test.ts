import { LedgerEntryType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { calculateLedgerBalance, calculatePlatformFee } from './wallet.service.js';

describe('wallet ledger calculations', () => {
  it('calculates an event fee in integer minor units', () => {
    expect(calculatePlatformFee(10_000, 1_250)).toBe(1_250);
    expect(calculatePlatformFee(101, 333)).toBe(3);
  });

  it('derives the balance from signed append-only entries', () => {
    expect(calculateLedgerBalance([
      { type: LedgerEntryType.VOTE_EARNING, amount: 10_000 },
      { type: LedgerEntryType.PLATFORM_FEE, amount: -1_000 },
      { type: LedgerEntryType.WITHDRAWAL, amount: -4_000 },
      { type: LedgerEntryType.WITHDRAWAL_REVERSAL, amount: 500 },
    ], 2_000)).toEqual({ totalEarned: 10_000, totalFees: 1_000, totalWithdrawn: 3_500, pendingWithdrawals: 2_000, availableBalance: 5_500 });
  });
});
