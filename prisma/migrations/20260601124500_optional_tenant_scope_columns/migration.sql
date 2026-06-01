ALTER TABLE "Commodity" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Commodity" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "DeliveryBasis" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DeliveryBasis" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "Respondent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Respondent" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "Basket" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Basket" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "PriceSubmission" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PriceSubmission" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "ExternalIndicative" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ExternalIndicative" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "IndexCalculation" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "IndexCalculation" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "PublishedIndex" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PublishedIndex" ADD COLUMN "indexProductId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "indexProductId" TEXT;

-- Best-effort backfill for existing deployments. Rows not matched by known
-- Spike signatures default to UGA because the original production schema was
-- UGA-first. Fresh seed and runtime writes set the scope explicitly.
UPDATE "DeliveryBasis"
SET "tenantId" = CASE
  WHEN "code" IN ('CPT_ODESA_EXPORT', 'CPT_PARITY_ODESA_PROCESSING') THEN 'spike-ua'
  ELSE 'uga-ua'
END,
"indexProductId" = CASE
  WHEN "code" IN ('CPT_ODESA_EXPORT', 'CPT_PARITY_ODESA_PROCESSING') THEN 'spike-ua'
  ELSE 'uga-ua'
END
WHERE "tenantId" IS NULL;

UPDATE "Commodity"
SET "tenantId" = CASE
  WHEN "code" = 'SUNFLOWER' THEN 'spike-ua'
  ELSE 'uga-ua'
END,
"indexProductId" = CASE
  WHEN "code" = 'SUNFLOWER' THEN 'spike-ua'
  ELSE 'uga-ua'
END
WHERE "tenantId" IS NULL;

UPDATE "Respondent"
SET "tenantId" = CASE
  WHEN "id" IN ('MN7R_MONITOR', 'SPIKE_ADMIN_FALLBACK', 'fop-solovey') THEN 'spike-ua'
  ELSE 'uga-ua'
END,
"indexProductId" = CASE
  WHEN "id" IN ('MN7R_MONITOR', 'SPIKE_ADMIN_FALLBACK', 'fop-solovey') THEN 'spike-ua'
  ELSE 'uga-ua'
END
WHERE "tenantId" IS NULL;

