import { BasketChartEmbed } from "@/components/basket/basket-landing";
import { normalizeBasketMarket } from "@/lib/basket/data";

export const dynamic = "force-dynamic";

export default async function BasketChartEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const params = await searchParams;

  return <BasketChartEmbed market={normalizeBasketMarket(params.market)} />;
}
