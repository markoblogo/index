DROP INDEX IF EXISTS "Commodity_code_key";
DROP INDEX IF EXISTS "DeliveryBasis_code_key";
DROP INDEX IF EXISTS "Basket_code_key";
DROP INDEX IF EXISTS "PriceSubmission_tradeDate_commodityId_deliveryBasisId_respo_key";
DROP INDEX IF EXISTS "ExternalIndicative_tradeDate_commodityId_deliveryBasisId_so_key";
DROP INDEX IF EXISTS "IndexCalculation_tradeDate_commodityId_deliveryBasisId_bask_key";
DROP INDEX IF EXISTS "PublishedIndex_tradeDate_commodityId_deliveryBasisId_basket_key";

CREATE UNIQUE INDEX "Commodity_tenantId_code_key" ON "Commodity"("tenantId", "code");
CREATE UNIQUE INDEX "DeliveryBasis_tenantId_code_key" ON "DeliveryBasis"("tenantId", "code");
CREATE UNIQUE INDEX "Basket_tenantId_code_key" ON "Basket"("tenantId", "code");
CREATE UNIQUE INDEX "PriceSubmission_tenantId_tradeDate_commodityId_deliveryB_key"
  ON "PriceSubmission"("tenantId", "tradeDate", "commodityId", "deliveryBasisId", "respondentId", "source");
CREATE UNIQUE INDEX "ExternalIndicative_tenantId_tradeDate_commodityId_deliv_key"
  ON "ExternalIndicative"("tenantId", "tradeDate", "commodityId", "deliveryBasisId", "source");
CREATE UNIQUE INDEX "IndexCalculation_tenantId_tradeDate_commodityId_delivery_key"
  ON "IndexCalculation"("tenantId", "tradeDate", "commodityId", "deliveryBasisId", "basketId");
CREATE UNIQUE INDEX "PublishedIndex_tenantId_tradeDate_commodityId_deliveryBa_key"
  ON "PublishedIndex"("tenantId", "tradeDate", "commodityId", "deliveryBasisId", "basketId");
