ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "LoginChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginChallenge_userId_createdAt_idx" ON "LoginChallenge"("userId", "createdAt");
CREATE INDEX "LoginChallenge_expiresAt_consumedAt_idx" ON "LoginChallenge"("expiresAt", "consumedAt");
ALTER TABLE "LoginChallenge" ADD CONSTRAINT "LoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookLog" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebhookLog" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
ALTER TABLE "WebhookLog" ADD COLUMN "lastError" TEXT;
CREATE INDEX "WebhookLog_nextAttemptAt_processed_idx" ON "WebhookLog"("nextAttemptAt", "processed");
