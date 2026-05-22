import {
  getActiveIndexConfig,
  type IndexConfig,
  type IndexCommodityConfig,
} from "@/lib/index-platform";

export function getActiveIndexTenant() {
  return getActiveIndexConfig();
}

export function getConfiguredDeliveryBasisCodes(
  activeIndex: IndexConfig = getActiveIndexConfig(),
) {
  return activeIndex.deliveryBases.map((basis) => basis.code);
}

export function getDeliveryBasisConfigForCommodityCode(
  code: string,
  activeIndex: IndexConfig = getActiveIndexConfig(),
) {
  const commodity = activeIndex.commodities.find(
    (item) => item.dbCode === code || item.code === code || item.id === code,
  );

  return getDeliveryBasisConfigForCommodity(commodity, activeIndex);
}

export function getDeliveryBasisConfigForCommodityId(
  id: string,
  activeIndex: IndexConfig = getActiveIndexConfig(),
) {
  const commodity = activeIndex.commodities.find(
    (item) => item.id === id || item.dbCode === id || item.code === id,
  );

  return getDeliveryBasisConfigForCommodity(commodity, activeIndex);
}

export function getDeliveryBasketCodeForCommodityCode(
  code: string,
  activeIndex: IndexConfig = getActiveIndexConfig(),
) {
  return getDeliveryBasisConfigForCommodityCode(code, activeIndex).basketCode;
}

function getDeliveryBasisConfigForCommodity(
  commodity: IndexCommodityConfig | undefined,
  activeIndex: IndexConfig,
) {
  if (
    activeIndex.id === "spike-ua" &&
    commodity?.group === "processing" &&
    activeIndex.deliveryBases[1]
  ) {
    return activeIndex.deliveryBases[1];
  }

  return activeIndex.deliveryBases[0];
}
