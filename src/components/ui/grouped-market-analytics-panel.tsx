"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";
import { AnalyticsTrendChart } from "@/components/ui/analytics-trend-chart";
import { VolatilityRangePanel } from "@/components/ui/volatility-range-panel";
import { getDeliveryBasisConfigForCommodityId } from "@/lib/tenant-basis";

type MarketHistoryPoint = {
  commodityId: CommodityId;
  date: string;
  percentChange: number;
  value: number;
};

type GroupedMarketAnalyticsPanelProps = {
  commodities: Commodity[];
  history: MarketHistoryPoint[];
  locale: Locale;
};

const grainIds = new Set<CommodityId>(["corn", "corn-fca-chop", "wheat-115", "feed-wheat"]);
const defaultComparisonIds: CommodityId[] = [
  "gmo-soybean-export",
  "gmo-soybean",
  "rapeseed-export",
  "rapeseed",
];

export function GroupedMarketAnalyticsPanel({
  commodities,
  history,
  locale,
}: GroupedMarketAnalyticsPanelProps) {
  const text = getCopy(locale);
  const [selectedIds, setSelectedIds] = useState<CommodityId[]>(() =>
    defaultComparisonIds.filter((id) =>
      commodities.some((commodity) => commodity.id === id),
    ),
  );

  const selectorGroups = useMemo(() => {
    const grouped = {
      grains: [] as Commodity[],
      oilseeds: [] as Commodity[],
    };

    for (const commodity of commodities) {
      if (grainIds.has(commodity.id)) {
        grouped.grains.push(commodity);
      } else {
        grouped.oilseeds.push(commodity);
      }
    }

    return grouped;
  }, [commodities]);
  const filteredCommodities = useMemo(() => {
    const allowed = new Set(selectedIds);
    const filtered = commodities.filter((commodity) => allowed.has(commodity.id));
    return filtered.length > 0 ? filtered : commodities.slice(0, 1);
  }, [commodities, selectedIds]);
  const chartKey = selectedIds.join("-");

  function toggleCommodity(commodityId: CommodityId) {
    setSelectedIds((current) => {
      if (current.includes(commodityId)) {
        return current.length === 1
          ? current
          : current.filter((id) => id !== commodityId);
      }

      return [...current, commodityId];
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.3rem] border border-black bg-[#050805] p-4 text-white">
        <div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {text.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase leading-tight">
              {text.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/60">
              {text.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(21rem,0.95fr)]">
        <div className="rounded-[1.3rem] border border-black bg-white p-4">
          <div className="border-b border-black/15 pb-3">
            <h3 className="text-xl font-black uppercase leading-6 text-black">
              {text.trendTitle}
            </h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
              {text.trendDescription}
            </p>
          </div>
          <div className="mt-4">
            <AnalyticsTrendChart
              commodities={filteredCommodities}
              history={history}
              key={chartKey}
              locale={locale}
              showLegendControls={false}
            />
          </div>
        </div>

        <div className="rounded-[1.3rem] border border-black bg-white p-4">
          <div className="border-b border-black/15 pb-3">
            <h3 className="text-xl font-black uppercase leading-6 text-black">
              {text.selectorTitle}
            </h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
              {text.selectorDescription}
            </p>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <ComparisonSelectorGroup
              commodities={selectorGroups.oilseeds}
              locale={locale}
              onToggle={toggleCommodity}
              selectedIds={selectedIds}
              title={text.oilseedsTitle}
            />
            <ComparisonSelectorGroup
              commodities={selectorGroups.grains}
              locale={locale}
              onToggle={toggleCommodity}
              selectedIds={selectedIds}
              title={text.grainsTitle}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[1.3rem] border border-black bg-white p-4">
        <div className="border-b border-black/15 pb-3">
          <h3 className="text-xl font-black uppercase leading-6 text-black">
            {text.volatilityTitle}
          </h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
            {text.volatilityDescription}
          </p>
        </div>
        <div className="mt-4">
          <VolatilityRangePanel
            commodities={filteredCommodities}
            history={history}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

function ComparisonSelectorGroup({
  commodities,
  locale,
  onToggle,
  selectedIds,
  title,
}: {
  commodities: Commodity[];
  locale: Locale;
  onToggle: (commodityId: CommodityId) => void;
  selectedIds: CommodityId[];
  title: string;
}) {
  return (
    <div>
      <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-black/45">
        {title}
      </p>
      <div className="mt-2 grid gap-2">
        {commodities.map((commodity) => {
          const checked = selectedIds.includes(commodity.id);
          const basis = getDeliveryBasisConfigForCommodityId(commodity.id);

          return (
            <label
              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-2 rounded-xl border px-3 py-2 transition ${
                checked
                  ? "border-uga-green bg-uga-green/10 text-black"
                  : "border-black/10 bg-white text-black/60 hover:border-black/25 hover:text-black"
              }`}
              key={commodity.id}
            >
              <input
                checked={checked}
                className="mt-1 h-3.5 w-3.5 accent-[var(--color-green)]"
                onChange={() => onToggle(commodity.id)}
                type="checkbox"
              />
              <span>
                <span className="block text-xs font-black uppercase leading-4">
                  {commodity.shortName?.[locale] ?? commodity.name[locale]}
                </span>
                <span className="mt-0.5 block text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/42">
                  {getSelectorBasisLabel(basis.code, basis.name)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      description:
        "Вибирайте зернові та олійні позиції з різних базисів і категорій для прямого порівняння на одному графіку.",
      eyebrow: "Групова аналітика",
      grainsTitle: "Зернові / Grains",
      oilseedsTitle: "Олійні / Oilseeds",
      selectorDescription:
        "Список позицій із базисом поставки. Мінімум одна позиція залишається активною.",
      selectorTitle: "Вибір культур для порівняння",
      title: "Динаміка та волатильність за групами",
      trendDescription:
        "Вибрані позиції та їхній базис поставки відображаються за останні 180 днів.",
      trendTitle: "Динаміка індексів за позиціями",
      volatilityDescription:
        "Волатильність і ціновий діапазон за останні 180 днів тільки для вибраної групи.",
      volatilityTitle: "Волатильність і ціновий діапазон",
    };
  }

  return {
    description:
      "Select grain and oilseed positions across delivery bases and categories for direct comparison on one chart.",
    eyebrow: "Grouped analytics",
    grainsTitle: "Grains / Зернові",
    oilseedsTitle: "Oilseeds / Олійні",
    selectorDescription:
      "Position list with delivery basis. At least one position remains active.",
    selectorTitle: "Comparison selector",
    title: "Dynamics and volatility by group",
    trendDescription:
      "Selected positions and their delivery basis are shown over the last 180 days.",
    trendTitle: "Index dynamics by position",
    volatilityDescription:
      "Volatility and price range over the last 180 days for the selected group only.",
    volatilityTitle: "Volatility and price range",
  };
}

function getSelectorBasisLabel(code: string, fallbackName: string) {
  switch (code) {
    case "CPT_ODESA_EXPORT":
      return "CPT ODESA · EXPORT";
    case "FCA_CHOP_EXPORT":
      return "FCA CHOP · EXPORT";
    case "CPT_PARITY_ODESA_PROCESSING":
      return "CPT CRUSH · PROCESSING";
    default:
      return fallbackName.toUpperCase();
  }
}
