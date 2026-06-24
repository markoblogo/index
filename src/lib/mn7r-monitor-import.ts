import { getActiveIndexConfig } from "@/lib/index-platform";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { RespondentPriceInput } from "@/lib/respondent-prices";
import { getFxRates, type FxRates } from "@/lib/fx-rates";
import {
  clearRespondentPrice,
  resolveCommodityConfig,
  type ClearRespondentPriceInput,
  upsertRespondentPrice,
} from "@/lib/respondent-prices";

export type Mn7rPosition = {
  indexCode: string;
  currency: string | null;
  avgBid: number | null;
  avgOffer: number | null;
  monitorPrice: number | null;
  bidCount: number;
  offerCount: number;
  sampleCount: number;
  quality: "ok" | "thin" | "no_data";
};

export type Mn7rRawRecord = {
  id?: string | number | null;
  indexCode?: string | null;
  commodity?: string | null;
  product?: string | null;
  itemName?: string | null;
  title?: string | null;
  basis?: string | null;
  basisName?: string | null;
  deliveryBasis?: string | null;
  location?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  deliveryStart?: string | null;
  deliveryEnd?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  monitorPrice: number | null;
  currency: string | null;
  avgBid?: number | null;
  avgOffer?: number | null;
  bidCount?: number | null;
  offerCount?: number | null;
  sampleCount?: number | null;
  quality?: "ok" | "thin" | "no_data" | null;
};

export type Mn7rPayload = {
  source: "MN7R_MONITOR";
  respondentCode: "MN7R_MONITOR";
  asOfDate: string;
  generatedAt: string;
  timezone: string;
  methodologyVersion: string;
  positions?: Mn7rPosition[];
  records?: Mn7rRawRecord[];
  items?: Mn7rRawRecord[];
};

export type Mn7rImportResult = {
  date: string;
  imported: number;
  skipped: number;
};

export type Mn7rRawRecordDiagnostic = {
  basisText: string;
  currency: string | null;
  decision: "matched" | "skipped";
  deliveryEnd: string | null;
  deliveryStart: string | null;
  deliveryWindowEnd: string;
  deliveryWindowStart: string;
  matchedIndexCode: string | null;
  monitorPrice: number | null;
  overlapDays: number;
  passedDeliveryWindow: boolean;
  quality: string | null;
  rawId: string | null;
  rawText: string;
  reason:
    | "matched"
    | "delivery_overlap_below_10_days"
    | "matched_but_no_data"
    | "matched_but_price_missing"
    | "no_index_match"
    | "position_payload";
};

export type Mn7rMonitorImportAuditView = {
  createdAt: string;
  date: string;
  diagnostics: Mn7rRawRecordDiagnostic[];
  generatedAt: string | null;
  imported: number;
  methodologyVersion: string | null;
  rawCount: number;
  skipped: number;
  source: string;
  updatedAt: string;
};

type FetchLike = typeof fetch;
type ClearLike = (input: ClearRespondentPriceInput) => Promise<unknown>;
type GetFxRatesLike = (date?: string) => Promise<FxRates>;
type UpsertLike = (input: RespondentPriceInput) => Promise<unknown>;

type Mn7rTarget = {
  basisKeywords: string[];
  commodityKeywords: string[];
  excludeKeywords?: string[];
  indexCode: string;
};

type NormalizedRawMatch = {
  indexCode: string;
  raw: Mn7rRawRecord;
};

type NormalizedMn7rPayload = {
  diagnostics: Mn7rRawRecordDiagnostic[];
  missingIndexCodes: string[];
  positions: Mn7rPosition[];
  rawCount: number;
  skipped: number;
};

type InternalRawDiagnostic = Mn7rRawRecordDiagnostic & {
  raw: Mn7rRawRecord;
};

