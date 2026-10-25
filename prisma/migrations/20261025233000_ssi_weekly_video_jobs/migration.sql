CREATE TABLE IF NOT EXISTS private."SsiWeeklyVideoJob" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL CHECK ("tenantId" = 'spike-ua'),
  "reportId" TEXT NOT NULL,
  "periodEnd" DATE NOT NULL,
  "baseContentSha256" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "packet" JSONB NOT NULL,
  "readySet" JSONB,
  "targetChatId" TEXT NOT NULL,
  "ledger" JSONB,
  "lease" TEXT,
  "leaseUntil" TIMESTAMPTZ,
  "activeItem" TEXT,
  "status" TEXT NOT NULL DEFAULT 'prepared',
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", "reportId", "baseContentSha256")
);
ALTER TABLE private."SsiWeeklyVideoJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private."SsiWeeklyVideoJob" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private."SsiWeeklyVideoPreparation" (
  "periodEnd" DATE PRIMARY KEY,
  "lease" TEXT NOT NULL,
  "retryAfter" TIMESTAMPTZ NOT NULL
);
ALTER TABLE private."SsiWeeklyVideoPreparation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private."SsiWeeklyVideoPreparation" FROM PUBLIC, anon, authenticated;
