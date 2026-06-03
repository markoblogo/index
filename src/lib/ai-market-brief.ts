import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { commodities, type CommodityId } from "@/lib/mock-data";
import { getPublicHistoryData } from "@/lib/public-api-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory";

export type AiAnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

export type PublicAiMarketBrief = {
  blocks: Array<{ body: string; title: string }>;
  cardComments: Record<string, string>;
  confidence: string;
  generatedAt: string;
  inputDataHash: string;
  model: string;
  observability: {
    estimatedCostUsd: number | null;
    fallbackReason: string | null;
    promptTokens: number | null;
    status: string;
    totalTokens: number | null;
  };
};

type StoredBriefOutput = {
  blocks?: Array<{ body?: string; title?: string }>;
  confidence?: string;
};

type StoredCardComment = {
  code?: string;
  comment?: string;
};

type GenerateOptions = {
  actorUserId?: string | null;
  date?: string;
  force?: boolean;
  locale?: Locale;
  source?: string;
};

const BRIEF_KIND = "daily_market_brief";
const PROVIDER = "openai";
let storageReady: Promise<void> | null = null;

export async function getPublishedAiMarketBrief({
  activeRespondentCount,
  history,
  locale,
}: {
  activeRespondentCount: number;
  history: AiAnalyticsPoint[];
  locale: Locale;
}): Promise<PublicAiMarketBrief | null> {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "spike-ua") {
    return null;
  }

  if (hasDatabaseUrl()) {
    const latestDate = getLatestHistoryDate(history);
    const stored = await findStoredBrief(locale, latestDate);

    if (stored) {
      return mapStoredBrief(stored, locale);
    }

    if (!allowMockFallback()) {
      return null;
    }
  }

  return buildDeterministicAiMarketBrief(history, locale, activeRespondentCount, {
    fallbackReason: "demo_or_missing_saved_brief",
  });
}

export async function getLatestAiCardComments(locale: Locale) {
  if (getActiveIndexConfig().id !== "spike-ua" || !hasDatabaseUrl()) {
    return {};
  }

  const stored = await findStoredBrief(locale);

  if (!stored) {
    return {};
  }

  return mapCardComments(stored.cardCommentsJson, locale);
}

export async function getAiMarketBriefAdminStatus(date: string) {
  if (getActiveIndexConfig().id !== "spike-ua" || !hasDatabaseUrl()) {
    return {
      enabled: false,
      rows: [],
      skippedReason: "database_not_configured_or_non_spike_tenant",
    };
  }

  await ensureAiMarketBriefStorage();
  const rows = await db.aiMarketBrief.findMany({
    orderBy: [{ locale: "asc" }],
    where: {
      kind: BRIEF_KIND,
      tenantId: getActiveIndexConfig().id,
      tradeDate: dateToUtcDate(date),
    },
  });

  return {
    enabled: true,
    rows: rows.map((row) => ({
      estimatedCostUsd: row.estimatedCostUsd?.toNumber() ?? null,
      error: row.error,
      fallbackReason: row.fallbackReason,
      generatedAt: row.generatedAt.toISOString(),
      inputDataHash: row.inputDataHash,
      locale: row.locale,
      model: row.model,
      status: row.status,
      totalTokens: row.totalTokens,
    })),
    skippedReason: null,
  };
}

export async function generateAndStoreDailyAiMarketBriefs(
  options: Omit<GenerateOptions, "locale"> = {},
) {
  const results = await Promise.all([
    generateAndStoreDailyAiMarketBrief({ ...options, locale: "uk" }),
    generateAndStoreDailyAiMarketBrief({ ...options, locale: "en" }),
  ]);
  const date = results[0]?.date ?? options.date ?? null;

  if (date && options.source === "auto_publish") {
    await sendAiBriefTelegramSummary(date, "uk");
  }

  return {
    date,
    results,
  };
}

