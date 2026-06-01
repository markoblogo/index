CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicSiteUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IndexProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "marketId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexProduct_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Tenant" ("id", "name", "publicSiteUrl", "updatedAt")
VALUES
  ('1d3x', '1D3X', 'https://1d3x.com', CURRENT_TIMESTAMP),
  ('uga-ua', 'UGA Index', 'https://uga.1d3x.com', CURRENT_TIMESTAMP),
  ('spike-ua', 'SPIKE SPOT INDEX', 'https://spike.1d3x.com', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Market" ("id", "tenantId", "code", "name", "countryCode", "updatedAt")
VALUES
  ('uga-ua', 'uga-ua', 'ua', 'Ukraine', 'UA', CURRENT_TIMESTAMP),
  ('spike-ua', 'spike-ua', 'ua', 'Ukraine', 'UA', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "IndexProduct" ("id", "tenantId", "marketId", "code", "name", "updatedAt")
VALUES
  ('uga-ua', 'uga-ua', 'uga-ua', 'uga-index', 'UGA Index', CURRENT_TIMESTAMP),
  ('spike-ua', 'spike-ua', 'spike-ua', 'spike-spot-index', 'SPIKE SPOT INDEX', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX "Market_tenantId_code_key" ON "Market"("tenantId", "code");
CREATE UNIQUE INDEX "IndexProduct_tenantId_code_key" ON "IndexProduct"("tenantId", "code");
CREATE INDEX "Tenant_active_idx" ON "Tenant"("active");
CREATE INDEX "Market_tenantId_active_idx" ON "Market"("tenantId", "active");
CREATE INDEX "IndexProduct_tenantId_active_idx" ON "IndexProduct"("tenantId", "active");
CREATE INDEX "IndexProduct_marketId_active_idx" ON "IndexProduct"("marketId", "active");

ALTER TABLE "Market" ADD CONSTRAINT "Market_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IndexProduct" ADD CONSTRAINT "IndexProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IndexProduct" ADD CONSTRAINT "IndexProduct_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
