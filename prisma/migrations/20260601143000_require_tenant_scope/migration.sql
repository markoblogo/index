UPDATE "Commodity"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "DeliveryBasis"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "Respondent"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "Basket"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "User"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "PriceSubmission"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "ExternalIndicative"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "IndexCalculation"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "PublishedIndex"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "AuditLog"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

UPDATE "PasswordSetupToken"
SET "tenantId" = COALESCE("tenantId", 'uga-ua'),
    "indexProductId" = COALESCE("indexProductId", "tenantId", 'uga-ua')
WHERE "tenantId" IS NULL OR "indexProductId" IS NULL;

ALTER TABLE "Commodity" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Commodity" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "DeliveryBasis" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DeliveryBasis" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "Respondent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Respondent" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "Basket" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Basket" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "PriceSubmission" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PriceSubmission" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "ExternalIndicative" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ExternalIndicative" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "IndexCalculation" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "IndexCalculation" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "PublishedIndex" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PublishedIndex" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "indexProductId" SET NOT NULL;
ALTER TABLE "PasswordSetupToken" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PasswordSetupToken" ALTER COLUMN "indexProductId" SET NOT NULL;
