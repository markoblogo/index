import { BasketLanding } from "@/components/basket/basket-landing";
import { normalizeBasketMarket } from "@/lib/basket/data";

export const dynamic = "force-dynamic";

export default async function BasketSiteEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const params = await searchParams;

  return <BasketLanding embed initialMarket={normalizeBasketMarket(params.market)} />;
}
