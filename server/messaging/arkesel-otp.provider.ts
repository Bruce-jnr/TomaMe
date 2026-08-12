import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const generateResponseSchema = z
  .object({
    code: z.union([z.string(), z.number()]),
    message: z.string().optional(),
  })
  .passthrough();
const verifyResponseSchema = z
  .object({
    code: z.union([z.string(), z.number()]),
    message: z.string().optional(),
  })
  .passthrough();

function configuration() {
  if (!env.ARKESEL_API_KEY || !env.ARKESEL_SENDER_ID)
    throw new AppError(
      503,
      'OTP_PROVIDER_NOT_CONFIGURED',
      'Password recovery is not configured.',
    );
  return { apiKey: env.ARKESEL_API_KEY, senderId: env.ARKESEL_SENDER_ID };
}

async function request(path: string, body: unknown) {
  const { apiKey } = configuration();
  try {
    const response = await fetch(`https://sms.arkesel.com${path}`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok)
      throw new AppError(
        502,
        'OTP_PROVIDER_ERROR',
        'The OTP provider rejected the request.',
      );
    return payload;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      'OTP_PROVIDER_UNREACHABLE',
      'The OTP provider is temporarily unreachable.',
    );
  }
}

async function sendOtp(phone: string, message: string) {
  const { senderId } = configuration();
  const response = generateResponseSchema.parse(
    await request('/api/otp/generate', {
      expiry: 10,
      length: 6,
      medium: 'sms',
      message,
      number: phone,
      sender_id: senderId,
      type: 'numeric',
    }),
  );
  if (String(response.code) !== '1000')
    throw new AppError(
      502,
      'OTP_SEND_FAILED',
      'The password reset code could not be sent.',
    );
}

export function sendPasswordResetOtp(phone: string) {
  return sendOtp(
    phone,
    'Your TomaMe password reset code is %otp_code%. It expires in 10 minutes.',
  );
}

export function sendLoginOtp(phone: string) {
  return sendOtp(
    phone,
    'Your TomaMe organizer sign-in code is %otp_code%. It expires in 10 minutes.',
  );
}

export async function verifyPasswordResetOtp(phone: string, code: string) {
  const response = verifyResponseSchema.parse(
    await request('/api/otp/verify', { number: phone, code }),
  );
  return String(response.code) === '1100';
}

export const verifyLoginOtp = verifyPasswordResetOtp;
