ALTER TABLE "AuditLog" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "AuditLog_archivedAt_idx" ON "AuditLog"("archivedAt");
