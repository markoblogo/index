import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";
import {
  commodities,
  weeklySeries,
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

const chartColors = [
  "var(--color-green)",
  "var(--color-ink)",
  "#6b8f1a",
  "#2f7f68",
];
const demoDates = [
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-05-07",
  "2026-05-08",
];

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const history = buildAnalyticsHistory();
  const latestRows = commodities.map((commodity) => {
    const commodityHistory = history.filter(
      (point) => point.commodityId === commodity.id,
    );

    return commodityHistory[commodityHistory.length - 1];
  });
  const tableRows = history.slice(-24).reverse();

  return (
    <>
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-end">
            <SectionHeader
              label={dict.analytics.label}
              title={dict.analytics.title}
              description={dict.analytics.description}
            />
            <div className="rounded-[3px] border border-black/10 bg-uga-mist p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
                {dict.analytics.filtersTitle}
              </p>
              <div className="mt-5 grid gap-4">
                <FilterControl label={dict.analytics.commodityFilter}>
                  <select className="w-full rounded-[3px] border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black">
                    <option>{dict.analytics.allCommodities}</option>
                    {commodities.map((commodity) => (
                      <option key={commodity.id}>
                        {commodity.name[locale]}
                      </option>
                    ))}
                  </select>
                </FilterControl>
                <FilterControl label={dict.analytics.dateRangeFilter}>
                  <select className="w-full rounded-[3px] border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black">
                    <option>
                      {locale === "uk" ? "Останні 7 днів" : "Last 7 days"}
                    </option>
                    <option>
                      {locale === "uk" ? "Останній 1 рік" : "Last 1 year"}
                    </option>
                    <option>
                      {locale === "uk" ? "Повний період" : "Full period"}
                    </option>
                  </select>
                </FilterControl>
                <FilterControl label={dict.analytics.basisFilter}>
                  <select className="w-full rounded-[3px] border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black">
                    <option>{SITE_CONFIG.defaultDeliveryBasis}</option>
                  </select>
                </FilterControl>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            {dict.analytics.demoAccess}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            {dict.analytics.accessTitle}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dict.analytics.accessLevels.map((level) => (
            <article
              className="rounded-[3px] border border-black/10 bg-white p-5 "
              key={level.title}
            >
              <span className="rounded-full bg-uga-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
                {dict.analytics.demoAccess}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-black">
                {level.title}
              </h3>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-uga-green">
                {level.period}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/60">
                {level.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-uga-mist">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <ChartCard
              description={dict.analytics.historicalDescription}
              demoLabel={dict.analytics.demoAccess}
              title={dict.analytics.historicalTitle}
            >
              <HistoricalLineChart history={history} locale={locale} />
            </ChartCard>
            <ChartCard
              description={dict.analytics.dayChangeDescription}
              demoLabel={dict.analytics.demoAccess}
              title={dict.analytics.dayChangeTitle}
            >
              <DayChangeChart latestRows={latestRows} locale={locale} />
            </ChartCard>
          </div>
          <div className="mt-5">
            <ChartCard
              description={dict.analytics.comparisonDescription}
              demoLabel={dict.analytics.demoAccess}
              title={dict.analytics.comparisonTitle}
            >
              <ComparisonChart latestRows={latestRows} locale={locale} />
            </ChartCard>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            {dict.analytics.demoAccess}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            {dict.analytics.tableTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-black/65">
            {dict.analytics.tableDescription}
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-[3px] border border-black/10 bg-white ">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-uga-dark text-xs uppercase tracking-[0.16em] text-white/70">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.date}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.commodity}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.basis}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.value}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.dayChange}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.respondents}
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    {dict.analytics.table.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {tableRows.map((row) => {
                  const commodity = getCommodity(row.commodityId);

                  return (
                    <tr className="text-sm" key={`${row.commodityId}-${row.date}`}>
                      <td className="px-5 py-4 text-black/60">{row.date}</td>
                      <td className="px-5 py-4 font-semibold text-black">
                        {commodity.name[locale]}
                      </td>
                      <td className="px-5 py-4 text-black/60">
                        {SITE_CONFIG.defaultDeliveryBasis}
                      </td>
                      <td className="px-5 py-4 font-semibold text-black">
                        ${row.value.toFixed(1)} {SITE_CONFIG.currency}/
                        {SITE_CONFIG.unit}
                      </td>
                      <td
                        className={
                          row.dayChange >= 0
                            ? "px-5 py-4 font-semibold text-uga-green"
                            : "px-5 py-4 font-semibold text-black"
                        }
                      >
                        {formatSigned(row.dayChange)} USD ·{" "}
                        {formatSigned(row.percentChange)}%
                      </td>
                      <td className="px-5 py-4 text-black/60">
                        {row.respondents}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-uga-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
                          {dict.analytics.demoAccess}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
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
    <label className="grid gap-2 text-sm font-semibold text-black">
      {label}
      {children}
    </label>
  );
}

function ChartCard({
  children,
  demoLabel,
  description,
  title,
}: {
  children: ReactNode;
  demoLabel: string;
  description: string;
  title: string;
}) {
  return (
    <article className="rounded-[3px] border border-black/10 bg-white p-5  sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-black">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
            {description}
          </p>
        </div>
        <span className="w-fit rounded-full bg-uga-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
          {demoLabel}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </article>
  );
}

function HistoricalLineChart({
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
        aria-label="Historical commodity line chart"
        className="h-80 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <GridLines />
        {commodities.map((commodity, index) => {
          const commodityValues = history.filter(
            (point) => point.commodityId === commodity.id,
          );

          return (
            <polyline
              fill="none"
              key={commodity.id}
              points={toChartPoints(commodityValues.map((point) => point.value), min, max)}
              stroke={chartColors[index]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.8"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="mt-5 flex flex-wrap gap-3">
        {commodities.map((commodity, index) => (
          <div className="flex items-center gap-2 text-sm" key={commodity.id}>
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chartColors[index] }}
            />
            <span className="font-semibold text-black">
              {commodity.name[locale]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayChangeChart({
  latestRows,
  locale,
}: {
  latestRows: AnalyticsPoint[];
  locale: Locale;
}) {
  const maxAbs = Math.max(...latestRows.map((row) => Math.abs(row.dayChange)), 1);

  return (
    <div className="grid gap-4">
      {latestRows.map((row) => {
        const commodity = getCommodity(row.commodityId);
        const width = `${Math.max((Math.abs(row.dayChange) / maxAbs) * 100, 8)}%`;

        return (
          <div key={row.commodityId}>
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="font-semibold text-black">
                {commodity.name[locale]}
              </span>
              <span
                className={
                  row.dayChange >= 0
                    ? "font-semibold text-uga-green"
                    : "font-semibold text-black"
                }
              >
                {formatSigned(row.dayChange)} USD
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-uga-mist">
              <div
                className={
                  row.dayChange >= 0
                    ? "h-full rounded-full bg-uga-green"
                    : "h-full rounded-full bg-red-700"
                }
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparisonChart({
  latestRows,
  locale,
}: {
  latestRows: AnalyticsPoint[];
  locale: Locale;
}) {
  const max = Math.max(...latestRows.map((row) => row.value), 1);

  return (
    <div className="grid gap-4">
      {latestRows.map((row) => {
        const commodity = getCommodity(row.commodityId);
        const width = `${(row.value / max) * 100}%`;

        return (
          <div
            className="grid gap-3 rounded-[3px] bg-uga-mist p-4 md:grid-cols-[13rem_1fr_6rem] md:items-center"
            key={row.commodityId}
          >
            <div>
              <p className="text-sm font-semibold text-black">
                {commodity.name[locale]}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                {commodity.code}
              </p>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-uga-green"
                style={{ width }}
              />
            </div>
            <p className="text-right text-lg font-semibold text-black">
              ${row.value.toFixed(1)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function GridLines() {
  return (
    <>
      {[18, 34, 50, 66, 82].map((y) => (
        <line
          key={y}
          stroke="var(--color-ink)"
          strokeOpacity="0.08"
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
  return commodities.flatMap((commodity) =>
    weeklySeries[commodity.id].map((value, index, values) => {
      const previousValue = values[index - 1] ?? value;
      const dayChange = roundOne(value - previousValue);

      return {
        date: demoDates[index],
        commodityId: commodity.id,
        value,
        dayChange,
        percentChange:
          previousValue === 0 ? 0 : roundOne((dayChange / previousValue) * 100),
        respondents: commodity.id === "gmo-soybean" && index === 6 ? 6 : 8,
      };
    }),
  );
}

function toChartPoints(values: number[], min: number, max: number) {
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");
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
