import { EVERYDAY_SOURCE_DEFINITIONS } from "@/lib/everyday-index/config";
import { economistBigMacAdapter } from "@/lib/everyday-index/big-mac-adapter";
import { validateConsumerObservation } from "@/lib/everyday-index/validation";
import type {
  ConsumerProductLock,
  EverydaySourceAdapter,
  ParsedObservation,
} from "@/lib/everyday-index/types";

const unsupportedSourceSnapshotBody = JSON.stringify({
  status: "unsupported",
});

export const everydaySourceAdapters: Record<string, EverydaySourceAdapter> = {
  [economistBigMacAdapter.key]: economistBigMacAdapter,
  "latte-starbucks": createUnsupportedAdapter(
    {
      key: "latte",
      label: "Latte Index",
      variant: "Starbucks Caffe Latte",
      rules: [],
    },
    "Official Starbucks public source parsing not enabled yet.",
  ),
  "iphone-apple-store": createUnsupportedAdapter(
    {
      key: "iphone_price",
      label: "iPhone Index",
      variant: "Unlocked base-storage iPhone",
      rules: [],
    },
    "Apple Store parsing scaffold exists, but publishing is disabled until a valid retail parser is verified.",
  ),
  "iphone-workdays": createUnsupportedAdapter(
    {
      key: "iphone_workdays",
      label: "iPhone Workdays Index",
      variant: "Validated wage-backed workdays model",
      rules: [],
    },
    "Wage and tax adapter chain is not configured yet.",
  ),
  "market-wti": createDisabledMarketAdapter("wti_oil"),
  "market-brent": createDisabledMarketAdapter("brent_oil"),
  "market-gold": createDisabledMarketAdapter("gold"),
};

export function getEverydaySourceRegistry() {
  return EVERYDAY_SOURCE_DEFINITIONS.map((source) => ({
    ...source,
    adapterRegistered: Boolean(everydaySourceAdapters[source.key]),
  }));
}

function createUnsupportedAdapter(
  productLock: ConsumerProductLock,
  reason: string,
): EverydaySourceAdapter {
  return {
    key: `${productLock.key}-unsupported`,
    async fetchSnapshot(source) {
      return {
        sourceId: source.id,
        fetchedAt: new Date().toISOString(),
        contentType: "application/json",
        hash: "unsupported",
        url: source.sourceUrl,
        body: unsupportedSourceSnapshotBody,
      };
    },
    async parse(snapshot, source) {
      const observation: ParsedObservation = {
        sourceId: source.id,
        productKey: productLock.key,
        countryIso3: source.countryIso3,
        observedAt: snapshot.fetchedAt,
        parserVersion: `${productLock.key}-scaffold-v1`,
        confidence: "none",
        status: "unsupported",
        metadata: {
          reason,
        },
      };

      return observation;
    },
    validate(observation, source, previousPublishedPrice) {
      return validateConsumerObservation({
        observation,
        source,
        productLock,
        previousPublishedPrice,
      });
    },
  };
}

function createDisabledMarketAdapter(productKey: "wti_oil" | "brent_oil" | "gold") {
  return {
    key: `${productKey}-disabled`,
    async fetchSnapshot(source) {
      return {
        sourceId: source.id,
        fetchedAt: new Date().toISOString(),
        contentType: "application/json",
        hash: "disabled",
        url: source.sourceUrl,
        body: unsupportedSourceSnapshotBody,
      };
    },
    async parse(snapshot, source) {
      return {
        sourceId: source.id,
        productKey,
        observedAt: snapshot.fetchedAt,
        parserVersion: `${productKey}-disabled-v1`,
        confidence: "none" as const,
        status: "unsupported" as const,
        metadata: {
          reason:
            productKey === "gold"
              ? "Gold remains disabled until a legally safe source adapter is configured."
              : "Market overlay adapter scaffold is present but disabled in this first slice.",
        },
      };
    },
    validate() {
      return {
        status: "accepted" as const,
        reasons: [],
      };
    },
  } satisfies EverydaySourceAdapter;
}
