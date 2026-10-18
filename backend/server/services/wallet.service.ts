import { GlobalRole, LedgerEntryType, MembershipStatus, OrganizationRole, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';

type TransactionClient = Prisma.TransactionClient;

export function calculatePlatformFee(amount: number, platformFeeBps: number) {
  return Math.floor((amount * platformFeeBps) / 10_000);
}

export function calculateLedgerBalance(groups: Array<{ type: LedgerEntryType; amount: number }>, pendingWithdrawals: number) {
  const totals = new Map(groups.map((group) => [group.type, group.amount]));
  const totalEarned = totals.get(LedgerEntryType.VOTE_EARNING) ?? 0;
  const totalFees = Math.abs(totals.get(LedgerEntryType.PLATFORM_FEE) ?? 0);
  const totalWithdrawn = Math.abs(totals.get(LedgerEntryType.WITHDRAWAL) ?? 0) - (totals.get(LedgerEntryType.WITHDRAWAL_REVERSAL) ?? 0);
  return { totalEarned, totalFees, totalWithdrawn, pendingWithdrawals, availableBalance: groups.reduce((sum, group) => sum + group.amount, 0) };
}

export async function getOrCreateSuperadminWallet(tx: TransactionClient, organizationId: string, currency: string) {
  const owner = await tx.organizationMembership.findFirst({
    where: { organizationId, role: OrganizationRole.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE, user: { globalRole: GlobalRole.SUPER_ADMIN } },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) throw new AppError(409, 'WALLET_OWNER_REQUIRED', 'The organization does not have an active superadmin wallet owner.');
  return tx.wallet.upsert({
    where: { userId_currency: { userId: owner.userId, currency: currency.toUpperCase() } },
    create: { userId: owner.userId, currency: currency.toUpperCase() },
    update: {},
  });
}

export async function recordVoteEarnings(tx: TransactionClient, input: { organizationId: string; eventId: string; paymentId: string; paymentReference: string; amount: number; currency: string; platformFeeBps: number }) {
  const wallet = await getOrCreateSuperadminWallet(tx, input.organizationId, input.currency);
  const fee = calculatePlatformFee(input.amount, input.platformFeeBps);
  await tx.ledgerEntry.createMany({ data: [
    { walletId: wallet.id, eventId: input.eventId, paymentId: input.paymentId, type: LedgerEntryType.VOTE_EARNING, amount: input.amount, reference: `EARN-${input.paymentReference}`, description: 'Verified vote payment earning', metadata: { paymentReference: input.paymentReference } },
    ...(fee ? [{ walletId: wallet.id, eventId: input.eventId, paymentId: input.paymentId, type: LedgerEntryType.PLATFORM_FEE, amount: -fee, reference: `FEE-${input.paymentReference}`, description: 'Event platform fee', metadata: { paymentReference: input.paymentReference, platformFeeBps: input.platformFeeBps } }] : []),
  ] });
}

export async function getWalletBalance(walletId: string) {
  const [wallet, groups, pending] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { id: walletId }, select: { id: true, currency: true, userId: true } }),
    prisma.ledgerEntry.groupBy({ by: ['type'], where: { walletId }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { walletId, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } }, _sum: { amount: true } }),
  ]);
  return { ...wallet, ...calculateLedgerBalance(groups.map((group) => ({ type: group.type, amount: group._sum.amount ?? 0 })), pending._sum.amount ?? 0) };
}
