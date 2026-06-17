import { Prisma } from "@prisma/client";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import type { Locale } from "@/lib/i18n";
import type { PublicAiMarketBrief } from "@/lib/ai-market-brief-types";

const BRIEF_KIND = "daily_market_brief";
const PROVIDER = "openai";
let storageReady: Promise<void> | null = null;

export { BRIEF_KIND, PROVIDER };

export async function ensureAiMarketBriefStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiMarketBrief" (
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
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AiMarketBrief_tenantId_tradeDate_locale_kind_key" ON "AiMarketBrief"("tenantId", "tradeDate", "locale", "kind")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AiMarketBrief_tenantId_tradeDate_status_idx" ON "AiMarketBrief"("tenantId", "tradeDate", "status")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AiMarketBrief_generatedAt_idx" ON "AiMarketBrief"("generatedAt")
    `);
  })();

  await storageReady;
}

export async function findStoredBrief(locale: Locale, date?: string | null) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureAiMarketBriefStorage();
  return db.aiMarketBrief.findFirst({
    orderBy: { tradeDate: "desc" },
    where: {
      kind: BRIEF_KIND,
      locale,
      status: { in: ["generated", "fallback"] },
      tenantId: getActiveIndexConfig().id,
      ...(date ? { tradeDate: dateToUtcDate(date) } : {}),
    },
  });
}

export async function upsertBrief({
  actorUserId,
  date,
  error,
  fallback,
  generated,
  input,
  inputDataHash,
  locale,
  source,
  status,
}: {
  actorUserId?: string | null;
  date: string;
  error?: string;
  fallback?: PublicAiMarketBrief;
  generated?: {
    blocks: Array<{ body: string; title: string }>;
    cardComments: Array<{ code: string; comment: string }>;
    completionTokens: number | null;
    confidence: string;
    estimatedCostUsd: number | null;
    model: string;
    promptTokens: number | null;
    totalTokens: number | null;
  };
  input: Prisma.InputJsonValue | Record<string, unknown>;
  inputDataHash: string;
  locale: Locale;
  source: string;
  status: "fallback" | "generated";
}) {
  const activeIndex = getActiveIndexConfig();
  const output = generated
    ? { blocks: generated.blocks, confidence: generated.confidence }
    : {
        blocks: fallback?.blocks ?? [],
        confidence: fallback?.confidence ?? "fallback",
      };
  const cardComments = generated
    ? generated.cardComments
    : Object.entries(fallback?.cardComments ?? {}).map(([code, comment]) => ({
        code,
        comment,
      }));
  const model = generated?.model ?? fallback?.model ?? "deterministic-fallback";
  const estimatedCostUsd =
    generated?.estimatedCostUsd == null
      ? null
      : new Prisma.Decimal(generated.estimatedCostUsd.toFixed(6));

  await ensureAiMarketBriefStorage();
  return db.aiMarketBrief.upsert({
    create: {
      cardCommentsJson: cardComments,
      completionTokens: generated?.completionTokens ?? null,
      confidence: output.confidence,
      error: error ?? null,
      estimatedCostUsd,
      fallbackReason: generated
        ? null
        : (fallback?.observability.fallbackReason ?? "fallback"),
      generatedById: actorUserId ?? null,
      inputDataHash,
      inputJson: input as Prisma.InputJsonValue,
      kind: BRIEF_KIND,
      locale,
      model,
      outputJson: output,
      promptTokens: generated?.promptTokens ?? null,
      provider: generated ? PROVIDER : "deterministic",
      source,
      status,
      tenantId: activeIndex.id,
      totalTokens: generated?.totalTokens ?? null,
      tradeDate: dateToUtcDate(date),
    },
    update: {
      cardCommentsJson: cardComments,
      completionTokens: generated?.completionTokens ?? null,
      confidence: output.confidence,
      error: error ?? null,
      estimatedCostUsd,
      fallbackReason: generated
        ? null
        : (fallback?.observability.fallbackReason ?? "fallback"),
      generatedAt: new Date(),
      generatedById: actorUserId ?? null,
      inputDataHash,
      inputJson: input as Prisma.InputJsonValue,
      model,
      outputJson: output,
      promptTokens: generated?.promptTokens ?? null,
      provider: generated ? PROVIDER : "deterministic",
      source,
      status,
      totalTokens: generated?.totalTokens ?? null,
    },
    where: {
      tenantId_tradeDate_locale_kind: {
        kind: BRIEF_KIND,
        locale,
        tenantId: activeIndex.id,
        tradeDate: dateToUtcDate(date),
      },
    },
  });
}

export function canUsePublicAiBriefStorage() {
  return hasDatabaseUrl() || allowMockFallback();
}

export function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
