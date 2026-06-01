import type { IndexConfig } from "@/lib/index-platform";
import { INDEX_CONFIGS } from "@/lib/index-platform";
import { getPlatformSiteUrl, PLATFORM_TENANT_ID } from "@/lib/platform-site";
import type { TenantContext } from "@1d3x/data";

export type MarketPack = {
  tenantId: TenantContext["tenantId"];
  marketId?: string;
  indexProductId?: string;
  publicSiteUrl: string;
  brandName: string;
  locales: readonly string[];
  deployment: {
    requiredEnv: readonly string[];
    optionalEnv: readonly string[];
  };
  integrations: readonly string[];
};

const commonIndexRequiredEnv = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "INDEX_TENANT",
  "NEXT_PUBLIC_INDEX_TENANT",
  "DEMO_AUTH_SECRET",
  "CRON_SECRET",
] as const;

const platformPack: MarketPack = {
  tenantId: PLATFORM_TENANT_ID,
  publicSiteUrl: getPlatformSiteUrl(),
  brandName: "1D3X",
  locales: ["en"],
  deployment: {
    requiredEnv: ["NEXT_PUBLIC_SITE_URL", "INDEX_TENANT", "NEXT_PUBLIC_INDEX_TENANT"],
    optionalEnv: [
      "RESEND_API_KEY",
      "PLATFORM_CONTACT_FROM_EMAIL",
      "PLATFORM_CONTACT_TO_EMAIL",
    ],
  },
  integrations: ["resend"],
};

function indexConfigToMarketPack(config: IndexConfig): MarketPack {
  const isSpike = config.id === "spike-ua";

  return {
    tenantId: config.id,
    marketId: config.id,
    indexProductId: config.id,
    publicSiteUrl: config.publicSiteUrl,
    brandName: config.name,
    locales: ["uk", "en"],
    deployment: {
      requiredEnv: commonIndexRequiredEnv,
      optionalEnv: isSpike
        ? [
            "MN7R_API_URL",
            "MN7R_INDEX_EXPORT_TOKEN",
            "MN7R_INDEX_RESPONDENT_CODE",
            "SPIKE_AUTO_PUBLISH_CRON_SECRET",
            "SPIKE_TELEGRAM_BOT_TOKEN",
            "RESPONDENT_TELEGRAM_CRON_SECRET",
          ]
        : [
            "RESEND_API_KEY",
            "RESPONDENT_EMAIL_CRON_SECRET",
            "UGA_SPIKE_DEMO_SYNC_ENABLED",
            "UGA_SPIKE_DEMO_SYNC_CRON_SECRET",
          ],
    },
    integrations: isSpike ? ["mn7r", "telegram", "nbu-fx"] : ["resend", "nbu-fx"],
  };
}

export const MARKET_PACKS: Record<TenantContext["tenantId"], MarketPack> = {
  [PLATFORM_TENANT_ID]: platformPack,
  "uga-ua": indexConfigToMarketPack(INDEX_CONFIGS["uga-ua"]),
  "spike-ua": indexConfigToMarketPack(INDEX_CONFIGS["spike-ua"]),
};

export function getMarketPack(context: TenantContext): MarketPack {
  return MARKET_PACKS[context.tenantId];
}

export function getMissingRequiredEnv(pack: MarketPack) {
  return pack.deployment.requiredEnv.filter((key) => !process.env[key]);
}

