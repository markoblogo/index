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

type MarketSeriesPoint = {
  date: string;
  value: number;
};

type MarketDriver = {
  body: string;
  label: string;
  tone: "green" | "lime" | "amber" | "blue";
  value: string;
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
  const [commodityId, setCommodityId] = useState<CommodityId>(
    commodities[0]?.id ?? "corn",
  );
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

    const spread =
      spreadDefinitions.find((item) => item.id === spreadId) ??
      spreadDefinitions[0];
    return buildSpreadSeries(history, spread);
  }, [commodityId, history, mode, spreadId]);

  const sample = useMemo(
    () => series.slice(-Math.min(period, series.length)),
    [period, series],
  );
  const read = useMemo(
    () => buildMarketRead(sample, text, mode),
    [mode, sample, text],
  );
  const chartValues =
    sample.length > 0
      ? sample.flatMap((point) => [
          point.value,
          read.normalLower,
          read.normalUpper,
        ])
      : [0, read.normalLower, read.normalUpper];
  const range = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
  const title =
    mode === "commodity"
      ? commodities.find((commodity) => commodity.id === commodityId)?.name[locale]
      : spreadDefinitions.find((spread) => spread.id === spreadId)?.label[locale];

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.4rem] border border-black bg-white p-4 shadow-[0_28px_80px_rgba(0,0,0,0.12)]">
      <div className="border-b border-black pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase leading-6 text-black">
              {text.title}
            </h2>
            <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-black/55">
              {text.description}
            </p>
          </div>
          <span className="rounded-full border border-black bg-uga-green px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] !text-[#050505]">
            {read.confidence}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_1fr_auto] lg:items-end">
        <div className="flex overflow-hidden rounded-full border border-black bg-white">
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
            className="w-full rounded-[0.55rem] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
            disabled={mode !== "commodity"}
            onChange={(event) => setCommodityId(event.target.value as CommodityId)}
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
            className="w-full rounded-[0.55rem] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
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
              className={`rounded-full border px-2.5 py-2 text-[0.68rem] font-black uppercase transition ${
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

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1rem] border border-black bg-uga-mist p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">
            {text.marketRegime}
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase leading-tight text-black">
            {read.regime}
          </h3>
          <ul className="mt-4 grid gap-3 text-sm font-semibold leading-5 text-black/68">
            {read.summary.map((item) => (
              <li className="flex gap-2" key={item}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-uga-green" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1rem] border border-black bg-[#050805] p-4 text-white">
          <div className="mb-2 flex flex-wrap justify-between gap-3 text-xs font-black uppercase text-white/58">
            <span>{title}</span>
            <span>{read.latestLabel}</span>
            <span>
              {period} {text.days}
            </span>
          </div>
          <svg
            aria-label={text.title}
            className="h-64 w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <GridLines />
            {sample.length > 1 ? (
              <>
                <rect
                  fill="rgba(57,255,20,0.08)"
                  height="72"
                  width={recentWindowWidth(sample.length)}
                  x={100 - recentWindowWidth(sample.length)}
                  y="14"
                />
                <polygon
                  className="market-band"
                  fill="var(--color-lime)"
                  fillOpacity="0.16"
                  points={toBandPoints(
                    sample,
                    read.normalLower,
                    read.normalUpper,
                    range.min,
                    range.max,
                  )}
                />
                <polyline
                  className="market-line"
                  fill="none"
                  points={toChartPoints(
                    sample.map((point) => point.value),
                    range.min,
                    range.max,
                  )}
                  stroke="var(--color-lime)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx="100"
                  cy={toChartY(sample.at(-1)?.value ?? 0, range.min, range.max)}
                  fill="#f8f8f2"
                  r="1.9"
                  stroke="var(--color-lime)"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-black uppercase text-white/62">
            <span>{text.publishedLine}</span>
            <span>{text.normalRange}</span>
            <span>{text.recentWindow}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {read.drivers.map((driver) => (
          <div
            className="rounded-[0.95rem] border border-black bg-white p-3"
            key={driver.label}
          >
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-black/45">
              {driver.label}
            </p>
            <p className={`mt-2 text-xl font-black ${driverToneClass(driver.tone)}`}>
              {driver.value}
            </p>
            <p className="mt-1 text-xs font-semibold leading-4 text-black/58">
              {driver.body}
            </p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .market-line {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: market-draw 1.7s ease-out forwards;
        }

        .market-band {
          opacity: 0;
          animation: market-band 1s ease-out 0.45s forwards;
        }

        @keyframes market-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes market-band {
          to {
            opacity: 1;
          }
        }
      `}</style>
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

  let latestFirst: number | undefined;
  let latestSecond: number | undefined;

  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .flatMap(([date, values]) => {
      latestFirst = values.get(spread.a) ?? latestFirst;
      latestSecond = values.get(spread.b) ?? latestSecond;

      if (latestFirst === undefined || latestSecond === undefined) {
        return [];
      }

      return [
        {
          date,
          value: roundOne(latestFirst - latestSecond),
        },
      ];
    });
}

