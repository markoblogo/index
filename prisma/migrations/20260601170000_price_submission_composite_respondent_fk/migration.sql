ALTER TABLE "PriceSubmission" DROP CONSTRAINT IF EXISTS "PriceSubmission_respondentId_fkey";

ALTER TABLE "PriceSubmission"
ADD CONSTRAINT "PriceSubmission_respondentId_tenantId_indexProductId_fkey"
FOREIGN KEY ("respondentId", "tenantId", "indexProductId")
REFERENCES "Respondent"("id", "tenantId", "indexProductId")
ON DELETE RESTRICT ON UPDATE CASCADE;
