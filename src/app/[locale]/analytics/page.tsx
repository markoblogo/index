import type { ReactNode } from "react";
import nextDynamic from "next/dynamic";
import { allowMockFallback, hasDatabaseUrl } from "@/lib/db";
import { getFxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getLatestPublishedMediaHubReportSummary } from "@/lib/media-hub-publication-scheduler";
import { commodities, type Commodity, type CommodityId } from "@/lib/mock-data";
import { getPublicHistoryData } from "@/lib/public-api-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";
import { getScenarioMarketReadSnapshot } from "@/lib/scenario-market-read-data";
import { getDeliveryBasisConfigForCommodityId } from "@/lib/tenant-basis";

export const dynamic = "force-dynamic";

type AnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

const AnalyticsTrendChartAsync = nextDynamic(
  () =>
    import("@/components/ui/analytics-trend-chart").then(
      (module) => module.AnalyticsTrendChart,
    ),
  {
    loading: () => (
      <div className="grid h-72 place-items-center rounded border border-black bg-white p-4 text-xs font-black uppercase tracking-[0.12em] text-black/40">
        Loading chart...
      </div>
    ),
  },
);

const CurrencyValueAsync = nextDynamic(
  () =>
    import("@/components/ui/currency-toggle").then(
      (module) => module.CurrencyValue,
    ),
  {
    loading: () => <span className="text-sm text-black/55">—</span>,
  },
);

const ScenarioModelPanelAsync = nextDynamic(
  () =>
    import("@/components/ui/scenario-model-panel").then(
      (module) => module.ScenarioModelPanel,
    ),
  {
    loading: () => (
      <div className="border border-black bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">
          Loading AI market read...
        </p>
      </div>
    ),
  },
);

const SpreadAnalysisPanelAsync = nextDynamic(
  () =>
    import("@/components/ui/spread-analysis-panel").then(
      (module) => module.SpreadAnalysisPanel,
    ),
  {
    loading: () => (
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">
          Loading spread panel...
        </p>
      </section>
    ),
  },
);

const GroupedMarketAnalyticsPanelAsync = nextDynamic(
  () =>
    import("@/components/ui/grouped-market-analytics-panel").then(
      (module) => module.GroupedMarketAnalyticsPanel,
    ),
  {
    loading: () => (
      <section className="border border-black bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">
          Loading grouped analytics...
        </p>
      </section>
    ),
  },
);

const VolatilityRangePanelAsync = nextDynamic(
  () =>
    import("@/components/ui/volatility-range-panel").then(
      (module) => module.VolatilityRangePanel,
    ),
  {
    loading: () => (
      <section className="border border-black bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">
          Loading volatility panel...
        </p>
      </section>
    ),
  },
);

const ExperimentalAnalyticsSectionAsync = nextDynamic(
  () =>
    import("@/components/analytics/ExperimentalAnalyticsSection").then(
      (module) => module.ExperimentalAnalyticsSection,
    ),
  {
    loading: () => (
      <section className="border-y border-[var(--spike-accent)]/40 bg-[#050505] px-6 py-10 text-[#f8f8f2] lg:px-8">
        <p className="mx-auto max-w-7xl text-xs font-black uppercase tracking-[0.18em] text-white/40">
          Loading experimental analytics...
        </p>
      </section>
    ),
  },
);

const VOLATILITY_WINDOWS = [90, 180, 365] as const;
type VolatilityWindow = (typeof VOLATILITY_WINDOWS)[number];

const profileByCommodity: Partial<
  Record<CommodityId, { drift: number; volatility: number; phase: number }>
