import { BasketHeroEmbed } from "@/components/basket/basket-landing";
import { normalizeBasketMarket } from "@/lib/basket/data";

export const dynamic = "force-dynamic";

export default async function BasketHeroEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const params = await searchParams;

  return <BasketHeroEmbed market={normalizeBasketMarket(params.market)} />;
}
