"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";

type ScenarioSourcePoint = {
  commodityId: CommodityId;
  date: string;
  dayChange: number;
  value: number;
};

type ScenarioModelPanelProps = {
  commodities: Commodity[];
  history: ScenarioSourcePoint[];
  locale: Locale;
};

type SpreadDefinition = {
  id: string;
  a: CommodityId;
  b: CommodityId;
  label: Record<Locale, string>;
};

type ScenarioPoint = {
  base: number;
  lower: number;
  upper: number;
};

const periods = [30, 60, 90, 180] as const;

const spreadDefinitions: SpreadDefinition[] = [
  {
    a: "wheat-115",
    b: "feed-wheat",
    id: "wheat-feed",
    label: {
      en: "Wheat 11.5% premium vs feed wheat",
      uk: "Премія пшениці 11.5% до фуражної",
    },
  },
  {
    a: "corn",
    b: "feed-wheat",
    id: "corn-feed",
    label: {
      en: "Corn vs feed wheat spread",
      uk: "Спред кукурудзи до фуражної пшениці",
    },
  },
  {
    a: "gmo-soybean",
    b: "corn",
    id: "soy-corn",
    label: {
      en: "GMO soybean premium vs corn",
      uk: "Премія сої ГМО до кукурудзи",
    },
  },
];