> = {
  corn: { drift: 0.22, volatility: 1.2, phase: 0.2 },
  "wheat-115": { drift: 0.31, volatility: 1.05, phase: 0.85 },
  "feed-wheat": { drift: -0.08, volatility: 0.78, phase: 1.7 },
  "gmo-soybean": { drift: 0.45, volatility: 1.65, phase: 2.25 },
};

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    aiAnalytics?: string;
    experimentalAnalytics?: string;
    history?: string;
    volatilityWindow?: string;
  }>;
}) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const copy = getAnalyticsCopy(locale);
  const volatilityWindow = normalizeVolatilityWindow("365");
  const fxRatesPromise = getFxRates();
  const scenarioMarketReadSnapshotPromise = getScenarioMarketReadSnapshot();
  const mediaHubSummaryPromise = getLatestPublishedMediaHubReportSummary({
    kind: "daily",
    locale,
    tenantId: "spike-ua",
  });
  const respondentCountPromise = getActiveRespondentCountData();
  const activeRespondentCount = await respondentCountPromise;
  const useFullHistory =
    queryParams.history === "full" ||
    queryParams.experimentalAnalytics === "1" ||
    queryParams.aiAnalytics === "1";
  const history = await getAnalyticsHistory(activeRespondentCount, useFullHistory);
  const [fxRates, mediaHubSummary, scenarioMarketReadSnapshot] = await Promise.all([
    fxRatesPromise,
    mediaHubSummaryPromise,
    scenarioMarketReadSnapshotPromise,
  ]);
  const snapshot = buildMarketSnapshot(
    history,
    locale,
    activeRespondentCount,
    volatilityWindow,
  );
  const tableRows = selectRecentPublishedRows(history, 3);
  const isSpike = getActiveIndexConfig().id === "spike-ua";
  const hasHistory = history.length > 0;
  const showExperimentalAnalytics =
    isSpike &&
    hasHistory &&
    (process.env.NEXT_PUBLIC_ANALYTICS_EXPERIMENTAL_BLOCKS === "true" ||
      queryParams.experimentalAnalytics === "1");
  const showAiAnalytics =
    showExperimentalAnalytics &&
    queryParams.aiAnalytics !== "0" &&
    (process.env.NEXT_PUBLIC_ANALYTICS_AI_BLOCKS !== "false" ||
      queryParams.aiAnalytics === "1");

  return (
    <main
      className={
        isSpike
          ? "spike-analytics-page overflow-hidden bg-[#050505] text-[#f8f8f2]"
          : ""
      }
    >
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end lg:px-8 lg:py-9">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-[3.35rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-black/70 sm:text-base">
              {copy.heroBody}
            </p>
          </div>
          <div className="grid gap-2 border border-black bg-uga-mist p-3">
            {copy.workbenchLinks.map((link) => (
              <a
                className="grid grid-cols-[1fr_auto] items-center gap-3 border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:bg-uga-lime"
                href={link.href}
                key={link.label}
              >
                <span>{link.label}</span>
                <span aria-hidden="true">↘</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-7">
        <KpiStrip items={snapshot} />
      </section>

      {showExperimentalAnalytics ? (
        <ExperimentalAnalyticsSectionAsync
          enableAiAnalytics={showAiAnalytics}
          history={history}
          instruments={commodities.map((commodity) => ({
            id: commodity.id,
            label: commodity.name[locale],
          }))}
        />
      ) : null}

      {hasHistory ? (
        <>
          <section className="border-y border-black bg-uga-mist" id="movement">
            <div className="mx-auto grid max-w-7xl gap-5 px-6 py-8 lg:px-8 lg:py-10">
              <AnalyticsPanel
                description={copy.movementDescription}
                title={copy.movementTitle}
              >
                <MovementSummary history={history} locale={locale} />
              </AnalyticsPanel>
              <div id="groups">
                {isSpike ? (
                  <GroupedMarketAnalyticsPanelAsync
                    commodities={commodities}
                    history={history}
                    locale={locale}
                  />
                ) : (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <AnalyticsPanel
                      description={copy.trendDescription}
                      title={copy.trendTitle}
                    >
                      <AnalyticsTrendChartAsync
                        commodities={commodities}
                        history={history}
                        locale={locale}
                      />
                    </AnalyticsPanel>
                    <AnalyticsPanel
                      description={copy.volatilityDescription}
                      title={copy.volatilityTitle}
                    >
                      <VolatilityRangePanelAsync
                        commodities={commodities}
                        history={history}
                        locale={locale}
                      />
                    </AnalyticsPanel>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div id="spreads">
            <SpreadAnalysisPanelAsync history={history} locale={locale} />
          </div>
        </>
      ) : (
        <section className="border-y border-black bg-uga-mist">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
            <AnalyticsPanel
              description={copy.noRealDataDescription}
              title={copy.noRealDataTitle}
            >
              <p className="text-sm font-semibold leading-6 text-black/60">
                {copy.noRealDataBody}
              </p>
            </AnalyticsPanel>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
        {hasHistory ? (
          <ScenarioModelPanelAsync
            commodities={commodities}
            history={history}
            locale={locale}
            mediaHubHighlights={mediaHubSummary?.summaryBody.slice(0, 4) ?? []}
            mediaHubReportDate={mediaHubSummary?.periodEndDate}
            snapshot={scenarioMarketReadSnapshot}
          />
        ) : null}
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
    </main>
  );
}

function KpiStrip({
  items,
}: {
  items: Array<{ label: string; value: string; meta: string }>;
}) {
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

function MovementSummary({
  history,
  locale,
}: {
  history: AnalyticsPoint[];
  locale: Locale;
}) {
  const activeIndex = getActiveIndexConfig();

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
      <div className="flex min-w-max gap-4">
        {commodities.map((commodity) => {
          const commodityHistory = getCommodityHistory(history, commodity.id);
          const latest = commodityHistory.at(-1);

          if (!latest) {
            return null;
          }

          const latestDate = formatShortDate(latest.date, locale);
          const sevenDay =
            latest.value - getCalendarLookbackPoint(commodityHistory, latest.date, 7).value;
          const thirtyDay =
            latest.value - getCalendarLookbackPoint(commodityHistory, latest.date, 30).value;
          const ninetyDay =
            latest.value - getCalendarLookbackPoint(commodityHistory, latest.date, 90).value;
          const blockLabel = getMovementCardBlockLabel(commodity, locale, activeIndex);
          const vatLabel = locale === "uk" ? "з ПДВ" : "with VAT";

          return (
            <article
              className="min-h-[20rem] w-[17.5rem] rounded-[1.25rem] border border-black bg-[#050505] p-5 text-[#f8f8f2] shadow-[0_18px_55px_rgba(0,0,0,0.18)]"
              key={commodity.id}
            >
              <div className="flex min-h-6 flex-wrap items-center gap-2">
                <span className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-[var(--spike-accent)]">
                  {blockLabel}
                </span>
                {commodity.vatIncluded ? (
                  <span className="rounded-full border border-[var(--spike-pink)]/45 bg-[var(--spike-pink)]/12 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--spike-pink)]">
                    {vatLabel}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-5 min-h-[3.5rem] text-2xl font-black uppercase leading-none tracking-tight text-[#f8f8f2]">
                {commodity.name[locale]}
              </h3>
              <div className="mt-6">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/42">
                  Index
                </p>
                <p className="mt-1 text-5xl font-black leading-none text-[#f8f8f2]">
                  {latest.value.toFixed(0)}
                </p>
                <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/42">
                  {latestDate}
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <MetricDelta label="1D" value={latest.dayChange} />
                <MetricDelta label="7D" value={sevenDay} />
                <MetricDelta label="30D" value={thirtyDay} />
                <MetricDelta label="90D" value={ninetyDay} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getMovementCardBlockLabel(
  commodity: Commodity,
  locale: Locale,
  activeIndex: ReturnType<typeof getActiveIndexConfig>,
) {
  const basis = getDeliveryBasisConfigForCommodityId(commodity.id, activeIndex);

  if (basis.code === "FCA_CHOP_EXPORT") {
    return locale === "uk" ? "Чоп експорт" : "Chop Export";
  }

  if (commodity.category === "processors") {
    return locale === "uk" ? "Олійні переробка" : "Oilseeds crush";
  }

  if (commodity.category === "seasonal-export") {
    return locale === "uk" ? "Олійні експорт" : "Oilseeds Export";
  }

  return locale === "uk" ? "Зернові експорт" : "Grains Export";
}

function MetricDelta({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="rounded-[0.8rem] border border-white/10 bg-white/[0.06] px-3 py-2">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/38">
        {label}
      </p>
      <p
        className={
          isPositive
            ? "mt-1 font-black text-[var(--spike-accent)]"
            : isNegative
              ? "mt-1 font-black text-[color:var(--color-negative)]"
              : "mt-1 font-black text-white/58"
        }
      >
        {formatSigned(value)}
      </p>
    </div>
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
  const activeIndex = getActiveIndexConfig();
  const groups = groupRowsByDate(rows);

  return (
    <div className="min-w-0 border border-black bg-white">
      <div className="border-b border-black bg-uga-mist px-4 py-3 text-xs font-semibold leading-5 text-black/60">
        {copy.historyPublicLimit}
      </div>
      <div className="divide-y divide-black">
        {groups.map((group) => (
          <details className="group" key={group.date}>
            <summary className="grid cursor-pointer grid-cols-[1fr_auto] gap-4 px-4 py-4 text-left marker:hidden">
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.12em] text-black">
                  {formatShortDate(group.date, locale)}
                </span>
                <span className="mt-1 block text-xs font-semibold text-black/55">
                  {group.rows.length} {copy.historyPositionsLabel}
                </span>
              </span>
              <span className="self-center rounded-full border border-black px-3 py-1 text-xs font-black uppercase text-black transition group-open:bg-black group-open:text-white">
                {copy.expandLabel}
              </span>
            </summary>
            <div className="overflow-x-auto border-t border-black">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-uga-dark text-xs uppercase tracking-[0.14em] text-white/70">
                  <tr>
                    {copy.tableHeaders.slice(1).map((header) => (
                      <th className="px-4 py-3 font-black" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {group.rows.map((row) => {
                    const commodity = getCommodity(row.commodityId);
                    const basis = getDeliveryBasisConfigForCommodityId(
                      row.commodityId,
                      activeIndex,
                    );

                    return (
                      <tr
                        className="text-sm"
                        key={`${row.date}-${row.commodityId}`}
                      >
                        <td className="px-4 py-3 font-black text-black">
                          {commodity.name[locale]}
                        </td>
                        <td className="px-4 py-3 text-black/60">
                          {basis.name}
                        </td>
                        <td className="px-4 py-3 font-black text-black">
                          <CurrencyValueAsync
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
                        <td className="px-4 py-3 text-black/60">
                          {row.respondents}
                        </td>
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
          </details>
        ))}
      </div>
    </div>
  );
}

async function getAnalyticsHistory(activeRespondentCount: number, useFullHistory: boolean) {
  if (hasDatabaseUrl()) {
    const realHistory = await getRealAnalyticsHistory(useFullHistory);

    if (realHistory.length > 0 || !allowMockFallback()) {
      return realHistory;
    }
  }

  if (!hasDatabaseUrl() || allowMockFallback()) {
    return buildDemoAnalyticsHistory(activeRespondentCount);
  }

  return [];
}

async function getRealAnalyticsHistory(useFullHistory: boolean): Promise<AnalyticsPoint[]> {
  const rows = await getPublicHistoryData(
    useFullHistory ? { scope: "analytics" } : undefined,
  );

  return rows
    .map((row) => ({
      commodityId: row.commodityId,
      date: row.date,
      dayChange: row.changeAbs,
      percentChange: row.changePct,
      respondents: row.respondents,
      value: row.valueUsdPerMt,
    }))
    .sort((first, second) =>
      first.date === second.date
        ? compareAnalyticsRows(first, second)
        : first.date.localeCompare(second.date),
    );
}

function selectRecentPublishedRows(
  history: AnalyticsPoint[],
  dayCount: number,
) {
  const dates = [...new Set(history.map((row) => row.date))]
    .sort((first, second) => second.localeCompare(first))
    .slice(0, dayCount);
  const dateSet = new Set(dates);

  return history
    .filter((row) => dateSet.has(row.date))
    .sort((first, second) =>
      first.date === second.date
        ? compareAnalyticsRows(first, second)
        : second.date.localeCompare(first.date),
    );
}

function groupRowsByDate(rows: AnalyticsPoint[]) {
  const groups = new Map<string, AnalyticsPoint[]>();

  for (const row of rows) {
    groups.set(row.date, [...(groups.get(row.date) ?? []), row]);
  }

  return [...groups.entries()].map(([date, groupRows]) => ({
    date,
    rows: [...groupRows].sort(compareAnalyticsRows),
  }));
}

function compareAnalyticsRows(first: AnalyticsPoint, second: AnalyticsPoint) {
  const firstCommodity = getCommodity(first.commodityId);
  const secondCommodity = getCommodity(second.commodityId);
  const firstRank = getAnalyticsCommodityRank(firstCommodity);
  const secondRank = getAnalyticsCommodityRank(secondCommodity);

  return firstRank === secondRank
    ? first.commodityId.localeCompare(second.commodityId)
    : firstRank - secondRank;
}

function getAnalyticsCommodityRank(commodity: Commodity) {
  const commodityOrder = commodities.findIndex(
    (item) => item.id === commodity.id,
  );
  const groupRank =
    commodity.group === "processing"
      ? 3
      : commodity.category === "seasonal-export"
        ? 2
        : 1;

  return groupRank * 1000 + Math.max(commodityOrder, 0);
}

function buildDemoAnalyticsHistory(
  activeRespondentCount: number,
): AnalyticsPoint[] {
  const dates = Array.from({ length: 360 }, (_, index) => {
    const date = new Date("2026-05-08T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() - (359 - index));
    return date.toISOString().slice(0, 10);
  });

  const rows = commodities.flatMap((commodity) => {
    const profile = getCommodityProfile(commodity.id);
    const latest = commodity.latest ?? 0;
    const values = dates.map((_, index) => {
      const reverseIndex = 359 - index;
      const wave =
        Math.sin(index * 0.72 + profile.phase) * profile.volatility +
        Math.cos(index * 0.31 + profile.phase) * profile.volatility * 0.45;

      return roundOne(latest - reverseIndex * profile.drift + wave);
    });

    values[values.length - 1] = latest;

    return values.map((value, index) => {
      const previousValue = values[index - 1] ?? value;
      const dayChange = roundOne(value - previousValue);

      return {
        commodityId: commodity.id,
        date: dates[index],
        dayChange,
        percentChange:
          previousValue === 0 ? 0 : roundOne((dayChange / previousValue) * 100),
        respondents: activeRespondentCount,
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

function buildMarketSnapshot(
  history: AnalyticsPoint[],
  locale: Locale,
  activeRespondentCount: number,
  volatilityWindow: VolatilityWindow,
) {
  const latestRows = commodities
    .map((commodity) => getCommodityHistory(history, commodity.id).at(-1))
    .filter(Boolean) as AnalyticsPoint[];
  const copy = getAnalyticsCopy(locale);

  if (latestRows.length === 0) {
    return [
      {
        label: copy.annualVolatilitySoybean,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityRapeseed,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilitySunflower,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityCorn,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityWheat,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.respondentCoverage,
        meta: copy.currentBasket,
        value: String(activeRespondentCount),
      },
    ];
  }

  const commodityGroups = [
    {
      key: "soybean",
      ids: commodities.filter((commodity) => commodity.id.includes("soybean")).map(
        (commodity) => commodity.id,
      ),
    },
    {
      key: "rapeseed",
      ids: commodities.filter((commodity) => commodity.id.includes("rapeseed")).map(
        (commodity) => commodity.id,
      ),
    },
    {
      key: "sunflower",
      ids: commodities
        .filter((commodity) => commodity.id.includes("sunflower"))
        .map((commodity) => commodity.id),
    },
    {
      key: "corn",
      ids: commodities
        .filter((commodity) => commodity.id.includes("corn"))
        .map((commodity) => commodity.id),
    },
    {
      key: "wheat11",
      ids: commodities
        .filter((commodity) => commodity.id.includes("wheat"))
        .map((commodity) => commodity.id),
    },
  ];

  const latestDate = latestRows
    .map((row) => row.date)
    .sort((first, second) => second.localeCompare(first))[0];

  const annualVolatilityCards = commodityGroups
    .map((group) => {
      const row = getAnnualCommodityVolatility(
        history,
        group.ids,
        latestDate,
        volatilityWindow,
      );
      const label = getCommodityGroupLabel(group.key, locale);

      return {
        label,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: row === null ? "n/a" : `${row.toFixed(2)}%`,
      };
    });

  if (annualVolatilityCards.every((item) => item.value === "n/a")) {
    return [
      {
        label: copy.annualVolatilitySoybean,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityRapeseed,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilitySunflower,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityCorn,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.annualVolatilityWheat,
        meta: copyAnnualVolatilityMeta(locale, volatilityWindow),
        value: "n/a",
      },
      {
        label: copy.respondentCoverage,
        meta: copy.currentBasket,
        value: String(activeRespondentCount),
      },
    ];
  }

  return [
    ...annualVolatilityCards,
    {
      label: copy.respondentCoverage,
      meta: copy.currentBasket,
      value: String(activeRespondentCount),
    },
  ];
}

function getCommodityGroupLabel(key: string, locale: Locale) {
  const copy = getAnalyticsCopy(locale);

  if (key === "soybean") {
    return copy.annualVolatilitySoybean;
  }

  if (key === "rapeseed") {
    return copy.annualVolatilityRapeseed;
  }

  if (key === "sunflower") {
    return copy.annualVolatilitySunflower;
  }

  if (key === "corn") {
    return copy.annualVolatilityCorn;
  }

  return copy.annualVolatilityWheat;
}

function copyAnnualVolatilityMeta(locale: Locale, volatilityWindow: VolatilityWindow) {
  const map: Record<VolatilityWindow, string> = {
    90: locale === "uk" ? "90 днів" : "90 days",
    180: locale === "uk" ? "180 днів" : "180 days",
    365: locale === "uk" ? "365 днів" : "365 days",
  };

  return map[volatilityWindow];
}

function getAnnualCommodityVolatility(
  history: AnalyticsPoint[],
  commodityIds: string[],
  latestDate: string,
  volatilityWindow: VolatilityWindow,
) {
  if (commodityIds.length === 0 || latestDate.length === 0) {
    return null;
  }

  const latest = new Date(`${latestDate}T00:00:00.000Z`);
  const oneYearAgo = new Date(latest);
  oneYearAgo.setUTCDate(latest.getUTCDate() - volatilityWindow);

  const commodityHistory = history
    .filter((point) => commodityIds.includes(point.commodityId))
    .filter((point) => {
      const pointDate = new Date(`${point.date}T00:00:00.000Z`);
      return pointDate >= oneYearAgo && pointDate <= latest;
    });

  const prices = commodityHistory
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (prices.length === 0) {
    return null;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min <= 0) {
    return null;
  }

  return ((max - min) / min) * 100;
}

function normalizeVolatilityWindow(value: string | undefined): VolatilityWindow {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isNaN(parsed) && VOLATILITY_WINDOWS.includes(parsed as VolatilityWindow)) {
    return parsed as VolatilityWindow;
  }

  return 365;
}

function getCommodityHistory(
  history: AnalyticsPoint[],
  commodityId: CommodityId,
) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getPointBack(history: AnalyticsPoint[], countFromEnd: number) {
  return (
    history.at(-countFromEnd) ??
    history[0] ?? {
      commodityId: "corn" as CommodityId,
      date: "",
      dayChange: 0,
      percentChange: 0,
      respondents: 0,
      value: 0,
    }
  );
}

function getCalendarLookbackPoint(
  history: AnalyticsPoint[],
  latestDate: string,
  daysBack: number,
) {
  const targetDate = addDays(latestDate, -daysBack);
  return (
    history.filter((point) => point.date <= targetDate).at(-1) ??
    history.find((point) => point.date >= targetDate) ??
    getPointBack(history, 1)
  );
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function getCommodity(commodityId: CommodityId): Commodity {
  return (
    commodities.find((commodity) => commodity.id === commodityId) ??
    commodities[0]
  );
}

function getCommodityProfile(commodityId: CommodityId) {
  const configuredProfile = profileByCommodity[commodityId];

  if (configuredProfile) {
    return configuredProfile;
  }

  const commodityIndex = commodities.findIndex(
    (commodity) => commodity.id === commodityId,
  );

  return {
    drift: 0.16 + Math.max(commodityIndex, 0) * 0.06,
    phase: 0.45 + Math.max(commodityIndex, 0) * 0.55,
    volatility: 0.85 + Math.max(commodityIndex, 0) * 0.2,
  };
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function formatShortDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

type AnalyticsCopy = ReturnType<typeof getAnalyticsCopy>;

function getAnalyticsCopy(locale: Locale) {
  const activeIndex = getActiveIndexConfig();

  if (locale === "uk") {
    const copy = {
      accessLabels: [
        "Перший рік безкоштовно",
        "Платна аналітика планується",
        "API планується",
      ],
      accessMatrixEyebrow: "Доступ",
      accessMatrixHeaders: ["Рівень", "Історія", "Аналітика", "API"],
      accessMatrixRows: [
        ["Public preview", "30 днів", "обмежена", "ні"],
        ["Registered preview", "1 рік", "стандартна", "ні"],
        ["UGA member", "повний період", "розширена", "планується"],
        ["Paid/API", "повний період", "розширена", "так"],
      ],
      accessMatrixTitle: "Модель доступу",
      accessText:
        "Аналітична панель доступна безкоштовно протягом першого року роботи UGA Index. З 15.06.2027 розширена аналітика та API-доступ плануються у форматі платної підписки.",
      accessTitle: "Попередній доступ до аналітики",
      allCommodities: "Усі культури",
      aiBrief: {
        aiAssistedBadge: "AI-assisted",
        cautionTitle: "Caution notes",
        confidenceLabel: "Data confidence",
        coverageCaution: (count: number) =>
          `Покриття респондентів зараз ${count}. Такий brief корисний як пояснення опублікованих даних, але значення з обмеженим покриттям треба читати обережно.`,
        description:
          "Компактний AI-assisted шар над опублікованими значеннями, який не повторює індексну таблицю, а підсвічує головний сигнал дня, значущі рухи, зони нестабільності та short-term watch points.",
        disclaimer:
          "AI layer не розраховує і не коригує офіційні значення SPIKE SPOT INDEX. Він пояснює вже опубліковані дані та не є торговою рекомендацією.",
        eyebrow: "AI market intelligence",
        generatedLabel: "generated from published data",
        moversBody: (commodity: string, change: string) =>
          `Найпомітніший денний рух зараз у позиції ${commodity}: ${change} USD/t. Це сигнал для аналізу, а не рекомендація купувати чи продавати.`,
        moversTitle: "Key movements",
        noDataBody:
          "Після першої публікації індексу brief почне читати реальні published values і динаміку.",
        notAvailable: "n/a",
        officialUnchangedBadge: "Official values unchanged by AI",
        snapshotBody: (positions: number, respondents: number) =>
          `Brief читає ${positions} опублікованих позицій та поточне покриття ${respondents} респондентів. Розрахунки індексу залишаються методологічними.`,
        snapshotTitle: "Market snapshot",
        standardCaution: (count: number) =>
          `Покриття респондентів: ${count}. AI summary пояснює validated data, але не має доступу до індивідуальних подань респондентів.`,
        title: "AI Market Brief",
        volatilityBody: (commodity: string, value: string) =>
          `Найвища короткострокова волатильність у вибірці: ${commodity}, ${value}%. Це допомагає відокремити ринковий рух від шуму.`,
        volatilityTitle: "Volatility and spreads",
      },
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
      expandLabel: "розгорнути",
      filtersTitle: "Фільтри",
      fullPeriod: "Повний період",
      heroBody:
        "Порівнюйте динаміку індексів, аналізуйте структуру ринку, відстежуйте волатильність і переглядайте аналітичні сценарії для українських експортних цін на зернові та олійні культури.",
      heroEyebrow: "Аналітика",
      heroTitle: "Аналітика значень UGA Index",
      annualVolatilitySoybean: "Річна волатильність сої",
      annualVolatilityRapeseed: "Річна волатильність ріпаку",
      annualVolatilitySunflower: "Річна волатильність соняшнику",
      annualVolatilityCorn: "Річна волатильність кукурудзи",
      annualVolatilityWheat: "Річна волатильність пшениці 11,5",
      daysLabel: "днів",
      volatilityWindowLabel: "Вікно річної волатильності",
      highestWeeklyGain: "Найбільше місячне зростання",
      historyActions: ["Повна історія", "Export CSV", "API access"],
      historyDescription:
        "У відкритому блоці показані тільки останні три дні публікацій. Повна історія зберігається в системі для довгострокової аналітики, але не виводиться у публічну площину.",
      historyEyebrow: "Історія",
      historyPositionsLabel: "позицій",
      historyPublicLimit:
        "Публічний перегляд обмежено останніми 3 днями. Кожен день згорнутий за замовчуванням.",
      historyTitle: "Історія опублікованих значень",
      largestWeeklyDecline: "Найбільше місячне зниження",
      last30Days: "Останні 30 днів",
      last30DaysMeta: "останні 30 днів",
      last7Days: "останні 30 днів",
      last90Days: "Останні 90 днів",
      latestPublication: "Остання публікація",
      lowerRange: "Нижній діапазон",
      monthUnit: "місяців",
      mostVolatileCommodity: "Найбільш волатильна за місяць культура",
      movementDescription:
        "Останнє значення індексу та зміни за 1, 7, 30 і 90 днів.",
      movementTitle: "Підсумок цінових змін",
      noRealDataBody:
        "Після першої публікації індексу тут з'являться реальні історичні значення, спреди, волатильність і сценарні зрізи. Demo-серії використовуються лише в demo-режимі.",
      noRealDataDescription:
        "У production-режимі аналітика читає тільки реальні опубліковані значення з бази даних.",
      noRealDataMeta: "реальні дані ще не опубліковані",
      noRealDataTitle: "Очікуємо першу реальну публікацію",
      officialLabel: "офіційно",
      outlookDescription:
        "Місячний сценарний діапазон для довшого аналітичного горизонту.",
      outlookTitle: "Аналітичний прогноз на 12 місяців",
      plannedLabel: "за підпискою",
      previewLabel: "Попередній доступ",
      publishedLabel: "published",
      quarterTitle: "Сценарій на найближчий квартал",
      respondentCoverage: "Покриття респондентів",
      scenarioBody:
        "Аналітична preview-модель будує можливі траєкторії індексів на основі історичної динаміки, короткострокового імпульсу та волатильності окремих культур. Результат є сценарним діапазоном, а не гарантією майбутніх цін.",
      scenarioChartDescription:
        "90-денний горизонт із базовим сценарієм і верхнім/нижнім діапазоном.",
      scenarioDisclaimer:
        "Сценарні результати сформовані лише для аналітичного попереднього перегляду. Вони не є інвестиційною порадою, торговою рекомендацією або гарантованим прогнозом. Фактичні ринкові ціни можуть суттєво відрізнятися.",
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
        "30-денна історія для всіх чотирьох опублікованих індексів у режимі аналітичного preview.",
      trendTitle: "Динаміка індексів за культурами",
      upperRange: "Верхній діапазон",
      volatilityDescription:
        "Рейтинг короткострокової волатильності та 30-денного діапазону.",
      volatilityRange: "Діапазон волатильності",
      volatilityTitle: "Волатильність і ціновий діапазон",
      weekUnit: "періодів",
      workbenchLinks: [
        { href: "#movement", label: "Цінові зміни" },
        { href: "#groups", label: "Групова аналітика" },
        { href: "#spreads", label: "Спреди" },
      ],
    };

    if (activeIndex.id !== "spike-ua") {
      return copy;
    }

    return {
      ...copy,
      accessMatrixRows: copy.accessMatrixRows.map((row) =>
        row[0] === "UGA member"
          ? ["Spike partner", row[1], row[2], row[3]]
          : row,
      ),
      accessText:
        "Аналітична панель доступна як preview для SPIKE SPOT INDEX. Розширена історія, API-доступ і комерційні аналітичні зрізи можуть бути оформлені як окремі рівні доступу після запуску.",
      heroBody:
        "Порівнюйте динаміку спотових позицій, аналізуйте експортні та переробні базиси, відстежуйте волатильність і досліджуйте AI-assisted market read на основі опублікованих даних SPIKE SPOT INDEX.",
      heroTitle: "Аналітика SPIKE SPOT INDEX",
      scenarioBody:
        "Публічний AI Market Read зіставляє поточну ціну з verified historical archive: сезонністю попередніх років, схожістю з найближчим історичним роком, коротким імпульсом і спредами. Це демонструє, як AI може читати накопичені дані і формувати обережний сезонний сценарій без доступу до індивідуальних подань респондентів.",
      scenarioDisclaimer:
        "AI-assisted outputs пояснюють уже опубліковані й verified archive data. Сезонний сценарій не є інвестиційною порадою, торговою рекомендацією або гарантованим прогнозом майбутніх цін.",
      scenarioEyebrow: "AI-assisted analytics",
      scenarioTitle: "AI Market Intelligence Lab",
      spreadDescription:
        "Відносні спреди показують, як експортні та переробні позиції рухаються одна відносно одної.",
      spreadTitle: "Спреди та премії між позиціями",
      trendDescription:
        "30-денна історія для опублікованих позицій SPIKE SPOT INDEX у режимі аналітичного preview.",
      trendTitle: "Динаміка індексів за позиціями",
    };
  }

  const copy = {
    accessLabels: ["Free first year", "Paid analytics planned", "API planned"],
    accessMatrixEyebrow: "Access",
    accessMatrixHeaders: ["Access level", "History", "Analytics", "API"],
    accessMatrixRows: [
      ["Public preview", "30 days", "limited", "no"],
      ["Registered preview", "1 year", "standard", "no"],
      ["UGA member", "full period", "extended", "planned"],
      ["Paid/API", "full period", "extended", "yes"],
    ],
    accessMatrixTitle: "Access model",
    accessText:
      "The analytics dashboard is available free of charge during the first year of UGA Index operation. From 15.06.2027, extended analytics and API access are planned to move to a paid subscription model.",
    accessTitle: "Analytics access preview",
    allCommodities: "All commodities",
      aiBrief: {
        aiAssistedBadge: "AI-assisted",
      cautionTitle: "Caution notes",
      confidenceLabel: "Data confidence",
      coverageCaution: (count: number) =>
        `Respondent coverage is currently ${count}. The brief is useful as an explanation of published data, but limited-coverage values should be read with caution.`,
      description:
        "A compact AI-assisted interpretation layer above published values. It does not repeat the index table and instead highlights the main signal, meaningful moves, stability risk and short-term watch points.",
      disclaimer:
        "The AI layer does not calculate or adjust official SPIKE SPOT INDEX values. It explains already published data and is not a trading recommendation.",
      eyebrow: "AI market intelligence",
      generatedLabel: "generated from published data",
      moversBody: (commodity: string, change: string) =>
        `The most visible daily move is currently ${commodity}: ${change} USD/t. This is an analytical signal, not a buy or sell recommendation.`,
      moversTitle: "Key movements",
      noDataBody:
        "After the first index publication, the brief will read real published values and movement history.",
      notAvailable: "n/a",
      officialUnchangedBadge: "Official values unchanged by AI",
      snapshotBody: (positions: number, respondents: number) =>
        `The brief reads ${positions} published positions and current coverage from ${respondents} respondents. Index calculation remains methodology-driven.`,
      snapshotTitle: "Market snapshot",
      standardCaution: (count: number) =>
        `Respondent coverage: ${count}. The AI summary explains validated data, but does not access individual respondent submissions.`,
      title: "AI Market Brief",
        volatilityBody: (commodity: string, value: string) =>
          `The highest short-term volatility in the sample is ${commodity}, ${value}%. This helps separate market movement from noise.`,
        volatilityTitle: "Volatility and spreads",
      },
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
    expandLabel: "expand",
    filtersTitle: "Filters",
    fullPeriod: "Full period",
    heroBody:
      "Compare index dynamics, review market structure, track volatility and explore analytical scenarios for Ukrainian grain and oilseed export prices.",
    heroEyebrow: "Analytics",
    heroTitle: "Commodity intelligence for UGA Index values",
      annualVolatilitySoybean: "Annual soybean volatility",
      annualVolatilityRapeseed: "Annual rapeseed volatility",
      annualVolatilitySunflower: "Annual sunflower volatility",
      annualVolatilityCorn: "Annual corn volatility",
      annualVolatilityWheat: "Annual wheat 11.5 volatility",
      daysLabel: "days",
      volatilityWindowLabel: "Annual volatility window",
      highestWeeklyGain: "Highest monthly gain",
    historyActions: ["View full history", "Export CSV", "API access"],
    historyDescription:
      "The public block shows only the last three publication days. The full archive remains stored in the system for long-term analytics, but is not exposed publicly.",
    historyEyebrow: "History",
    historyPositionsLabel: "positions",
    historyPublicLimit:
      "Public view is limited to the last 3 days. Each day is collapsed by default.",
    historyTitle: "Published values history",
    largestWeeklyDecline: "Largest monthly decline",
    last30Days: "Last 30 days",
    last30DaysMeta: "last 30 days",
    last7Days: "last 30 days",
    last90Days: "Last 90 days",
    latestPublication: "Latest publication",
    lowerRange: "Lower range",
    monthUnit: "months",
    mostVolatileCommodity: "Most volatile commodity this month",
    movementDescription:
      "Latest index value and 1, 7, 30, and 90-day changes by commodity.",
    movementTitle: "Price movement summary",
    noRealDataBody:
      "After the first index publication, this page will show real historical values, spreads, volatility and scenario views. Demo series are used only in demo mode.",
    noRealDataDescription:
      "In production mode, analytics reads only real published database values.",
    noRealDataMeta: "real data not published yet",
    noRealDataTitle: "Waiting for the first real publication",
    officialLabel: "official",
    outlookDescription:
      "Monthly scenario range for a longer analytical horizon.",
    outlookTitle: "12-month analytical outlook",
    plannedLabel: "by subscription",
    previewLabel: "Preview access",
    publishedLabel: "published",
    quarterTitle: "Next quarter scenario",
    respondentCoverage: "Respondent coverage",
    scenarioBody:
      "An analytical preview model projects possible index paths using historical index movement, short-term momentum and commodity-specific volatility. The output is a scenario range, not a guarantee of future prices.",
    scenarioChartDescription:
      "90-day horizon with a base scenario and upper/lower range.",
    scenarioDisclaimer:
      "Scenario outputs are generated for analytical preview only. They are not investment advice, trading recommendations or guaranteed forecasts. Actual market prices may differ materially.",
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
      "30-day analytics preview history for all four published commodity indices.",
    trendTitle: "Index dynamics by commodity",
    upperRange: "Upper range",
    volatilityDescription:
      "Ranking of short-term volatility and 30-day price range.",
    volatilityRange: "Volatility range",
    volatilityTitle: "Volatility and price range",
    weekUnit: "periods",
    workbenchLinks: [
      { href: "#movement", label: "Price changes" },
      { href: "#groups", label: "Grouped analytics" },
      { href: "#spreads", label: "Spreads" },
    ],
  };

  if (activeIndex.id !== "spike-ua") {
    return copy;
  }

  return {
    ...copy,
    accessMatrixRows: copy.accessMatrixRows.map((row) =>
      row[0] === "UGA member" ? ["Spike partner", row[1], row[2], row[3]] : row,
    ),
    accessText:
      "The analytics dashboard is available as a preview for SPIKE SPOT INDEX. Extended history, API access and commercial analytics views can be introduced as separate access levels after launch.",
    heroBody:
      "Compare spot-position dynamics, review export and processing bases, track volatility and explore an AI-assisted market read based on published SPIKE SPOT INDEX data.",
    heroTitle: "SPIKE SPOT INDEX analytics",
    historyDescription:
      "For core SPIKE positions, the archive of published index values is connected from 2025-09-01 and is used for longer charts, spread views, volatility and movement analytics.",
    historyPublicLimit:
      "The recent-publications table stays compact, while charts and analytical views can use the connected core-position archive from 2025-09-01.",
    scenarioBody:
      "The public AI Market Read compares the current price with the verified historical archive: prior-year seasonality, the closest historical-year shape, short momentum and spreads. It shows how AI can read accumulated data and form a cautious seasonal scenario without accessing individual respondent submissions.",
    scenarioDisclaimer:
      "AI-assisted outputs explain already published and verified archive data. The seasonal scenario is not investment advice, a trading recommendation or a guaranteed forecast of future prices.",
    scenarioEyebrow: "AI-assisted analytics",
    scenarioTitle: "AI Market Intelligence Lab",
    spreadDescription:
      "Relative spreads help show how export and processing positions move against each other.",
    spreadTitle: "Position spreads and premiums",
    trendDescription:
      "Analytics preview for published SPIKE SPOT INDEX positions, including the connected core-position archive from 2025-09-01.",
    trendTitle: "Index dynamics by position",
  };
}