function buildMarketRead(
  sample: MarketSeriesPoint[],
  text: ReturnType<typeof getCopy>,
  mode: "commodity" | "spread",
) {
  const latest = sample.at(-1)?.value ?? 0;
  const previous = sample.at(-2)?.value ?? latest;
  const first = sample[0]?.value ?? latest;
  const monthAgo = sample.at(-31)?.value ?? first;
  const change1d = roundOne(latest - previous);
  const changePeriod = roundOne(latest - first);
  const change30d = roundOne(latest - monthAgo);
  const values = sample.map((point) => point.value);
  const average = averageValue(values);
  const volatility = standardDeviation(
    sample.map((point, index) =>
      index === 0 ? 0 : point.value - sample[index - 1].value,
    ),
  );
  const normalBand = Math.max(volatility * 2.2, Math.abs(average) * 0.012, 1);
  const normalLower = average - normalBand;
  const normalUpper = average + normalBand;
  const percentile = percentileRank(values, latest);
  const regime = getRegime(change1d, change30d, volatility, percentile, mode, text);
  const confidence =
    sample.length >= 90
      ? text.confidenceHigh
      : sample.length >= 30
        ? text.confidenceNormal
        : text.confidenceLimited;

  return {
    confidence,
    drivers: [
      {
        body: text.indexMoveBody(change1d),
        label: text.indexMove,
        tone: change1d > 0 ? "green" : change1d < 0 ? "amber" : "blue",
        value: formatSigned(change1d),
      },
      {
        body: text.periodMoveBody(sample.length),
        label: text.periodMove,
        tone: changePeriod > 0 ? "green" : changePeriod < 0 ? "amber" : "blue",
        value: formatSigned(changePeriod),
      },
      {
        body: text.volatilityBody,
        label: text.volatility,
        tone: volatility > 4 ? "amber" : "lime",
        value: `${roundOne(volatility)} USD/t`,
      },
      {
        body: text.contextBody(mode),
        label: text.aiContext,
        tone: "blue",
        value: `${Math.round(percentile)}%`,
      },
    ] satisfies MarketDriver[],
    latestLabel: text.latestLabel(latest),
    normalLower,
    normalUpper,
    regime: regime.title,
    summary: [
      text.summaryCurrent(latest, percentile),
      text.summaryMonth(change30d),
      regime.body,
    ],
  };
}

