import "dotenv/config";
import { readFileSync } from "node:fs";
import { z } from "zod";

function secret(name: string): string | undefined {
  const direct = process.env[name];
  const file = process.env[`${name}_FILE`];
  if (direct && file)
    throw new Error(`Configure only one of ${name} or ${name}_FILE.`);
  if (!file) return direct;
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    throw new Error(`Unable to read secret file for ${name}.`);
  }
}

const normalizedEnv = {
  ...process.env,
  DATABASE_URL: secret("DATABASE_URL"),
  SESSION_SECRET: secret("SESSION_SECRET"),
  REDIS_URL: secret("REDIS_URL"),
  PAYSTACK_PUBLIC_KEY: secret("PAYSTACK_PUBLIC_KEY"),
  PAYSTACK_SECRET_KEY: secret("PAYSTACK_SECRET_KEY"),
  ARKESEL_API_KEY: secret("ARKESEL_API_KEY"),
  ARKESEL_SENDER_ID: secret("ARKESEL_SENDER_ID"),
  ARKESEL_USSD_SECRET: secret("ARKESEL_USSD_SECRET"),
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:4000"),
  SESSION_SECRET: z.string().min(32),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  REDIS_URL: z.string().url().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  ARKESEL_API_KEY: z.string().min(1).optional(),
  ARKESEL_SENDER_ID: z.string().min(1).optional(),
  ARKESEL_USSD_SECRET: z.string().min(24).optional(),
  WEBHOOK_RETRY_INTERVAL_MS: z.coerce.number().int().min(5_000).default(30_000),
});

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration:\n${details.join("\n")}`);
}

export const env = parsed.data;

if (env.NODE_ENV === "production") {
  const missing = [
    !env.REDIS_URL && "REDIS_URL",
    !env.PAYSTACK_SECRET_KEY && "PAYSTACK_SECRET_KEY",
    !env.ARKESEL_USSD_SECRET && "ARKESEL_USSD_SECRET",
    !env.ARKESEL_API_KEY && "ARKESEL_API_KEY",
    !env.ARKESEL_SENDER_ID && "ARKESEL_SENDER_ID",
  ].filter(Boolean);
  if (missing.length)
    throw new Error(
      `Missing production security configuration: ${missing.join(", ")}`,
    );
  if (env.SESSION_SECRET.toLowerCase().includes("replace"))
    throw new Error("SESSION_SECRET must not be a placeholder in production.");
  if (
    !env.APP_URL.startsWith("https://") ||
    !env.API_URL.startsWith("https://")
  )
    throw new Error("APP_URL and API_URL must use HTTPS in production.");
  if (!env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_"))
    throw new Error("A Paystack live secret key is required in production.");
}