export async function generateAndStoreDailyAiMarketBrief({
  actorUserId = null,
  date,
  force = false,
  locale = "uk",
  source = "system",
}: GenerateOptions = {}) {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "spike-ua") {
    return { locale, skippedReason: "non_spike_tenant", status: "skipped" };
  }

  if (!hasDatabaseUrl()) {
    return { locale, skippedReason: "database_not_configured", status: "skipped" };
  }

  const activeRespondentCount = await getActiveRespondentCountData();
  const history = await getRealAnalyticsHistory();
  const tradeDate = date ?? getLatestHistoryDate(history);

  if (!tradeDate) {
    const fallback = buildDeterministicAiMarketBrief(
      history,
      locale,
      activeRespondentCount,
      { fallbackReason: "no_published_history" },
    );
    const row = await upsertBrief({
      actorUserId,
      date: todayKyivDate(),
      fallback,
      input: { activeRespondentCount, locale, positions: [] },
      locale,
      source,
      status: "fallback",
    });

    return { date: todayKyivDate(), id: row.id, locale, status: row.status };
  }

  const existing = await findStoredBrief(locale, tradeDate);
  const input = buildBriefInput(history, locale, activeRespondentCount, tradeDate);
  const fallback = buildDeterministicAiMarketBrief(
    history,
    locale,
    activeRespondentCount,
  );

  if (existing && existing.inputDataHash === input.inputDataHash && !force) {
    return {
      date: tradeDate,
      id: existing.id,
      inputDataHash: existing.inputDataHash,
      locale,
      skippedReason: "already_current",
      status: existing.status,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const row = await upsertBrief({
      actorUserId,
      date: tradeDate,
      fallback: {
        ...fallback,
        observability: {
          ...fallback.observability,
          fallbackReason: "openai_api_key_missing",
        },
      },
      input,
      locale,
      source,
      status: "fallback",
    });

    return { date: tradeDate, id: row.id, inputDataHash: row.inputDataHash, locale, status: row.status };
  }

  try {
    const generated = await callOpenAiBrief(apiKey, input);
    const row = await upsertBrief({
      actorUserId,
      date: tradeDate,
      generated,
      input,
      locale,
      source,
      status: "generated",
    });

    revalidateAiBriefViews();
    return {
      estimatedCostUsd: row.estimatedCostUsd?.toNumber() ?? null,
      date: tradeDate,
      id: row.id,
      inputDataHash: row.inputDataHash,
      locale,
      status: row.status,
      totalTokens: row.totalTokens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    const row = await upsertBrief({
      actorUserId,
      date: tradeDate,
      error: message,
      fallback: {
        ...fallback,
        observability: {
          ...fallback.observability,
          fallbackReason: "openai_generation_error",
        },
      },
      input,
      locale,
      source,
      status: "fallback",
    });

    revalidateAiBriefViews();
    return {
      error: message,
      date: tradeDate,
      id: row.id,
      inputDataHash: row.inputDataHash,
      locale,
      status: row.status,
    };
  }
}

export async function sendAiBriefTelegramSummary(date: string, locale: Locale = "uk") {
  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ?? process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
    process.env.UGA_TELEGRAM_ADMIN_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId || !hasDatabaseUrl()) {
    return { skippedReason: "telegram_not_configured", status: "skipped" };
  }

  const stored = await findStoredBrief(locale, date);

  if (!stored) {
    return { skippedReason: "brief_not_found", status: "skipped" };
  }

  const brief = mapStoredBrief(stored, locale);
  const text = [
    locale === "uk"
      ? `AI Market Brief SPIKE SPOT INDEX за ${date}`
      : `AI Market Brief SPIKE SPOT INDEX for ${date}`,
    "",
    ...brief.blocks.map((block) => `• ${block.title}: ${block.body}`),
    "",
    `Model: ${brief.model}`,
    `Status: ${brief.observability.status}`,
    `Tokens: ${brief.observability.totalTokens ?? "n/a"}`,
    `Cost: ${
      brief.observability.estimatedCostUsd == null
        ? "n/a"
        : `$${brief.observability.estimatedCostUsd.toFixed(6)} est.`
    }`,
  ].join("\n");
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      text,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return {
      error: await response.text(),
      status: "failed",
    };
  }

  return { status: "sent" };
}

