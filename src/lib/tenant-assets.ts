type TenantAssetKey =
  | "1d3x.partnerDeck.pdf"
  | "spike.handbook.cover.en"
  | "spike.handbook.cover.ua"
  | "spike.handbook.en.epub"
  | "spike.handbook.en.pdf"
  | "spike.handbook.ua.epub"
  | "spike.handbook.ua.pdf"
  | "spike.methodology.en.pdf"
  | "spike.methodology.pdf"
  | "spike.methodology.uk.pdf"
  | "spike.onboarding.uk.png"
  | "spike.partnerDeck.en.pdf"
  | "spike.respondentsDeck.uk.pdf"
  | "uga.marketIntelligence.pdf"
  | "uga.methodology.pdf";

type TenantAssetEntry = {
  fallbackPath: string;
  envVar: string;
};

const TENANT_ASSET_MANIFEST: Record<TenantAssetKey, TenantAssetEntry> = {
  "1d3x.partnerDeck.pdf": {
    envVar: "ASSET_1D3X_PARTNER_DECK_PDF_URL",
    fallbackPath: "/files/1D3X_Local_Commodity_Index_Partner_Program.pdf",
  },
  "spike.handbook.cover.en": {
    envVar: "ASSET_SPIKE_HANDBOOK_COVER_EN_URL",
    fallbackPath: "/files/spot-market-handbook-cover-en.jpg",
  },
  "spike.handbook.cover.ua": {
    envVar: "ASSET_SPIKE_HANDBOOK_COVER_UA_URL",
    fallbackPath: "/files/spot-market-handbook-cover-ua.png",
  },
  "spike.handbook.en.epub": {
    envVar: "ASSET_SPIKE_HANDBOOK_EN_EPUB_URL",
    fallbackPath: "/files/spot-market-handbook-en.epub",
  },
  "spike.handbook.en.pdf": {
    envVar: "ASSET_SPIKE_HANDBOOK_EN_PDF_URL",
    fallbackPath: "/files/spot-market-handbook-en.pdf",
  },
  "spike.handbook.ua.epub": {
    envVar: "ASSET_SPIKE_HANDBOOK_UA_EPUB_URL",
    fallbackPath: "/files/spot-market-handbook-ua.epub",
  },
  "spike.handbook.ua.pdf": {
    envVar: "ASSET_SPIKE_HANDBOOK_UA_PDF_URL",
    fallbackPath: "/files/spot-market-handbook-ua.pdf",
  },
  "spike.methodology.en.pdf": {
    envVar: "ASSET_SPIKE_METHODOLOGY_EN_PDF_URL",
    fallbackPath: "/files/spike-index-methodology-en.pdf",
  },
  "spike.methodology.pdf": {
    envVar: "ASSET_SPIKE_METHODOLOGY_PDF_URL",
    fallbackPath: "/files/spike-index-methodology.pdf",
  },
  "spike.methodology.uk.pdf": {
    envVar: "ASSET_SPIKE_METHODOLOGY_UK_PDF_URL",
    fallbackPath: "/files/spike-index-methodology-uk.pdf",
  },
  "spike.onboarding.uk.png": {
    envVar: "ASSET_SPIKE_ONBOARDING_UK_PNG_URL",
    fallbackPath: "/files/spike-respondent-onboarding-uk.png",
  },
  "spike.partnerDeck.en.pdf": {
    envVar: "ASSET_SPIKE_PARTNER_DECK_EN_PDF_URL",
    fallbackPath: "/files/spike-spot-index-global-partner-deck-2026.pdf",
  },
  "spike.respondentsDeck.uk.pdf": {
    envVar: "ASSET_SPIKE_RESPONDENTS_DECK_UK_PDF_URL",
    fallbackPath: "/files/spike-spot-index-respondents-presentation.pdf",
  },
  "uga.marketIntelligence.pdf": {
    envVar: "ASSET_UGA_MARKET_INTELLIGENCE_PDF_URL",
    fallbackPath: "/files/uga-index-market-intelligence.pdf",
  },
  "uga.methodology.pdf": {
    envVar: "ASSET_UGA_METHODOLOGY_PDF_URL",
    fallbackPath: "/files/uga-index-methodology.pdf",
  },
};

function getEnvAssetOverride(envVar: string): string | null {
  const value = process.env[envVar]?.trim();
  return value ? value : null;
}

function joinAbsoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function getTenantAssetUrl(key: TenantAssetKey): string {
  const asset = TENANT_ASSET_MANIFEST[key];
  return getEnvAssetOverride(asset.envVar) ?? asset.fallbackPath;
}

export function getTenantAssetAbsoluteUrl(
  key: TenantAssetKey,
  baseUrl: string,
): string {
  const value = getTenantAssetUrl(key);
  if (/^https?:\/\//.test(value)) {
    return value;
  }

  return joinAbsoluteUrl(baseUrl, value);
}

export function getTenantAssetManifest() {
  return TENANT_ASSET_MANIFEST;
}