function getRegime(
  change1d: number,
  change30d: number,
  volatility: number,
  percentile: number,
  mode: "commodity" | "spread",
  text: ReturnType<typeof getCopy>,
) {
  if (volatility >= 5) {
    return {
      body: text.regimeVolatileBody,
      title: text.regimeVolatile,
    };
  }

  if (mode === "spread" && change30d >= 4) {
    return {
      body: text.regimeWideningBody,
      title: text.regimeWidening,
    };
  }

  if (mode === "spread" && change30d <= -4) {
    return {
      body: text.regimeCompressionBody,
      title: text.regimeCompression,
    };
  }

  if (change1d < -1 || change30d < -4 || percentile < 35) {
    return {
      body: text.regimePressureBody,
      title: text.regimePressure,
    };
  }

  if (change1d > 1 || change30d > 4 || percentile > 65) {
    return {
      body: text.regimeReboundBody,
      title: text.regimeRebound,
    };
  }

  return {
    body: text.regimeStableBody,
    title: text.regimeStable,
  };
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

function averageValue(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentileRank(values: number[], latest: number) {
  if (values.length <= 1) {
    return 50;
  }

  const belowOrEqual = values.filter((value) => value <= latest).length;
  return (belowOrEqual / values.length) * 100;
}

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.14, 1);

  return {
    max: max + padding,
    min: min - padding,
  };
}

function toChartPoints(values: number[], min: number, max: number) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = toChartY(value, min, max);
      return `${x},${y}`;
    })
    .join(" ");
}

function toBandPoints(
  sample: MarketSeriesPoint[],
  lower: number,
  upper: number,
  min: number,
  max: number,
) {
  const upperPoints = sample.map((_, index) => {
    const x = sample.length === 1 ? 0 : (index / (sample.length - 1)) * 100;
    return `${x},${toChartY(upper, min, max)}`;
  });
  const lowerPoints = sample
    .map((_, index) => {
      const x = sample.length === 1 ? 0 : (index / (sample.length - 1)) * 100;
      return `${x},${toChartY(lower, min, max)}`;
    })
    .reverse();

  return [...upperPoints, ...lowerPoints].join(" ");
}

function toChartY(value: number, min: number, max: number) {
  const range = Math.max(max - min, 1);
  return 84 - ((value - min) / range) * 68;
}

function recentWindowWidth(length: number) {
  return Math.min(38, (Math.min(14, length) / Math.max(length, 1)) * 100);
}

