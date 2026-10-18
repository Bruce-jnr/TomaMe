export const HSTS_MAX_AGE_SECONDS = 63_072_000;

export function strictTransportSecurity(nodeEnv: string) {
  if (nodeEnv !== 'production') return false as const;
  return {
    maxAge: HSTS_MAX_AGE_SECONDS,
    includeSubDomains: true,
    preload: true,
  };
}
