import { getActiveIndexConfig } from "@/lib/index-platform";
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
    excludeKeywords: ["feed", "fodder", "фураж", "parity", "паритет"],
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
    indexCode: "SUNFLOWER",
    commodityKeywords: ["sunflower", "соняш"],
    basisKeywords: ["parity", "паритет", "odesa", "одеса"],
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

  return { date: payload.asOfDate, imported, skipped };
}

function normalizePayload(payload: Mn7rPayload) {
  if (payload.positions?.length) {
    return {
      missingIndexCodes: [] as string[],
      positions: payload.positions,
      skipped: 0,
    };
  }

  return aggregateRawRecords(payload);
}

function aggregateRawRecords(payload: Mn7rPayload) {
  const rawRecords = payload.records ?? payload.items ?? [];
  const window = buildDeliveryWindow(payload.asOfDate);
  const matches: NormalizedRawMatch[] = [];
  let skipped = 0;

  for (const raw of rawRecords) {
    const indexCode = matchRawRecordToIndexCode(raw);

    if (!indexCode) {
      skipped += 1;
      continue;
    }

    if (!hasRequiredDeliveryOverlap(raw, window)) {
      skipped += 1;
      continue;
    }

    matches.push({ indexCode, raw });
  }

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

  return { missingIndexCodes, positions, skipped };
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

function buildDeliveryWindow(asOfDate: string) {
  const start = parseIsoDateOnly(asOfDate);
  const end = addDays(start, 30);

  return { end, start };
}

function hasRequiredDeliveryOverlap(
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

  return overlapDays >= 10;
}

function parseIsoDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
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

export function getMn7rImportTargetCodes() {
  return getActiveIndexConfig().id === "spike-ua"
    ? SPIKE_MN7R_TARGETS.map((target) => target.indexCode)
    : [];
}
