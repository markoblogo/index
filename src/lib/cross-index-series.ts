import { getBasketHistory, normalizeBasketMarket } from "@/lib/basket/data";
import type { BasketMarket } from "@/lib/basket/types";

export function loadBasketSeries(input: { market?: string; products?: string[] }) {
  const market = normalizeBasketMarket(input.market);
  const productIds = new Set(input.products ?? []);

  return getBasketHistory(market).filter((series) => productIds.size === 0 || productIds.has(series.id));
}

export function loadSpikeSeries(input: { market?: BasketMarket; positions?: string[] }) {
  if (input.market !== "UA") return [];

  const positionIds = new Set(input.positions ?? []);

  return getBasketHistory("UA").filter(
    (series) => series.id.startsWith("spike-") && (positionIds.size === 0 || positionIds.has(series.id)),
  );
}
