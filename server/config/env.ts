import 'dotenv/config';
import { z } from 'zod';

function databaseUrlFromLegacyVariables(
  env: NodeJS.ProcessEnv,
): string | undefined {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = env;
  if (![DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD].every(Boolean))
    return undefined;

  const user = encodeURIComponent(DB_USER!);
  const password = encodeURIComponent(DB_PASSWORD!);
  return `postgresql://${user}:${password}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`;
}

const normalizedEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ?? databaseUrlFromLegacyVariables(process.env),
  SESSION_SECRET: process.env.SESSION_SECRET ?? process.env.JWT_SECRET,
  PAYSTACK_PUBLIC_KEY:
    process.env.PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_TEST_PUBLIC_KEY ??
    process.env.PAYSTACK_LIVE_PUBLIC_KEY,
  PAYSTACK_SECRET_KEY:
    process.env.PAYSTACK_SECRET_KEY ??
    process.env.PAYSTACK_TEST_SECRET_KEY ??
    process.env.PAYSTACK_TEST_SECREY_KEY ??
    process.env.PAYSTACK_LIVE_SECREY_KEY,
  ARKESEL_API_KEY: process.env.ARKESEL_API_KEY ?? process.env.ARKESEL_APIKEY,
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  SESSION_SECRET: z.string().min(32),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  REDIS_URL: z.string().url().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  ARKESEL_API_KEY: z.string().min(1).optional(),
  ARKESEL_SENDER_ID: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
}

export const env = parsed.data;
