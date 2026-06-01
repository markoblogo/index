ALTER TABLE "RespondentEmailDelivery" DROP CONSTRAINT IF EXISTS "RespondentEmailDelivery_respondentId_fkey";
ALTER TABLE "RespondentSurveyToken" DROP CONSTRAINT IF EXISTS "RespondentSurveyToken_respondentId_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "Respondent_id_tenantId_indexProductId_key"
ON "Respondent"("id", "tenantId", "indexProductId");

ALTER TABLE "RespondentEmailDelivery"
ADD CONSTRAINT "RespondentEmailDelivery_respondentId_tenantId_indexProductId_fkey"
FOREIGN KEY ("respondentId", "tenantId", "indexProductId")
REFERENCES "Respondent"("id", "tenantId", "indexProductId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RespondentSurveyToken"
ADD CONSTRAINT "RespondentSurveyToken_respondentId_tenantId_indexProductId_fkey"
FOREIGN KEY ("respondentId", "tenantId", "indexProductId")
REFERENCES "Respondent"("id", "tenantId", "indexProductId")
ON DELETE CASCADE ON UPDATE CASCADE;
