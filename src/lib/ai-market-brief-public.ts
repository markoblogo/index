import { allowMockFallback, hasDatabaseUrl } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { commodities, type CommodityId } from "@/lib/mock-data";
import { getPublicHistoryData } from "@/lib/public-api-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";
import {
  findStoredBrief,
} from "@/lib/ai-market-brief-storage";
import type {
  AiAnalyticsPoint,
  PublicAiMarketBrief,
  StoredBriefOutput,
  StoredCardComment,
} from "@/lib/ai-market-brief-types";

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

export async function getRealAnalyticsHistory(): Promise<AiAnalyticsPoint[]> {
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
      const adminModule = await import("@/lib/ai-market-brief");
      await adminModule.generateAndStoreDailyAiMarketBrief({
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
        const commodityHistory = getCommodityHistory(history, row.commodityId);
        const weeklyChange =
          computeChangeFromPreviousFriday(
            commodityHistory,
            row.value,
            row.date,
          ) ?? 0;
        return [
          commodity.code,
          copy.cardComment(
            formatUsdPerT(row.dayChange, locale),
            formatUsdPerT(weeklyChange, locale),
          ),
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

function getCommodityHistory(
  history: AiAnalyticsPoint[],
  commodityId: CommodityId,
) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getLatestHistoryDate(history: AiAnalyticsPoint[]) {
  return (
    history
      .map((row) => row.date)
      .sort()
      .at(-1) ?? null
  );
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
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function computeChangeFromPreviousFriday(
  history: AiAnalyticsPoint[],
  latest: number,
  latestDate: string,
) {
  const previousFriday = getPreviousFridayDate(latestDate);
  const reference = history
    .filter((point) => point.date <= previousFriday)
    .sort((first, second) => first.date.localeCompare(second.date))
    .at(-1);

  return reference ? Math.round((latest - reference.value) * 10) / 10 : null;
}

function getPreviousFridayDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay();
  const daysSinceFriday = (day + 2) % 7;
  value.setUTCDate(value.getUTCDate() - (daysSinceFriday === 0 ? 7 : daysSinceFriday));
  return value.toISOString().slice(0, 10);
}

function formatUsdPerT(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}$`;
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

function getFallbackCopy(locale: Locale) {
  return locale === "uk"
    ? {
        cardComment: (dayChange: string, weeklyChange: string) =>
          `Сьогодні індекс змінився на ${dayChange} відносно минулого дня. Тижнева зміна відносно минулої п'ятниці склала ${weeklyChange}.`,
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
        cardComment: (dayChange: string, weeklyChange: string) =>
          `Today the index changed by ${dayChange} versus the previous day. The weekly change versus last Friday was ${weeklyChange}.`,
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
