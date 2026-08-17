import argon2 from "argon2";
import { LedgerEntryType, Prisma, WithdrawalStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { paystackProvider } from "../payments/paystack.provider.js";
import { getWalletBalance } from "../services/wallet.service.js";

export const financialRouter = Router();
financialRouter.use(requireAuth);
financialRouter.use((req, _res, next) =>
  (req as AuthenticatedRequest).auth.globalRole === "SUPER_ADMIN"
    ? next()
    : next(
        new AppError(
          403,
          "SUPER_ADMIN_REQUIRED",
          "Superadmin access is required.",
        ),
      ),
);
financialRouter.use((req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  if (req.header("origin") !== env.APP_URL) {
    next(
      new AppError(
        403,
        "INVALID_REQUEST_ORIGIN",
        "Financial request origin was rejected.",
      ),
    );
    return;
  }
  next();
});

async function ownedWallet(userId: string, currency = "GHS") {
  return prisma.wallet.upsert({
    where: { userId_currency: { userId, currency } },
    create: { userId, currency },
    update: {},
  });
}

function payoutAccountNumber(type: "mobile_money" | "ghipss", value: string) {
  const digits = value.replace(/^\+/, "");
  if (type !== "mobile_money") return digits;
  if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^\d{9}$/.test(digits)) return `0${digits}`;
  if (/^0\d{9}$/.test(digits)) return digits;
  throw new AppError(
    422,
    "INVALID_GHANA_MOBILE_NUMBER",
    "Enter a valid 10-digit Ghana mobile-money number.",
  );
}

financialRouter.get("/overview", async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const wallet = await ownedWallet(auth.userId);
    const [balance, eventGroups] = await Promise.all([
      getWalletBalance(wallet.id),
      prisma.ledgerEntry.groupBy({
        by: ["eventId"],
        where: { walletId: wallet.id, eventId: { not: null } },
        _sum: { amount: true },
      }),
    ]);
    const eventIds = eventGroups.flatMap((group) =>
      group.eventId ? [group.eventId] : [],
    );
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds }, organizationId: auth.organizationId },
      select: { id: true, name: true, currency: true },
    });
    const totals = new Map(
      eventGroups.map((group) => [group.eventId, group._sum.amount ?? 0]),
    );
    const eventRevenue = events
      .map((event) => ({
        ...event,
        availableBalance: totals.get(event.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, data: { balance, eventRevenue } });
  } catch (error) {
    next(error);
  }
});

financialRouter.get("/paystack-balance", async (_req, res, next) => {
  try {
    const balance = await paystackProvider.getCachedBalance();
    res.setHeader("Cache-Control", "private, max-age=60");
    res.json({
      success: true,
      data: { balances: balance.data, cachedAt: balance.cachedAt },
    });
  } catch (error) {
    next(error);
  }
});

financialRouter.get("/ledger", async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const wallet = await ownedWallet(auth.userId);
    const query = z
      .object({
        type: z.nativeEnum(LedgerEntryType).optional(),
        search: z.string().trim().max(100).default(""),
        page: z.coerce.number().int().positive().default(1),
      })
      .parse(req.query);
    const where: Prisma.LedgerEntryWhereInput = {
      walletId: wallet.id,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        select: {
          id: true,
          type: true,
          amount: true,
          reference: true,
          createdAt: true,
          event: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * 25,
        take: 25,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: query.page,
          total,
          pageCount: Math.ceil(total / 25),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/adjustments", async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const input = z
      .object({
        amount: z
          .number()
          .int()
          .refine((value) => value !== 0, "Amount cannot be zero."),
        reason: z.string().trim().min(10).max(300),
        reference: z
          .string()
          .trim()
          .regex(/^ADJ-[A-Z0-9-]{4,50}$/),
        password: z.string().min(6).max(200),
      })
      .parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
    });
    if (!(await argon2.verify(user.passwordHash, input.password)))
      throw new AppError(
        401,
        "INVALID_PASSWORD",
        "Current password is incorrect.",
      );
    const wallet = await ownedWallet(auth.userId);
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: LedgerEntryType.ADJUSTMENT,
          amount: input.amount,
          reference: input.reference,
          description: input.reason,
          metadata: { approvedBy: auth.userId },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: auth.organizationId,
          userId: auth.userId,
          action: "LEDGER_ADJUSTMENT_CREATED",
          resourceType: "LedgerEntry",
          resourceId: created.id,
          newValue: {
            amount: input.amount,
            reference: input.reference,
            reason: input.reason,
          },
        },
      });
      return created;
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

