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
  tradeDate: string;
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

type GeneratedBriefJson = {
  cardComments?: StoredCardComment[];
  dataConfidence?: string;
  keyMovers?: string[] | string;
  marketSignal?: string;
  riskRead?: string;
  watchNext?: string[] | string;
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
    const resolved = await resolvePublishedAiMarketBrief({
      activeRespondentCount,
      history,
      locale,
    });

    if (resolved) {
      return resolved;
    }

    if (!allowMockFallback()) {
      return null;
    }
  }

  return buildDeterministicAiMarketBrief(
    history,
    locale,
    activeRespondentCount,
    {
      fallbackReason: "demo_or_missing_saved_brief",
    },
  );
}

export async function getLatestAiCardComments(locale: Locale) {
  if (getActiveIndexConfig().id !== "spike-ua" || !hasDatabaseUrl()) {
    return {};
  }

  const history = await getRealAnalyticsHistory();
  const activeRespondentCount = await getActiveRespondentCountData();
  const brief = await resolvePublishedAiMarketBrief({
    activeRespondentCount,
    history,
    locale,
  });

  if (!brief) {
    return {};
  }

  return brief.cardComments;
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
    return {
      locale,
      skippedReason: "database_not_configured",
      status: "skipped",
    };
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
  const input = buildBriefInput(
    history,
    locale,
    activeRespondentCount,
    tradeDate,
  );
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

    return {
      date: tradeDate,
      id: row.id,
      inputDataHash: row.inputDataHash,
      locale,
      status: row.status,
    };
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

export async function sendAiBriefTelegramSummary(
  date: string,
  locale: Locale = "uk",
) {
  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
    process.env.UGA_TELEGRAM_ADMIN_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !chatId || !hasDatabaseUrl()) {
    return { skippedReason: "telegram_not_configured", status: "skipped" };
  }

  const history = await getRealAnalyticsHistory();
  const activeRespondentCount = await getActiveRespondentCountData();
  const brief = await resolvePublishedAiMarketBrief({
    activeRespondentCount,
    date,
    history,
    locale,
  });

  if (!brief) {
    return { skippedReason: "brief_not_found", status: "skipped" };
  }

  const text = buildAiBriefTelegramSummaryText(brief, locale);
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        parse_mode: "HTML",
        text,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

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
      const commodityHistory = getCommodityHistory(
        history,
        commodity.id,
      ).filter((point) => point.date <= tradeDate);
      const latest = commodityHistory.at(-1);

      if (!latest || latest.date !== tradeDate) {
        return null;
      }

      return {
        change1d: latest.dayChange,
        change7d: roundOne(
          latest.value - getPointBack(commodityHistory, 8).value,
        ),
        change30d: roundOne(
          latest.value - getPointBack(commodityHistory, 31).value,
        ),
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
      "Today's Market Signal",
      "Key Movers",
      "Risk / Stability Read",
      "What to Watch Next",
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
  const localeInstructions =
    input.locale === "uk"
      ? "Write every public text value in Ukrainian only. Keep commodity codes, price units, and proper nouns as needed, but all explanations, bullets, labels, and sentences must be Ukrainian."
      : "Write every public text value in English only. Keep commodity codes, price units, and proper nouns as needed, but all explanations, bullets, labels, and sentences must be English.";
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            `You generate concise market intelligence briefs for SPIKE SPOT INDEX, a Ukrainian agro commodity spot benchmark. Use only the provided data. Do not invent prices, respondent names, trades, causes, news, or forecasts. Do not restate the full index table. Do not list all prices unless a value is necessary to explain a signal. Do not present scenarios as forecasts. Do not give trading advice. Public outputs must not expose model, token, cost, or debug data. ${localeInstructions} The brief must answer: 1) what is the main market signal today, 2) which movements are meaningful, 3) where instability or divergence is visible, 4) what should be watched in the next publication cycle. Return strict JSON only with keys: marketSignal, keyMovers, riskRead, watchNext, dataConfidence, cardComments. keyMovers and watchNext should contain 2-3 short items each. dataConfidence must be one of limited, normal, strong. cardComments must contain one short object per provided position with code and comment. The brief is not trading advice.`,
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
    throw new Error(
      `OpenAI brief generation failed: ${response.status} ${await response.text()}`,
    );
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

  const parsed = parseBriefJson(content) as GeneratedBriefJson;
  const confidence = normalizeConfidence(parsed.dataConfidence);
  const blocks = buildBlocksFromGeneratedJson(parsed, input.locale);
  const cardComments = normalizeCardComments(parsed.cardComments);

  if (blocks.length !== 4) {
    throw new Error(
      "OpenAI brief generation returned invalid section payload.",
    );
  }

  const promptTokens = payload.usage?.input_tokens ?? null;
  const completionTokens = payload.usage?.output_tokens ?? null;
  const totalTokens = payload.usage?.total_tokens ?? null;

  return {
    blocks,
    cardComments,
    confidence,
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
  row: Awaited<ReturnType<typeof findStoredBrief>> extends infer T
    ? NonNullable<T>
    : never,
  locale: Locale,
): PublicAiMarketBrief {
  const output = row.outputJson as StoredBriefOutput | null;

  return {
    blocks: normalizeBlocks(output?.blocks),
    cardComments: mapCardComments(row.cardCommentsJson, locale),
    confidence: normalizeConfidence(row.confidence ?? output?.confidence),
    generatedAt: formatShortDate(
      row.tradeDate.toISOString().slice(0, 10),
      locale,
    ),
    inputDataHash: row.inputDataHash,
    model: row.model,
    tradeDate: row.tradeDate.toISOString().slice(0, 10),
    observability: {
      estimatedCostUsd: row.estimatedCostUsd?.toNumber() ?? null,
      fallbackReason: row.fallbackReason,
      promptTokens: row.promptTokens,
      status: row.status,
      totalTokens: row.totalTokens,
    },
  };
}

export function isAiBriefLocaleCompatible(
  brief: PublicAiMarketBrief,
  locale: Locale,
) {
  const text = brief.blocks.map((block) => block.body).join("\n");
  const cyrillicCount = (text.match(/[А-Яа-яЁёІіЇїЄєҐґ]/g) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;

  if (locale === "uk") {
    return cyrillicCount > latinCount;
  }

  return latinCount >= cyrillicCount;
}

async function resolvePublishedAiMarketBrief({
  activeRespondentCount,
  date,
  history,
  locale,
}: {
  activeRespondentCount: number;
  date?: string;
  history: AiAnalyticsPoint[];
  locale: Locale;
}): Promise<PublicAiMarketBrief | null> {
  const latestDate = date ?? getLatestHistoryDate(history);

  if (!latestDate) {
    return null;
  }

  const stored = await findStoredBrief(locale, latestDate);

  if (stored) {
    const mapped = mapStoredBrief(stored, locale);

    if (isAiBriefLocaleCompatible(mapped, locale)) {
      return mapped;
    }

    if (process.env.SPIKE_AI_BRIEF_AUTO_REPAIR !== "0") {
      await generateAndStoreDailyAiMarketBrief({
        date: latestDate,
        force: true,
        locale,
        source: "locale_repair",
      });

      const repaired = await findStoredBrief(locale, latestDate);

      if (repaired) {
        const repairedMapped = mapStoredBrief(repaired, locale);

        if (isAiBriefLocaleCompatible(repairedMapped, locale)) {
          return repairedMapped;
        }
      }
    }
  }

  if (!stored && hasDatabaseUrl() && !allowMockFallback()) {
    return null;
  }

  return buildDeterministicAiMarketBrief(history, locale, activeRespondentCount, {
    fallbackReason: stored ? "locale_mismatch" : "demo_or_missing_saved_brief",
  });
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
      commodity:
        commodities.find((commodity) => commodity.id === row.commodityId) ??
        commodities[0],
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
  const confidence =
    activeRespondentCount < 5
      ? "limited"
      : activeRespondentCount >= 7
        ? "strong"
        : "normal";

  return {
    blocks: [
      {
        body:
          keyMover && keyMoverCommodity
            ? copy.signalBody(
                keyMoverCommodity.name[locale],
                formatSigned(keyMover.dayChange),
              )
            : copy.noDataBody,
        title: copy.signalTitle,
      },
      {
        body: buildFallbackKeyMoversBody(latestRows, locale, copy),
        title: copy.moversTitle,
      },
      {
        body: copy.riskBody(
          mostVolatile.commodity.name[locale],
          mostVolatile.volatility.toFixed(2),
        ),
        title: copy.riskTitle,
      },
      {
        body: buildFallbackWatchNextBody(latestRows, locale, copy),
        title: copy.watchTitle,
      },
    ],
    cardComments: Object.fromEntries(
      latestRows.map((row) => {
        const commodity =
          commodities.find((item) => item.id === row.commodityId) ??
          commodities[0];
        return [
          commodity.code,
          copy.cardComment(commodity.name[locale], formatSigned(row.dayChange)),
        ];
      }),
    ),
    confidence,
    generatedAt: latestDate
      ? formatShortDate(latestDate, locale)
      : copy.notAvailable,
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
    tradeDate: latestDate ?? todayKyivDate(),
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
  const fallback =
    locale === "uk" ? "AI-коментар очікує публікації." : "AI note pending.";

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

function estimateCostUsd(
  promptTokens: number | null,
  completionTokens: number | null,
) {
  if (promptTokens == null && completionTokens == null) {
    return null;
  }

  const inputPerMillion = Number(process.env.SPIKE_AI_INPUT_USD_PER_1M ?? 0.4);
  const outputPerMillion = Number(
    process.env.SPIKE_AI_OUTPUT_USD_PER_1M ?? 1.6,
  );

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

function getCommodityHistory(
  history: AiAnalyticsPoint[],
  commodityId: CommodityId,
) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getPointBack(history: AiAnalyticsPoint[], countFromEnd: number) {
  return (
    history.at(-countFromEnd) ??
    history[0] ?? {
      commodityId: "corn" as CommodityId,
      date: "",
      dayChange: 0,
      percentChange: 0,
      respondents: 0,
      value: 0,
    }
  );
}

function getLatestHistoryDate(history: AiAnalyticsPoint[]) {
  return (
    history
      .map((row) => row.date)
      .sort()
      .at(-1) ?? null
  );
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
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

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

function buildBlocksFromGeneratedJson(
  payload: GeneratedBriefJson,
  locale: Locale,
) {
  const titles =
    locale === "uk"
      ? {
          keyMovers: "Що рухалося найсильніше",
          marketSignal: "Головний сигнал дня",
          riskRead: "Стійкість / ризик",
          watchNext: "На що дивитися далі",
        }
      : {
          keyMovers: "Key Movers",
          marketSignal: "Today's Market Signal",
          riskRead: "Risk / Stability Read",
          watchNext: "What to Watch Next",
        };

  return normalizeBlocks([
    {
      body: String(payload.marketSignal || "").trim(),
      title: titles.marketSignal,
    },
    {
      body: joinBulletLikeBody(payload.keyMovers),
      title: titles.keyMovers,
    },
    {
      body: String(payload.riskRead || "").trim(),
      title: titles.riskRead,
    },
    {
      body: joinBulletLikeBody(payload.watchNext),
      title: titles.watchNext,
    },
  ]);
}

function joinBulletLikeBody(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" ");
  }

  return String(value || "").trim();
}

function normalizeConfidence(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "limited" ||
    normalized === "normal" ||
    normalized === "strong"
  ) {
    return normalized;
  }

  if (normalized === "low") {
    return "limited";
  }

  if (normalized === "high") {
    return "strong";
  }

  return "normal";
}

function buildFallbackKeyMoversBody(
  latestRows: AiAnalyticsPoint[],
  locale: Locale,
  copy: ReturnType<typeof getFallbackCopy>,
) {
  const ranked = [...latestRows]
    .sort((a, b) => Math.abs(b.dayChange) - Math.abs(a.dayChange))
    .slice(0, 2);

  if (ranked.length === 0) {
    return copy.noDataBody;
  }

  return ranked
    .map((row) => {
      const commodity =
        commodities.find((item) => item.id === row.commodityId) ??
        commodities[0];
      return copy.moverLine(
        commodity.name[locale],
        formatSigned(row.dayChange),
      );
    })
    .join(" ");
}

function buildFallbackWatchNextBody(
  latestRows: AiAnalyticsPoint[],
  locale: Locale,
  copy: ReturnType<typeof getFallbackCopy>,
) {
  const positive =
    [...latestRows].sort((a, b) => b.dayChange - a.dayChange)[0] ?? null;
  const negative =
    [...latestRows].sort((a, b) => a.dayChange - b.dayChange)[0] ?? null;

  if (!positive && !negative) {
    return copy.noDataBody;
  }

  const focusNames = [positive, negative]
    .filter(
      (row, index, array): row is AiAnalyticsPoint =>
        Boolean(row) && array.indexOf(row) === index,
    )
    .map((row) => {
      const commodity =
        commodities.find((item) => item.id === row.commodityId) ??
        commodities[0];
      return commodity.name[locale];
    });

  return copy.watchBody(focusNames);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatTelegramDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function buildAiBriefTelegramSummaryText(
  brief: PublicAiMarketBrief,
  locale: Locale,
) {
  const signal = brief.blocks[0];
  const movers = brief.blocks[1];
  const risk = brief.blocks[2];
  const watch = brief.blocks[3];
  const confidence =
    locale === "uk"
      ? mapConfidenceLabel(brief.confidence, locale)
      : `Data confidence: ${mapConfidenceLabel(brief.confidence, locale)}`;

  if (locale === "uk") {
    return [
      "<b>🌾 AI Market Brief · SPIKE SPOT INDEX</b>",
      `<b>📅 ${escapeHtml(formatTelegramDate(brief.tradeDate, locale))}</b>`,
      "",
      `<b>🔎 ${escapeHtml(signal?.title ?? "Головний сигнал дня")}</b>`,
      escapeHtml(signal?.body ?? ""),
      "",
      `<b>📈 ${escapeHtml(movers?.title ?? "Що рухалося найсильніше")}</b>`,
      escapeHtml(movers?.body ?? ""),
      "",
      `<b>⚖️ ${escapeHtml(risk?.title ?? "Стійкість / ризик")}</b>`,
      escapeHtml(risk?.body ?? ""),
      "",
      `<b>👀 ${escapeHtml(watch?.title ?? "На що дивитися далі")}</b>`,
      escapeHtml(watch?.body ?? ""),
      "",
      `<i>${escapeHtml(confidence)}</i>`,
      "<i>AI-assisted brief based on published SPIKE SPOT INDEX data. Not a trading recommendation.</i>",
    ].join("\n");
  }

  return [
    "<b>🌾 AI Market Brief · SPIKE SPOT INDEX</b>",
    `<b>📅 ${escapeHtml(formatTelegramDate(brief.tradeDate, locale))}</b>`,
    "",
    `<b>🔎 ${escapeHtml(signal?.title ?? "Today's Market Signal")}</b>`,
    escapeHtml(signal?.body ?? ""),
    "",
    `<b>📈 ${escapeHtml(movers?.title ?? "Key Movers")}</b>`,
    escapeHtml(movers?.body ?? ""),
    "",
    `<b>⚖️ ${escapeHtml(risk?.title ?? "Risk / Stability Read")}</b>`,
    escapeHtml(risk?.body ?? ""),
    "",
    `<b>👀 ${escapeHtml(watch?.title ?? "What to Watch Next")}</b>`,
    escapeHtml(watch?.body ?? ""),
    "",
    `<i>${escapeHtml(confidence)}</i>`,
    "<i>AI-assisted brief based on published SPIKE SPOT INDEX data. Not a trading recommendation.</i>",
  ].join("\n");
}

function getFallbackCopy(locale: Locale) {
  return locale === "uk"
    ? {
        cardComment: (commodity: string, change: string) =>
          `${commodity}: денний рух ${change} USD/t. AI-коментар базується на опублікованих значеннях.`,
        moverLine: (commodity: string, change: string) =>
          `${commodity} показує один із найпомітніших короткострокових рухів: ${change} USD/t.`,
        moversTitle: "Що рухалося найсильніше",
        noDataBody:
          "Після першої публікації індексу brief почне читати реальні published values і динаміку.",
        notAvailable: "n/a",
        riskBody: (commodity: string, volatility: string) =>
          `${commodity} зараз має найвищий сигнал нестабільності у вибірці, тоді як інші позиції виглядають більш стримано. Орієнтовна 30-денна волатильність становить ${volatility}%.`,
        riskTitle: "Стійкість / ризик",
        signalBody: (commodity: string, change: string) =>
          `${commodity} формує головний сигнал дня з рухом ${change} USD/t, але цей імпульс поки виглядає більш локальним, ніж загальноринковим.`,
        signalTitle: "Головний сигнал дня",
        watchBody: (commoditiesToWatch: string[]) =>
          commoditiesToWatch.length > 0
            ? `У наступній публікації варто стежити, чи підтвердиться рух у позиціях ${commoditiesToWatch.join(", ")} і чи пошириться сигнал ширше по ринку.`
            : "Наступна публікація покаже, чи підтвердиться поточний рух і чи сформується ширший ринковий сигнал.",
        watchTitle: "На що дивитися далі",
      }
    : {
        cardComment: (commodity: string, change: string) =>
          `${commodity}: daily move ${change} USD/t. AI note is based on published values.`,
        moverLine: (commodity: string, change: string) =>
          `${commodity} is one of the most visible short-term movers at ${change} USD/t.`,
        moversTitle: "Key Movers",
        noDataBody:
          "After the first index publication, the brief will read real published values and movement history.",
        notAvailable: "n/a",
        riskBody: (commodity: string, volatility: string) =>
          `${commodity} currently carries the clearest instability signal in the sample, while the rest of the basket looks more restrained. Indicative 30-day volatility is ${volatility}%.`,
        riskTitle: "Risk / Stability Read",
        signalBody: (commodity: string, change: string) =>
          `${commodity} defines the main signal of the day with a move of ${change} USD/t, although the impulse still looks more isolated than market-wide.`,
        signalTitle: "Today's Market Signal",
        watchBody: (commoditiesToWatch: string[]) =>
          commoditiesToWatch.length > 0
            ? `Watch whether movement in ${commoditiesToWatch.join(", ")} is confirmed in the next publication cycle and whether the signal broadens across the market.`
            : "Watch whether the current move is confirmed in the next publication cycle and broadens across the market.",
        watchTitle: "What to Watch Next",
      };
}

export function mapConfidenceLabel(confidence: string, locale: Locale) {
  const value = normalizeConfidence(confidence);

  if (locale === "uk") {
    return value === "limited"
      ? "Data confidence: обмежена"
      : value === "strong"
        ? "Data confidence: висока"
        : "Data confidence: нормальна";
  }

  return value === "limited"
    ? "limited"
    : value === "strong"
      ? "strong"
      : "normal";
}
