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
    const [commodityCount, deliveryBasisCount, basketCount] = await Promise.all([
      db.commodity.count({
        where: {
          code: { in: activeIndex.commodities.map((commodity) => commodity.dbCode) },
          status: "published",
        },
      }),
      db.deliveryBasis.count({
        where: {
          code: { in: activeIndex.deliveryBases.map((basis) => basis.code) },
          status: "published",
        },
      }),
      db.basket.count({
        where: {
          active: true,
          code: { in: activeIndex.deliveryBases.map((basis) => basis.basketCode) },
        },
      }),
    ]);

    if (
      commodityCount === activeIndex.commodities.length &&
      deliveryBasisCount === activeIndex.deliveryBases.length &&
      basketCount === activeIndex.deliveryBases.length
    ) {
      return {
        baskets: basketCount,
        commodities: commodityCount,
        deliveryBases: deliveryBasisCount,
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

  return {
    baskets: baskets.length,
    commodities: commodities.length,
    deliveryBases: deliveryBases.length,
    skippedReason: null,
  };
}
