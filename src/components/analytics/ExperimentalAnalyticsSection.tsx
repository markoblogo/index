"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  buildDataQualitySummary,
  buildMarketPulseRows,
  buildSeasonalitySeries,
  buildSpreadLeaderboard,
  computeRangeForWindow,
  normalizeHistory,
  type ConfidenceLevel,
  type IndexHistoryPoint,
  type IndexInstrument,
  type SeasonalitySeries,
  type SpreadDefinition,
} from "@/lib/analytics/experimental-analytics";

type Props = {
  history: IndexHistoryPoint[];
  instruments: IndexInstrument[];
};

const RANGE_WINDOWS = [90, 180, 365, "all"] as const;

export function ExperimentalAnalyticsSection({ history, instruments }: Props) {
  const normalizedHistory = useMemo(() => normalizeHistory(history), [history]);
  const pulseRows = useMemo(
    () => buildMarketPulseRows(normalizedHistory, instruments),
    [normalizedHistory, instruments],
  );
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(
    instruments[0]?.id ?? "",
  );
  const [rangeWindow, setRangeWindow] = useState<(typeof RANGE_WINDOWS)[number]>(180);
  const [seasonalityMode, setSeasonalityMode] = useState<"indexed" | "absolute">(
    "indexed",
  );
  const selectedSeries = useMemo(
    () =>
      normalizedHistory.filter(
        (point) => point.commodityId === selectedInstrumentId,
      ),
    [normalizedHistory, selectedInstrumentId],
  );
  const selectedInstrument =
    instruments.find((instrument) => instrument.id === selectedInstrumentId) ??
    instruments[0];
  const rangeStats = computeRangeForWindow(selectedSeries, rangeWindow);
  const seasonality = buildSeasonalitySeries(selectedSeries, seasonalityMode);
  const spreadDefinitions = useMemo(
    () => buildDefaultSpreads(instruments),
    [instruments],
  );
  const spreadRows = useMemo(
    () => buildSpreadLeaderboard(normalizedHistory, spreadDefinitions),
    [normalizedHistory, spreadDefinitions],
  );
  const quality = useMemo(
    () => buildDataQualitySummary(normalizedHistory, instruments),
    [normalizedHistory, instruments],
  );

  if (normalizedHistory.length === 0 || instruments.length === 0) {
    return null;
  }

  return (
    <section
      className="border-y border-[var(--spike-accent)]/45 bg-[#050505] text-[#f8f8f2]"
      id="experimental-analytics"
    >
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-12">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--spike-accent)]">
            Experimental layer
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">
            Експериментальна аналітика індексів
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
            Додаткові аналітичні зрізи на основі історії індексів. Не є прогнозом
            або торговою рекомендацією.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          <MarketPulseHeatmap rows={pulseRows} />
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <PriceRangeCard
              instruments={instruments}
              rangeStats={rangeStats}
              rangeWindow={rangeWindow}
              selectedInstrumentId={selectedInstrumentId}
              selectedLabel={selectedInstrument?.label ?? ""}
              setRangeWindow={setRangeWindow}
              setSelectedInstrumentId={setSelectedInstrumentId}
            />
            <SeasonalityCard
              mode={seasonalityMode}
              selectedLabel={selectedInstrument?.label ?? ""}
              seasonality={seasonality}
              setMode={setSeasonalityMode}
            />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
            <SpreadLeaderboard rows={spreadRows} />
            <DataQualityPanel quality={quality} pulseRows={pulseRows} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketPulseHeatmap({
  rows,
}: {
  rows: ReturnType<typeof buildMarketPulseRows>;
}) {
  return (
    <Panel
      kicker="Market pulse heatmap"
      subtitle="Один екран для денного, тижневого, місячного й квартального руху. Колір не є сигналом, це лише швидке маркування сили зміни."
      title="Пульс ринку за позиціями"
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-white/12 text-[0.68rem] uppercase tracking-[0.16em] text-white/45">
              {["Позиція", "1Д", "7Д", "30Д", "90Д", "Перцентиль", "Vol 30D", "Якість"].map(
                (header) => (
                  <th className="px-3 py-3 font-black" key={header}>
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row) => (
              <tr className="text-sm" key={row.positionId}>
                <td className="px-3 py-3 font-black uppercase tracking-[0.04em]">
                  {row.positionLabel}
                  <span className="mt-1 block text-[0.68rem] font-semibold normal-case tracking-normal text-white/42">
                    {row.latestDate} · {formatNumber(row.value)} USD/t
                  </span>
                </td>
                <DeltaCell value={row.change1d.abs} />
                <DeltaCell value={row.change7d.abs} />
                <DeltaCell value={row.change30d.abs} />
                <DeltaCell value={row.change90d.abs} />
                <td className="px-3 py-3 font-black">
                  {formatNullable(row.percentile, "%")}
                </td>
                <td className="px-3 py-3 font-black">
                  {formatNullable(row.volatility30d, "%")}
                </td>
                <td className="px-3 py-3">
                  <ConfidencePill confidence={row.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PriceRangeCard({
  instruments,
  rangeStats,
  rangeWindow,
  selectedInstrumentId,
  selectedLabel,
  setRangeWindow,
  setSelectedInstrumentId,
}: {
  instruments: IndexInstrument[];
  rangeStats: ReturnType<typeof computeRangeForWindow>;
  rangeWindow: (typeof RANGE_WINDOWS)[number];
  selectedInstrumentId: string;
  selectedLabel: string;
  setRangeWindow: (window: (typeof RANGE_WINDOWS)[number]) => void;
  setSelectedInstrumentId: (id: string) => void;
}) {
  return (
    <Panel
      kicker="Percentile & range"
      subtitle="Поточна ціна порівнюється з власним історичним діапазоном обраної позиції."
      title="Перцентиль і історичний діапазон"
    >
      <Controls>
        <Select
          label="Позиція"
          onChange={setSelectedInstrumentId}
          options={instruments.map((instrument) => ({
            label: instrument.label,
            value: instrument.id,
          }))}
          value={selectedInstrumentId}
        />
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
            Вікно
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RANGE_WINDOWS.map((window) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase transition ${
                  rangeWindow === window
                    ? "border-[var(--spike-accent)] bg-[var(--spike-accent)] text-[#050505]"
                    : "border-white/15 bg-white/[0.04] text-white/72 hover:border-white/40"
                }`}
                key={window}
                onClick={() => setRangeWindow(window)}
                type="button"
              >
                {window === "all" ? "All" : `${window}D`}
              </button>
            ))}
          </div>
        </div>
      </Controls>

      {rangeStats ? (
        <>
          <RangeBar stats={rangeStats} />
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <SmallMetric label="Current" value={`${formatNumber(rangeStats.current)} USD/t`} />
            <SmallMetric label="Median" value={`${formatNumber(rangeStats.median)} USD/t`} />
            <SmallMetric label="Percentile" value={`${formatNumber(rangeStats.percentile)}%`} />
            <SmallMetric
              label="vs median"
              value={`${formatSigned(rangeStats.distanceFromMedian)} USD/t`}
            />
          </div>
        </>
      ) : (
        <EmptyState text={`Для ${selectedLabel} поки недостатньо точок для надійного діапазону.`} />
      )}
    </Panel>
  );
}

function SeasonalityCard({
  mode,
  seasonality,
  selectedLabel,
  setMode,
}: {
  mode: "indexed" | "absolute";
  seasonality: ReturnType<typeof buildSeasonalitySeries>;
  selectedLabel: string;
  setMode: (mode: "indexed" | "absolute") => void;
}) {
  const years = seasonality.yearSeries.map((series) => series.year);

  return (
    <Panel
      kicker="Seasonality explorer"
      subtitle="Порівняння календарної форми поточного року з попередніми роками й середньою сезонною траєкторією."
      title="Сезонність позиції"
    >
      <Controls>
        <SmallMetric label="Позиція" value={selectedLabel} />
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
            Режим
          </p>
          <div className="mt-2 flex gap-2">
            {(["indexed", "absolute"] as const).map((item) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase transition ${
                  mode === item
                    ? "border-[var(--spike-accent)] bg-[var(--spike-accent)] text-[#050505]"
                    : "border-white/15 bg-white/[0.04] text-white/72 hover:border-white/40"
                }`}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item === "indexed" ? "Index 100" : "USD/t"}
              </button>
            ))}
          </div>
        </div>
      </Controls>
      <SeasonalitySvg
        average={seasonality.averageSeries}
        series={seasonality.yearSeries}
      />
      <p className="mt-3 text-xs font-semibold leading-5 text-white/46">
        Роки в архіві: {years.length > 0 ? years.join(", ") : "недостатньо даних"}.
        Середня лінія не є прогнозом, вона лише показує історичну форму.
      </p>
    </Panel>
  );
}

function SpreadLeaderboard({
  rows,
}: {
  rows: ReturnType<typeof buildSpreadLeaderboard>;
}) {
  return (
    <Panel
      kicker="Spread leaderboard"
      subtitle="Спреди ранжуються за відхиленням від власної історії. Z-score допомагає знайти незвичні розриви."
      title="Лідери спредів і z-score"
    >
      {rows.length > 0 ? (
        <div className="grid gap-3">
          {rows.slice(0, 8).map((row) => (
            <article
              className="grid gap-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              key={row.label}
            >
              <div>
                <h4 className="text-sm font-black uppercase leading-5">
                  {row.label}
                </h4>
                <p className="mt-1 text-xs font-semibold text-white/45">
                  Поточний спред: {formatSigned(row.current)} USD/t · {row.status}
                </p>
              </div>
              <SmallMetric label="7D" value={formatNullable(row.change7d, " USD/t", true)} />
              <SmallMetric label="30D" value={formatNullable(row.change30d, " USD/t", true)} />
              <SmallMetric
                label="z-score"
                value={row.zScore === null ? "n/a" : row.zScore.toFixed(2)}
              />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="Поки недостатньо парних історичних рядів для спредів." />
      )}
    </Panel>
  );
}

function DataQualityPanel({
  pulseRows,
  quality,
}: {
  pulseRows: ReturnType<typeof buildMarketPulseRows>;
  quality: ReturnType<typeof buildDataQualitySummary>;
}) {
  const counts = quality.rows.reduce(
    (acc, row) => {
      acc[row.confidence] += 1;
      return acc;
    },
    { high: 0, low: 0, medium: 0, unavailable: 0 } satisfies Record<
      ConfidenceLevel,
      number
    >,
  );
  const labeledAlerts = pulseRows.flatMap((row) =>
    quality.rows
      .find((qualityRow) => qualityRow.positionId === row.positionId)
      ?.alerts.map((alert) => ({
        ...alert,
        label: row.positionLabel,
      })) ?? [],
  );

  return (
    <Panel
      kicker="Data quality"
      subtitle="Контроль покриття, свіжості та підозрілих стрибків, щоб відділяти аналітичний шум від корисної історії."
      title="Якість даних і алерти"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <SmallMetric label="Висока" value={String(counts.high)} />
        <SmallMetric label="Середня" value={String(counts.medium)} />
        <SmallMetric label="Низька" value={String(counts.low)} />
        <SmallMetric label="Немає даних" value={String(counts.unavailable)} />
      </div>
      <div className="mt-4 grid gap-2">
        {labeledAlerts.length > 0 ? (
          labeledAlerts.slice(0, 10).map((alert, index) => (
            <div
              className={`rounded-[0.9rem] border px-3 py-2 text-xs font-bold leading-5 ${
                alert.level === "critical"
                  ? "border-red-400/35 bg-red-500/10 text-red-100"
                  : "border-yellow-300/35 bg-yellow-300/10 text-yellow-100"
              }`}
              key={`${alert.label}-${alert.message}-${index}`}
            >
              <span className="font-black uppercase">{alert.label}</span>:{" "}
              {alert.message}
            </div>
          ))
        ) : (
          <EmptyState text="Критичних алертів за поточними рядами немає." />
        )}
      </div>
    </Panel>
  );
}

function Panel({
  children,
  kicker,
  subtitle,
  title,
}: {
  children: ReactNode;
  kicker: string;
  subtitle: string;
  title: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-white/12 bg-[radial-gradient(circle_at_top_right,rgba(52,255,25,0.09),rgba(255,255,255,0.035)_42%,rgba(255,255,255,0.02))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-5">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--spike-accent)]">
        {kicker}
      </p>
      <h3 className="mt-2 text-xl font-black uppercase leading-tight">{title}</h3>
      <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-white/52">
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Select({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label>
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      <select
        className="mt-2 w-full rounded-[0.8rem] border border-white/12 bg-black px-3 py-3 text-sm font-black uppercase text-white outline-none focus:border-[var(--spike-accent)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeBar({ stats }: { stats: NonNullable<ReturnType<typeof computeRangeForWindow>> }) {
  const span = stats.max - stats.min || 1;
  const pct = (value: number) => clamp(((value - stats.min) / span) * 100, 0, 100);

  return (
    <div className="mt-6">
      <div className="relative h-14 rounded-full border border-white/12 bg-white/[0.045]">
        <div
          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full bg-[var(--spike-accent)]/20"
          style={{ left: `${pct(stats.p25)}%`, width: `${pct(stats.p75) - pct(stats.p25)}%` }}
        />
        {[stats.min, stats.median, stats.max].map((value) => (
          <span
            className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-white/28"
            key={value}
            style={{ left: `${pct(value)}%` }}
          />
        ))}
        <span
          className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-[var(--spike-accent)] shadow-[0_0_22px_rgba(52,255,25,0.55)]"
          style={{ left: `${pct(stats.current)}%` }}
          title={`Current: ${formatNumber(stats.current)} USD/t`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/42">
        <span>{formatNumber(stats.min)}</span>
        <span>{formatNumber(stats.max)}</span>
      </div>
    </div>
  );
}

function SeasonalitySvg({
  average,
  series,
}: {
  average: Array<{ dayOfYear: number; value: number }>;
  series: SeasonalitySeries[];
}) {
  const latestYear = Math.max(...series.map((row) => row.year), 0);
  const visibleSeries = series.slice(-4);
  const values = [...visibleSeries.flatMap((row) => row.points), ...average];
  const minDay = Math.min(...values.map((point) => point.dayOfYear), 1);
  const maxDay = Math.max(...values.map((point) => point.dayOfYear), 365);
  const minValue = Math.min(...values.map((point) => point.value), 0);
  const maxValue = Math.max(...values.map((point) => point.value), 1);
  const path = (points: Array<{ dayOfYear: number; value: number }>) =>
    points
      .map((point, index) => {
        const x = 34 + ((point.dayOfYear - minDay) / (maxDay - minDay || 1)) * 540;
        const y = 250 - ((point.value - minValue) / (maxValue - minValue || 1)) * 210;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  if (values.length < 2) {
    return <EmptyState text="Для сезонного графіка поки недостатньо історії." />;
  }

  return (
    <div className="mt-5 overflow-hidden rounded-[1rem] border border-white/10 bg-black">
      <svg aria-label="Seasonality chart" className="h-[18rem] w-full" viewBox="0 0 608 288">
        {[55, 115, 175, 235].map((y) => (
          <line key={y} stroke="rgba(255,255,255,0.12)" x1="30" x2="578" y1={y} y2={y} />
        ))}
        {average.length > 1 ? (
          <path
            d={path(average)}
            fill="none"
            stroke="rgba(255,255,255,0.44)"
            strokeDasharray="6 8"
            strokeWidth="2"
          />
        ) : null}
        {visibleSeries.map((row, index) => (
          <path
            d={path(row.points)}
            fill="none"
            key={row.year}
            opacity={row.year === latestYear ? 1 : 0.42}
            stroke={row.year === latestYear ? "var(--spike-accent)" : palette[index % palette.length]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={row.year === latestYear ? 4 : 2}
          />
        ))}
      </svg>
    </div>
  );
}

function DeltaCell({ value }: { value: number | null }) {
  const tone =
    value === null
      ? "bg-white/[0.035] text-white/36"
      : value > 0
        ? "bg-[var(--spike-accent)]/15 text-[var(--spike-accent)]"
        : value < 0
          ? "bg-red-500/12 text-red-200"
          : "bg-white/[0.05] text-white/62";

  return (
    <td className="px-3 py-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>
        {value === null ? "n/a" : `${formatSigned(value)} USD/t`}
      </span>
    </td>
  );
}

function ConfidencePill({ confidence }: { confidence: ConfidenceLevel }) {
  const labels: Record<ConfidenceLevel, string> = {
    high: "висока",
    low: "низька",
    medium: "середня",
    unavailable: "немає",
  };
  const classes: Record<ConfidenceLevel, string> = {
    high: "border-[var(--spike-accent)]/50 bg-[var(--spike-accent)]/16 text-[var(--spike-accent)]",
    low: "border-red-400/40 bg-red-500/12 text-red-100",
    medium: "border-yellow-300/40 bg-yellow-300/12 text-yellow-100",
    unavailable: "border-white/14 bg-white/[0.04] text-white/40",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${classes[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-black/42 p-3">
      <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-white/42">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-6 text-white/48">
      {text}
    </div>
  );
}

function buildDefaultSpreads(instruments: IndexInstrument[]): SpreadDefinition[] {
  const ids = new Set(instruments.map((instrument) => instrument.id));
  const candidates: SpreadDefinition[] = [
    { a: "wheat-115", b: "feed-wheat", id: "wheat-premium", label: "Премія пшениці 11.5% до фуражної" },
    { a: "corn", b: "feed-wheat", id: "corn-feed", label: "Спред кукурудзи до фуражної пшениці" },
    { a: "corn", b: "corn-chop", id: "corn-port-chop", label: "Кукурудза Port / Chop" },
    { a: "gmo-soybean-cpt", b: "gmo-soybean-chop", id: "soybean-gmo-port-chop", label: "Соя ГМО Port / Chop" },
    { a: "rapeseed-non-gmo-cpt", b: "rapeseed-non-gmo-chop", id: "rapeseed-port-chop", label: "Ріпак Port / Chop" },
    { a: "gmo-soybean", b: "sunflower", id: "crush-soy-sunflower", label: "Соя ГМО / соняшник переробка" },
  ];

  return candidates.filter((spread) => ids.has(spread.a) && ids.has(spread.b));
}

function formatNullable(value: number | null, suffix = "", signed = false) {
  if (value === null) return "n/a";
  return `${signed ? formatSigned(value) : formatNumber(value)}${suffix}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatSigned(value: number) {
  const formatted = formatNumber(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const palette = ["#68e0c2", "#f2f4a2", "#7da51f", "#ffffff"];
