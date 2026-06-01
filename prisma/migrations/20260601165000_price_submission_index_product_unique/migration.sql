DROP INDEX IF EXISTS "PriceSubmission_tenantId_tradeDate_commodityId_deliveryBasisId_respondentId_source_key";

CREATE UNIQUE INDEX "PriceSubmission_tenantId_indexProductId_tradeDate_commodityId_deliveryBasisId_respondentId_source_key"
ON "PriceSubmission"("tenantId", "indexProductId", "tradeDate", "commodityId", "deliveryBasisId", "respondentId", "source");
