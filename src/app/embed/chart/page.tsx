import dynamic from "next/dynamic";

import { EmbedShell } from "@/components/embed/embed-shell";
import { normalizeEmbedLocale } from "@/lib/embed";
import { commodities, weeklySeries, type CommodityId } from "@/lib/mock-data";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";

const EmbedChartContentAsync = dynamic(
  () =>
    import("@/components/embed/embed-chart-content").then(
      (module) => module.EmbedChartContent,
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">
          Loading chart...
        </p>
      </div>
    ),
  },
);

type EmbedChartPageProps = {
  searchParams: Promise<{
    commodity?: string;
    locale?: string;
  }>;
};

export default async function EmbedChartPage({
  searchParams,
}: EmbedChartPageProps) {
  const params = await searchParams;
  const locale = normalizeEmbedLocale(params.locale);
  const requestedCommodity = getCommodityId(params.commodity);
  const snapshot = await getPublicIndexSnapshot();
  const commodity =
    snapshot.commodities.find((item) => item.id === requestedCommodity) ??
    snapshot.commodities[0];
  const values = commodity.sparkline.length > 1
    ? commodity.sparkline
    : weeklySeries[commodity.id];
  const positive = values[values.length - 1] >= values[0];

  return (
    <EmbedShell>
      <EmbedChartContentAsync
        commodity={commodity}
        locale={locale}
        positive={positive}
        values={values}
      />
    </EmbedShell>
  );
}

function getCommodityId(value: string | undefined): CommodityId {
  return commodities.some((item) => item.id === value)
    ? (value as CommodityId)
    : "corn";
}