const SPIKE_MN7R_TARGETS: Mn7rTarget[] = [
  {
    indexCode: "CORN",
    commodityKeywords: ["corn", "maize", "кукуруд"],
    basisKeywords: ["cpt", "odesa", "одеса"],
    excludeKeywords: ["parity", "паритет", "chop", "чоп"],
  },
  {
    indexCode: "WHT_115",
    commodityKeywords: ["11.5", "11,5", "milling wheat", "пшениц", "wheat"],
    basisKeywords: ["cpt", "odesa", "одеса"],
    excludeKeywords: [
      "12.5",
      "12,5",
      "feed",
      "fodder",
      "фураж",
      "parity",
      "паритет",
    ],
  },
  {
    indexCode: "FEED_WHT",
    commodityKeywords: ["feed wheat", "fodder wheat", "фураж", "feed_wht"],
    basisKeywords: ["cpt", "odesa", "одеса"],
    excludeKeywords: ["parity", "паритет"],
  },
  {
    indexCode: "CORN_FCA_CHOP",
    commodityKeywords: ["corn", "maize", "кукуруд"],
    basisKeywords: ["fca", "chop", "чоп"],
  },
  {
    indexCode: "GMO_SOY",
    commodityKeywords: ["soy", "soybean", "соя", "gmo"],
    basisKeywords: ["parity", "паритет", "odesa", "одеса"],
  },
  {
    indexCode: "GMO_SOY_EXPORT",
    commodityKeywords: ["soy", "soybean", "соя", "gmo"],
    basisKeywords: ["cpt", "port", "odesa", "одеса"],
    excludeKeywords: ["parity", "паритет", "chop", "чоп"],
  },
  {
    indexCode: "GMO_SOY_FCA_CHOP",
    commodityKeywords: ["soy", "soybean", "соя", "gmo"],
    basisKeywords: ["fca", "chop", "чоп"],
  },
  {
    indexCode: "SOYBEAN_NON_GMO_EXPORT",
    commodityKeywords: ["soy", "soybean", "соя", "non gmo", "не гмо"],
    basisKeywords: ["cpt", "port", "odesa", "одеса"],
    excludeKeywords: ["parity", "паритет", "chop", "чоп"],
  },
  {
    indexCode: "SOYBEAN_NON_GMO_FCA_CHOP",
    commodityKeywords: ["soy", "soybean", "соя", "non gmo", "не гмо"],
    basisKeywords: ["fca", "chop", "чоп"],
  },
  {
    indexCode: "SUNFLOWER",
    commodityKeywords: ["sunflower", "соняш"],
    basisKeywords: ["parity", "паритет", "odesa", "одеса"],
  },
  {
    indexCode: "RAPESEED_NON_GMO_PROCESSING",
    commodityKeywords: ["rapeseed", "canola", "ріпак", "non gmo", "не гмо"],
    basisKeywords: ["parity", "паритет", "odesa", "одеса"],
  },
  {
    indexCode: "RAPESEED_NON_GMO_EXPORT",
    commodityKeywords: ["rapeseed", "canola", "ріпак", "non gmo", "не гмо"],
    basisKeywords: ["cpt", "port", "odesa", "одеса"],
    excludeKeywords: ["parity", "паритет", "chop", "чоп"],
  },
  {
    indexCode: "RAPESEED_NON_GMO_FCA_CHOP",
    commodityKeywords: ["rapeseed", "canola", "ріпак", "non gmo", "не гмо"],
    basisKeywords: ["fca", "chop", "чоп"],
  },
];

export function formatDateKyiv(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isKyivMn7rImportHour(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Kyiv",
    }).format(date),
  );

  return hour === 17;
}

