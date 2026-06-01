CREATE TABLE "PasswordSetupToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "indexProductId" TEXT,
    "tokenDigest" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "respondentAuthAccountId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordSetupToken_tokenDigest_key" ON "PasswordSetupToken"("tokenDigest");
CREATE INDEX "PasswordSetupToken_tenantId_expiresAt_idx" ON "PasswordSetupToken"("tenantId", "expiresAt");
CREATE INDEX "PasswordSetupToken_indexProductId_expiresAt_idx" ON "PasswordSetupToken"("indexProductId", "expiresAt");
CREATE INDEX "PasswordSetupToken_userId_expiresAt_idx" ON "PasswordSetupToken"("userId", "expiresAt");
CREATE INDEX "PasswordSetupToken_respondentAuthAccountId_expiresAt_idx" ON "PasswordSetupToken"("respondentAuthAccountId", "expiresAt");

ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_respondentAuthAccountId_fkey" FOREIGN KEY ("respondentAuthAccountId") REFERENCES "RespondentAuthAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