export function ScenarioModelPanel({
  commodities,
  history,
  locale,
}: ScenarioModelPanelProps) {
  const [mode, setMode] = useState<"commodity" | "spread">("commodity");
  const [commodityId, setCommodityId] = useState<CommodityId>(commodities[0]?.id ?? "corn");
  const [spreadId, setSpreadId] = useState(spreadDefinitions[0].id);
  const [period, setPeriod] = useState<(typeof periods)[number]>(90);
  const text = getCopy(locale);

  const series = useMemo(() => {
    if (mode === "commodity") {
      return history
        .filter((point) => point.commodityId === commodityId)
        .map((point) => ({
          date: point.date,
          value: point.value,
        }));
    }

    const spread = spreadDefinitions.find((item) => item.id === spreadId) ?? spreadDefinitions[0];
    return buildSpreadSeries(history, spread);
  }, [commodityId, history, mode, spreadId]);

  const scenario = useMemo(() => buildScenario(series, period), [period, series]);
  const chartValues = scenario.flatMap((point) => [point.lower, point.base, point.upper]);
  const range = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
  const title =
    mode === "commodity"
      ? commodities.find((commodity) => commodity.id === commodityId)?.name[locale]
      : spreadDefinitions.find((spread) => spread.id === spreadId)?.label[locale];

  return (
    <article className="min-w-0 border border-black bg-white p-4">
      <div className="border-b border-black pb-3">
        <h2 className="text-xl font-black uppercase leading-6 text-black">
          {text.title}
        </h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
          {text.description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_1fr_auto] lg:items-end">
        <div className="flex border border-black">
          {(["commodity", "spread"] as const).map((item) => (
            <button
              className={`px-3 py-2 text-xs font-black uppercase transition ${
                mode === item
                  ? "bg-uga-dark text-white"
                  : "bg-white text-black/55 hover:text-black"
              }`}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {item === "commodity" ? text.commodityMode : text.spreadMode}
            </button>
          ))}
        </div>

        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
          {text.commodityLabel}
          <select
            className="w-full rounded-[3px] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
            disabled={mode !== "commodity"}
            onChange={(event) => setCommodityId(event.target.value)}
            value={commodityId}
          >
            {commodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name[locale]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
          {text.spreadLabel}
          <select
            className="w-full rounded-[3px] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
            disabled={mode !== "spread"}
            onChange={(event) => setSpreadId(event.target.value)}
            value={spreadId}
          >
            {spreadDefinitions.map((spread) => (
              <option key={spread.id} value={spread.id}>
                {spread.label[locale]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-1.5 lg:justify-end">
          {periods.map((item) => (
            <button
              className={`border px-2.5 py-2 text-[0.68rem] font-black uppercase transition ${
                period === item
                  ? "border-black bg-uga-dark text-white"
                  : "border-black/25 bg-white text-black/50 hover:border-black hover:text-black"
              }`}
              key={item}
              onClick={() => setPeriod(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap justify-between gap-3 text-xs font-black uppercase text-black/50">
          <span>{title}</span>
          <span>{text.modelStatus}</span>
          <span>
            {period} {text.days}
          </span>
        </div>
        <svg
          aria-label={text.title}
          className="h-72 w-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <GridLines />
          <polygon
            className="scenario-band"
            fill="var(--color-lime)"
            fillOpacity="0.3"
            points={`${toChartPoints(
              scenario.map((point) => point.upper),
              range.min,
              range.max,
            )} ${toChartPoints(
              scenario.map((point) => point.lower).reverse(),
              range.min,
              range.max,
            )
              .split(" ")
              .reverse()
              .join(" ")}`}
          />
          <polyline
            className="scenario-line scenario-line-delayed"
            fill="none"
            points={toChartPoints(
              scenario.map((point) => point.upper),
              range.min,
              range.max,
            )}
            stroke="var(--color-green)"
            strokeDasharray="4 3"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            className="scenario-line scenario-line-delayed"
            fill="none"
            points={toChartPoints(
              scenario.map((point) => point.lower),
              range.min,
              range.max,
            )}
            stroke="var(--color-green)"
            strokeDasharray="4 3"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            className="scenario-line"
            fill="none"
            points={toChartPoints(
              scenario.map((point) => point.base),
              range.min,
              range.max,
            )}
            stroke="var(--color-ink)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-black uppercase text-black/60">
          <span>{text.baseScenario}</span>
          <span>{text.upperRange}</span>
          <span>{text.lowerRange}</span>
          <span>{text.aiOption}</span>
        </div>
        <style jsx>{`
          .scenario-line {
            stroke-dasharray: 180;
            stroke-dashoffset: 180;
            animation: scenario-draw 1.8s ease-out forwards;
          }

          .scenario-line-delayed {
            animation-delay: 0.22s;
          }

          .scenario-band {
            opacity: 0;
            animation: scenario-band 1.2s ease-out 0.55s forwards;
          }

          @keyframes scenario-draw {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes scenario-band {
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </article>
  );
}

function buildSpreadSeries(history: ScenarioSourcePoint[], spread: SpreadDefinition) {
  const byDate = new Map<string, Map<CommodityId, number>>();

  for (const point of history) {
    const values = byDate.get(point.date) ?? new Map<CommodityId, number>();
    values.set(point.commodityId, point.value);
    byDate.set(point.date, values);
  }

  return Array.from(byDate.entries())
    .map(([date, values]) => ({
      date,
      value: roundOne((values.get(spread.a) ?? 0) - (values.get(spread.b) ?? 0)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildScenario(series: Array<{ date: string; value: number }>, period: number) {
  const sample = series.slice(-Math.min(period, series.length));
  const latest = sample.at(-1)?.value ?? 0;
  const first = sample[0]?.value ?? latest;
  const changes = sample.map((point, index) =>
    index === 0 ? 0 : point.value - sample[index - 1].value,
  );
  const drift = (latest - first) / Math.max(sample.length - 1, 1);
  const volatility = Math.max(standardDeviation(changes), 0.3);

  return Array.from({ length: period }, (_, index): ScenarioPoint => {
    const step = index + 1;
    const base =
      latest +
      drift * step +
      Math.sin(step * 0.28) * volatility * 0.35;
    const range = volatility * Math.sqrt(step) * 0.92;

    return {
      base: roundOne(base),
      lower: roundOne(base - range),
      upper: roundOne(base + range),
    };
  });
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.12, 1);

  return {
    max: max + padding,
    min: min - padding,
  };
}

function toChartPoints(values: number[], min: number, max: number) {
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");
}

function GridLines() {
  return (
    <>
      {[18, 34, 50, 66, 82].map((y) => (
        <line
          key={y}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1="0"
          x2="100"
          y1={y}
          y2={y}
        />
      ))}
    </>
  );
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      baseScenario: "Базовий сценарій",
      aiOption: "AI-модель: опція підписки",
      commodityLabel: "Культура",
      commodityMode: "Культура",
      days: "днів",
      description:
        "Оберіть культуру або конкретний спред і горизонт, щоб побудувати сценарний діапазон.",
      lowerRange: "Нижній діапазон",
      modelStatus: "ШІ-модель активна · демо-розрахунок",
      spreadLabel: "Конкретний спред",
      spreadMode: "Спред",
      title: "Модельний сценарій",
      upperRange: "Верхній діапазон",
    };
  }

  return {
    baseScenario: "Base scenario",
    aiOption: "AI model: subscription option",
    commodityLabel: "Commodity",
    commodityMode: "Commodity",
    days: "days",
    description:
      "Choose a commodity or specific spread and horizon to draw the scenario range.",
    lowerRange: "Lower range",
    modelStatus: "AI model active · demo run",
    spreadLabel: "Specific spread",
    spreadMode: "Spread",
    title: "Model scenario",
    upperRange: "Upper range",
  };
}
