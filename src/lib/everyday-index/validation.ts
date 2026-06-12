import type {
  ConsumerIndexKey,
  ConsumerProductLock,
  ConsumerSourceDefinition,
  ParsedObservation,
  ValidationResult,
} from "@/lib/everyday-index/types";

const MAX_PCT_MOVE: Record<ConsumerIndexKey, number> = {
  burger: 30,
  latte: 30,
  iphone_price: 20,
  iphone_workdays: 20,
};

export function validateConsumerObservation(args: {
  observation: ParsedObservation;
  source: ConsumerSourceDefinition;
  productLock: ConsumerProductLock;
  previousPublishedPrice?: number | null;
}): ValidationResult {
  const { observation, source, productLock, previousPublishedPrice } = args;
  const reasons: string[] = [];

  if (source.expectedCurrency && observation.currency !== source.expectedCurrency) {
    reasons.push("Currency does not match expected source currency.");
  }

  if (
    observation.productVariant &&
    !observation.productVariant
      .toLowerCase()
      .includes(productLock.variant.split(",")[0].toLowerCase())
  ) {
    reasons.push("Parsed product variant does not match product lock.");
  }

  if (
    observation.productKey === "iphone_price" &&
    containsRestrictedIphonePricing(observation)
  ) {
    reasons.push("Rejected iPhone price due to trade-in, subsidy, installment or 'from' pricing.");
  }

  if (
    observation.productKey === "latte" &&
    containsDeliveryMarkup(observation)
  ) {
    reasons.push("Rejected latte price from a delivery-platform-style source.");
  }

  if (
    typeof observation.price === "number" &&
    typeof previousPublishedPrice === "number" &&
    previousPublishedPrice > 0
  ) {
    const deltaPct =
      Math.abs(((observation.price - previousPublishedPrice) / previousPublishedPrice) * 100);
    const threshold = MAX_PCT_MOVE[observation.productKey as ConsumerIndexKey];

    if (deltaPct > threshold) {
      return {
        status: "quarantined",
        reasons: [
          `Rejected due to suspicious ${deltaPct.toFixed(1)}% move above ${threshold}% threshold.`,
        ],
      };
    }
  }

  if (observation.confidence === "low" || observation.confidence === "none") {
    reasons.push("Confidence below publishing threshold.");
  }

  if (reasons.length > 0) {
    return {
      status: "rejected",
      reasons,
    };
  }

  return {
    status: "accepted",
    reasons: [],
  };
}

function containsRestrictedIphonePricing(observation: ParsedObservation) {
  const haystack = JSON.stringify(observation.metadata ?? {}).toLowerCase();

  return ["trade-in", "trade in", "carrier", "installment", "\"from\"", "from "].some(
    (token) => haystack.includes(token),
  );
}

function containsDeliveryMarkup(observation: ParsedObservation) {
  const haystack = JSON.stringify(observation.metadata ?? {}).toLowerCase();

  return ["uber eats", "ubereats", "doordash", "delivery"].some((token) =>
    haystack.includes(token),
  );
}
