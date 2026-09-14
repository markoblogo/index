import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getActiveIndexConfig } from "@/lib/index-platform";

export type SpikeReadthroughItem = {
  commodityId: string;
  commodityCode: string;
  commodityNameUk: string;
  commodityNameEn: string;
  date: string;
  basis: string;
  valueUsdPerMt: number | null;
  changeAbs?: number | null;
  changePct?: number | null;
  respondents?: number | null;
  status?: string;
};

export type SpikeReadthroughPayload = {
  data: SpikeReadthroughItem[];
  generatedAt?: string;
};

const UGA_COMPATIBLE_SPIKE_CODES = new Set([
  "CORN",
  "WHT_115",
  "FEED_WHT",
  "GMO_SOY",
]);
const SPIKE_PUBLIC_API_TIMEOUT_MS = 15_000;

export function isUgaSpikeReadthroughEnabled(requestHost?: string) {
  return (
    getActiveIndexConfig(requestHost).id === "uga-ua" &&
    process.env.UGA_SPIKE_READTHROUGH_ENABLED === "enabled"
  );
}

export function getUgaSpikeReadthroughSource() {
  const source = new URL(
    process.env.UGA_SPIKE_PUBLIC_API_BASE ?? "https://spike.1d3x.com",
  );
  if (source.protocol !== "https:" || source.hostname !== "spike.1d3x.com") {
    throw new Error("UGA SPIKE read-through source must be https://spike.1d3x.com.");
  }
  return source.toString();
}

export function selectUgaCompatibleSpikeItems(items: SpikeReadthroughItem[]) {
  return items.filter(
    (item) =>
      UGA_COMPATIBLE_SPIKE_CODES.has(item.commodityCode) &&
      item.status !== "draft" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
      item.basis.trim().length > 0 &&
      item.valueUsdPerMt !== null &&
      Number.isFinite(item.valueUsdPerMt) &&
      item.valueUsdPerMt > 0 &&
      (item.changeAbs == null || Number.isFinite(item.changeAbs)) &&
      (item.changePct == null || Number.isFinite(item.changePct)) &&
      (item.respondents == null ||
        (Number.isInteger(item.respondents) && item.respondents >= 0)),
  );
}

export async function fetchUgaSpikeReadthrough(
  mode: "latest" | "history",
  sourceBaseUrl = getUgaSpikeReadthroughSource(),
): Promise<SpikeReadthroughPayload> {
  const endpoint = new URL(`/api/public/${mode}`, normalizeBaseUrl(sourceBaseUrl));
  const response = await fetchWithTimeout(
    endpoint,
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "UGA-Index-SPIKE-readthrough/1.0",
      },
    },
    SPIKE_PUBLIC_API_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`SPIKE public API returned ${response.status} for ${endpoint.toString()}.`);
  }

  const payload = (await response.json()) as SpikeReadthroughPayload;
  if (!Array.isArray(payload.data)) {
    throw new Error("SPIKE public API response does not contain a data array.");
  }

  return {
    data: selectUgaCompatibleSpikeItems(payload.data),
    generatedAt: payload.generatedAt,
  };
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
