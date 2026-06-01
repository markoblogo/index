import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { tenantScopedWhere } from "@/lib/tenant-data-scope";
import {
  getDeliveryBasketCodeForCommodityCode,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

type SpikePublicIndexItem = {
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

type SpikePublicIndexResponse = {
  data: SpikePublicIndexItem[];
  generatedAt?: string;
};

export type UgaSpikeDemoSyncResult = {
  source: string;
  requestedMode: "latest" | "history";
  copied: number;
  skipped: number;
  dates: string[];
  commodities: string[];
};

const allowedCommodityCodes = new Set([
  "CORN",
  "WHT_115",
  "FEED_WHT",
  "GMO_SOY",
]);

const excludedCommodityIds = new Set(["sunflower"]);

export async function syncUgaDemoIndicesFromSpike({
  mode = "history",
  sourceBaseUrl = process.env.UGA_SPIKE_PUBLIC_API_BASE ??
    "https://spike.1d3x.com",
}: {
  mode?: "latest" | "history";
  sourceBaseUrl?: string;
} = {}): Promise<UgaSpikeDemoSyncResult> {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "uga-ua") {
    return {
      source: sourceBaseUrl,
      requestedMode: mode,
      copied: 0,
      skipped: 0,
      dates: [],
      commodities: [],
    };
  }

  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required to sync UGA demo indices from Spike.");
  }

  const sourceItems = await fetchSpikePublicIndexData(sourceBaseUrl, mode);
  const items = sourceItems.filter(isUgaSupportedSpikeItem);
  const copiedCommodities = new Set<string>();
  const copiedDates = new Set<string>();
  let copied = 0;

  for (const item of items) {
    const copiedItem = await copySpikeItemToUga(item);

    if (copiedItem) {
      copied += 1;
      copiedCommodities.add(item.commodityCode);
      copiedDates.add(item.date);
    }
  }

  const skipped = sourceItems.length - copied;

  if (copied > 0) {
    const tenantScope = tenantScopedWhere();
    await db.auditLog.create({
      data: {
        ...tenantScope,
        actorRole: "admin",
        action: "uga.demo_spike_sync",
        entityType: "PublishedIndex",
        summary: `Copied ${copied} Spike public index values into UGA demo indices.`,
        afterJson: {
          copied,
          source: sourceBaseUrl,
          mode,
          excluded: ["sunflower"],
          dates: Array.from(copiedDates).sort(),
          commodities: Array.from(copiedCommodities).sort(),
        },
      },
    });
  }

  return {
    source: sourceBaseUrl,
    requestedMode: mode,
    copied,
    skipped,
    dates: Array.from(copiedDates).sort(),
    commodities: Array.from(copiedCommodities).sort(),
  };
}

async function fetchSpikePublicIndexData(
  sourceBaseUrl: string,
  mode: "latest" | "history",
) {
  const endpoint = new URL(
    `/api/public/${mode === "latest" ? "latest" : "history"}`,
    normalizeBaseUrl(sourceBaseUrl),
  );
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "UGA-Index-demo-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Spike public API returned ${response.status} for ${endpoint.toString()}.`,
    );
  }

  const payload = (await response.json()) as SpikePublicIndexResponse;

  if (!Array.isArray(payload.data)) {
    throw new Error("Spike public API response does not contain a data array.");
  }

  return payload.data;
}

function isUgaSupportedSpikeItem(item: SpikePublicIndexItem) {
  return (
    item.valueUsdPerMt !== null &&
    Number.isFinite(item.valueUsdPerMt) &&
    item.valueUsdPerMt > 0 &&
    item.status !== "draft" &&
    allowedCommodityCodes.has(item.commodityCode) &&
    !excludedCommodityIds.has(item.commodityId)
  );
}

async function copySpikeItemToUga(item: SpikePublicIndexItem) {
  const activeIndex = getActiveIndexConfig();
  const tenantScope = tenantScopedWhere();
  const commodity = await db.commodity.findFirst({
    where: { ...tenantScope, code: item.commodityCode },
  });

  if (!commodity) {
    return false;
  }

  const basisConfig = getDeliveryBasisConfigForCommodityCode(
    item.commodityCode,
    activeIndex,
  );
  const basketCode = getDeliveryBasketCodeForCommodityCode(
    item.commodityCode,
    activeIndex,
  );
  const [deliveryBasis, basket] = await Promise.all([
    db.deliveryBasis.findFirst({ where: { ...tenantScope, code: basisConfig.code } }),
    db.basket.findFirst({ where: { ...tenantScope, code: basketCode } }),
  ]);

  if (!deliveryBasis || !basket) {
    return false;
  }

  const tradeDate = toDatabaseDate(item.date);
  const value = roundOne(item.valueUsdPerMt ?? 0);
  const calculation = await db.indexCalculation.upsert({
    where: {
      tenantId_tradeDate_commodityId_deliveryBasisId_basketId: {
        tenantId: tenantScope.tenantId,
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: deliveryBasis.id,
        basketId: basket.id,
      },
    },
    create: {
      ...tenantScope,
      tradeDate,
      commodityId: commodity.id,
      deliveryBasisId: deliveryBasis.id,
      basketId: basket.id,
      status: "published",
      medianUsdPerMt: value,
      valueUsdPerMt: value,
      publicValueUsdPerMt: value,
      rawCount: item.respondents ?? 0,
      usedCount: item.respondents ?? 0,
      version: 1,
    },
    update: {
      ...tenantScope,
      status: "published",
      medianUsdPerMt: value,
      valueUsdPerMt: value,
      publicValueUsdPerMt: value,
      rawCount: item.respondents ?? 0,
      usedCount: item.respondents ?? 0,
      calculatedAt: new Date(),
    },
  });

  await db.publishedIndex.upsert({
    where: {
      tenantId_tradeDate_commodityId_deliveryBasisId_basketId: {
        tenantId: tenantScope.tenantId,
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: deliveryBasis.id,
        basketId: basket.id,
      },
    },
    create: {
      ...tenantScope,
      tradeDate,
      commodityId: commodity.id,
      deliveryBasisId: deliveryBasis.id,
      basketId: basket.id,
      calculationId: calculation.id,
      status: "published",
      calculatedValueUsdPerMt: value,
      benchmarkBlendEnabled: false,
      benchmarkValueUsdPerMt: value,
      adjustmentMethod: "temporary_spike_demo_copy",
      adjustmentReason:
        "Temporary demo-mode sync from Spike Spot Index until respondent-based UGA publication is enabled.",
      valueUsdPerMt: value,
      changeAbsUsdPerMt: roundOne(item.changeAbs ?? 0),
      changePct: roundTwo(item.changePct ?? 0),
      locked: true,
      publishedAt: new Date(),
    },
    update: {
      ...tenantScope,
      calculationId: calculation.id,
      status: "published",
      calculatedValueUsdPerMt: value,
      benchmarkBlendEnabled: false,
      benchmarkValueUsdPerMt: value,
      adjustmentMethod: "temporary_spike_demo_copy",
      adjustmentReason:
        "Temporary demo-mode sync from Spike Spot Index until respondent-based UGA publication is enabled.",
      valueUsdPerMt: value,
      changeAbsUsdPerMt: roundOne(item.changeAbs ?? 0),
      changePct: roundTwo(item.changePct ?? 0),
      locked: true,
      publishedAt: new Date(),
    },
  });

  return true;
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function toDatabaseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}
