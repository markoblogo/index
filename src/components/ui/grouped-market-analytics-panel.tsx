"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";
import { AnalyticsTrendChart } from "@/components/ui/analytics-trend-chart";
import { VolatilityRangePanel } from "@/components/ui/volatility-range-panel";

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

type BasisFilter = "port" | "chop";

type MarketGroup = {
  description: Record<Locale, string>;
  id: "grains" | "oilseeds-export" | "oilseeds-processing";
  ids: CommodityId[];
  label: Record<Locale, string>;
  toggles?: BasisFilter[];
};

const marketGroups: MarketGroup[] = [
  {
    description: {
      en: "Port and Chop grain positions in one analytical window.",
      uk: "Портові та Chop зернові позиції в одному аналітичному вікні.",
    },
    id: "grains",
    ids: ["corn", "corn-fca-chop", "wheat-115", "feed-wheat"],
    label: { en: "Grains", uk: "Зернові" },
    toggles: ["port", "chop"],
  },
  {
    description: {
      en: "Seasonal soybean and rapeseed export positions by Port / Chop.",
      uk: "Сезонні експортні позиції сої та ріпаку за Port / Chop.",
    },
    id: "oilseeds-export",
    ids: [
      "gmo-soybean-export",
      "non-gmo-soybean-export",
      "rapeseed-export",
      "gmo-soybean-fca-chop",
      "non-gmo-soybean-fca-chop",
      "rapeseed-fca-chop",
    ],
    label: { en: "Oilseeds export", uk: "Олійні експорт" },
    toggles: ["port", "chop"],
  },
  {
    description: {
      en: "Domestic processing basket: GMO soybean and sunflower seed.",
      uk: "Внутрішня переробна корзина: соя ГМО та соняшник.",
    },
    id: "oilseeds-processing",
    ids: ["gmo-soybean", "sunflower"],
    label: { en: "Oilseeds processing", uk: "Олійні переробка" },
  },
];

const basisIds: Record<BasisFilter, CommodityId[]> = {
  chop: [
    "corn-fca-chop",
    "gmo-soybean-fca-chop",
    "non-gmo-soybean-fca-chop",
    "rapeseed-fca-chop",
  ],
  port: [
    "corn",
    "wheat-115",
    "feed-wheat",
    "gmo-soybean-export",
    "non-gmo-soybean-export",
    "rapeseed-export",
  ],
};

export function GroupedMarketAnalyticsPanel({
  commodities,
  history,
  locale,
}: GroupedMarketAnalyticsPanelProps) {
  const [activeGroupId, setActiveGroupId] = useState<MarketGroup["id"]>("grains");
  const [enabledBasis, setEnabledBasis] = useState<Set<BasisFilter>>(
    () => new Set(["port", "chop"]),
  );
  const text = getCopy(locale);
  const activeGroup =
    marketGroups.find((group) => group.id === activeGroupId) ?? marketGroups[0];

  const filteredCommodities = useMemo(() => {
    const allowedIds = activeGroup.ids.filter((id) => {
      if (!activeGroup.toggles) {
        return true;
      }

      return Array.from(enabledBasis).some((basis) => basisIds[basis].includes(id));
    });
    const allowed = new Set(allowedIds);
    const filtered = commodities.filter((commodity) => allowed.has(commodity.id));
    return filtered.length > 0 ? filtered : commodities;
  }, [activeGroup, commodities, enabledBasis]);
  const chartKey = `${activeGroup.id}-${Array.from(enabledBasis).sort().join("-")}`;

  function toggleBasis(filter: BasisFilter) {
    setEnabledBasis((current) => {
      const next = new Set(current);

      if (next.has(filter)) {
        if (next.size === 1) {
          return current;
        }

        next.delete(filter);
        return next;
      }

      next.add(filter);
      return next;
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.3rem] border border-black bg-[#050805] p-4 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {text.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase leading-tight">
              {text.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/60">
              {activeGroup.description[locale]}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {marketGroups.map((group) => {
              const active = group.id === activeGroup.id;

              return (
                <button
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${
                    active
                      ? "border-uga-green bg-uga-green !text-[#050505]"
                      : "border-white/25 bg-transparent text-white/60 hover:border-white/50 hover:text-white"
                  }`}
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  type="button"
                >
                  {group.label[locale]}
                </button>
              );
            })}
          </div>
        </div>

        {activeGroup.toggles ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/42">
              {text.basisFilter}
            </span>
            {activeGroup.toggles.map((filter) => {
              const active = enabledBasis.has(filter);

              return (
                <button
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-[0.68rem] font-black uppercase transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/25 bg-transparent text-white/45 hover:text-white"
                  }`}
                  key={filter}
                  onClick={() => toggleBasis(filter)}
                  type="button"
                >
                  {text.basisLabels[filter]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
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
            />
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
    </div>
  );
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      basisFilter: "Увімкнути / вимкнути базис",
      basisLabels: {
        chop: "Chop",
        port: "Port",
      },
      eyebrow: "Групова аналітика",
      title: "Динаміка та волатильність за групами",
      trendDescription:
        "Вибрані позиції групи відображаються в одному графіку, щоб порівняти рух Port / Chop та структуру корзини.",
      trendTitle: "Динаміка індексів за позиціями",
      volatilityDescription:
        "Рейтинг короткострокової волатильності та цінового діапазону тільки для вибраної групи.",
      volatilityTitle: "Волатильність і ціновий діапазон",
    };
  }

  return {
    basisFilter: "Enable / disable basis",
    basisLabels: {
      chop: "Chop",
      port: "Port",
    },
    eyebrow: "Grouped analytics",
    title: "Dynamics and volatility by group",
    trendDescription:
      "Selected group positions are shown in one chart to compare Port / Chop movement and basket structure.",
    trendTitle: "Index dynamics by position",
    volatilityDescription:
      "Short-term volatility and price range ranking for the selected group only.",
    volatilityTitle: "Volatility and price range",
  };
}
