import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getActiveIndexConfig,
  type IndexCommodityConfig,
} from "@/lib/index-platform";
import {
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

export type RespondentPriceInput = {
  date: string;
  respondentCode: string;
  indexCode: string;
  price: number;
  currency: string;
  meta?: Prisma.InputJsonValue;
};

export type ClearRespondentPriceInput = {
  date: string;
  respondentCode: string;
  indexCode: string;
  reason: string;
};

export async function upsertRespondentPrice(input: RespondentPriceInput) {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Respondent price must be a positive number.");
  }

  const activeIndex = getActiveIndexConfig();
  const commodityConfig = resolveCommodityConfig(input.indexCode, activeIndex.commodities);

  if (!commodityConfig) {
    throw new Error(`Unknown index code: ${input.indexCode}`);
  }

  const [commodity, basis, respondent] = await Promise.all([
    db.commodity.findUnique({ where: { code: commodityConfig.dbCode } }),
    db.deliveryBasis.findUnique({
      where: {
        code: getDeliveryBasisConfigForCommodityCode(commodityConfig.dbCode, activeIndex).code,
      },
    }),
    db.respondent.upsert({
      where: { id: input.respondentCode },
      update: {
        active: true,
        collectionMode: "manual_outreach",
        displayName: getRespondentDisplayName(input.respondentCode),
        legalName: getRespondentDisplayName(input.respondentCode),
        status: "active",
      },
      create: {
        id: input.respondentCode,
        active: true,
        collectionMode: "manual_outreach",
        displayName: getRespondentDisplayName(input.respondentCode),
        legalName: getRespondentDisplayName(input.respondentCode),
        status: "active",
      },
    }),
  ]);

  if (!commodity) {
    throw new Error(`Commodity is not seeded: ${commodityConfig.dbCode}`);
  }

  if (!basis) {
    throw new Error(`Delivery basis is not seeded for ${commodityConfig.dbCode}.`);
  }

  const tradeDate = dateToUtcDate(input.date);
  const existing = await db.priceSubmission.findUnique({
    where: {
      tradeDate_commodityId_deliveryBasisId_respondentId_source: {
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        respondentId: respondent.id,
        source: "respondent",
      },
    },
  });
  const metadata = {
    ...(isJsonObject(input.meta) ? input.meta : {}),
    currency: input.currency || "USD",
    indexCode: input.indexCode,
    respondentCode: input.respondentCode,
  } satisfies Prisma.InputJsonObject;
  const saved = await db.priceSubmission.upsert({
    where: {
      tradeDate_commodityId_deliveryBasisId_respondentId_source: {
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        respondentId: respondent.id,
        source: "respondent",
      },
    },
    update: {
      metadata,
      priceUsdPerMt: new Prisma.Decimal(input.price),
      status: "submitted",
      submittedAt: new Date(),
    },
    create: {
      tradeDate,
      commodityId: commodity.id,
      deliveryBasisId: basis.id,
      respondentId: respondent.id,
      source: "respondent",
      status: "submitted",
      priceUsdPerMt: new Prisma.Decimal(input.price),
      metadata,
      submittedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      actorRole: "respondent",
      action: existing
        ? "mn7r_monitor.price_submission.updated"
        : "mn7r_monitor.price_submission.created",
      entityType: "PriceSubmission",
      entityId: saved.id,
      summary: `MN7R Monitor saved ${input.price} ${input.currency || "USD"}/t for ${input.indexCode} on ${input.date}.`,
      beforeJson: existing
        ? {
            priceUsdPerMt: existing.priceUsdPerMt.toNumber(),
            status: existing.status,
          }
        : Prisma.JsonNull,
      afterJson: {
        metadata,
        priceUsdPerMt: saved.priceUsdPerMt.toNumber(),
        status: saved.status,
      },
    },
  });

  return saved;
}

export async function clearRespondentPrice(input: ClearRespondentPriceInput) {
  const activeIndex = getActiveIndexConfig();
  const commodityConfig = resolveCommodityConfig(input.indexCode, activeIndex.commodities);

  if (!commodityConfig) {
    throw new Error(`Unknown index code: ${input.indexCode}`);
  }

  const [commodity, basis] = await Promise.all([
    db.commodity.findUnique({ where: { code: commodityConfig.dbCode } }),
    db.deliveryBasis.findUnique({
      where: {
        code: getDeliveryBasisConfigForCommodityCode(commodityConfig.dbCode, activeIndex).code,
      },
    }),
  ]);

  if (!commodity || !basis) {
    return null;
  }

  const tradeDate = dateToUtcDate(input.date);
  const existing = await db.priceSubmission.findUnique({
    where: {
      tradeDate_commodityId_deliveryBasisId_respondentId_source: {
        tradeDate,
        commodityId: commodity.id,
        deliveryBasisId: basis.id,
        respondentId: input.respondentCode,
        source: "respondent",
      },
    },
  });

  if (!existing || existing.status === "draft") {
    return existing;
  }

  const updated = await db.priceSubmission.update({
    data: {
      metadata: {
        ...(isJsonObject(existing.metadata) ? existing.metadata : {}),
        clearedAt: new Date().toISOString(),
        clearReason: input.reason,
        indexCode: input.indexCode,
        respondentCode: input.respondentCode,
      },
      status: "draft",
    },
    where: { id: existing.id },
  });

  await db.auditLog.create({
    data: {
      actorRole: "respondent",
      action: "mn7r_monitor.price_submission.cleared",
      afterJson: {
        status: updated.status,
      },
      beforeJson: {
        priceUsdPerMt: existing.priceUsdPerMt.toNumber(),
        status: existing.status,
      },
      entityId: existing.id,
      entityType: "PriceSubmission",
      summary: `MN7R Monitor cleared ${input.indexCode} for ${input.date}: ${input.reason}.`,
    },
  });

  return updated;
}

export function resolveCommodityConfig(
  indexCode: string,
  commodities = getActiveIndexConfig().commodities,
) {
  const normalized = normalizeCode(indexCode);

  return [...commodities]
    .sort((first, second) => second.dbCode.length - first.dbCode.length)
    .find((commodity) => {
      const aliases = [
        commodity.dbCode,
        commodity.code,
        commodity.id,
        ...getAdditionalAliases(commodity),
      ].map(normalizeCode);

      return aliases.some(
        (alias) => normalized === alias || normalized.startsWith(`${alias}_`),
      );
    });
}

function getAdditionalAliases(commodity: IndexCommodityConfig) {
  if (commodity.dbCode === "WHT_115") {
    return ["WHEAT_115", "WHEAT_11_5", "WHT_11_5", "WHTEX"];
  }

  if (commodity.dbCode === "FEED_WHT") {
    return ["FEED_WHEAT", "FWTEX"];
  }

  if (commodity.dbCode === "GMO_SOY") {
    return ["GMO_SOYBEAN", "SOY_GMO", "SOYEX", "SOYPR"];
  }

  if (commodity.dbCode === "SUNFLOWER") {
    return ["SUN", "SUNFLOWER_SEED", "SUNPR"];
  }

  if (commodity.dbCode === "CORN") {
    return ["CRNEX"];
  }

  return [];
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isJsonObject(value: unknown): value is Prisma.InputJsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRespondentDisplayName(respondentCode: string) {
  return respondentCode === "MN7R_MONITOR" ? "MN7R Monitor" : respondentCode;
}