function buildBriefInput(
  history: AiAnalyticsPoint[],
  locale: Locale,
  activeRespondentCount: number,
  tradeDate: string,
) {
  const latestRows = commodities
    .map((commodity) => {
      const commodityHistory = getCommodityHistory(history, commodity.id).filter(
        (point) => point.date <= tradeDate,
      );
      const latest = commodityHistory.at(-1);

      if (!latest || latest.date !== tradeDate) {
        return null;
      }

      return {
        change1d: latest.dayChange,
        change7d: roundOne(latest.value - getPointBack(commodityHistory, 8).value),
        change30d: roundOne(latest.value - getPointBack(commodityHistory, 31).value),
        change90d: roundOne(latest.value - commodityHistory[0].value),
        code: commodity.code,
        commodityId: commodity.id,
        latestUsdPerMt: latest.value,
        name: commodity.name[locale],
        volatility30d: roundOne(
          standardDeviation(
            commodityHistory.slice(-30).map((point) => point.percentChange),
          ),
        ),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const input = {
    generatedFromDate: tradeDate,
    locale,
    positions: latestRows,
    respondentCoverage: activeRespondentCount,
    requiredSections: [
      "Market snapshot",
      "Key movers",
      "Volatility note",
      "Coverage caution",
    ],
  };

  return {
    ...input,
    inputDataHash: buildShortHash(JSON.stringify(input)),
  };
}

async function callOpenAiBrief(
  apiKey: string,
  input: ReturnType<typeof buildBriefInput>,
) {
  const model = process.env.SPIKE_AI_BRIEF_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            "You generate concise market intelligence briefs for SPIKE SPOT INDEX, a Ukrainian agro commodity spot benchmark. Use only the provided data. Do not invent prices, respondent names, trades, causes, news, or forecasts. Return strict JSON only with keys: blocks, cardComments, confidence. blocks must be exactly four objects with title and body. cardComments must contain one short object per provided position with code and comment. The brief is not trading advice.",
          role: "system",
        },
        {
          content: JSON.stringify(input),
          role: "user",
        },
      ],
      max_output_tokens: 850,
      model,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`OpenAI brief generation failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  const content = extractResponseText(payload);

  if (!content) {
    throw new Error("OpenAI brief generation returned empty text.");
  }

  const parsed = parseBriefJson(content) as StoredBriefOutput & {
    cardComments?: StoredCardComment[];
  };
  const blocks = normalizeBlocks(parsed.blocks);
  const cardComments = normalizeCardComments(parsed.cardComments);

  if (blocks.length !== 4) {
    throw new Error("OpenAI brief generation returned invalid block count.");
  }

  const promptTokens = payload.usage?.input_tokens ?? null;
  const completionTokens = payload.usage?.output_tokens ?? null;
  const totalTokens = payload.usage?.total_tokens ?? null;

  return {
    blocks,
    cardComments,
    confidence: String(parsed.confidence || "medium").trim() || "medium",
    estimatedCostUsd: estimateCostUsd(promptTokens, completionTokens),
    model,
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

async function upsertBrief({
  actorUserId,
  date,
  error,
  fallback,
  generated,
  input,
  locale,
  source,
  status,
}: {
  actorUserId?: string | null;
  date: string;
  error?: string;
  fallback?: PublicAiMarketBrief;
  generated?: Awaited<ReturnType<typeof callOpenAiBrief>>;
  input: ReturnType<typeof buildBriefInput> | Record<string, unknown>;
  locale: Locale;
  source: string;
  status: "fallback" | "generated";
}) {
  const activeIndex = getActiveIndexConfig();
  const output = generated
    ? { blocks: generated.blocks, confidence: generated.confidence }
    : { blocks: fallback?.blocks ?? [], confidence: fallback?.confidence ?? "fallback" };
  const cardComments = generated
    ? generated.cardComments
    : Object.entries(fallback?.cardComments ?? {}).map(([code, comment]) => ({
        code,
        comment,
      }));
  const model = generated?.model ?? fallback?.model ?? "deterministic-fallback";
  const inputDataHash =
    "inputDataHash" in input && typeof input.inputDataHash === "string"
      ? input.inputDataHash
      : buildShortHash(JSON.stringify(input));
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
      fallbackReason: generated ? null : fallback?.observability.fallbackReason ?? "fallback",
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
      fallbackReason: generated ? null : fallback?.observability.fallbackReason ?? "fallback",
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

async function findStoredBrief(locale: Locale, date?: string | null) {
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

async function ensureAiMarketBriefStorage() {
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

function mapStoredBrief(
  row: Awaited<ReturnType<typeof findStoredBrief>> extends infer T ? NonNullable<T> : never,
  locale: Locale,
): PublicAiMarketBrief {
  const output = row.outputJson as StoredBriefOutput | null;

  return {
    blocks: normalizeBlocks(output?.blocks),
    cardComments: mapCardComments(row.cardCommentsJson, locale),
    confidence: row.confidence ?? output?.confidence ?? "medium",
    generatedAt: formatShortDate(row.tradeDate.toISOString().slice(0, 10), locale),
    inputDataHash: row.inputDataHash,
    model: row.model,
    observability: {
      estimatedCostUsd: row.estimatedCostUsd?.toNumber() ?? null,
      fallbackReason: row.fallbackReason,
      promptTokens: row.promptTokens,
      status: row.status,
      totalTokens: row.totalTokens,
    },
  };
}

function buildDeterministicAiMarketBrief(
  history: AiAnalyticsPoint[],
  locale: Locale,
  activeRespondentCount: number,
  options: { fallbackReason?: string } = {},
): PublicAiMarketBrief {
  const latestRows = commodities
    .map((commodity) => getCommodityHistory(history, commodity.id).at(-1))
    .filter((row): row is AiAnalyticsPoint => Boolean(row));
  const latestDate = getLatestHistoryDate(history);
  const keyMover = latestRows.reduce<AiAnalyticsPoint | null>(
    (current, row) =>
      !current || Math.abs(row.dayChange) > Math.abs(current.dayChange)
        ? row
        : current,
    null,
  );
  const volatilityRows = latestRows.map((row) => {
    const commodityHistory = getCommodityHistory(history, row.commodityId);
    return {
      commodity: commodities.find((commodity) => commodity.id === row.commodityId) ?? commodities[0],
      volatility: standardDeviation(
        commodityHistory.slice(-30).map((point) => point.percentChange),
      ),
    };
  });
  const mostVolatile = volatilityRows.reduce(
    (current, row) => (row.volatility > current.volatility ? row : current),
    volatilityRows[0] ?? { commodity: commodities[0], volatility: 0 },
  );
  const keyMoverCommodity = keyMover
    ? commodities.find((commodity) => commodity.id === keyMover.commodityId)
    : null;
  const copy = getFallbackCopy(locale);

  return {
    blocks: [
      {
        body: latestDate
          ? copy.snapshotBody(latestRows.length, activeRespondentCount)
          : copy.noDataBody,
        title: copy.snapshotTitle,
      },
      {
        body:
          keyMover && keyMoverCommodity
            ? copy.moversBody(
                keyMoverCommodity.name[locale],
                formatSigned(keyMover.dayChange),
              )
            : copy.noDataBody,
        title: copy.moversTitle,
      },
      {
        body: copy.volatilityBody(
          mostVolatile.commodity.name[locale],
          mostVolatile.volatility.toFixed(2),
        ),
        title: copy.volatilityTitle,
      },
      {
        body:
          activeRespondentCount < 5
            ? copy.coverageCaution(activeRespondentCount)
            : copy.standardCaution(activeRespondentCount),
        title: copy.cautionTitle,
      },
    ],
    cardComments: Object.fromEntries(
      latestRows.map((row) => {
        const commodity =
          commodities.find((item) => item.id === row.commodityId) ?? commodities[0];
        return [
          commodity.code,
          copy.cardComment(commodity.name[locale], formatSigned(row.dayChange)),
        ];
      }),
    ),
    confidence: "fallback",
    generatedAt: latestDate ? formatShortDate(latestDate, locale) : copy.notAvailable,
    inputDataHash: buildShortHash(
      JSON.stringify({
        activeRespondentCount,
        latestDate,
        latestRows: latestRows.map((row) => [
          row.commodityId,
          row.value,
          row.dayChange,
        ]),
      }),
    ),
    model: "deterministic-fallback",
    observability: {
      estimatedCostUsd: 0,
      fallbackReason: options.fallbackReason ?? "deterministic_fallback",
      promptTokens: 0,
      status: "fallback",
      totalTokens: 0,
    },
  };
}

async function getRealAnalyticsHistory(): Promise<AiAnalyticsPoint[]> {
  const rows = await getPublicHistoryData();

  return rows
    .map((row) => ({
      commodityId: row.commodityId,
      date: row.date,
      dayChange: row.changeAbs,
      percentChange: row.changePct,
      respondents: row.respondents,
      value: row.valueUsdPerMt,
    }))
    .sort((a, b) =>
      a.date === b.date
        ? a.commodityId.localeCompare(b.commodityId)
        : a.date.localeCompare(b.date),
    );
}

function mapCardComments(value: unknown, locale: Locale) {
  const fallback = locale === "uk" ? "AI-коментар очікує публікації." : "AI note pending.";

  if (!Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    value
      .map((item) => {
        const entry = item as StoredCardComment;
        const code = String(entry.code || "").trim();
        const comment = String(entry.comment || fallback).trim();
        return code && comment ? [code, comment] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );
}

function normalizeBlocks(blocks: StoredBriefOutput["blocks"]) {
  return (blocks ?? [])
    .map((block) => ({
      body: String(block.body || "").trim(),
      title: String(block.title || "").trim(),
    }))
    .filter((block) => block.title && block.body)
    .slice(0, 4);
}

function normalizeCardComments(comments: StoredCardComment[] | undefined) {
  return (comments ?? [])
    .map((comment) => ({
      code: String(comment.code || "").trim(),
      comment: String(comment.comment || "").trim(),
    }))
    .filter((comment) => comment.code && comment.comment)
    .slice(0, commodities.length);
}

function estimateCostUsd(promptTokens: number | null, completionTokens: number | null) {
  if (promptTokens == null && completionTokens == null) {
    return null;
  }

  const inputPerMillion = Number(process.env.SPIKE_AI_INPUT_USD_PER_1M ?? 0.4);
  const outputPerMillion = Number(process.env.SPIKE_AI_OUTPUT_USD_PER_1M ?? 1.6);

  return (
    ((promptTokens ?? 0) / 1_000_000) * inputPerMillion +
    ((completionTokens ?? 0) / 1_000_000) * outputPerMillion
  );
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = payload as {
    output?: Array<{
      content?: Array<{ text?: string | { value?: string }; value?: string }>;
    }>;
    output_text?: string;
  };

  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => {
        if (typeof content.text === "string") {
          return content.text;
        }

        if (content.text && typeof content.text.value === "string") {
          return content.text.value;
        }

        return typeof content.value === "string" ? content.value : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

function parseBriefJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return JSON.parse(fenced?.[1] || trimmed);
}

function getCommodityHistory(history: AiAnalyticsPoint[], commodityId: CommodityId) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getPointBack(history: AiAnalyticsPoint[], countFromEnd: number) {
  return history.at(-countFromEnd) ?? history[0] ?? {
    commodityId: "corn" as CommodityId,
    date: "",
    dayChange: 0,
    percentChange: 0,
    respondents: 0,
    value: 0,
  };
}

function getLatestHistoryDate(history: AiAnalyticsPoint[]) {
  return history.map((row) => row.date).sort().at(-1) ?? null;
}

function revalidateAiBriefViews() {
  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/ai/market-brief");
}

function buildShortHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function formatShortDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

function todayKyivDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function getFallbackCopy(locale: Locale) {
  return locale === "uk"
    ? {
        cardComment: (commodity: string, change: string) =>
          `${commodity}: денний рух ${change} USD/t. AI-коментар базується на опублікованих значеннях.`,
        cautionTitle: "Обмеження",
        coverageCaution: (count: number) =>
          `Покриття респондентів: ${count}. AI summary пояснює validated data, але значення з обмеженим покриттям слід читати обережно.`,
        moversBody: (commodity: string, change: string) =>
          `Найпомітніший денний рух зараз ${commodity}: ${change} USD/t. Це аналітичний сигнал, а не рекомендація купівлі чи продажу.`,
        moversTitle: "Ключовий рух",
        noDataBody:
          "Після першої публікації індексу brief почне читати реальні published values і динаміку.",
        notAvailable: "n/a",
        snapshotBody: (positions: number, respondents: number) =>
          `Brief читає ${positions} published positions і поточне покриття ${respondents} респондентів. Розрахунок індексу залишається методологічним.`,
        snapshotTitle: "Market snapshot",
        standardCaution: (count: number) =>
          `Покриття ${count} респондентів підтримує базове читання індексу, але AI layer залишається лише поясненням опублікованих даних.`,
        volatilityBody: (commodity: string, volatility: string) =>
          `${commodity} має найвищу 30-денну волатильність у вибірці: ${volatility}%.`,
        volatilityTitle: "Волатильність",
      }
    : {
        cardComment: (commodity: string, change: string) =>
          `${commodity}: daily move ${change} USD/t. AI note is based on published values.`,
        cautionTitle: "Limitations",
        coverageCaution: (count: number) =>
          `Respondent coverage is currently ${count}. The brief is useful as an explanation of published data, but limited-coverage values should be read with caution.`,
        moversBody: (commodity: string, change: string) =>
          `The most visible daily move is currently ${commodity}: ${change} USD/t. This is an analytical signal, not a buy or sell recommendation.`,
        moversTitle: "Key mover",
        noDataBody:
          "After the first index publication, the brief will read real published values and movement history.",
        notAvailable: "n/a",
        snapshotBody: (positions: number, respondents: number) =>
          `The brief reads ${positions} published positions and current coverage from ${respondents} respondents. Index calculation remains methodology-driven.`,
        snapshotTitle: "Market snapshot",
        standardCaution: (count: number) =>
          `Coverage from ${count} respondents supports the baseline index reading, while the AI layer remains explanatory only.`,
        volatilityBody: (commodity: string, volatility: string) =>
          `${commodity} shows the highest 30-day volatility in the current set: ${volatility}%.`,
        volatilityTitle: "Volatility",
      };
}