export async function importMn7rMonitorRespondentPrices(
  date = formatDateKyiv(),
  options: {
    clearRespondentPriceImpl?: ClearLike;
    fetchImpl?: FetchLike;
    getFxRatesImpl?: GetFxRatesLike;
    upsertRespondentPriceImpl?: UpsertLike;
  } = {},
): Promise<Mn7rImportResult> {
  const baseUrl = process.env.MN7R_API_URL;
  const token = process.env.MN7R_INDEX_EXPORT_TOKEN;

  if (!baseUrl) {
    throw new Error("MN7R_API_URL is not configured");
  }

  if (!token) {
    throw new Error("MN7R_INDEX_EXPORT_TOKEN is not configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${baseUrl.replace(/\/$/, "")}/api/integrations/index/daily-prices?date=${encodeURIComponent(date)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`MN7R Monitor export failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as Mn7rPayload;
  const upsert = options.upsertRespondentPriceImpl ?? upsertRespondentPrice;
  const clear = options.clearRespondentPriceImpl ?? clearRespondentPrice;
  const respondentCode =
    process.env.MN7R_INDEX_RESPONDENT_CODE ?? payload.respondentCode;
  const normalizedPayload = normalizePayload(payload);
  const fxRates = await getFxRatesForPayload(
    normalizedPayload.positions,
    payload.asOfDate,
    options.getFxRatesImpl,
  );
  let imported = 0;
  let skipped = normalizedPayload.skipped;

  for (const position of normalizedPayload.positions) {
    if (!resolveCommodityConfig(position.indexCode)) {
      skipped += 1;
      continue;
    }

    if (position.monitorPrice == null || position.quality === "no_data") {
      await clear({
        date: payload.asOfDate,
        indexCode: position.indexCode,
        reason:
          position.quality === "no_data"
            ? "mn7r_no_data"
            : "mn7r_monitor_price_null",
        respondentCode,
      });
      skipped += 1;
      continue;
    }

    const normalized = normalizeMonitorPriceToUsd(position, fxRates);

    if (!normalized) {
      await clear({
        date: payload.asOfDate,
        indexCode: position.indexCode,
        reason: `mn7r_unsupported_currency_${position.currency ?? "null"}`,
        respondentCode,
      });
      skipped += 1;
      continue;
    }

    await upsert({
      date: payload.asOfDate,
      respondentCode,
      indexCode: position.indexCode,
      price: normalized.priceUsd,
      currency: "USD",
      meta: {
        source: payload.source,
        generatedAt: payload.generatedAt,
        methodologyVersion: payload.methodologyVersion,
        avgBid: position.avgBid,
        avgOffer: position.avgOffer,
        bidCount: position.bidCount,
        fxRates: normalized.fxMeta,
        originalCurrency: normalized.originalCurrency,
        originalMonitorPrice: position.monitorPrice,
        offerCount: position.offerCount,
        sampleCount: position.sampleCount,
        quality: position.quality,
      },
    });
    imported += 1;
  }

  for (const missingIndexCode of normalizedPayload.missingIndexCodes) {
    await clear({
      date: payload.asOfDate,
      indexCode: missingIndexCode,
      reason: "mn7r_no_matching_records",
      respondentCode,
    });
    skipped += 1;
  }

  await persistMn7rMonitorImportAudit({
    diagnostics: normalizedPayload.diagnostics,
    imported,
    payload,
    rawCount: normalizedPayload.rawCount,
    skipped,
  });

  return { date: payload.asOfDate, imported, skipped };
}

export async function getMn7rMonitorImportAudit(
  date: string,
): Promise<Mn7rMonitorImportAuditView | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    await ensureMn7rMonitorImportAuditStorage();
    const rows = await db.$queryRawUnsafe<
      Array<{
        createdAt: Date;
        date: Date;
        diagnosticsJson: unknown;
        generatedAt: Date | null;
        imported: number;
        methodologyVersion: string | null;
        rawCount: number;
        skipped: number;
        source: string;
        updatedAt: Date;
      }>
    >(
      `SELECT "date", "source", "generatedAt", "methodologyVersion", "rawCount", "imported", "skipped", "diagnosticsJson", "createdAt", "updatedAt"
       FROM "Mn7rMonitorImportAudit"
       WHERE "date" = $1::date AND "source" = 'MN7R_MONITOR'
       LIMIT 1`,
      date,
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      createdAt: row.createdAt.toISOString(),
      date: formatDateOnly(row.date),
      diagnostics: Array.isArray(row.diagnosticsJson)
        ? (row.diagnosticsJson as Mn7rRawRecordDiagnostic[])
        : [],
      generatedAt: row.generatedAt?.toISOString() ?? null,
      imported: row.imported,
      methodologyVersion: row.methodologyVersion,
      rawCount: row.rawCount,
      skipped: row.skipped,
      source: row.source,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error) {
    console.warn("Failed to load MN7R Monitor import audit", safeErrorMessage(error));
    return null;
  }
}

async function persistMn7rMonitorImportAudit({
  diagnostics,
  imported,
  payload,
  rawCount,
  skipped,
}: {
  diagnostics: Mn7rRawRecordDiagnostic[];
  imported: number;
  payload: Mn7rPayload;
  rawCount: number;
  skipped: number;
}) {
  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    await ensureMn7rMonitorImportAuditStorage();
    await db.$executeRawUnsafe(
      `INSERT INTO "Mn7rMonitorImportAudit"
        ("id", "date", "source", "generatedAt", "methodologyVersion", "rawCount", "imported", "skipped", "diagnosticsJson", "createdAt", "updatedAt")
       VALUES ($1, $2::date, $3, $4::timestamp, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())
       ON CONFLICT ("date", "source") DO UPDATE SET
        "generatedAt" = EXCLUDED."generatedAt",
        "methodologyVersion" = EXCLUDED."methodologyVersion",
        "rawCount" = EXCLUDED."rawCount",
        "imported" = EXCLUDED."imported",
        "skipped" = EXCLUDED."skipped",
        "diagnosticsJson" = EXCLUDED."diagnosticsJson",
        "updatedAt" = NOW()`,
      `mn7r-monitor:${payload.asOfDate}`,
      payload.asOfDate,
      payload.source,
      payload.generatedAt ? new Date(payload.generatedAt) : null,
      payload.methodologyVersion,
      rawCount,
      imported,
      skipped,
      JSON.stringify(diagnostics),
    );
  } catch (error) {
    console.warn("Failed to persist MN7R Monitor import audit", safeErrorMessage(error));
  }
}

