import type { ReactNode } from "react";
import { AnalyticsTrendChart } from "@/components/ui/analytics-trend-chart";
import { CurrencyValue } from "@/components/ui/currency-toggle";
import { ScenarioModelPanel } from "@/components/ui/scenario-model-panel";
import { SpreadAnalysisPanel } from "@/components/ui/spread-analysis-panel";
import { VolatilityRangePanel } from "@/components/ui/volatility-range-panel";
import { SITE_CONFIG } from "@/lib/constants";
import { getFxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  commodities,
  indexUpdatedAt,
  type Commodity,
  type CommodityId,
} from "@/lib/mock-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory";

type AnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

const profileByCommodity: Partial<Record<
  CommodityId,
  { drift: number; volatility: number; phase: number }
>> = {
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
  const history = buildAnalyticsHistory(activeRespondentCount);
  const snapshot = buildMarketSnapshot(history, locale, activeRespondentCount);
  const tableRows = history.slice(-14).reverse();
  const isSpike = getActiveIndexConfig().id === "spike-ua";

  return (
    <main className={isSpike ? "spike-analytics-page overflow-hidden bg-[#050505] text-[#f8f8f2]" : ""}>
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

      <SpreadAnalysisPanel
        history={history}
        locale={locale}
      />

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

          <ScenarioModelPanel
            commodities={commodities}
            history={history}
            locale={locale}
          />
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
        const latestDate = formatShortDate(latest.date, locale);
        const sevenDay = latest.value - commodityHistory.at(-8)!.value;
        const thirtyDay = latest.value - commodityHistory.at(-31)!.value;
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

function buildAnalyticsHistory(activeRespondentCount: number): AnalyticsPoint[] {
  const dates = Array.from({ length: 360 }, (_, index) => {
    const date = new Date("2026-05-08T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() - (359 - index));
    return date.toISOString().slice(0, 10);
  });

  const rows = commodities.flatMap((commodity) => {
    const profile = getCommodityProfile(commodity.id);
    const values = dates.map((_, index) => {
      const reverseIndex = 359 - index;
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
  const latestRows = commodities.map((commodity) =>
    getCommodityHistory(history, commodity.id).at(-1),
  ).filter(Boolean) as AnalyticsPoint[];
  const monthlyRows = latestRows.map((row) => {
    const commodityHistory = getCommodityHistory(history, row.commodityId);
    return {
      commodity: getCommodity(row.commodityId),
      change: roundOne(row.value - commodityHistory.at(-31)!.value),
      volatility: standardDeviation(commodityHistory.slice(-30).map((point) => point.percentChange)),
    };
  });
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

function getCommodityHistory(history: AnalyticsPoint[], commodityId: CommodityId) {
  return history.filter((point) => point.commodityId === commodityId);
}

function getCommodity(commodityId: CommodityId): Commodity {
  return commodities.find((commodity) => commodity.id === commodityId) ?? commodities[0];
}

function getCommodityProfile(commodityId: CommodityId) {
  const configuredProfile = profileByCommodity[commodityId];

  if (configuredProfile) {
    return configuredProfile;
  }

  const commodityIndex = commodities.findIndex((commodity) => commodity.id === commodityId);

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
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
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
      highestWeeklyGain: "Найбільше місячне зростання",
      historyActions: ["Повна історія", "Export CSV", "API access"],
      historyDescription:
        "Останні опубліковані значення з базисом, зміною, кількістю респондентів і статусом публікації.",
      historyEyebrow: "Історія",
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
        row[0] === "UGA member" ? ["Spike partner", row[1], row[2], row[3]] : row,
      ),
      accessText:
        "Аналітична панель доступна як preview для SPIKE SPOT INDEX. Розширена історія, API-доступ і комерційні аналітичні зрізи можуть бути оформлені як окремі рівні доступу після запуску.",
      heroBody:
        "Порівнюйте динаміку спотових позицій, аналізуйте експортні та переробні базиси, відстежуйте волатильність і переглядайте сценарії для українських аграрних цін Spike Brokers.",
      heroTitle: "Аналітика SPIKE SPOT INDEX",
      scenarioBody:
        "Аналітична preview-модель будує можливі траєкторії індексів на основі історичної динаміки, короткострокового імпульсу та волатильності окремих позицій. Результат є сценарним діапазоном, а не гарантією майбутніх цін.",
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
    highestWeeklyGain: "Highest monthly gain",
    historyActions: ["View full history", "Export CSV", "API access"],
    historyDescription:
      "Recent published values with basis, change, respondent count and publication status.",
    historyEyebrow: "History",
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
      "Compare spot-position dynamics, review export and processing bases, track volatility and explore analytical scenarios for Spike Brokers Ukrainian agricultural prices.",
    heroTitle: "SPIKE SPOT INDEX analytics",
    scenarioBody:
      "An analytical preview model projects possible index paths using historical index movement, short-term momentum and position-specific volatility. The output is a scenario range, not a guarantee of future prices.",
    spreadDescription:
      "Relative spreads help show how export and processing positions move against each other.",
    spreadTitle: "Position spreads and premiums",
    trendDescription:
      "30-day analytics preview history for published SPIKE SPOT INDEX positions.",
    trendTitle: "Index dynamics by position",
  };
}
