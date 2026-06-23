CREATE TABLE IF NOT EXISTS "MediaHubManualMaterialAsset" (
  "id" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "storagePath" TEXT,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "extractedText" TEXT,
  "visualSummary" TEXT,
  "confidence" DOUBLE PRECISION,
  "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "binaryBytes" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaHubManualMaterialAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MediaHubManualMaterialAsset_material_idx"
ON "MediaHubManualMaterialAsset"("materialId", "assetType", "pageNumber");
