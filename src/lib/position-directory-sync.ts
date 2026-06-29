import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getActiveIndexConfig, type IndexConfig } from "@/lib/index-platform";

type SyncOptions = {
  force?: boolean;
};

export async function syncIndexPositionDirectory(
  activeIndex: IndexConfig = getActiveIndexConfig(),
  options: SyncOptions = {},
) {
  if (activeIndex.id !== "spike-ua") {
    return { skippedReason: "non_spike_tenant" };
  }

  if (!options.force) {
    const [existingCommodities, existingDeliveryBases, existingBaskets, existingRespondents] =
      await Promise.all([
        db.commodity.findMany({
          select: { code: true, nameEn: true, nameUk: true, sortOrder: true, status: true },
          where: {
            code: { in: activeIndex.commodities.map((commodity) => commodity.dbCode) },
            status: "published",
          },
        }),
        db.deliveryBasis.findMany({
          select: { code: true, name: true, region: true, status: true },
          where: {
            code: { in: activeIndex.deliveryBases.map((basis) => basis.code) },
            status: "published",
          },
        }),
        db.basket.findMany({
          select: { active: true, code: true, name: true },
          where: {
            active: true,
            code: { in: activeIndex.deliveryBases.map((basis) => basis.basketCode) },
          },
        }),
        db.respondent.findMany({
          select: {
            active: true,
            collectionMode: true,
            id: true,
            legalName: true,
            status: true,
          },
          where: {
            id: { in: activeIndex.respondents.map((respondent) => respondent.id) },
            status: "active",
          },
        }),
      ]);
    const commodityByCode = new Map(
      existingCommodities.map((commodity) => [commodity.code, commodity]),
    );
    const basisByCode = new Map(existingDeliveryBases.map((basis) => [basis.code, basis]));
    const basketByCode = new Map(existingBaskets.map((basket) => [basket.code, basket]));
    const respondentById = new Map(
      existingRespondents.map((respondent) => [respondent.id, respondent]),
    );
    const commoditiesSynced = activeIndex.commodities.every((commodity) => {
      const existing = commodityByCode.get(commodity.dbCode);
      return (
        existing?.nameEn === commodity.name.en &&
        existing.nameUk === commodity.name.uk &&
        existing.sortOrder === commodity.sortOrder
      );
    });
    const deliveryBasesSynced = activeIndex.deliveryBases.every((basis) => {
      const existing = basisByCode.get(basis.code);
      return existing?.name === basis.name && existing.region === basis.region;
    });
    const basketsSynced = activeIndex.deliveryBases.every((basis) => {
      const existing = basketByCode.get(basis.basketCode);
      return existing?.name === basis.basketName && existing.active === true;
    });
    const respondentsSynced = activeIndex.respondents.every((respondent) => {
      const existing = respondentById.get(respondent.id);
      return (
        existing?.legalName === respondent.legalName &&
        existing.active === true &&
        existing.status === "active" &&
        existing.collectionMode === (respondent.collectionMode ?? "self_service")
      );
    });

    if (
      existingCommodities.length === activeIndex.commodities.length &&
      existingDeliveryBases.length === activeIndex.deliveryBases.length &&
      existingBaskets.length === activeIndex.deliveryBases.length &&
      existingRespondents.length === activeIndex.respondents.length &&
      commoditiesSynced &&
      deliveryBasesSynced &&
      basketsSynced &&
      respondentsSynced
    ) {
      return {
        baskets: existingBaskets.length,
        commodities: existingCommodities.length,
        deliveryBases: existingDeliveryBases.length,
        respondents: existingRespondents.length,
        skippedReason: "already_synced",
      };
    }
  }

  return db.$transaction((tx) => syncIndexPositionDirectoryTx(tx, activeIndex));
}

export async function syncIndexPositionDirectoryTx(
  tx: Prisma.TransactionClient,
  activeIndex: IndexConfig = getActiveIndexConfig(),
) {
  if (activeIndex.id !== "spike-ua") {
    return { skippedReason: "non_spike_tenant" };
  }

  const deliveryBases = await Promise.all(
    activeIndex.deliveryBases.map((basis) =>
      tx.deliveryBasis.upsert({
        create: {
          code: basis.code,
          name: basis.name,
          region: basis.region,
          status: "published",
        },
        update: {
          name: basis.name,
          region: basis.region,
          status: "published",
        },
        where: { code: basis.code },
      }),
    ),
  );
  const deliveryBasisByCode = new Map(
    deliveryBases.map((basis) => [basis.code, basis]),
  );

  const commodities = await Promise.all(
    activeIndex.commodities.map((commodity) =>
      tx.commodity.upsert({
        create: {
          code: commodity.dbCode,
          nameEn: commodity.name.en,
          nameUk: commodity.name.uk,
          sortOrder: commodity.sortOrder,
          status: "published",
        },
        update: {
          nameEn: commodity.name.en,
          nameUk: commodity.name.uk,
          sortOrder: commodity.sortOrder,
          status: "published",
        },
        where: { code: commodity.dbCode },
      }),
    ),
  );

  const baskets = await Promise.all(
    activeIndex.deliveryBases.map((basis) => {
      const deliveryBasis = deliveryBasisByCode.get(basis.code);

      if (!deliveryBasis) {
        throw new Error(`Missing delivery basis ${basis.code}`);
      }

      return tx.basket.upsert({
        create: {
          active: true,
          code: basis.basketCode,
          deliveryBasisId: deliveryBasis.id,
          name: basis.basketName,
          weight: new Prisma.Decimal(1),
        },
        update: {
          active: true,
          deliveryBasisId: deliveryBasis.id,
          name: basis.basketName,
          weight: new Prisma.Decimal(1),
        },
        where: { code: basis.basketCode },
      });
    }),
  );
  const respondents = await Promise.all(
    activeIndex.respondents.map((respondent) =>
      tx.respondent.upsert({
        create: {
          active: true,
          collectionMode: respondent.collectionMode ?? "self_service",
          displayName: respondent.legalName,
          id: respondent.id,
          legalName: respondent.legalName,
          status: "active",
        },
        update: {
          active: true,
          collectionMode: respondent.collectionMode ?? "self_service",
          displayName: respondent.legalName,
          legalName: respondent.legalName,
          status: "active",
        },
        where: { id: respondent.id },
      }),
    ),
  );

  await Promise.all(
    baskets.flatMap((basket) =>
      respondents.map((respondent) =>
        tx.basketRespondent.upsert({
          create: {
            active: true,
            basketId: basket.id,
            respondentId: respondent.id,
            weight: new Prisma.Decimal(1),
          },
          update: {
            active: true,
            weight: new Prisma.Decimal(1),
          },
          where: {
            basketId_respondentId: {
              basketId: basket.id,
              respondentId: respondent.id,
            },
          },
        }),
      ),
    ),
  );

  return {
    baskets: baskets.length,
    commodities: commodities.length,
    deliveryBases: deliveryBases.length,
    respondents: respondents.length,
    skippedReason: null,
  };
}
