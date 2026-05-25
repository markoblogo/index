import type { RespondentPriceInput } from "@/lib/respondent-prices";
import { upsertRespondentPrice } from "@/lib/respondent-prices";

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
    fetchImpl?: FetchLike;
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
  const respondentCode =
    process.env.MN7R_INDEX_RESPONDENT_CODE ?? payload.respondentCode;
  let imported = 0;
  let skipped = 0;

  for (const position of payload.positions) {
    if (position.monitorPrice == null || position.quality === "no_data") {
      skipped += 1;
      continue;
    }

    await upsert({
      date: payload.asOfDate,
      respondentCode,
      indexCode: position.indexCode,
      price: position.monitorPrice,
      currency: position.currency || "USD",
      meta: {
        source: payload.source,
        generatedAt: payload.generatedAt,
        methodologyVersion: payload.methodologyVersion,
        avgBid: position.avgBid,
        avgOffer: position.avgOffer,
        bidCount: position.bidCount,
        offerCount: position.offerCount,
        sampleCount: position.sampleCount,
        quality: position.quality,
      },
    });
    imported += 1;
  }

  return { date: payload.asOfDate, imported, skipped };
}
