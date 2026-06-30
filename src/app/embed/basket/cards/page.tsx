import { BasketCardsEmbed } from "@/components/basket/basket-landing";
import { normalizeBasketMarket } from "@/lib/basket/data";

export const dynamic = "force-dynamic";

export default async function BasketCardsEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const params = await searchParams;

  return <BasketCardsEmbed market={normalizeBasketMarket(params.market)} />;
}
