CREATE TABLE IF NOT EXISTS private."MediaHubGoogleDriveVersionReceipt" (
  "tenantId" TEXT NOT NULL CHECK ("tenantId" = 'spike-ua'),
  "canonicalUrl" TEXT NOT NULL,
  "driveFileId" TEXT NOT NULL,
  "modifiedAt" TIMESTAMPTZ NOT NULL,
  "materialId" TEXT NOT NULL REFERENCES public."MediaHubManualMaterial"("id") ON DELETE CASCADE,
  "contentSha256" TEXT NOT NULL CHECK ("contentSha256" ~ '^[a-f0-9]{64}$'),
  "importedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("tenantId", "canonicalUrl")
);
ALTER TABLE private."MediaHubGoogleDriveVersionReceipt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private."MediaHubGoogleDriveVersionReceipt" FROM PUBLIC, anon, authenticated;
