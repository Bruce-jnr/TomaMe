CREATE TYPE "LedgerEntryType" AS ENUM ('VOTE_EARNING', 'PLATFORM_FEE', 'REFUND', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADJUSTMENT');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED', 'REJECTED');

ALTER TABLE "Event" ADD COLUMN "platformFeeBps" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Wallet" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "currency" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LedgerEntry" ("id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "eventId" TEXT, "paymentId" TEXT, "type" "LedgerEntryType" NOT NULL, "amount" INTEGER NOT NULL, "reference" TEXT NOT NULL, "description" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PayoutRecipient" ("id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL, "accountNumber" TEXT NOT NULL, "bankCode" TEXT NOT NULL, "recipientCode" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PayoutRecipient_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Withdrawal" ("id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "payoutRecipientId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "fee" INTEGER NOT NULL DEFAULT 0, "netAmount" INTEGER NOT NULL, "currency" TEXT NOT NULL, "reference" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "paystackTransferCode" TEXT, "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING', "failureReason" TEXT, "approvedBy" TEXT, "approvedAt" TIMESTAMP(3), "processedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "Wallet_userId_currency_key" ON "Wallet"("userId", "currency");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE UNIQUE INDEX "LedgerEntry_reference_key" ON "LedgerEntry"("reference");
CREATE INDEX "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");
CREATE INDEX "LedgerEntry_eventId_createdAt_idx" ON "LedgerEntry"("eventId", "createdAt");
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");
CREATE UNIQUE INDEX "PayoutRecipient_recipientCode_key" ON "PayoutRecipient"("recipientCode");
CREATE INDEX "PayoutRecipient_walletId_idx" ON "PayoutRecipient"("walletId");
CREATE UNIQUE INDEX "Withdrawal_reference_key" ON "Withdrawal"("reference");
CREATE UNIQUE INDEX "Withdrawal_idempotencyKey_key" ON "Withdrawal"("idempotencyKey");
CREATE UNIQUE INDEX "Withdrawal_paystackTransferCode_key" ON "Withdrawal"("paystackTransferCode");
CREATE INDEX "Withdrawal_walletId_status_createdAt_idx" ON "Withdrawal"("walletId", "status", "createdAt");

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutRecipient" ADD CONSTRAINT "PayoutRecipient_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_payoutRecipientId_fkey" FOREIGN KEY ("payoutRecipientId") REFERENCES "PayoutRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
