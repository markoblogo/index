CREATE TABLE "AiMarketBrief" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tradeDate" DATE NOT NULL,
    "locale" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'daily_market_brief',
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "confidence" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputDataHash" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB,
    "cardCommentsJson" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "fallbackReason" TEXT,
    "error" TEXT,
    "generatedById" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiMarketBrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiMarketBrief_tenantId_tradeDate_locale_kind_key" ON "AiMarketBrief"("tenantId", "tradeDate", "locale", "kind");
CREATE INDEX "AiMarketBrief_tenantId_tradeDate_status_idx" ON "AiMarketBrief"("tenantId", "tradeDate", "status");
CREATE INDEX "AiMarketBrief_generatedAt_idx" ON "AiMarketBrief"("generatedAt");
