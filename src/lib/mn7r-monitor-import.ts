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

export type Mn7rPayload = {
  source: "MN7R_MONITOR";
  respondentCode: "MN7R_MONITOR";
  asOfDate: string;
  generatedAt: string;
  timezone: string;
  methodologyVersion: string;
  positions: Mn7rPosition[];
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

export function formatDateKyiv(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
  const fxRates = await getFxRatesForPayload(payload, options.getFxRatesImpl);
  const upsert = options.upsertRespondentPriceImpl ?? upsertRespondentPrice;
  const clear = options.clearRespondentPriceImpl ?? clearRespondentPrice;
  const respondentCode =
    process.env.MN7R_INDEX_RESPONDENT_CODE ?? payload.respondentCode;
  let imported = 0;
  let skipped = 0;

  for (const position of payload.positions) {
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

  return { date: payload.asOfDate, imported, skipped };
}

async function getFxRatesForPayload(
  payload: Mn7rPayload,
  getFxRatesImpl: GetFxRatesLike = getFxRates,
) {
  const hasNonUsdPrice = payload.positions.some((position) => {
    if (
      !resolveCommodityConfig(position.indexCode) ||
      position.monitorPrice == null ||
      position.quality === "no_data"
    ) {
      return false;
    }

    return normalizeCurrency(position.currency) !== "USD";
  });

  return hasNonUsdPrice ? getFxRatesImpl(payload.asOfDate) : null;
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

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
