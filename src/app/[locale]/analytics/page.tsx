import type { ReactNode } from "react";
import { CurrencyToggle, CurrencyValue } from "@/components/ui/currency-toggle";
import { SITE_CONFIG } from "@/lib/constants";
import { getFxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import {
  commodities,
  indexUpdatedAt,
  type Commodity,
  type CommodityId,
} from "@/lib/mock-data";

type AnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

type ScenarioPoint = {
  label: string;
  base: number;
  upper: number;
  lower: number;
};

const chartColors = [
  "var(--color-green)",
  "var(--color-ink)",
  "#6b8f1a",
  "#2f7f68",
];

const profileByCommodity: Record<
  CommodityId,
  { drift: number; volatility: number; phase: number }
> = {
  corn: { drift: 0.22, volatility: 1.2, phase: 0.2 },
  "wheat-115": { drift: 0.31, volatility: 1.05, phase: 0.85 },
  "feed-wheat": { drift: -0.08, volatility: 0.78, phase: 1.7 },
  "gmo-soybean": { drift: 0.45, volatility: 1.65, phase: 2.25 },
};

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = getAnalyticsCopy(locale);
  const fxRates = await getFxRates();
  const history = buildAnalyticsHistory();
  const snapshot = buildMarketSnapshot(history, locale);
  const tableRows = history.slice(-14).reverse();
  const quarterScenario = buildScenario("wheat-115", 13, "week");
  const annualScenario = buildScenario("wheat-115", 12, "month");
  const spreads = buildSpreads();

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_27rem] lg:px-8 lg:py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-black/70 sm:text-lg">
              {copy.heroBody}
            </p>
          </div>

          <div className="border border-black bg-uga-mist p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {copy.filtersTitle}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <FilterControl label={copy.commodityFilter}>
                <select className="w-full rounded-[3px] border-black bg-white px-3 py-2 text-sm font-semibold text-black">
                  <option>{copy.allCommodities}</option>
                  {commodities.map((commodity) => (
                    <option key={commodity.id}>{commodity.name[locale]}</option>
                  ))}
                </select>
              </FilterControl>
              <FilterControl label={copy.dateRangeFilter}>
                <select className="w-full rounded-[3px] border-black bg-white px-3 py-2 text-sm font-semibold text-black">
                  <option>{copy.last30Days}</option>
                  <option>{copy.last90Days}</option>
                  <option>{copy.fullPeriod}</option>
                </select>
              </FilterControl>
              <FilterControl label={copy.basisFilter}>
                <select className="w-full rounded-[3px] border-black bg-white px-3 py-2 text-sm font-semibold text-black">
                  <option>{SITE_CONFIG.defaultDeliveryBasis}</option>
                </select>
              </FilterControl>
              <FilterControl label={copy.currencyFilter}>
                <CurrencyToggle label={copy.currencyToggleLabel} />
              </FilterControl>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <AccessNotice copy={copy} />
        <KpiStrip items={snapshot} />
      </section>

      <section className="border-y border-black bg-uga-mist">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-12 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-14">
          <AnalyticsPanel
            description={copy.trendDescription}
            title={copy.trendTitle}
          >
            <MultiCommodityTrend history={history} locale={locale} />
          </AnalyticsPanel>
          <AnalyticsPanel
            description={copy.movementDescription}
            title={copy.movementTitle}
          >
            <MovementSummary history={history} locale={locale} />
          </AnalyticsPanel>
          <AnalyticsPanel
            description={copy.volatilityDescription}
            title={copy.volatilityTitle}
          >
            <VolatilityPanel history={history} locale={locale} />
          </AnalyticsPanel>
          <AnalyticsPanel
            description={copy.spreadDescription}
            title={copy.spreadTitle}
          >
            <SpreadPremiumChart locale={locale} spreads={spreads} />
          </AnalyticsPanel>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {copy.scenarioEyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black lg:text-4xl">
              {copy.scenarioTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-black/65">
              {copy.scenarioBody}
            </p>
            <p className="mt-4 border border-black bg-uga-mist p-4 text-xs font-semibold leading-5 text-black/60">
              {copy.scenarioDisclaimer}
            </p>
          </div>

          <div className="grid gap-5">
            <AnalyticsPanel
              description={copy.scenarioChartDescription}
              title={copy.quarterTitle}
            >
              <ScenarioForecastChart
                copy={copy}
                points={quarterScenario}
                unitLabel={copy.weekUnit}
              />
            </AnalyticsPanel>
            <AnalyticsPanel
              description={copy.outlookDescription}
              title={copy.outlookTitle}
            >
              <ScenarioForecastChart
                copy={copy}
                points={annualScenario}
                unitLabel={copy.monthUnit}
              />
            </AnalyticsPanel>
          </div>
        </div>
      </section>

      <section className="border-y border-black bg-uga-mist">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-12">
          <ApiPanel copy={copy} />
          <AccessMatrix copy={copy} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {copy.historyEyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black">
              {copy.historyTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-black/65">
              {copy.historyDescription}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {copy.historyActions.map((action) => (
                <button
                  className="rounded-[3px] border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-black/55"
                  disabled
                  key={action}
                  type="button"
                >
                  {action} · {copy.plannedLabel}
                </button>
              ))}
            </div>
          </div>

          <PublishedValuesTable
            copy={copy}
            fxRates={fxRates}
            locale={locale}
            rows={tableRows}
          />
        </div>
      </section>
    </>
  );
}

function AccessNotice({ copy }: { copy: AnalyticsCopy }) {
  return (
    <div className="grid border border-black bg-white lg:grid-cols-[1fr_auto]">
      <div className="p-4 lg:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
          {copy.previewLabel}
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-normal text-black">
          {copy.accessTitle}
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-black/65">
          {copy.accessText}
        </p>
      </div>
      <div className="grid border-t border-black lg:min-w-[25rem] lg:border-l lg:border-t-0">
        {copy.accessLabels.map((label) => (
          <div
            className="border-b border-black px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black/70 last:border-b-0"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiStrip({ items }: { items: Array<{ label: string; value: string; meta: string }> }) {
  return (
    <div className="mt-4 grid border border-black bg-white sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          className="border-b border-black p-4 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(6n)]:border-r-0 [&:nth-last-child(-n+2)]:sm:border-b-0 [&:nth-last-child(-n+3)]:lg:border-b-0 [&:nth-last-child(-n+6)]:xl:border-b-0"
          key={item.label}
        >
          <p className="text-[0.68rem] font-black uppercase leading-4 tracking-[0.1em] text-black/45">
            {item.label}
          </p>
          <p className="mt-2 text-xl font-black leading-none text-black">
            {item.value}
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
            {item.meta}
          </p>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <article className="min-w-0 border border-black bg-white p-4">
      <div className="border-b border-black pb-3">
        <h2 className="text-xl font-black uppercase leading-6 text-black">
          {title}
        </h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
          {description}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function MultiCommodityTrend({
  history,
  locale,
}: {
  history: AnalyticsPoint[];
  locale: Locale;
}) {
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div>
      <svg
        aria-label="Index dynamics by commodity"
        className="h-72 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <GridLines />
        {commodities.map((commodity, index) => (
          <polyline
            fill="none"
            key={commodity.id}
            points={toChartPoints(
              getCommodityHistory(history, commodity.id).map((point) => point.value),
              min,
              max,
            )}
            stroke={chartColors[index]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.6"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap gap-3">
        {commodities.map((commodity, index) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-black uppercase text-black/65"
            key={commodity.id}
          >
            <span
              className="h-2.5 w-2.5 border border-black"
              style={{ backgroundColor: chartColors[index] }}
            />
            {commodity.name[locale]}
          </span>
        ))}
      </div>
    </div>
  );
}

function MovementSummary({
  history,
  locale,
}: {
  history: AnalyticsPoint[];
  locale: Locale;
}) {
  return (
    <div className="grid gap-3">
      {commodities.map((commodity) => {
        const commodityHistory = getCommodityHistory(history, commodity.id);
        const latest = commodityHistory.at(-1) ?? commodityHistory[0];
        const sevenDay = latest.value - commodityHistory.at(-8)!.value;
        const thirtyDay = latest.value - commodityHistory[0].value;

        return (
          <div
            className="grid grid-cols-[1fr_auto] gap-3 border border-black/20 p-3"
            key={commodity.id}
          >
            <div>
              <p className="text-sm font-black text-black">
                {commodity.name[locale]}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                {commodity.code}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right text-xs">
              <MetricDelta label="1D" value={latest.dayChange} />
              <MetricDelta label="7D" value={sevenDay} />
              <MetricDelta label="30D" value={thirtyDay} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricDelta({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-black text-black/45">{label}</p>
      <p
        className={
          value >= 0
            ? "mt-1 font-black text-uga-green"
            : "mt-1 font-black text-[color:var(--color-negative)]"
        }
      >
        {formatSigned(value)}
      </p>
    </div>
  );
}

function VolatilityPanel({
  history,
  locale,
}: {
  history: AnalyticsPoint[];
  locale: Locale;
}) {
  const rows = commodities.map((commodity) => {
    const commodityHistory = getCommodityHistory(history, commodity.id);
    const lastSeven = commodityHistory.slice(-7);
    const changes = lastSeven.map((point) => point.percentChange);
    const volatility = standardDeviation(changes);
    const min = Math.min(...commodityHistory.map((point) => point.value));
    const max = Math.max(...commodityHistory.map((point) => point.value));

    return { commodity, volatility, min, max };
  });
  const maxVolatility = Math.max(...rows.map((row) => row.volatility), 1);

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.commodity.id}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-black">
              {row.commodity.name[locale]}
            </span>
            <span className="font-black text-black/60">
              {row.volatility.toFixed(2)}% · {row.min.toFixed(0)}-
              {row.max.toFixed(0)} USD/t
            </span>
          </div>
          <div className="h-3 border border-black bg-white">
            <div
              className="h-full bg-uga-green"
              style={{ width: `${Math.max((row.volatility / maxVolatility) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SpreadPremiumChart({
  locale,
  spreads,
}: {
  locale: Locale;
  spreads: Array<{ label: Record<Locale, string>; value: number }>;
}) {
  const maxAbs = Math.max(...spreads.map((spread) => Math.abs(spread.value)), 1);

  return (
    <div className="grid gap-4">
      {spreads.map((spread) => (
        <div key={spread.label.en}>
          <div className="mb-2 flex justify-between gap-3 text-sm">
            <span className="font-black text-black">{spread.label[locale]}</span>
            <span className="font-black text-uga-green">
              {formatSigned(spread.value)} USD/t
            </span>
          </div>
          <div className="h-3 border border-black bg-white">
            <div
              className="h-full bg-uga-lime"
              style={{ width: `${Math.max((Math.abs(spread.value) / maxAbs) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScenarioForecastChart({
  copy,
  points,
  unitLabel,
}: {
  copy: AnalyticsCopy;
  points: ScenarioPoint[];
  unitLabel: string;
}) {
  const values = points.flatMap((point) => [point.lower, point.base, point.upper]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div>
      <svg
        aria-label="Scenario forecast chart"
        className="h-56 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <GridLines />
        <polygon
          fill="var(--color-lime)"
          fillOpacity="0.32"
          points={`${toChartPoints(points.map((point) => point.upper), min, max)} ${toChartPoints(
            points.map((point) => point.lower).reverse(),
            min,
            max,
          )
            .split(" ")
            .reverse()
            .join(" ")}`}
        />
        <polyline
          fill="none"
          points={toChartPoints(points.map((point) => point.upper), min, max)}
          stroke="var(--color-green)"
          strokeDasharray="4 3"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={toChartPoints(points.map((point) => point.lower), min, max)}
          stroke="var(--color-green)"
          strokeDasharray="4 3"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={toChartPoints(points.map((point) => point.base), min, max)}
          stroke="var(--color-ink)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-black uppercase text-black/60">
        <span>{copy.baseScenario}</span>
        <span>{copy.upperRange}</span>
        <span>{copy.lowerRange}</span>
        <span>
          {points.length} {unitLabel}
        </span>
      </div>
    </div>
  );
}

function ApiPanel({ copy }: { copy: AnalyticsCopy }) {
  return (
    <article className="min-w-0 border border-black bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
        API
      </p>
      <h2 className="mt-3 text-2xl font-black uppercase text-black">
        {copy.apiTitle}
      </h2>
      <p className="mt-3 text-sm leading-6 text-black/65">{copy.apiText}</p>
      <div className="mt-4 grid border border-black">
        {copy.apiBullets.map((bullet) => (
          <div
            className="border-b border-black px-3 py-2 text-sm font-black text-black last:border-b-0"
            key={bullet}
          >
            {bullet}
          </div>
        ))}
      </div>
    </article>
  );
}

function AccessMatrix({ copy }: { copy: AnalyticsCopy }) {
  return (
    <article className="min-w-0 border border-black bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
        {copy.accessMatrixEyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black uppercase text-black">
        {copy.accessMatrixTitle}
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-black text-xs uppercase tracking-[0.12em] text-black/55">
            <tr>
              {copy.accessMatrixHeaders.map((header) => (
                <th className="py-2 pr-3 font-black" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20">
            {copy.accessMatrixRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td className="py-2 pr-3 font-semibold text-black/70" key={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PublishedValuesTable({
  copy,
  fxRates,
  locale,
  rows,
}: {
  copy: AnalyticsCopy;
  fxRates: Awaited<ReturnType<typeof getFxRates>>;
  locale: Locale;
  rows: AnalyticsPoint[];
}) {
  return (
    <div className="min-w-0 overflow-hidden border border-black bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-uga-dark text-xs uppercase tracking-[0.14em] text-white/70">
            <tr>
              {copy.tableHeaders.map((header) => (
                <th className="px-4 py-3 font-black" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {rows.map((row) => {
              const commodity = getCommodity(row.commodityId);

              return (
                <tr className="text-sm" key={`${row.date}-${row.commodityId}`}>
                  <td className="px-4 py-3 text-black/60">{row.date}</td>
                  <td className="px-4 py-3 font-black text-black">
                    {commodity.name[locale]}
                  </td>
                  <td className="px-4 py-3 text-black/60">
                    {SITE_CONFIG.defaultDeliveryBasis}
                  </td>
                  <td className="px-4 py-3 font-black text-black">
                    <CurrencyValue
                      compact
                      fxRates={fxRates}
                      locale={locale}
                      officialLabel={copy.officialLabel}
                      officialUsd={row.value}
                    />
                  </td>
                  <td
                    className={
                      row.dayChange >= 0
                        ? "px-4 py-3 font-black text-uga-green"
                        : "px-4 py-3 font-black text-[color:var(--color-negative)]"
                    }
                  >
                    {formatSigned(row.dayChange)} USD ·{" "}
                    {formatSigned(row.percentChange)}%
                  </td>
                  <td className="px-4 py-3 text-black/60">{row.respondents}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-black/25 px-2.5 py-1 text-xs font-black uppercase text-black/55">
                      {copy.publishedLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterControl({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
      {label}
      {children}
    </label>
  );
}

function GridLines() {
  return (
    <>
      {[18, 34, 50, 66, 82].map((y) => (
        <line
          key={y}
          stroke="var(--color-ink)"
          strokeOpacity="0.1"
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

function buildAnalyticsHistory(): AnalyticsPoint[] {
  const dates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date("2026-05-08T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });

  const rows = commodities.flatMap((commodity) => {
    const profile = profileByCommodity[commodity.id];
    const values = dates.map((_, index) => {
      const reverseIndex = 29 - index;
      const wave =
        Math.sin(index * 0.72 + profile.phase) * profile.volatility +
        Math.cos(index * 0.31 + profile.phase) * profile.volatility * 0.45;

      return roundOne(commodity.latest - reverseIndex * profile.drift + wave);
    });

    values[values.length - 1] = commodity.latest;

    return values.map((value, index) => {
      const previousValue = values[index - 1] ?? value;
      const dayChange = roundOne(value - previousValue);

      return {
        commodityId: commodity.id,
        date: dates[index],
        dayChange,
        percentChange:
          previousValue === 0 ? 0 : roundOne((dayChange / previousValue) * 100),
        respondents:
          commodity.id === "feed-wheat" ? 6 + (index % 3 === 0 ? 1 : 0) : 8,
        value,
      };
    });
  });

  return rows.sort((a, b) =>
    a.date === b.date
      ? a.commodityId.localeCompare(b.commodityId)
      : a.date.localeCompare(b.date),
  );
}

function buildMarketSnapshot(history: AnalyticsPoint[], locale: Locale) {
  const latestRows = commodities.map((commodity) =>
    getCommodityHistory(history, commodity.id).at(-1),
  ).filter(Boolean) as AnalyticsPoint[];
  const weeklyRows = latestRows.map((row) => {
    const commodityHistory = getCommodityHistory(history, row.commodityId);
    return {
      commodity: getCommodity(row.commodityId),
      change: roundOne(row.value - commodityHistory.at(-8)!.value),
      volatility: standardDeviation(commodityHistory.slice(-7).map((point) => point.percentChange)),
    };
  });
  const highestGain = weeklyRows.reduce((max, row) =>
    row.change > max.change ? row : max,
  );
  const largestDecline = weeklyRows.reduce((min, row) =>
    row.change < min.change ? row : min,
  );
  const mostStable = weeklyRows.reduce((min, row) =>
    row.volatility < min.volatility ? row : min,
  );
  const copy = getAnalyticsCopy(locale);
  const volatilityValues = weeklyRows.map((row) => row.volatility);
  const minVolatility = Math.min(...volatilityValues).toFixed(2);
  const maxVolatility = Math.max(...volatilityValues).toFixed(2);
  const updatedAt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(indexUpdatedAt));

  return [
    {
      label: copy.highestWeeklyGain,
      meta: highestGain.commodity.name[locale],
      value: `${formatSigned(highestGain.change)} USD/t`,
    },
    {
      label: copy.largestWeeklyDecline,
      meta: largestDecline.commodity.name[locale],
      value: `${formatSigned(largestDecline.change)} USD/t`,
    },
    {
      label: copy.mostStableCommodity,
      meta: mostStable.commodity.name[locale],
      value: mostStable.volatility.toFixed(2) + "%",
    },
    {
      label: copy.latestPublication,
      meta: SITE_CONFIG.defaultDeliveryBasis,
      value: updatedAt,
    },
    {
      label: copy.volatilityRange,
      meta: copy.last7Days,
      value: `${minVolatility}-${maxVolatility}%`,
    },
    {
      label: copy.respondentCoverage,
      meta: copy.currentBasket,
      value: "6-8",
    },
  ];
}

function buildSpreads() {
  const corn = getCommodity("corn").latest;
  const wheat = getCommodity("wheat-115").latest;
  const feed = getCommodity("feed-wheat").latest;
  const soy = getCommodity("gmo-soybean").latest;

  return [
    {
      label: {
        en: "Wheat 11.5% premium vs feed wheat",
        uk: "Премія пшениці 11.5% до фуражної",
      },
      value: wheat - feed,
    },
    {
      label: {
        en: "Corn vs feed wheat spread",
        uk: "Спред кукурудзи до фуражної пшениці",
      },
      value: corn - feed,
    },
    {
      label: {
        en: "GMO soybean premium vs corn",
        uk: "Премія сої ГМО до кукурудзи",
      },
      value: soy - corn,
    },
  ];
}

function buildScenario(
  commodityId: CommodityId,
  length: number,
  period: "week" | "month",
): ScenarioPoint[] {
  const commodity = getCommodity(commodityId);
  const profile = profileByCommodity[commodityId];
  const periodFactor = period === "week" ? 1 : 4.2;

  return Array.from({ length }, (_, index) => {
    const step = index + 1;
    const base =
      commodity.latest +
      profile.drift * periodFactor * step +
      Math.sin(step * 0.65 + profile.phase) * profile.volatility * periodFactor * 0.22;
    const range = profile.volatility * Math.sqrt(step) * (period === "week" ? 1.15 : 1.9);

    return {
      base: roundOne(base),
      label: String(step),
      lower: roundOne(base - range),
      upper: roundOne(base + range),
    };
  });
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

function getCommodityHistory(history: AnalyticsPoint[], commodityId: CommodityId) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getCommodity(commodityId: CommodityId): Commodity {
  return commodities.find((commodity) => commodity.id === commodityId) ?? commodities[0];
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function standardDeviation(values: number[]) {
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

type AnalyticsCopy = ReturnType<typeof getAnalyticsCopy>;

function getAnalyticsCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      accessLabels: [
        "Безкоштовний доступ до 15.06.2027",
        "Платна аналітика після стартового періоду",
        "Платний API-доступ у планах",
      ],
      accessMatrixEyebrow: "Доступ",
      accessMatrixHeaders: ["Рівень", "Історія", "Аналітика", "API"],
      accessMatrixRows: [
        ["Public preview", "7 днів", "обмежена", "ні"],
        ["Registered preview", "1 рік", "стандартна", "ні"],
        ["UGA member", "повний період", "розширена", "планується"],
        ["Paid/API", "повний період", "розширена", "так"],
      ],
      accessMatrixTitle: "Модель доступу",
      accessText:
        "Аналітична панель доступна безкоштовно протягом першого року роботи UGA Index. З 15.06.2027 розширена аналітика та API-доступ плануються у форматі платної підписки.",
      accessTitle: "Попередній доступ до аналітики",
      allCommodities: "Усі культури",
      apiBullets: [
        "Історія опублікованих індексів",
        "Аналітика трендів за культурами",
        "Значення з валютним перерахунком",
        "Результати сценарних моделей",
      ],
      apiText:
        "Майбутній платний доступ планується з API-ендпоінтами для історії опублікованих індексів, аналітики за культурами, валютного відображення та сценарних результатів.",
      apiTitle: "Планується API для аналітики",
      baseScenario: "Базовий сценарій",
      basisFilter: "Базис",
      commodityFilter: "Культура",
      currencyFilter: "Валюта",
      currencyToggleLabel: "Валюта відображення",
      currentBasket: "поточна корзина",
      dateRangeFilter: "Період",
      filtersTitle: "Фільтри",
      fullPeriod: "Повний період",
      heroBody:
        "Порівнюйте динаміку індексів, аналізуйте структуру ринку, відстежуйте волатильність і переглядайте аналітичні сценарії для українських експортних цін на зернові та олійні культури.",
      heroEyebrow: "Аналітика",
      heroTitle: "Аналітика значень UGA Index",
      highestWeeklyGain: "Найбільше тижневе зростання",
      historyActions: ["Повна історія", "Export CSV", "API access"],
      historyDescription:
        "Останні опубліковані значення з базисом, зміною, кількістю респондентів і статусом публікації.",
      historyEyebrow: "Історія",
      historyTitle: "Історія опублікованих значень",
      largestWeeklyDecline: "Найбільше тижневе зниження",
      last30Days: "Останні 30 днів",
      last7Days: "останні 7 днів",
      last90Days: "Останні 90 днів",
      latestPublication: "Остання публікація",
      lowerRange: "Нижній діапазон",
      monthUnit: "місяців",
      mostStableCommodity: "Найстабільніша культура",
      movementDescription:
        "Стислий зріз денних, тижневих і 30-денних змін за культурами.",
      movementTitle: "Підсумок цінових змін",
      officialLabel: "офіційно",
      outlookDescription:
        "Місячний сценарний діапазон для довшого аналітичного горизонту.",
      outlookTitle: "Аналітичний прогноз на 12 місяців",
      plannedLabel: "planned",
      previewLabel: "Preview access",
      publishedLabel: "published",
      quarterTitle: "Сценарій на найближчий квартал",
      respondentCoverage: "Покриття респондентів",
      scenarioBody:
        "Демо-аналітична модель будує можливі траєкторії індексів на основі історичної динаміки, короткострокового імпульсу та волатильності окремих культур. Результат є сценарним діапазоном, а не гарантією майбутніх цін.",
      scenarioChartDescription:
        "90-денний горизонт із базовим сценарієм і верхнім/нижнім діапазоном.",
      scenarioDisclaimer:
        "Сценарні результати сформовані лише для аналітичної демонстрації. Вони не є інвестиційною порадою, торговою рекомендацією або гарантованим прогнозом. Фактичні ринкові ціни можуть суттєво відрізнятися.",
      scenarioEyebrow: "Модельний сценарій",
      scenarioTitle: "AI-сценарій динаміки індексів",
      spreadDescription:
        "Відносні спреди показують, як різні товарні корзини рухаються одна відносно одної.",
      spreadTitle: "Спреди та премії між культурами",
      tableHeaders: [
        "Дата",
        "Культура",
        "Базис",
        "Значення",
        "Зміна",
        "Респонденти",
        "Статус",
      ],
      trendDescription:
        "30-денна demo-історія для всіх чотирьох опублікованих індексів.",
      trendTitle: "Динаміка індексів за культурами",
      upperRange: "Верхній діапазон",
      volatilityDescription:
        "Рейтинг короткострокової волатильності та 30-денного діапазону.",
      volatilityRange: "Діапазон волатильності",
      volatilityTitle: "Волатильність і ціновий діапазон",
      weekUnit: "тижнів",
    };
  }

  return {
    accessLabels: [
      "Free preview until 15.06.2027",
      "Paid analytics after launch period",
      "Paid API access planned",
    ],
    accessMatrixEyebrow: "Access",
    accessMatrixHeaders: ["Access level", "History", "Analytics", "API"],
    accessMatrixRows: [
      ["Public preview", "7 days", "limited", "no"],
      ["Registered preview", "1 year", "standard", "no"],
      ["UGA member", "full period", "extended", "planned"],
      ["Paid/API", "full period", "extended", "yes"],
    ],
    accessMatrixTitle: "Access model",
    accessText:
      "The analytics dashboard is available free of charge during the first year of UGA Index operation. From 15.06.2027, extended analytics and API access are planned to move to a paid subscription model.",
    accessTitle: "Analytics access preview",
    allCommodities: "All commodities",
    apiBullets: [
      "Published index history",
      "Commodity trend analytics",
      "Currency-adjusted values",
      "Scenario model outputs",
    ],
    apiText:
      "Future paid access is planned to include API endpoints for published index history, commodity-level analytics, FX-adjusted display values and scenario outputs.",
    apiTitle: "Analytics API planned",
    baseScenario: "Base scenario",
    basisFilter: "Basis",
    commodityFilter: "Commodity",
    currencyFilter: "Display currency",
    currencyToggleLabel: "Display currency",
    currentBasket: "current basket",
    dateRangeFilter: "Date range",
    filtersTitle: "Filters",
    fullPeriod: "Full period",
    heroBody:
      "Compare index dynamics, review market structure, track volatility and explore analytical scenarios for Ukrainian grain and oilseed export prices.",
    heroEyebrow: "Analytics",
    heroTitle: "Commodity intelligence for UGA Index values",
    highestWeeklyGain: "Highest weekly gain",
    historyActions: ["View full history", "Export CSV", "API access"],
    historyDescription:
      "Recent published values with basis, change, respondent count and publication status.",
    historyEyebrow: "History",
    historyTitle: "Published values history",
    largestWeeklyDecline: "Largest weekly decline",
    last30Days: "Last 30 days",
    last7Days: "last 7 days",
    last90Days: "Last 90 days",
    latestPublication: "Latest publication",
    lowerRange: "Lower range",
    monthUnit: "months",
    mostStableCommodity: "Most stable commodity",
    movementDescription:
      "Compact daily, 7-day and 30-day movement summary by commodity.",
    movementTitle: "Price movement summary",
    officialLabel: "official",
    outlookDescription:
      "Monthly scenario range for a longer analytical horizon.",
    outlookTitle: "12-month analytical outlook",
    plannedLabel: "planned",
    previewLabel: "Preview access",
    publishedLabel: "published",
    quarterTitle: "Next quarter scenario",
    respondentCoverage: "Respondent coverage",
    scenarioBody:
      "A demo analytical model projects possible index paths using historical index movement, short-term momentum and commodity-specific volatility. The output is a scenario range, not a guarantee of future prices.",
    scenarioChartDescription:
      "90-day horizon with a base scenario and upper/lower range.",
    scenarioDisclaimer:
      "Scenario outputs are generated for analytical demonstration only. They are not investment advice, trading recommendations or guaranteed forecasts. Actual market prices may differ materially.",
    scenarioEyebrow: "Model scenario",
    scenarioTitle: "AI-assisted scenario forecast",
    spreadDescription:
      "Relative spreads help show how different commodity baskets move against each other.",
    spreadTitle: "Commodity spreads and premiums",
    tableHeaders: [
      "Date",
      "Commodity",
      "Basis",
      "Value",
      "Change",
      "Respondents",
      "Status",
    ],
    trendDescription:
      "30-day demo history for all four published commodity indices.",
    trendTitle: "Index dynamics by commodity",
    upperRange: "Upper range",
    volatilityDescription:
      "Ranking of short-term volatility and 30-day price range.",
    volatilityRange: "Volatility range",
    volatilityTitle: "Volatility and price range",
    weekUnit: "weeks",
  };
}