financialRouter.get("/recipients", async (req, res, next) => {
  try {
    const wallet = await ownedWallet((req as AuthenticatedRequest).auth.userId);
    res.json({
      success: true,
      data: await prisma.payoutRecipient.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    next(error);
  }
});

financialRouter.get("/providers", async (req, res, next) => {
  try {
    const query = z
      .object({
        type: z.enum(["mobile_money", "ghipss"]).default("mobile_money"),
        currency: z.string().length(3).default("GHS"),
      })
      .parse(req.query);
    const providers = await paystackProvider.listTransferProviders(
      query.type,
      query.currency.toUpperCase(),
    );
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/recipients/resolve", async (req, res, next) => {
  try {
    const input = z
      .object({
        type: z.enum(["mobile_money", "ghipss"]),
        accountNumber: z
          .string()
          .trim()
          .regex(/^\+?[0-9]{6,20}$/, "Enter a valid account or phone number."),
        bankCode: z.string().trim().min(2).max(30),
      })
      .parse(req.body);
    if (input.type === "mobile_money")
      throw new AppError(
        422,
        "MOBILE_MONEY_NAME_NOT_RESOLVABLE",
        "Paystack does not provide recipient-name resolution for Ghana mobile-money numbers. Enter the registered account name instead.",
      );
    const accountNumber = payoutAccountNumber(input.type, input.accountNumber);
    const resolved = await paystackProvider.resolveTransferAccount(
      accountNumber,
      input.bankCode,
    );
    res.json({ success: true, data: { ...resolved, type: input.type } });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/recipients", async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const input = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        type: z.enum(["mobile_money", "ghipss"]),
        accountNumber: z
          .string()
          .trim()
          .regex(/^\+?[0-9]{6,20}$/),
        bankCode: z.string().trim().min(2).max(30),
        currency: z.string().length(3).default("GHS"),
      })
      .parse(req.body);
    const accountNumber = payoutAccountNumber(input.type, input.accountNumber);
    const accountName =
      input.type === "mobile_money"
        ? input.name
        : (
            await paystackProvider.resolveTransferAccount(
              accountNumber,
              input.bankCode,
            )
          ).accountName;
    if (!accountName)
      throw new AppError(
        422,
        "RECIPIENT_NAME_REQUIRED",
        "Enter the name registered to this mobile-money number.",
      );
    const wallet = await ownedWallet(auth.userId, input.currency.toUpperCase());
    const recipientCode = await paystackProvider.createTransferRecipient({
      ...input,
      name: accountName,
      accountNumber,
    });
    const recipient = await prisma.payoutRecipient.create({
      data: {
        walletId: wallet.id,
        name: accountName,
        type: input.type,
        accountNumber: `****${accountNumber.slice(-4)}`,
        bankCode: input.bankCode,
        recipientCode,
      },
    });
    res.status(201).json({ success: true, data: recipient });
  } catch (error) {
    next(error);
  }
});

financialRouter.get("/withdrawals", async (req, res, next) => {
  try {
    const wallet = await ownedWallet((req as AuthenticatedRequest).auth.userId);
    const query = z
      .object({ page: z.coerce.number().int().positive().default(1) })
      .parse(req.query);
    const where = { walletId: wallet.id };
    const [items, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        select: {
          id: true,
          amount: true,
          currency: true,
          reference: true,
          status: true,
          createdAt: true,
          payoutRecipient: { select: { name: true, accountNumber: true } },
          event: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * 15,
        take: 15,
      }),
      prisma.withdrawal.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: query.page,
          total,
          pageCount: Math.ceil(total / 15),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/withdrawals", async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const idempotencyKey = req.header("idempotency-key");
    if (
      !idempotencyKey ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 100
    )
      throw new AppError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Provide a unique Idempotency-Key of at least 16 characters.",
      );
    const input = z
      .object({
        eventId: z.string().cuid(),
        type: z.enum(["mobile_money", "ghipss"]),
        accountNumber: z
          .string()
          .trim()
          .regex(/^\+?[0-9]{6,20}$/),
        bankCode: z.string().trim().min(2).max(30),
        name: z.string().trim().min(2).max(100).optional(),
        amount: z.number().int().positive(),
      })
      .parse(req.body);
    const existing = await prisma.withdrawal.findUnique({
      where: { idempotencyKey },
      include: { payoutRecipient: true },
    });
    if (existing) {
      res.json({ success: true, data: existing });
      return;
    }
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, organizationId: auth.organizationId },
      select: { id: true, currency: true },
    });
    if (!event)
      throw new AppError(
        404,
        "EVENT_NOT_FOUND",
        "The selected event was not found.",
      );
    const accountNumber = payoutAccountNumber(input.type, input.accountNumber);
    const accountName =
      input.type === "mobile_money"
        ? input.name
        : (
            await paystackProvider.resolveTransferAccount(
              accountNumber,
              input.bankCode,
            )
          ).accountName;
    if (!accountName)
      throw new AppError(
        422,
        "RECIPIENT_NAME_REQUIRED",
        "Enter the name registered to this mobile-money number.",
      );
    const recipientCode = await paystackProvider.createTransferRecipient({
      ...input,
      name: accountName,
      accountNumber,
      currency: event.currency,
    });
    const withdrawal = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: {
            userId_currency: { userId: auth.userId, currency: event.currency },
          },
        });
        const aggregate = await tx.ledgerEntry.aggregate({
          where: { walletId: wallet.id, eventId: event.id },
          _sum: { amount: true },
        });
        if ((aggregate._sum.amount ?? 0) < input.amount)
          throw new AppError(
            409,
            "INSUFFICIENT_EVENT_BALANCE",
            "The selected event does not have enough available revenue.",
          );
        const recipient = await tx.payoutRecipient.upsert({
          where: { recipientCode },
          create: {
            walletId: wallet.id,
            name: accountName,
            type: input.type,
            accountNumber: `****${accountNumber.slice(-4)}`,
            bankCode: input.bankCode,
            recipientCode,
          },
          update: {
            name: accountName,
            type: input.type,
            accountNumber: `****${accountNumber.slice(-4)}`,
            bankCode: input.bankCode,
          },
        });
        if (recipient.walletId !== wallet.id)
          throw new AppError(
            409,
            "RECIPIENT_WALLET_CONFLICT",
            "This payout destination belongs to a different wallet.",
          );
        const reference = `WDR-${randomUUID()}`;
        const created = await tx.withdrawal.create({
          data: {
            walletId: wallet.id,
            eventId: event.id,
            payoutRecipientId: recipient.id,
            amount: input.amount,
            netAmount: input.amount,
            currency: wallet.currency,
            reference,
            idempotencyKey,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            eventId: event.id,
            type: LedgerEntryType.WITHDRAWAL,
            amount: -input.amount,
            reference: `RESERVE-${reference}`,
            description: "Event withdrawal amount reserved",
            metadata: { withdrawalId: created.id },
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: auth.organizationId,
            userId: auth.userId,
            action: "WITHDRAWAL_REQUESTED",
            resourceType: "Withdrawal",
            resourceId: created.id,
            newValue: {
              eventId: event.id,
              amount: input.amount,
              currency: wallet.currency,
              reference,
            },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    res.status(201).json({ success: true, data: withdrawal });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/withdrawals/:id/approve", async (req, res, next) => {
  try {
    const auth = (req as unknown as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const updated = await prisma.withdrawal.updateMany({
      where: {
        id,
        wallet: { userId: auth.userId },
        status: WithdrawalStatus.PENDING,
      },
      data: {
        status: WithdrawalStatus.APPROVED,
        approvedBy: auth.userId,
        approvedAt: new Date(),
      },
    });
    if (!updated.count)
      throw new AppError(
        409,
        "WITHDRAWAL_NOT_PENDING",
        "Only pending withdrawals can be approved.",
      );
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/withdrawals/:id/reject", async (req, res, next) => {
  try {
    const auth = (req as unknown as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findFirst({
        where: {
          id,
          wallet: { userId: auth.userId },
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED] },
        },
      });
      if (!withdrawal)
        throw new AppError(
          409,
          "WITHDRAWAL_NOT_REJECTABLE",
          "This withdrawal cannot be rejected.",
        );
      await tx.withdrawal.update({
        where: { id },
        data: { status: WithdrawalStatus.REJECTED },
      });
      await tx.ledgerEntry.create({
        data: {
          walletId: withdrawal.walletId,
          eventId: withdrawal.eventId,
          type: LedgerEntryType.WITHDRAWAL_REVERSAL,
          amount: withdrawal.amount,
          reference: `REJECT-${withdrawal.reference}`,
          description: "Rejected withdrawal reservation released",
        },
      });
    });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/withdrawals/:id/process", async (req, res, next) => {
  try {
    const auth = (req as unknown as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const { password } = z
      .object({ password: z.string().min(6).max(200) })
      .parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
    });
    if (!(await argon2.verify(user.passwordHash, password)))
      throw new AppError(
        401,
        "INVALID_PASSWORD",
        "Current password is incorrect.",
      );
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        wallet: { userId: auth.userId },
        status: WithdrawalStatus.APPROVED,
      },
      include: { payoutRecipient: true },
    });
    if (!withdrawal)
      throw new AppError(
        409,
        "WITHDRAWAL_NOT_APPROVED",
        "Approve the withdrawal before processing it.",
      );
    const transfer = await paystackProvider.initiateTransfer({
      amount: withdrawal.netAmount,
      recipientCode: withdrawal.payoutRecipient.recipientCode,
      reference: withdrawal.reference,
      reason: "TomaMe wallet withdrawal",
      currency: withdrawal.currency,
    });
    await prisma.withdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.PROCESSING,
        paystackTransferCode: transfer.transferCode,
        processedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: "PAYSTACK_TRANSFER_INITIATED",
        resourceType: "Withdrawal",
        resourceId: id,
        newValue: {
          amount: withdrawal.amount,
          reference: withdrawal.reference,
          transferCode: transfer.transferCode,
        },
      },
    });
    res.json({
      success: true,
      data: { status: "PROCESSING", requiresOtp: transfer.status === "otp" },
    });
  } catch (error) {
    next(error);
  }
});

financialRouter.post("/withdrawals/:id/finalize", async (req, res, next) => {
  try {
    const auth = (req as unknown as AuthenticatedRequest).auth;
    const id = z.string().cuid().parse(req.params.id);
    const { otp } = z
      .object({ otp: z.string().regex(/^\d{6}$/) })
      .parse(req.body);
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        wallet: { userId: auth.userId },
        status: WithdrawalStatus.PROCESSING,
        paystackTransferCode: { not: null },
      },
    });
    if (!withdrawal?.paystackTransferCode)
      throw new AppError(
        409,
        "TRANSFER_NOT_AWAITING_OTP",
        "This transfer is not awaiting authorization.",
      );
    await paystackProvider.finalizeTransfer(
      withdrawal.paystackTransferCode,
      otp,
    );
    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: "PAYSTACK_TRANSFER_OTP_SUBMITTED",
        resourceType: "Withdrawal",
        resourceId: id,
      },
    });
    res.json({ success: true, data: { status: "PROCESSING" } });
  } catch (error) {
    next(error);
  }
});
