CREATE TABLE "RespondentTelegramLinkToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "respondentId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RespondentTelegramLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RespondentTelegramLinkToken_tokenHash_key"
  ON "RespondentTelegramLinkToken"("tokenHash");

CREATE INDEX "RespondentTelegramLinkToken_contactId_idx"
  ON "RespondentTelegramLinkToken"("contactId");

CREATE INDEX "RespondentTelegramLinkToken_respondentId_idx"
  ON "RespondentTelegramLinkToken"("respondentId");

CREATE INDEX "RespondentTelegramLinkToken_expiresAt_idx"
  ON "RespondentTelegramLinkToken"("expiresAt");

ALTER TABLE "RespondentTelegramLinkToken"
  ADD CONSTRAINT "RespondentTelegramLinkToken_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "RespondentContact"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