UPDATE "Basket" b
SET "tenantId" = COALESCE(db."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(db."indexProductId", 'uga-ua')
FROM "DeliveryBasis" db
WHERE b."deliveryBasisId" = db."id" AND b."tenantId" IS NULL;

UPDATE "User" u
SET "tenantId" = CASE
  WHEN u."email" LIKE '%spike%' OR u."email" IN ('an@spike.broker', 'os@spike.broker') THEN 'spike-ua'
  ELSE COALESCE(r."tenantId", 'uga-ua')
END,
"indexProductId" = CASE
  WHEN u."email" LIKE '%spike%' OR u."email" IN ('an@spike.broker', 'os@spike.broker') THEN 'spike-ua'
  ELSE COALESCE(r."indexProductId", 'uga-ua')
END
FROM "Respondent" r
WHERE u."respondentId" = r."id" AND u."tenantId" IS NULL;

UPDATE "User"
SET "tenantId" = CASE
  WHEN "email" LIKE '%spike%' OR "email" IN ('an@spike.broker', 'os@spike.broker') THEN 'spike-ua'
  ELSE 'uga-ua'
END,
"indexProductId" = CASE
  WHEN "email" LIKE '%spike%' OR "email" IN ('an@spike.broker', 'os@spike.broker') THEN 'spike-ua'
  ELSE 'uga-ua'
END
WHERE "tenantId" IS NULL;

UPDATE "PriceSubmission" ps
SET "tenantId" = COALESCE(r."tenantId", c."tenantId", db."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(r."indexProductId", c."indexProductId", db."indexProductId", 'uga-ua')
FROM "Respondent" r, "Commodity" c, "DeliveryBasis" db
WHERE ps."respondentId" = r."id"
  AND ps."commodityId" = c."id"
  AND ps."deliveryBasisId" = db."id"
  AND ps."tenantId" IS NULL;

UPDATE "ExternalIndicative" ei
SET "tenantId" = COALESCE(c."tenantId", db."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(c."indexProductId", db."indexProductId", 'uga-ua')
FROM "Commodity" c, "DeliveryBasis" db
WHERE ei."commodityId" = c."id"
  AND ei."deliveryBasisId" = db."id"
  AND ei."tenantId" IS NULL;

UPDATE "IndexCalculation" ic
SET "tenantId" = COALESCE(c."tenantId", b."tenantId", db."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(c."indexProductId", b."indexProductId", db."indexProductId", 'uga-ua')
FROM "Commodity" c, "DeliveryBasis" db, "Basket" b
WHERE ic."commodityId" = c."id"
  AND ic."deliveryBasisId" = db."id"
  AND ic."basketId" = b."id"
  AND ic."tenantId" IS NULL;

UPDATE "PublishedIndex" pi
SET "tenantId" = COALESCE(ic."tenantId", c."tenantId", b."tenantId", db."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(ic."indexProductId", c."indexProductId", b."indexProductId", db."indexProductId", 'uga-ua')
FROM "IndexCalculation" ic, "Commodity" c, "DeliveryBasis" db, "Basket" b
WHERE pi."calculationId" = ic."id"
  AND pi."commodityId" = c."id"
  AND pi."deliveryBasisId" = db."id"
  AND pi."basketId" = b."id"
  AND pi."tenantId" IS NULL;

UPDATE "AuditLog" al
SET "tenantId" = COALESCE(u."tenantId", 'uga-ua'),
    "indexProductId" = COALESCE(u."indexProductId", 'uga-ua')
FROM "User" u
WHERE al."actorUserId" = u."id" AND al."tenantId" IS NULL;

UPDATE "AuditLog"
SET "tenantId" = 'uga-ua', "indexProductId" = 'uga-ua'
WHERE "tenantId" IS NULL;

CREATE INDEX "Commodity_tenantId_status_sortOrder_idx" ON "Commodity"("tenantId", "status", "sortOrder");
CREATE INDEX "Commodity_indexProductId_status_sortOrder_idx" ON "Commodity"("indexProductId", "status", "sortOrder");
CREATE INDEX "DeliveryBasis_tenantId_status_idx" ON "DeliveryBasis"("tenantId", "status");
CREATE INDEX "DeliveryBasis_indexProductId_status_idx" ON "DeliveryBasis"("indexProductId", "status");
CREATE INDEX "Respondent_tenantId_status_collectionMode_idx" ON "Respondent"("tenantId", "status", "collectionMode");
CREATE INDEX "Respondent_indexProductId_status_collectionMode_idx" ON "Respondent"("indexProductId", "status", "collectionMode");
CREATE INDEX "Basket_tenantId_active_idx" ON "Basket"("tenantId", "active");
CREATE INDEX "Basket_indexProductId_active_idx" ON "Basket"("indexProductId", "active");
CREATE INDEX "User_tenantId_role_active_idx" ON "User"("tenantId", "role", "active");
CREATE INDEX "User_indexProductId_role_active_idx" ON "User"("indexProductId", "role", "active");
CREATE INDEX "PriceSubmission_tenantId_tradeDate_status_idx" ON "PriceSubmission"("tenantId", "tradeDate", "status");
CREATE INDEX "PriceSubmission_indexProductId_tradeDate_status_idx" ON "PriceSubmission"("indexProductId", "tradeDate", "status");
CREATE INDEX "ExternalIndicative_tenantId_tradeDate_source_status_idx" ON "ExternalIndicative"("tenantId", "tradeDate", "source", "status");
CREATE INDEX "ExternalIndicative_indexProductId_tradeDate_source_status_idx" ON "ExternalIndicative"("indexProductId", "tradeDate", "source", "status");
CREATE INDEX "IndexCalculation_tenantId_tradeDate_status_idx" ON "IndexCalculation"("tenantId", "tradeDate", "status");
CREATE INDEX "IndexCalculation_indexProductId_tradeDate_status_idx" ON "IndexCalculation"("indexProductId", "tradeDate", "status");
CREATE INDEX "PublishedIndex_tenantId_tradeDate_locked_idx" ON "PublishedIndex"("tenantId", "tradeDate", "locked");
CREATE INDEX "PublishedIndex_indexProductId_tradeDate_locked_idx" ON "PublishedIndex"("indexProductId", "tradeDate", "locked");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_indexProductId_createdAt_idx" ON "AuditLog"("indexProductId", "createdAt");

ALTER TABLE "Commodity" ADD CONSTRAINT "Commodity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Commodity" ADD CONSTRAINT "Commodity_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryBasis" ADD CONSTRAINT "DeliveryBasis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryBasis" ADD CONSTRAINT "DeliveryBasis_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceSubmission" ADD CONSTRAINT "PriceSubmission_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalIndicative" ADD CONSTRAINT "ExternalIndicative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalIndicative" ADD CONSTRAINT "ExternalIndicative_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndexCalculation" ADD CONSTRAINT "IndexCalculation_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublishedIndex" ADD CONSTRAINT "PublishedIndex_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_indexProductId_fkey" FOREIGN KEY ("indexProductId") REFERENCES "IndexProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
