-- CreateEnum
CREATE TYPE "ConsumerSourceStatus" AS ENUM ('verified', 'stale', 'unsupported', 'unavailable', 'quarantined');

-- CreateEnum
CREATE TYPE "ConsumerValidationStatus" AS ENUM ('accepted', 'rejected', 'quarantined');

-- CreateTable
CREATE TABLE "ConsumerIndexDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerIndexDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerProductLock" (
    "id" TEXT NOT NULL,
    "indexDefinitionId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "rulesJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerProductLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerCountry" (
    "id" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "referenceCity" TEXT,
    "burgerCovered" BOOLEAN NOT NULL DEFAULT false,
    "latteCovered" BOOLEAN NOT NULL DEFAULT false,
    "iphoneCovered" BOOLEAN NOT NULL DEFAULT false,
    "workdaysCovered" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerSourceDefinition" (
    "id" TEXT NOT NULL,
    "indexDefinitionId" TEXT NOT NULL,
    "countryId" TEXT,
    "city" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "parserKey" TEXT NOT NULL,
    "expectedCurrency" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerSourceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerRawSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "ConsumerRawSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerParsedObservation" (
    "id" TEXT NOT NULL,
    "indexDefinitionId" TEXT NOT NULL,
    "productLockId" TEXT,
    "countryId" TEXT,
    "sourceId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "localPrice" DECIMAL(12,4),
    "usdPrice" DECIMAL(12,4),
    "currency" TEXT,
    "productVariant" TEXT,
    "parserVersion" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2),
    "sourceStatus" "ConsumerSourceStatus" NOT NULL,
    "validationStatus" "ConsumerValidationStatus" NOT NULL,
    "validationNotes" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerParsedObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerFxRate" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "usdRate" DECIMAL(14,6) NOT NULL,
    "rateDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerFxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerWageObservation" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "grossWage" DECIMAL(12,4),
    "netWage" DECIMAL(12,4),
    "wagePeriod" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "taxMethod" TEXT,
    "confidenceScore" DECIMAL(5,2),
    "status" "ConsumerSourceStatus" NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerWageObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerPublishedValue" (
    "id" TEXT NOT NULL,
    "indexDefinitionId" TEXT NOT NULL,
    "productLockId" TEXT,
    "countryId" TEXT NOT NULL,
    "observationId" TEXT,
    "wageObservationId" TEXT,
    "publishedDate" DATE NOT NULL,
    "localPrice" DECIMAL(12,4),
    "usdPrice" DECIMAL(12,4),
    "indexVsUsReference" DECIMAL(10,4),
    "indexVsMedian" DECIMAL(10,4),
    "affordabilityDays" DECIMAL(10,4),
    "sourceStatus" "ConsumerSourceStatus" NOT NULL,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerPublishedValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketOverlaySeries" (
    "id" TEXT NOT NULL,
    "seriesKey" TEXT NOT NULL,
    "observationDate" DATE NOT NULL,
    "value" DECIMAL(14,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketOverlaySeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EverydayIngestionRun" (
    "id" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parserErrors" JSONB,
    "changedRows" INTEGER NOT NULL DEFAULT 0,
    "publishedRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "metadataJson" JSONB,

    CONSTRAINT "EverydayIngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerIndexDefinition_key_key" ON "ConsumerIndexDefinition"("key");

-- CreateIndex
CREATE INDEX "ConsumerIndexDefinition_enabled_idx" ON "ConsumerIndexDefinition"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerProductLock_variantKey_key" ON "ConsumerProductLock"("variantKey");

-- CreateIndex
CREATE INDEX "ConsumerProductLock_indexDefinitionId_enabled_idx" ON "ConsumerProductLock"("indexDefinitionId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerCountry_iso2_key" ON "ConsumerCountry"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerCountry_iso3_key" ON "ConsumerCountry"("iso3");

-- CreateIndex
CREATE INDEX "ConsumerCountry_enabled_idx" ON "ConsumerCountry"("enabled");

-- CreateIndex
CREATE INDEX "ConsumerSourceDefinition_indexDefinitionId_enabled_priority_idx" ON "ConsumerSourceDefinition"("indexDefinitionId", "enabled", "priority");

-- CreateIndex
CREATE INDEX "ConsumerSourceDefinition_countryId_enabled_idx" ON "ConsumerSourceDefinition"("countryId", "enabled");

-- CreateIndex
CREATE INDEX "ConsumerRawSnapshot_sourceId_fetchedAt_idx" ON "ConsumerRawSnapshot"("sourceId", "fetchedAt");

-- CreateIndex
CREATE INDEX "ConsumerRawSnapshot_snapshotHash_idx" ON "ConsumerRawSnapshot"("snapshotHash");

-- CreateIndex
CREATE INDEX "ConsumerParsedObservation_indexDefinitionId_observedAt_idx" ON "ConsumerParsedObservation"("indexDefinitionId", "observedAt");

-- CreateIndex
CREATE INDEX "ConsumerParsedObservation_countryId_observedAt_idx" ON "ConsumerParsedObservation"("countryId", "observedAt");

-- CreateIndex
CREATE INDEX "ConsumerParsedObservation_sourceId_validationStatus_idx" ON "ConsumerParsedObservation"("sourceId", "validationStatus");

-- CreateIndex
CREATE INDEX "ConsumerFxRate_rateDate_idx" ON "ConsumerFxRate"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerFxRate_currency_rateDate_source_key" ON "ConsumerFxRate"("currency", "rateDate", "source");

-- CreateIndex
CREATE INDEX "ConsumerWageObservation_countryId_observedAt_idx" ON "ConsumerWageObservation"("countryId", "observedAt");

-- CreateIndex
CREATE INDEX "ConsumerPublishedValue_countryId_publishedDate_idx" ON "ConsumerPublishedValue"("countryId", "publishedDate");

-- CreateIndex
CREATE INDEX "ConsumerPublishedValue_indexDefinitionId_publishedDate_idx" ON "ConsumerPublishedValue"("indexDefinitionId", "publishedDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerPublishedValue_indexDefinitionId_countryId_publishe_key" ON "ConsumerPublishedValue"("indexDefinitionId", "countryId", "publishedDate");

-- CreateIndex
CREATE INDEX "MarketOverlaySeries_seriesKey_observationDate_idx" ON "MarketOverlaySeries"("seriesKey", "observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "MarketOverlaySeries_seriesKey_observationDate_source_key" ON "MarketOverlaySeries"("seriesKey", "observationDate", "source");

-- CreateIndex
CREATE INDEX "EverydayIngestionRun_runKey_startedAt_idx" ON "EverydayIngestionRun"("runKey", "startedAt");

-- CreateIndex
CREATE INDEX "EverydayIngestionRun_status_startedAt_idx" ON "EverydayIngestionRun"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "ConsumerProductLock" ADD CONSTRAINT "ConsumerProductLock_indexDefinitionId_fkey" FOREIGN KEY ("indexDefinitionId") REFERENCES "ConsumerIndexDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerSourceDefinition" ADD CONSTRAINT "ConsumerSourceDefinition_indexDefinitionId_fkey" FOREIGN KEY ("indexDefinitionId") REFERENCES "ConsumerIndexDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerSourceDefinition" ADD CONSTRAINT "ConsumerSourceDefinition_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ConsumerCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerRawSnapshot" ADD CONSTRAINT "ConsumerRawSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConsumerSourceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerParsedObservation" ADD CONSTRAINT "ConsumerParsedObservation_indexDefinitionId_fkey" FOREIGN KEY ("indexDefinitionId") REFERENCES "ConsumerIndexDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerParsedObservation" ADD CONSTRAINT "ConsumerParsedObservation_productLockId_fkey" FOREIGN KEY ("productLockId") REFERENCES "ConsumerProductLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerParsedObservation" ADD CONSTRAINT "ConsumerParsedObservation_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ConsumerCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerParsedObservation" ADD CONSTRAINT "ConsumerParsedObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConsumerSourceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerParsedObservation" ADD CONSTRAINT "ConsumerParsedObservation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ConsumerRawSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerWageObservation" ADD CONSTRAINT "ConsumerWageObservation_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ConsumerCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPublishedValue" ADD CONSTRAINT "ConsumerPublishedValue_indexDefinitionId_fkey" FOREIGN KEY ("indexDefinitionId") REFERENCES "ConsumerIndexDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPublishedValue" ADD CONSTRAINT "ConsumerPublishedValue_productLockId_fkey" FOREIGN KEY ("productLockId") REFERENCES "ConsumerProductLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPublishedValue" ADD CONSTRAINT "ConsumerPublishedValue_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ConsumerCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPublishedValue" ADD CONSTRAINT "ConsumerPublishedValue_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "ConsumerParsedObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPublishedValue" ADD CONSTRAINT "ConsumerPublishedValue_wageObservationId_fkey" FOREIGN KEY ("wageObservationId") REFERENCES "ConsumerWageObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

