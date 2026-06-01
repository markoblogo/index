export type MarketPackTemplateCommodity = {
  code: string;
  dbCode: string;
  name: Record<"uk" | "en", string>;
  unit: "metric_ton";
  group: "export" | "processing";
  sortOrder: number;
};

export type MarketPackTemplateDeliveryBasis = {
  code: string;
  name: string;
  region: string;
  basketCode: string;
  basketName: string;
};

export type MarketPackTemplate = {
  tenantId: string;
  marketId: string;
  indexProductId: string;
  countryCode: string;
  brand: {
    name: string;
    publicSiteUrl: string;
    locales: readonly string[];
    themeToken: string;
  };
  methodology: {
    pdfPath: string;
    legalPageSlugs: readonly string[];
  };
  deployment: {
    requiredEnv: readonly string[];
    optionalEnv: readonly string[];
  };
  integrations: readonly string[];
  respondentCollectionMode: "self_service" | "manual_outreach" | "hybrid";
  commodities: readonly MarketPackTemplateCommodity[];
  deliveryBases: readonly MarketPackTemplateDeliveryBasis[];
  seedRespondents: readonly { id: string; legalName: string }[];
};

export const MARKET_PACK_TEMPLATE_REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "INDEX_TENANT",
  "NEXT_PUBLIC_INDEX_TENANT",
  "DEMO_AUTH_SECRET",
  "CRON_SECRET",
] as const;

export function createSyntheticFutureMarketPackTemplate(): MarketPackTemplate {
  return {
    tenantId: "future-xk",
    marketId: "future-xk",
    indexProductId: "future-xk",
    countryCode: "XK",
    brand: {
      name: "Future Spot Index",
      publicSiteUrl: "https://future.1d3x.com",
      locales: ["en"],
      themeToken: "future-xk",
    },
    methodology: {
      pdfPath: "/methodology/future-xk-methodology.pdf",
      legalPageSlugs: ["privacy", "terms", "risk-disclosure"],
    },
    deployment: {
      requiredEnv: MARKET_PACK_TEMPLATE_REQUIRED_ENV,
      optionalEnv: ["RESEND_API_KEY", "RESPONDENT_EMAIL_CRON_SECRET"],
    },
    integrations: ["nbu-fx"],
    respondentCollectionMode: "hybrid",
    deliveryBases: [
      {
        code: "CPT-FUTURE-PORT",
        name: "CPT Future Port",
        region: "Future Port",
        basketCode: "FUTURE-CPT-BASKET",
        basketName: "Future CPT basket",
      },
    ],
    commodities: [
      {
        code: "CORN",
        dbCode: "FUTURE_CORN",
        name: { uk: "Кукурудза", en: "Corn" },
        unit: "metric_ton",
        group: "export",
        sortOrder: 1,
      },
    ],
    seedRespondents: [
      {
        id: "future-respondent-1",
        legalName: "Future respondent 1",
      },
    ],
  };
}

export function validateMarketPackTemplate(template: MarketPackTemplate) {
  const errors: string[] = [];

  requireValue(errors, "tenantId", template.tenantId);
  requireValue(errors, "marketId", template.marketId);
  requireValue(errors, "indexProductId", template.indexProductId);
  requireValue(errors, "countryCode", template.countryCode);
  requireValue(errors, "brand.name", template.brand.name);
  requireValue(errors, "brand.publicSiteUrl", template.brand.publicSiteUrl);
  requireValue(errors, "brand.themeToken", template.brand.themeToken);
  requireCollection(errors, "brand.locales", template.brand.locales);
  requireValue(errors, "methodology.pdfPath", template.methodology.pdfPath);
  requireCollection(errors, "methodology.legalPageSlugs", template.methodology.legalPageSlugs);
  requireCollection(errors, "deployment.requiredEnv", template.deployment.requiredEnv);
  requireCollection(errors, "commodities", template.commodities);
  requireCollection(errors, "deliveryBases", template.deliveryBases);

  for (const key of MARKET_PACK_TEMPLATE_REQUIRED_ENV) {
    if (!template.deployment.requiredEnv.includes(key)) {
      errors.push(`deployment.requiredEnv missing ${key}`);
    }
  }

  const commodityCodes = new Set<string>();
  for (const commodity of template.commodities) {
    requireValue(errors, "commodity.code", commodity.code);
    requireValue(errors, "commodity.dbCode", commodity.dbCode);
    requireValue(errors, "commodity.name.en", commodity.name.en);
    if (commodityCodes.has(commodity.dbCode)) {
      errors.push(`duplicate commodity dbCode ${commodity.dbCode}`);
    }
    commodityCodes.add(commodity.dbCode);
  }

  const basisCodes = new Set<string>();
  for (const basis of template.deliveryBases) {
    requireValue(errors, "deliveryBasis.code", basis.code);
    requireValue(errors, "deliveryBasis.basketCode", basis.basketCode);
    if (basisCodes.has(basis.code)) {
      errors.push(`duplicate delivery basis code ${basis.code}`);
    }
    basisCodes.add(basis.code);
  }

  return errors;
}

function requireValue(errors: string[], field: string, value: string) {
  if (!value.trim()) {
    errors.push(`${field} is required`);
  }
}

function requireCollection(
  errors: string[],
  field: string,
  value: readonly unknown[],
) {
  if (value.length === 0) {
    errors.push(`${field} is required`);
  }
}
