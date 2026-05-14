import { getActiveIndexConfig } from "@/lib/index-platform";

const activeIndex = getActiveIndexConfig();

export const SITE_CONFIG = {
  name: activeIndex.name,
  publicSiteUrl: activeIndex.publicSiteUrl,
  defaultDeliveryBasis: activeIndex.defaultDeliveryBasis,
  defaultDeliveryPeriod: activeIndex.defaultDeliveryPeriod,
  currency: activeIndex.currency,
  unit: activeIndex.unit,
  logoPath: activeIndex.logoPath,
  logoHeaderPath: activeIndex.logoHeaderPath,
  methodologyPdfPath: activeIndex.methodologyPdfPath,
  tenantId: activeIndex.id,
  features: activeIndex.features,
} as const;