function GridLines() {
  return (
    <>
      {[16, 33, 50, 67, 84].map((y) => (
        <line
          key={y}
          stroke="rgba(255,255,255,0.12)"
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

function driverToneClass(tone: MarketDriver["tone"]) {
  if (tone === "amber") {
    return "text-[#ffb84d]";
  }

  if (tone === "blue") {
    return "text-[#5cd7ff]";
  }

  if (tone === "lime") {
    return "text-[#b9ff18]";
  }

  return "text-uga-green";
}

function formatSigned(value: number) {
  if (Math.abs(value) < 0.05) {
    return "0 USD/t";
  }

  return `${value > 0 ? "+" : ""}${roundOne(value)} USD/t`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      aiContext: "AI контекст",
      commodityLabel: "Культура",
      commodityMode: "Культура",
      confidenceHigh: "висока довіра",
      confidenceLimited: "обмежена довіра",
      confidenceNormal: "нормальна довіра",
      contextBody: (mode: "commodity" | "spread") =>
        mode === "spread"
          ? "Спред читається як сигнал розриву між двома ринковими корзинами."
          : "MediaHub-контекст може пояснювати рух, але не змінює офіційне значення.",
      days: "днів",
      description:
        "Публічний preview читає архів індексів, короткий імпульс, volatility та спреди. Це пояснення опублікованих даних, не прогноз.",
      indexMove: "Денний рух",
      indexMoveBody: (change: number) =>
        Math.abs(change) < 0.05
          ? "Останнє значення не показує суттєвого денного імпульсу."
          : "Остання зміна дає короткий сигнал для читання поточного тону.",
      latestLabel: (value: number) => `${roundOne(value)} USD/t`,
      marketRegime: "Режим ринку",
      normalRange: "нормальний діапазон",
      periodMove: "Рух періоду",
      periodMoveBody: (days: number) => `Зміна за останні ${days} точок архіву.`,
      publishedLine: "опублікована історія",
      recentWindow: "останні точки",
      regimeCompression: "Spread compression",
      regimeCompressionBody:
        "Різниця між позиціями стискається, що може означати вирівнювання попиту або логістичного тиску.",
      regimePressure: "Market pressure",
      regimePressureBody:
        "AI-read бачить тиск у поточному рівні або останньому імпульсі відносно архіву.",
      regimeRebound: "Rebound / strength",
      regimeReboundBody:
        "Поточний рух виглядає сильнішим за середній тон вибраного архівного вікна.",
      regimeStable: "Stable range",
      regimeStableBody:
        "Поточне значення залишається близьким до нормального архівного діапазону.",
      regimeVolatile: "High volatility",
      regimeVolatileBody:
        "Короткострокові зміни вищі за нормальний фон, тому сигнал треба читати обережно.",
      regimeWidening: "Spread widening",
      regimeWideningBody:
        "Різниця між позиціями розширюється, що підсвічує зміну відносної сили.",
      spreadLabel: "Конкретний спред",
      spreadMode: "Спред",
      summaryCurrent: (value: number, percentile: number) =>
        `Поточний рівень ${roundOne(value)} USD/t знаходиться приблизно на ${Math.round(percentile)}-му percentile вибраного архівного вікна.`,
      summaryMonth: (change: number) =>
        `30-денний імпульс: ${formatSigned(change)}. AI читає це як структурний рух, якщо він підтверджений кількома точками.`,
      title: "AI Market Read",
      volatility: "Volatility",
      volatilityBody:
        "Показник читає середню амплітуду коротких змін у вибраному вікні.",
    };
  }

  return {
    aiContext: "AI context",
    commodityLabel: "Commodity",
    commodityMode: "Commodity",
    confidenceHigh: "high confidence",
    confidenceLimited: "limited confidence",
    confidenceNormal: "normal confidence",
    contextBody: (mode: "commodity" | "spread") =>
      mode === "spread"
        ? "The spread is read as a signal between two market baskets."
        : "MediaHub context can explain movement, but does not change official values.",
    days: "days",
    description:
      "Public preview reads index history, short momentum, volatility and spreads. It explains published data; it is not a forecast.",
    indexMove: "Daily move",
    indexMoveBody: (change: number) =>
      Math.abs(change) < 0.05
        ? "The latest value does not show a meaningful daily impulse."
        : "The latest change gives a short signal for reading the current tone.",
    latestLabel: (value: number) => `${roundOne(value)} USD/t`,
    marketRegime: "Market regime",
    normalRange: "normal range",
    periodMove: "Period move",
    periodMoveBody: (days: number) => `Change across the latest ${days} archive points.`,
    publishedLine: "published history",
    recentWindow: "recent window",
    regimeCompression: "Spread compression",
    regimeCompressionBody:
      "The gap between positions is narrowing, which can signal a relative demand or logistics reset.",
    regimePressure: "Market pressure",
    regimePressureBody:
      "The AI read sees pressure in the current level or recent impulse relative to the archive.",
    regimeRebound: "Rebound / strength",
    regimeReboundBody:
      "The current move looks stronger than the average tone of the selected archive window.",
    regimeStable: "Stable range",
    regimeStableBody:
      "The current value remains close to the normal historical range for this window.",
    regimeVolatile: "High volatility",
    regimeVolatileBody:
      "Short-term changes are above the normal background, so the signal should be read carefully.",
    regimeWidening: "Spread widening",
    regimeWideningBody:
      "The gap between positions is widening, highlighting a change in relative strength.",
    spreadLabel: "Specific spread",
    spreadMode: "Spread",
    summaryCurrent: (value: number, percentile: number) =>
      `Current level ${roundOne(value)} USD/t sits near the ${Math.round(percentile)}th percentile of the selected archive window.`,
    summaryMonth: (change: number) =>
      `30-day impulse: ${formatSigned(change)}. The AI read treats it as structural only when confirmed by several points.`,
    title: "AI Market Read",
    volatility: "Volatility",
    volatilityBody:
      "This reads the average amplitude of short moves in the selected window.",
  };
}
