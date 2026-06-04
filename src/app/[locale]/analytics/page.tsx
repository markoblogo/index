import type { ReactNode } from "react";
import { AnalyticsTrendChart } from "@/components/ui/analytics-trend-chart";
import { CurrencyValue } from "@/components/ui/currency-toggle";
import { ScenarioModelPanel } from "@/components/ui/scenario-model-panel";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import { SpreadAnalysisPanel } from "@/components/ui/spread-analysis-panel";
import { VolatilityRangePanel } from "@/components/ui/volatility-range-panel";
import {
  getPublishedAiMarketBrief,
  type PublicAiMarketBrief,
} from "@/lib/ai-market-brief";
import { SITE_CONFIG } from "@/lib/constants";
import { allowMockFallback, hasDatabaseUrl } from "@/lib/db";
import { getFxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getPublishedWeeklyReports } from "@/lib/weekly-ai-report";
import { commodities, type Commodity, type CommodityId } from "@/lib/mock-data";
import { getPublicHistoryData } from "@/lib/public-api-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory";

type AnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

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
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = getAnalyticsCopy(locale);
  const fxRates = await getFxRates();
  const activeRespondentCount = await getActiveRespondentCountData();
  const history = await getAnalyticsHistory(activeRespondentCount);
  const snapshot = buildMarketSnapshot(history, locale, activeRespondentCount);
  const tableRows = selectRecentPublishedRows(history, 3);
  const isSpike = getActiveIndexConfig().id === "spike-ua";
  const hasHistory = history.length > 0;
  const aiBrief = isSpike
    ? await getPublishedAiMarketBrief({
        activeRespondentCount,
        history,
        locale,
      })
    : null;
  const weeklyReports = isSpike ? await getPublishedWeeklyReports() : [];
  const latestWeeklyReport = weeklyReports[0] ?? null;

  return (
    <main
      className={
        isSpike
          ? "spike-analytics-page overflow-hidden bg-[#050505] text-[#f8f8f2]"
          : ""
      }
    >
      <section className="border-b border-black bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <KpiStrip items={snapshot} />
      </section>

      {aiBrief ? (
        <AiMarketBriefSection
          brief={aiBrief}
          copy={copy.aiBrief}
          locale={locale}
        />
      ) : null}

      {isSpike ? (
        <WeeklyReportSection
          copy={copy.weeklyReport}
          locale={locale}
          report={latestWeeklyReport}
        />
      ) : null}

      {hasHistory ? (
        <>
          <section className="border-y border-black bg-uga-mist">
            <div className="mx-auto grid max-w-7xl gap-5 px-6 py-12 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-14">
              <AnalyticsPanel
                description={copy.trendDescription}
                title={copy.trendTitle}
              >
                <AnalyticsTrendChart
                  commodities={commodities}
                  history={history}
                  locale={locale}
                />
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
                <VolatilityRangePanel
                  commodities={commodities}
                  history={history}
                  locale={locale}
                />
              </AnalyticsPanel>
            </div>
          </section>

          <SpreadAnalysisPanel history={history} locale={locale} />
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

          {hasHistory ? (
            <ScenarioModelPanel
              commodities={commodities}
              history={history}
              locale={locale}
            />
          ) : null}
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

function AiMarketBriefSection({
  brief,
  copy,
  locale,
}: {
  brief: PublicAiMarketBrief;
  copy: AnalyticsCopy["aiBrief"];
  locale: Locale;
}) {
  return (
    <section className="border-y border-white/10 bg-[#101010]">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[0.76fr_1.24fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-normal text-white">
            {copy.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/64">
            {copy.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em]">
            <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
              {copy.aiAssistedBadge}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.generatedLabel}: {brief.generatedAt}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.confidenceLabel}:{" "}
              {mapBriefConfidenceLabel(brief.confidence, locale)}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.officialUnchangedBadge}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {brief.blocks[0] ? (
            <article className="rounded-[1rem] border border-[var(--spike-accent)]/60 bg-[#f8f8f2] p-5 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[0].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
                {brief.blocks[0].body}
              </p>
            </article>
          ) : null}
          {brief.blocks.slice(1, 3).map((block) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505]"
              key={block.title}
            >
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {block.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {block.body}
              </p>
            </article>
          ))}
          {brief.blocks[3] ? (
            <article className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[3].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {brief.blocks[3].body}
              </p>
            </article>
          ) : null}
          <p className="rounded-[1rem] border border-white/10 bg-black/45 p-4 text-xs font-semibold leading-5 text-white/58 md:col-span-2">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

function WeeklyReportSection({
  copy,
  locale,
  report,
}: {
  copy: AnalyticsCopy["weeklyReport"];
  locale: Locale;
  report: Awaited<ReturnType<typeof getPublishedWeeklyReports>>[number] | null;
}) {
  return (
    <section className="border-y border-white/10 bg-[#0b0b0b]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal text-white">
              {copy.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/64">
              {copy.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em]">
              {report ? (
                <>
                  <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
                    AI-assisted
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.weekEndingLabel}:{" "}
                    {formatWeeklyBadgeDate(report.weekEndDate, locale) ??
                      report.weekEndDate}
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.publicationLabel}:{" "}
                    {formatWeeklyBadgeDate(report.publishedAt, locale) ??
                      report.weekEndDate}
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.confidenceLabel}: {report.dataConfidence}
                  </span>
                </>
              ) : (
                <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                  {copy.noReportLabel}
                </span>
              )}
            </div>
            {report?.content?.executiveSummary?.[0] ? (
              <p className="mt-5 rounded-[1rem] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/74">
                {report.content.executiveSummary[0]}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-black transition hover:bg-[var(--spike-accent)]"
                href={report ? `/${locale}/analytics/weekly-reports/${report.slug}` : `/${locale}/analytics/weekly-reports`}
              >
                {report ? copy.openLatestCta : copy.viewArchiveCta}
              </a>
              <a
                className="rounded-full border border-white/18 px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:border-[var(--spike-accent)] hover:text-[var(--spike-accent)]"
                href={`/${locale}/analytics/weekly-reports`}
              >
                {copy.allReportsCta}
              </a>
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-white/10 bg-[#050505] p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    {copy.previewLabel}
                  </p>
                  <p className="mt-2 text-lg font-black uppercase tracking-normal text-white">
                    {copy.previewTitle}
                  </p>
                </div>
                <span className="rounded-full border border-white/14 px-3 py-1 text-xs font-black uppercase text-white/65 transition group-open:bg-white group-open:text-black">
                  {copy.expandLabel}
                </span>
              </summary>
              <div className="mt-5">
                {report ? (
                  <WeeklyReportView report={report} />
                ) : (
                  <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/64">
                    {copy.noReportBody}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatWeeklyBadgeDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
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
        const latest = commodityHistory.at(-1);

        if (!latest) {
          return null;
        }

        const latestDate = formatShortDate(latest.date, locale);
        const sevenDay = latest.value - getPointBack(commodityHistory, 8).value;
        const thirtyDay =
          latest.value - getPointBack(commodityHistory, 31).value;
        const ninetyDay = latest.value - commodityHistory[0].value;

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
            <div className="grid grid-cols-5 gap-3 text-right text-xs">
              <div className="min-w-[4.25rem]">
                <p className="font-black text-black/45">INDEX</p>
                <p className="mt-1 font-black text-black">
                  {latest.value.toFixed(0)}
                </p>
                <p className="mt-1 text-[0.65rem] font-semibold leading-none text-black/45">
                  {latestDate}
                </p>
              </div>
              <MetricDelta label="1D" value={latest.dayChange} />
              <MetricDelta label="7D" value={sevenDay} />
              <MetricDelta label="30D" value={thirtyDay} />
              <MetricDelta label="90D" value={ninetyDay} />
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

                    return (
                      <tr
                        className="text-sm"
                        key={`${row.date}-${row.commodityId}`}
                      >
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

async function getAnalyticsHistory(activeRespondentCount: number) {
  if (hasDatabaseUrl()) {
    const realHistory = await getRealAnalyticsHistory();

    if (realHistory.length > 0 || !allowMockFallback()) {
      return realHistory;
    }
  }

  if (!hasDatabaseUrl() || allowMockFallback()) {
    return buildDemoAnalyticsHistory(activeRespondentCount);
  }

  return [];
}

async function getRealAnalyticsHistory(): Promise<AnalyticsPoint[]> {
  const rows = await getPublicHistoryData();

  return rows
    .map((row) => ({
      commodityId: row.commodityId,
      date: row.date,
      dayChange: row.changeAbs,
      percentChange: row.changePct,
      respondents: row.respondents,
      value: row.valueUsdPerMt,
    }))
    .sort((a, b) =>
      a.date === b.date
        ? a.commodityId.localeCompare(b.commodityId)
        : a.date.localeCompare(b.date),
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
        ? first.commodityId.localeCompare(second.commodityId)
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
    rows: groupRows,
  }));
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
) {
  const latestRows = commodities
    .map((commodity) => getCommodityHistory(history, commodity.id).at(-1))
    .filter(Boolean) as AnalyticsPoint[];
  const monthlyRows = latestRows.map((row) => {
    const commodityHistory = getCommodityHistory(history, row.commodityId);
    const previousMonthlyPoint = getPointBack(commodityHistory, 31);
    return {
      commodity: getCommodity(row.commodityId),
      change: roundOne(row.value - previousMonthlyPoint.value),
      volatility: standardDeviation(
        commodityHistory.slice(-30).map((point) => point.percentChange),
      ),
    };
  });

  if (monthlyRows.length === 0) {
    const copy = getAnalyticsCopy(locale);

    return [
      {
        label: copy.highestWeeklyGain,
        meta: copy.noRealDataMeta,
        value: "n/a",
      },
      {
        label: copy.largestWeeklyDecline,
        meta: copy.noRealDataMeta,
        value: "n/a",
      },
      {
        label: copy.mostVolatileCommodity,
        meta: copy.noRealDataMeta,
        value: "n/a",
      },
      {
        label: copy.latestPublication,
        meta: SITE_CONFIG.defaultDeliveryBasis,
        value: "n/a",
      },
      { label: copy.volatilityRange, meta: copy.last30DaysMeta, value: "n/a" },
      {
        label: copy.respondentCoverage,
        meta: copy.currentBasket,
        value: String(activeRespondentCount),
      },
    ];
  }

  const highestGain = monthlyRows.reduce((max, row) =>
    row.change > max.change ? row : max,
  );
  const largestDecline = monthlyRows.reduce((min, row) =>
    row.change < min.change ? row : min,
  );
  const mostVolatile = monthlyRows.reduce((max, row) =>
    row.volatility > max.volatility ? row : max,
  );
  const copy = getAnalyticsCopy(locale);
  const volatilityValues = monthlyRows.map((row) => row.volatility);
  const minVolatility = Math.min(...volatilityValues).toFixed(2);
  const maxVolatility = Math.max(...volatilityValues).toFixed(2);
  const latestDate = latestRows
    .map((row) => row.date)
    .sort((first, second) => second.localeCompare(first))[0];
  const updatedAt = new Intl.DateTimeFormat(
    locale === "uk" ? "uk-UA" : "en-US",
    {
      dateStyle: "medium",
    },
  ).format(new Date(`${latestDate}T00:00:00.000Z`));

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
      label: copy.mostVolatileCommodity,
      meta: mostVolatile.commodity.name[locale],
      value: mostVolatile.volatility.toFixed(2) + "%",
    },
    {
      label: copy.latestPublication,
      meta: SITE_CONFIG.defaultDeliveryBasis,
      value: updatedAt,
    },
    {
      label: copy.volatilityRange,
      meta: copy.last30DaysMeta,
      value: `${minVolatility}-${maxVolatility}%`,
    },
    {
      label: copy.respondentCoverage,
      meta: copy.currentBasket,
      value: String(activeRespondentCount),
    },
  ];
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

type AnalyticsCopy = ReturnType<typeof getAnalyticsCopy>;

function mapBriefConfidenceLabel(confidence: string, locale: Locale) {
  if (locale === "uk") {
    return confidence === "limited"
      ? "обмежена"
      : confidence === "strong"
        ? "висока"
        : "нормальна";
  }

  return confidence === "limited"
    ? "limited"
    : confidence === "strong"
      ? "strong"
      : "normal";
}

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
      weeklyReport: {
        allReportsCta: "Усі щотижневі звіти",
        confidenceLabel: "Рівень даних",
        description:
          "Щотижневий AI-assisted огляд ринку, який об’єднує дані SPIKE SPOT INDEX, логістику, експортні потоки, біржовий фон, зовнішні ринкові фактори та перевірені джерела у структурований звіт для сайту й Telegram.",
        expandLabel: "Перегляд",
        eyebrow: "Щотижневий звіт",
        noReportBody:
          "Щотижневі звіти створюються після завершення ринкового тижня і публікуються після перегляду.",
        noReportLabel: "Ще немає опублікованого щотижневого звіту",
        openLatestCta: "Відкрити останній звіт",
        previewLabel: "Останній опублікований звіт",
        previewTitle: "Згорнутий перегляд",
        publicationLabel: "Публікація",
        title: "Weekly AI Commodity & Logistics Report",
        viewArchiveCta: "Переглянути архів звітів",
        weekEndingLabel: "Тиждень до",
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
        "Порівнюйте динаміку спотових позицій, аналізуйте експортні та переробні базиси, відстежуйте волатильність і досліджуйте AI-assisted аналітичні сценарії на основі опублікованих даних SPIKE SPOT INDEX.",
      heroTitle: "Аналітика SPIKE SPOT INDEX",
      scenarioBody:
        "AI-assisted analytics layer перетворює дані SPIKE SPOT INDEX на структурований ринковий контекст. Він аналізує опублікований рух індексу, короткостроковий імпульс, волатильність, цінові діапазони та поведінку спредів, а потім генерує аналітичні нотатки, які допомагають зрозуміти, що змінилося і де ринок потребує більшої уваги. AI scenario outputs базуються на історичному русі індексу, recent momentum і позиційній волатильності. Вони створені для market exploration, а не для прогнозування. AI layer не генерує офіційні значення індексу, не має доступу до індивідуальних подань респондентів і не надає торгових порад. Офіційні значення залишаються методологічними та locked після публікації.",
      scenarioDisclaimer:
        "AI-assisted outputs є лише аналітичними previews. Вони не є інвестиційною порадою, торговою рекомендацією або гарантованим прогнозом.",
      scenarioEyebrow: "AI-assisted analytics",
      scenarioTitle: "AI-assisted market intelligence",
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
      weeklyReport: {
        allReportsCta: "All weekly reports",
        confidenceLabel: "Data confidence",
        description:
          "A weekly AI-assisted market report combining SPIKE SPOT INDEX data, logistics inputs, export flows, futures context, external market factors and verified sources into a structured website and Telegram report.",
        expandLabel: "Preview",
        eyebrow: "Weekly report",
        noReportBody:
          "Weekly reports are generated after the market week closes and published after review.",
        noReportLabel: "No published weekly report yet",
        openLatestCta: "Open latest weekly report",
        previewLabel: "Latest published report",
        previewTitle: "Collapsed preview",
        publicationLabel: "Publication",
        title: "Weekly AI Commodity & Logistics Report",
        viewArchiveCta: "View weekly reports",
        weekEndingLabel: "Week ending",
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
      "Compare spot-position dynamics, review export and processing bases, track volatility and explore AI-assisted analytical scenarios based on published SPIKE SPOT INDEX data.",
    heroTitle: "SPIKE SPOT INDEX analytics",
    scenarioBody:
      "The AI-assisted analytics layer turns SPIKE SPOT INDEX data into structured market context. It reviews published index movement, short-term momentum, volatility, price ranges and spread behaviour, then generates analytical notes that help users understand what changed and where the market may require closer attention. AI scenario outputs are based on historical index movement, recent momentum and position-specific volatility. They are designed for market exploration, not prediction. The AI layer does not generate official index values, does not access individual respondent submissions and does not provide trading advice. Official values remain methodology-based and locked after publication.",
    scenarioDisclaimer:
      "AI-assisted outputs are analytical previews only. They are not investment advice, trading recommendations or guaranteed forecasts.",
    scenarioEyebrow: "AI-assisted analytics",
    scenarioTitle: "AI-assisted market intelligence",
    spreadDescription:
      "Relative spreads help show how export and processing positions move against each other.",
    spreadTitle: "Position spreads and premiums",
    trendDescription:
      "30-day analytics preview history for published SPIKE SPOT INDEX positions.",
    trendTitle: "Index dynamics by position",
  };
}