async function ensureMn7rMonitorImportAuditStorage() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Mn7rMonitorImportAudit" (
      "id" TEXT PRIMARY KEY,
      "date" DATE NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'MN7R_MONITOR',
      "generatedAt" TIMESTAMP NULL,
      "methodologyVersion" TEXT NULL,
      "rawCount" INTEGER NOT NULL DEFAULT 0,
      "imported" INTEGER NOT NULL DEFAULT 0,
      "skipped" INTEGER NOT NULL DEFAULT 0,
      "diagnosticsJson" JSONB NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Mn7rMonitorImportAudit_date_source_key"
      ON "Mn7rMonitorImportAudit"("date", "source")
  `);
}

function normalizePayload(payload: Mn7rPayload): NormalizedMn7rPayload {
  if (payload.positions?.length) {
    return {
      diagnostics: buildPositionDiagnostics(payload),
      missingIndexCodes: [] as string[],
      positions: payload.positions,
      rawCount: payload.positions.length,
      skipped: 0,
    };
  }

  return aggregateRawRecords(payload);
}

function aggregateRawRecords(payload: Mn7rPayload) {
  const diagnostics = buildInternalRawRecordDiagnostics(payload);
  const matches: NormalizedRawMatch[] = diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.matchedIndexCode &&
        diagnostic.passedDeliveryWindow,
    )
    .map((diagnostic) => ({
      indexCode: diagnostic.matchedIndexCode!,
      raw: diagnostic.raw,
    }));
  let skipped = diagnostics.filter(
    (diagnostic) => diagnostic.decision === "skipped",
  ).length;

  const positions: Mn7rPosition[] = [];
  const matchedIndexCodes = new Set<string>();

  for (const target of SPIKE_MN7R_TARGETS) {
    const group = matches.filter((match) => match.indexCode === target.indexCode);

    if (group.length === 0) {
      continue;
    }

    matchedIndexCodes.add(target.indexCode);
    const valid = group.filter(
      (match) =>
        match.raw.monitorPrice != null &&
        (match.raw.quality ?? "ok") !== "no_data",
    );

    if (valid.length === 0) {
      positions.push({
        indexCode: target.indexCode,
        currency: group[0]?.raw.currency ?? "USD",
        avgBid: null,
        avgOffer: null,
        bidCount: sum(group.map((match) => match.raw.bidCount ?? 0)),
        offerCount: sum(group.map((match) => match.raw.offerCount ?? 0)),
        sampleCount: sum(group.map((match) => match.raw.sampleCount ?? 0)),
        monitorPrice: null,
        quality: "no_data",
      });
      continue;
    }

    const currencies = [...new Set(valid.map((match) => normalizeCurrency(match.raw.currency)))];

    if (currencies.length !== 1) {
      skipped += valid.length;
      continue;
    }

    positions.push({
      indexCode: target.indexCode,
      currency: valid[0]?.raw.currency ?? "USD",
      avgBid: averageNullable(valid.map((match) => match.raw.avgBid ?? null)),
      avgOffer: averageNullable(valid.map((match) => match.raw.avgOffer ?? null)),
      bidCount: sum(valid.map((match) => match.raw.bidCount ?? 0)),
      offerCount: sum(valid.map((match) => match.raw.offerCount ?? 0)),
      sampleCount: valid.length,
      monitorPrice: roundToTwoDecimals(
        valid.reduce((total, match) => total + (match.raw.monitorPrice ?? 0), 0) /
          valid.length,
      ),
      quality: valid.length > 1 ? "ok" : (valid[0]?.raw.quality ?? "ok"),
    });
  }

  const missingIndexCodes = SPIKE_MN7R_TARGETS.map((target) => target.indexCode).filter(
    (indexCode) => !matchedIndexCodes.has(indexCode),
  );

  return {
    diagnostics: diagnostics.map(stripInternalRawDiagnostic),
    missingIndexCodes,
    positions,
    rawCount: diagnostics.length,
    skipped,
  };
}

export function buildMn7rRawRecordDiagnostics(
  payload: Mn7rPayload,
): Mn7rRawRecordDiagnostic[] {
  return buildInternalRawRecordDiagnostics(payload).map(stripInternalRawDiagnostic);
}

function buildInternalRawRecordDiagnostics(payload: Mn7rPayload): InternalRawDiagnostic[] {
  const rawRecords = payload.records ?? payload.items ?? [];
  const window = buildDeliveryWindow(payload.asOfDate);

  return rawRecords.map((raw) => {
    const matchedIndexCode = matchRawRecordToIndexCode(raw);
    const deliveryOverlap = calculateDeliveryOverlap(raw, window);
    const passedDeliveryWindow = deliveryOverlap.overlapDays >= 10;
    const noData = (raw.quality ?? "ok") === "no_data";
    const missingPrice = raw.monitorPrice == null;
    const decision =
      matchedIndexCode && passedDeliveryWindow && !noData && !missingPrice
        ? "matched"
        : "skipped";
    const reason: Mn7rRawRecordDiagnostic["reason"] = !matchedIndexCode
      ? "no_index_match"
      : !passedDeliveryWindow
        ? "delivery_overlap_below_10_days"
        : noData
          ? "matched_but_no_data"
          : missingPrice
            ? "matched_but_price_missing"
            : "matched";

    return {
      basisText: buildBasisText(raw),
      currency: raw.currency ?? null,
      decision,
      deliveryEnd: deliveryOverlap.deliveryEnd,
      deliveryStart: deliveryOverlap.deliveryStart,
      deliveryWindowEnd: formatDateOnly(window.end),
      deliveryWindowStart: formatDateOnly(window.start),
      matchedIndexCode,
      monitorPrice: raw.monitorPrice,
      overlapDays: deliveryOverlap.overlapDays,
      passedDeliveryWindow,
      quality: raw.quality ?? null,
      raw,
      rawId: raw.id == null ? null : String(raw.id),
      rawText: buildCommodityText(raw),
      reason,
    };
  });
}

function buildPositionDiagnostics(payload: Mn7rPayload): Mn7rRawRecordDiagnostic[] {
  const window = buildDeliveryWindow(payload.asOfDate);

  return (payload.positions ?? []).map((position) => {
    const noData = position.quality === "no_data";
    const missingPrice = position.monitorPrice == null;
    const decision = noData || missingPrice ? "skipped" : "matched";
    const reason: Mn7rRawRecordDiagnostic["reason"] = noData
      ? "matched_but_no_data"
      : missingPrice
        ? "matched_but_price_missing"
        : "position_payload";

    return {
      basisText: position.indexCode,
      currency: position.currency,
      decision,
      deliveryEnd: null,
      deliveryStart: null,
      deliveryWindowEnd: formatDateOnly(window.end),
      deliveryWindowStart: formatDateOnly(window.start),
      matchedIndexCode: position.indexCode,
      monitorPrice: position.monitorPrice,
      overlapDays: 30,
      passedDeliveryWindow: true,
      quality: position.quality,
      rawId: null,
      rawText: position.indexCode,
      reason,
    };
  });
}

function stripInternalRawDiagnostic(
  diagnostic: InternalRawDiagnostic,
): Mn7rRawRecordDiagnostic {
  const { raw, ...publicDiagnostic } = diagnostic;
  void raw;
  return publicDiagnostic;
}

async function getFxRatesForPayload(
  positions: Mn7rPosition[],
  date: string,
  getFxRatesImpl: GetFxRatesLike = getFxRates,
) {
  const hasNonUsdPrice = positions.some((position) => {
    if (
      !resolveCommodityConfig(position.indexCode) ||
      position.monitorPrice == null ||
      position.quality === "no_data"
    ) {
      return false;
    }

    return normalizeCurrency(position.currency) !== "USD";
  });

  return hasNonUsdPrice ? getFxRatesImpl(date) : null;
}

function normalizeMonitorPriceToUsd(
  position: Mn7rPosition,
  fxRates: FxRates | null,
) {
  const originalCurrency = normalizeCurrency(position.currency);

  if (position.monitorPrice == null) {
    return null;
  }

  if (originalCurrency === "USD") {
    return {
      fxMeta: null,
      originalCurrency,
      priceUsd: position.monitorPrice,
    };
  }

  if (!fxRates) {
    return null;
  }

  if (originalCurrency === "UAH") {
    return {
      fxMeta: buildFxMeta(fxRates),
      originalCurrency,
      priceUsd: roundToTwoDecimals(position.monitorPrice / fxRates.usdUah),
    };
  }

  if (originalCurrency === "EUR") {
    return {
      fxMeta: buildFxMeta(fxRates),
      originalCurrency,
      priceUsd: roundToTwoDecimals((position.monitorPrice * fxRates.eurUah) / fxRates.usdUah),
    };
  }

  return null;
}

function matchRawRecordToIndexCode(raw: Mn7rRawRecord) {
  const directIndexCode = raw.indexCode?.trim();

  if (directIndexCode) {
    const commodity = resolveCommodityConfig(directIndexCode);

    if (commodity && !directIndexCode.toUpperCase().includes("CORN_FCA_CHOP")) {
      const directTarget = SPIKE_MN7R_TARGETS.find((target) => {
        if (target.indexCode === "CORN_FCA_CHOP") {
          return false;
        }

        const normalizedTarget = normalizeText(target.indexCode);
        const normalizedDirect = normalizeText(directIndexCode);
        return normalizedDirect.includes(normalizedTarget) || normalizedTarget.includes(normalizedDirect);
      });

      if (directTarget) {
        return directTarget.indexCode;
      }
    }

    if (normalizeText(directIndexCode).includes("corn fca chop")) {
      return "CORN_FCA_CHOP";
    }
  }

  const commodityText = normalizeText(
    [
      raw.commodity,
      raw.product,
      raw.itemName,
      raw.title,
      raw.indexCode,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const basisText = normalizeText(
    [
      raw.basis,
      raw.basisName,
      raw.deliveryBasis,
      raw.location,
      raw.title,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return SPIKE_MN7R_TARGETS.find((target) => {
    const commodityMatches = target.commodityKeywords.some((keyword) =>
      commodityText.includes(normalizeText(keyword)),
    );
    const basisMatches = target.basisKeywords.some((keyword) =>
      basisText.includes(normalizeText(keyword)),
    );
    const excluded = (target.excludeKeywords ?? []).some((keyword) =>
      `${commodityText} ${basisText}`.includes(normalizeText(keyword)),
    );

    return commodityMatches && basisMatches && !excluded;
  })?.indexCode ?? null;
}

function buildCommodityText(raw: Mn7rRawRecord) {
  return [
    raw.commodity,
    raw.product,
    raw.itemName,
    raw.title,
    raw.indexCode,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildBasisText(raw: Mn7rRawRecord) {
  return [
    raw.basis,
    raw.basisName,
    raw.deliveryBasis,
    raw.location,
    raw.title,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildDeliveryWindow(asOfDate: string) {
  const start = parseIsoDateOnly(asOfDate);
  const end = addDays(start, 30);

  return { end, start };
}

function calculateDeliveryOverlap(
  raw: Mn7rRawRecord,
  window: { start: Date; end: Date },
) {
  const deliveryStart =
    parseFlexibleDate(
      raw.deliveryStart ?? raw.periodStart ?? raw.startDate ?? null,
    ) ?? window.start;
  const deliveryEnd =
    parseFlexibleDate(raw.deliveryEnd ?? raw.periodEnd ?? raw.endDate ?? null) ??
    deliveryStart;
  const rangeStart =
    deliveryStart <= deliveryEnd ? deliveryStart : deliveryEnd;
  const rangeEnd = deliveryStart <= deliveryEnd ? deliveryEnd : deliveryStart;
  const overlapStart = new Date(
    Math.max(rangeStart.getTime(), window.start.getTime()),
  );
  const overlapEnd = new Date(Math.min(rangeEnd.getTime(), window.end.getTime()));
  const overlapDays = Math.floor(
    (overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000,
  );

  return {
    deliveryEnd: formatDateOnly(rangeEnd),
    deliveryStart: formatDateOnly(rangeStart),
    overlapDays: Math.max(0, overlapDays),
  };
}

function parseIsoDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseFlexibleDate(value: string | null) {
  if (!value) {
    return null;
  }

  const isoDateMatch = value.match(/\d{4}-\d{2}-\d{2}/);

  if (isoDateMatch) {
    return parseIsoDateOnly(isoDateMatch[0]);
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeCurrency(currency: string | null) {
  const normalized = (currency || "USD").trim().toUpperCase();

  if (normalized.includes("UAH") || normalized.includes("₴")) {
    return "UAH";
  }

  if (normalized.includes("EUR") || normalized.includes("€")) {
    return "EUR";
  }

  if (normalized.includes("USD") || normalized.includes("$")) {
    return "USD";
  }

  return normalized;
}

function buildFxMeta(fxRates: FxRates) {
  return {
    eurUah: fxRates.eurUah,
    rateDate: fxRates.rateDate,
    source: fxRates.source,
    usdUah: fxRates.usdUah,
  };
}

function averageNullable(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value != null);

  if (numbers.length === 0) {
    return null;
  }

  return roundToTwoDecimals(sum(numbers) / numbers.length);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function getMn7rImportTargetCodes() {
  return getActiveIndexConfig().id === "spike-ua"
    ? SPIKE_MN7R_TARGETS.map((target) => target.indexCode)
    : [];
}
