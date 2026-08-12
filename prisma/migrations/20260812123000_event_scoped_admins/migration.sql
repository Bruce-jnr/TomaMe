CREATE TABLE "EventAssignment" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAssignment_eventId_membershipId_key" ON "EventAssignment"("eventId", "membershipId");
CREATE INDEX "EventAssignment_membershipId_eventId_idx" ON "EventAssignment"("membershipId", "eventId");
ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "User" SET "globalRole" = 'SUPER_ADMIN'
WHERE "id" IN (
  SELECT "userId" FROM "OrganizationMembership"
  WHERE "role" = 'ORGANIZATION_OWNER' AND "status" = 'ACTIVE'
);
