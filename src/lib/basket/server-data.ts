import { getBasketCompare, getBasketHistory, getBasketLatest, getBasketSources } from "@/lib/basket/data";
import type { BasketMarket } from "@/lib/basket/types";
import {
  getBasketCompareFromStorage,
  getBasketHistoryFromStorage,
  getBasketLatestFromStorage,
  getBasketSourcesFromStorage,
} from "@/lib/basket/storage";

export async function getBasketLatestDbFirst(market: BasketMarket) {
  return (await tryStorage(() => getBasketLatestFromStorage(market))) ?? getBasketLatest(market);
}

export async function getBasketHistoryDbFirst(market: BasketMarket) {
  return (await tryStorage(() => getBasketHistoryFromStorage(market))) ?? getBasketHistory(market);
}

export async function getBasketCompareDbFirst(market: BasketMarket) {
  return (await tryStorage(() => getBasketCompareFromStorage(market))) ?? getBasketCompare(market);
}

export async function getBasketSourcesDbFirst() {
  return (await tryStorage(() => getBasketSourcesFromStorage())) ?? getBasketSources();
}

async function tryStorage<T>(read: () => Promise<T | null>) {
  try {
    return await read();
  } catch (error) {
    console.warn("[basket] Falling back to fixture data after storage read failed", error);
    return null;
  }
}
