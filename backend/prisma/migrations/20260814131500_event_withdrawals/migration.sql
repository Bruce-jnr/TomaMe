ALTER TABLE "Withdrawal" ADD COLUMN "eventId" TEXT;

UPDATE "Withdrawal" AS withdrawal
SET "eventId" = entry."eventId"
FROM "LedgerEntry" AS entry
WHERE entry."metadata"->>'withdrawalId' = withdrawal."id"
  AND entry."eventId" IS NOT NULL;

UPDATE "Withdrawal" AS withdrawal
SET "eventId" = event."id"
FROM "Event" AS event
JOIN "OrganizationMembership" AS membership
  ON membership."organizationId" = event."organizationId"
WHERE withdrawal."eventId" IS NULL
  AND membership."userId" = (SELECT wallet."userId" FROM "Wallet" AS wallet WHERE wallet."id" = withdrawal."walletId")
  AND event."id" = (
    SELECT candidate_event."id"
    FROM "Event" AS candidate_event
    WHERE candidate_event."organizationId" = membership."organizationId"
    ORDER BY candidate_event."createdAt" ASC
    LIMIT 1
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Withdrawal" WHERE "eventId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign an event to every existing withdrawal';
  END IF;
END $$;

ALTER TABLE "Withdrawal" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Withdrawal_eventId_status_createdAt_idx" ON "Withdrawal"("eventId", "status", "createdAt");
