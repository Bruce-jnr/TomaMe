import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { PaymentInitialization, PaymentProvider, VerifiedPayment } from './payment-provider.js';

const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({ authorization_url: z.string().url(), reference: z.string(), access_code: z.string() }),
});

const verifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]), reference: z.string(), status: z.string(), amount: z.number().int(),
    currency: z.string(), channel: z.string().optional(), paid_at: z.string().datetime().nullable().optional(),
  }),
});
const mobileMoneyResponseSchema = z.object({
  status: z.boolean(), message: z.string(),
  data: z.object({ reference: z.string(), status: z.string(), display_text: z.string().optional() }),
});

export function isValidPaystackSignature(rawBody: Buffer, signature: string | undefined, secretKey: string): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export class PaystackProvider implements PaymentProvider {
  private readonly baseUrl = 'https://api.paystack.co';

  private get secretKey() {
    if (!env.PAYSTACK_SECRET_KEY) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Payment service is not configured.');
    if (env.NODE_ENV !== 'production' && env.PAYSTACK_SECRET_KEY.startsWith('sk_live_')) {
      throw new AppError(503, 'LIVE_PAYMENT_KEY_BLOCKED', 'Use Paystack test keys during development.');
    }
    return env.PAYSTACK_SECRET_KEY;
  }

  private async request(path: string, init?: RequestInit) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json', ...init?.headers },
        signal: AbortSignal.timeout(15_000),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment provider request failed.');
      return payload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(502, 'PAYMENT_PROVIDER_UNREACHABLE', 'Payment provider is temporarily unreachable.');
    }
  }

  async initializePayment(input: { reference: string; amount: number; currency: string; email?: string; phone: string; callbackUrl: string }): Promise<PaymentInitialization> {
    if (!input.email) throw new AppError(400, 'EMAIL_REQUIRED', 'Email is required for web payment.');
    const raw = await this.request('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        reference: input.reference, amount: String(input.amount), currency: input.currency,
        email: input.email, callback_url: input.callbackUrl,
        metadata: JSON.stringify({ phone: input.phone, source: 'TomaMe web voting' }),
      }),
    });
    const response = initializeResponseSchema.parse(raw);
    if (!response.status || response.data.reference !== input.reference) throw new AppError(502, 'PAYMENT_INITIALIZATION_FAILED', 'Payment could not be initialized.');
    return { reference: response.data.reference, authorizationUrl: response.data.authorization_url };
  }

  async initializeMobileMoney(input: { reference: string; amount: number; currency: string; email: string; phone: string; provider: 'mtn' | 'atl' | 'vod' }) {
    const raw = await this.request('/charge', { method: 'POST', body: JSON.stringify({
      reference: input.reference, amount: String(input.amount), currency: input.currency, email: input.email,
      mobile_money: { phone: input.phone, provider: input.provider },
      metadata: JSON.stringify({ phone: input.phone, source: 'TomaMe USSD voting' }),
    }) });
    const response = mobileMoneyResponseSchema.parse(raw);
    if (!response.status || response.data.reference !== input.reference || !['pay_offline', 'success'].includes(response.data.status)) {
      throw new AppError(502, 'MOBILE_MONEY_INITIALIZATION_FAILED', 'Mobile money authorization could not be started.');
    }
    return { reference: response.data.reference, status: response.data.status as 'pay_offline' | 'success', displayText: response.data.display_text || 'Approve the payment request on your phone.' };
  }

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const raw = await this.request(`/transaction/verify/${encodeURIComponent(reference)}`);
    const response = verifyResponseSchema.parse(raw);
    return {
      reference: response.data.reference,
      providerTransactionId: String(response.data.id),
      amount: response.data.amount,
      currency: response.data.currency,
      successful: response.status && response.data.status === 'success',
      paymentMethod: response.data.channel,
      paidAt: response.data.paid_at ? new Date(response.data.paid_at) : undefined,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    return isValidPaystackSignature(rawBody, signature, this.secretKey);
  }

  async getTransaction(reference: string) {
    return this.verifyPayment(reference);
  }
}

export const paystackProvider = new PaystackProvider();
