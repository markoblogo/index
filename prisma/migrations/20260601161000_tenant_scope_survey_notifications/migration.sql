ALTER TABLE "RespondentEmailSchedule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RespondentEmailSchedule" ADD COLUMN "indexProductId" TEXT;

UPDATE "RespondentEmailSchedule"
SET "tenantId" = 'uga-ua',
    "indexProductId" = 'uga-ua',
    "id" = CASE WHEN "id" = 'default' THEN 'uga-ua' ELSE "id" END
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

ALTER TABLE "RespondentEmailSchedule" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RespondentEmailSchedule" ALTER COLUMN "indexProductId" SET NOT NULL;

ALTER TABLE "RespondentEmailDelivery" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RespondentEmailDelivery" ADD COLUMN "indexProductId" TEXT;

UPDATE "RespondentEmailDelivery" red
SET "tenantId" = COALESCE(r."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(r."indexProductId", r."tenantId", 'uga-ua')
FROM "Respondent" r
WHERE red."respondentId" = r."id"
  AND (red."tenantId" IS NULL OR red."indexProductId" IS NULL);

UPDATE "RespondentEmailDelivery"
SET "tenantId" = 'uga-ua',
    "indexProductId" = 'uga-ua'
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

ALTER TABLE "RespondentEmailDelivery" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RespondentEmailDelivery" ALTER COLUMN "indexProductId" SET NOT NULL;

ALTER TABLE "RespondentSurveyToken" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RespondentSurveyToken" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "RespondentSurveyToken" ADD COLUMN "tokenDigest" TEXT;

UPDATE "RespondentSurveyToken" rst
SET "tenantId" = COALESCE(r."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(r."indexProductId", r."tenantId", 'uga-ua'),
    "tokenDigest" = 'legacy-invalid-' || rst."id"
FROM "Respondent" r
WHERE rst."respondentId" = r."id"
  AND (rst."tenantId" IS NULL OR rst."indexProductId" IS NULL OR rst."tokenDigest" IS NULL);

UPDATE "RespondentSurveyToken"
SET "tenantId" = 'uga-ua',
    "indexProductId" = 'uga-ua',
    "tokenDigest" = 'legacy-invalid-' || "id"
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL OR "tokenDigest" IS NULL;

DROP INDEX IF EXISTS "RespondentSurveyToken_token_key";
ALTER TABLE "RespondentSurveyToken" DROP COLUMN "token";
ALTER TABLE "RespondentSurveyToken" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RespondentSurveyToken" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "RespondentSurveyToken" ALTER COLUMN "tokenDigest" SET NOT NULL;

CREATE UNIQUE INDEX "RespondentEmailSchedule_tenantId_indexProductId_key" ON "RespondentEmailSchedule"("tenantId", "indexProductId");
CREATE INDEX "RespondentEmailSchedule_tenantId_idx" ON "RespondentEmailSchedule"("tenantId");
CREATE INDEX "RespondentEmailDelivery_tenantId_status_trigger_sentAt_idx" ON "RespondentEmailDelivery"("tenantId", "status", "trigger", "sentAt");
CREATE INDEX "RespondentSurveyToken_tenantId_expiresAt_idx" ON "RespondentSurveyToken"("tenantId", "expiresAt");
CREATE UNIQUE INDEX "RespondentSurveyToken_tokenDigest_key" ON "RespondentSurveyToken"("tokenDigest");

ALTER TABLE "RespondentEmailSchedule" ADD CONSTRAINT "RespondentEmailSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RespondentEmailSchedule" ADD CONSTRAINT "RespondentEmailSchedule_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RespondentEmailDelivery" ADD CONSTRAINT "RespondentEmailDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RespondentEmailDelivery" ADD CONSTRAINT "RespondentEmailDelivery_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RespondentSurveyToken" ADD CONSTRAINT "RespondentSurveyToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RespondentSurveyToken" ADD CONSTRAINT "RespondentSurveyToken_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
