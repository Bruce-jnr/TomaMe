import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const ussdSessionSchema = z.object({
  step: z.enum(['MAIN_MENU', 'ENTER_CODE', 'ENTER_QUANTITY', 'CONFIRM_ORDER']),
  phone: z.string(),
  network: z.string(),
  candidateId: z.string().optional(),
  candidateName: z.string().optional(),
  categoryName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  amount: z.number().int().nonnegative().optional(),
});

export type UssdStep = z.infer<typeof ussdSessionSchema>['step'];
export type UssdSession = z.infer<typeof ussdSessionSchema>;

const ttlSeconds = 120;

export async function saveUssdSession(id: string, session: UssdSession) {
  const validated = ussdSessionSchema.parse(session);
  const payload: Prisma.InputJsonObject = {
    step: validated.step,
    phone: validated.phone,
    network: validated.network,
    ...(validated.candidateId !== undefined
      ? { candidateId: validated.candidateId }
      : {}),
    ...(validated.candidateName !== undefined
      ? { candidateName: validated.candidateName }
      : {}),
    ...(validated.categoryName !== undefined
      ? { categoryName: validated.categoryName }
      : {}),
    ...(validated.quantity !== undefined
      ? { quantity: validated.quantity }
      : {}),
    ...(validated.amount !== undefined ? { amount: validated.amount } : {}),
  };
  await prisma.ussdSession.upsert({
    where: { id },
    create: {
      id,
      payload,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
    update: { payload, expiresAt: new Date(Date.now() + ttlSeconds * 1000) },
  });
}

export async function getUssdSession(id: string): Promise<UssdSession | null> {
  const value = await prisma.ussdSession.findUnique({
    where: { id },
    select: { payload: true, expiresAt: true },
  });
  if (!value || value.expiresAt <= new Date()) {
    if (value) await prisma.ussdSession.deleteMany({ where: { id } });
    return null;
  }
  const parsed = ussdSessionSchema.safeParse(value.payload);
  if (!parsed.success) {
    await prisma.ussdSession.deleteMany({ where: { id } });
    return null;
  }
  return parsed.data;
}

export async function deleteUssdSession(id: string) {
  await prisma.ussdSession.deleteMany({ where: { id } });
}
