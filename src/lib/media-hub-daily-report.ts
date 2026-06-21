import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig, type IndexCommodityConfig } from "@/lib/index-platform";
import type { PublicHistoryItem, PublicLatestItem } from "@/lib/public-api-data";

export type SsiDailyIndexGroupId = "all_season" | "seasonal" | "processing";
export type DailyNewsThemeId =
  | "key_signals"
  | "grains"
  | "oilseeds"
  | "logistics"
  | "crop_weather"
  | "policy"
  | "processing"
  | "international"
  | "regional";

export type SsiDailyIndexItem = {
  basis: string;
  commodityCode: string;
  comment: string;
  dayChange: number | null;
  groupId: SsiDailyIndexGroupId;
  name: string;
  previousFridayChange: number | null;
  previousFridayDate: string | null;
  sortOrder: number;
  unit: "USD/t";
  value: number | null;
  vatIncluded: boolean;
};

export type SsiDailyIndexGroup = {
  id: SsiDailyIndexGroupId;
  items: SsiDailyIndexItem[];
  subtitle: string;
  title: string;
};

export type DailyNewsTheme = {
  id: DailyNewsThemeId;
  items: string[];
  title: string;
};

export type MediaHubDailyReportView = {
  indexSection?: {
    date: string;
    groups: SsiDailyIndexGroup[];
    notes: string[];
    title: string;
  };
  newsSection: {
    themes: DailyNewsTheme[];
    title: string;
  };
};

const SSI_GROUPS: Array<Omit<SsiDailyIndexGroup, "items">> = [
  { id: "all_season", title: "ALL SEASON", subtitle: "основні індекси" },
  { id: "seasonal", title: "SEASONAL", subtitle: "сезонні індекси" },
  { id: "processing", title: "PROCESSING", subtitle: "переробка" },
];

const UK_DAILY_THEME_TITLES: Record<DailyNewsThemeId, string> = {
  key_signals: "🔎 Головні сигнали",
  grains: "🌾 Ринок зернових",
  oilseeds: "🌻 Олійні та продукти переробки",
  logistics: "🚚 Логістика та експорт",
  crop_weather: "🌦 Урожай, погода та виробництво",
  policy: "⚖️ Політика, регулювання та торгівля",
  processing: "🏭 Переробка, попит та внутрішній ринок",
  international: "🌍 Міжнародний контекст",
  regional: "🌍 Регіональні нотатки",
};

const EN_DAILY_THEME_TITLES: Record<DailyNewsThemeId, string> = {
  key_signals: "🔎 Key signals",
  grains: "🌽 Grains",
  oilseeds: "🌱 Oilseeds and vegetable oils",
  logistics: "🚢 Logistics and freight",
  crop_weather: "🌦 Crop weather and production",
  policy: "⚖️ Trade policy and demand",
  processing: "🏭 Processing and domestic demand",
  international: "🌍 International context",
  regional: "🌍 Regional notes",
};

export function buildSsiDailyReportView(input: {
  historyData: PublicHistoryItem[];
  latestData: PublicLatestItem[];
  localizedSummary: string[];
  localizedTitle?: string;
  locale: Locale;
  periodEndDate: string;
}): MediaHubDailyReportView {
  const indexGroups = groupSsiIndicesForDailyReport(
    buildSsiDailyIndexFacts(input.latestData, input.historyData, input.periodEndDate, input.locale),
  );

  return {
    indexSection: {
      date: input.periodEndDate,
      groups: indexGroups,
      notes: [
        "Ціни вказані для поставки протягом 30 днів, якщо інше не зазначено в індексі.",
        "Паритет - це відображення цін заводів із різних регіонів України, приведених до єдиного базису CPT Одеса з урахуванням логістичних витрат.",
      ],
      title: "SPIKE Spot Commodity Index Ukraine",
    },
    newsSection: {
      themes: buildDailyNewsThemes(input.localizedSummary, input.locale, "spike"),
      title: input.localizedTitle || `Щоденний аграрний огляд SPIKE SPOT INDEX Україна - ${formatHumanDate(input.periodEndDate, "uk")}`,
    },
  };
}

export function build1d3xDailyReportView(input: {
  localizedSummary: string[];
  localizedTitle?: string;
  periodEndDate: string;
}): MediaHubDailyReportView {
  return {
    newsSection: {
      themes: buildDailyNewsThemes(input.localizedSummary, "en", "platform"),
      title: input.localizedTitle || `Daily Global Grains and Oilseeds Market Review - ${formatHumanDate(input.periodEndDate, "en")}`,
    },
  };
}

export function buildSsiDailyIndexFacts(
  latestData: PublicLatestItem[],
  historyData: PublicHistoryItem[],
  reportDate: string,
  locale: Locale = "uk",
): SsiDailyIndexItem[] {
  const config = getActiveIndexConfig();
  const commodityByCode = new Map<string, IndexCommodityConfig>();
  for (const commodity of config.commodities) {
    commodityByCode.set(commodity.code, commodity);
    commodityByCode.set(commodity.dbCode, commodity);
    commodityByCode.set(commodity.id, commodity);
  }
  const previousFriday = getPreviousWeekFriday(reportDate);

  return latestData
    .map((item) => {
      const commodity = commodityByCode.get(item.commodityCode) ?? commodityByCode.get(item.commodityId);
      const previousFridayRow = findLatestHistoryOnOrBefore(
        historyData,
        item.commodityCode,
        item.commodityId,
        previousFriday,
      );
      const value = item.valueUsdPerMt;
      const previousFridayValue = previousFridayRow?.valueUsdPerMt ?? null;
      const previousFridayChange =
        value === null || previousFridayValue === null
          ? null
          : roundOne(value - previousFridayValue);

      return {
        basis: formatBasis(item.basis, locale),
        commodityCode: item.commodityCode,
        comment: buildIndexMoveComment({
          dayChange: item.valueUsdPerMt === null ? null : item.changeAbs,
          previousFridayChange,
        }),
        dayChange: item.valueUsdPerMt === null ? null : item.changeAbs,
        groupId: getSsiIndexGroupId(commodity, item),
        name: locale === "uk" ? item.commodityNameUk : item.commodityNameEn,
        previousFridayChange,
        previousFridayDate: previousFridayRow?.date ?? null,
        sortOrder: commodity?.sortOrder ?? 999,
        unit: "USD/t" as const,
        value,
        vatIncluded: Boolean(commodity?.vatIncluded),
      };
    })
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

export function groupSsiIndicesForDailyReport(items: SsiDailyIndexItem[]): SsiDailyIndexGroup[] {
  return SSI_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.groupId === group.id),
  }));
}

export function getPreviousPublishedBusinessDay(reportDate: string) {
  const cursor = parseIsoDate(reportDate);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6);

  return toIsoDate(cursor);
}

export function getPreviousWeekFriday(reportDate: string) {
  const cursor = parseIsoDate(reportDate);
  const day = cursor.getUTCDay();
  const daysSinceFriday = (day + 2) % 7;
  const delta = daysSinceFriday === 0 ? 7 : daysSinceFriday;
  cursor.setUTCDate(cursor.getUTCDate() - delta);
  return toIsoDate(cursor);
}

export function formatIndexValue(value: number | null, unit = "USD/t") {
  return value === null ? "дані недоступні" : `${formatNumber(value)} ${unit}`;
}

export function formatIndexChange(value: number | null, suffix = "") {
  if (value === null) {
    return "дані недоступні";
  }
  const formatted = value === 0 ? "0" : `${value > 0 ? "+" : ""}${formatNumber(value)}`;
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function renderSsiDailyIndexTelegramSection(indexSection: NonNullable<MediaHubDailyReportView["indexSection"]>) {
  const groups = indexSection.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.value !== null),
    }))
    .filter((group) => group.items.length > 0);
  if (groups.length === 0) {
    return [];
  }
  const lines = [
    `<b>📊 ${escapeHtml(indexSection.title)}</b>`,
  ];

  for (const group of groups) {
    lines.push("", "-----------------------------", `<b>${escapeHtml(group.title)}</b>`, `<i>${escapeHtml(group.subtitle)}</i>`);
    const byBasis = groupItemsByBasis(group.items);
    if (byBasis.length === 0) {
      continue;
    }
    for (const [basis, items] of byBasis) {
      lines.push("", `<b>${escapeHtml(basis.toUpperCase())}</b>`);
      for (const item of items) {
        const vat = item.vatIncluded ? " в т.ч. ПДВ" : "";
        lines.push(
          `• ${escapeHtml(item.name)} - <b>${escapeHtml(formatIndexValue(item.value, item.unit))}</b>${vat} (${escapeHtml(formatIndexChange(item.dayChange, "d/d"))}; ${escapeHtml(formatIndexChange(item.previousFridayChange, "до пт"))})`,
          `  ↳ ${escapeHtml(item.comment)}`,
        );
      }
    }
  }

  lines.push(
    "",
    "<i>ℹ️ Примітка:</i>",
    ...indexSection.notes.map((note) => `<i>• ${escapeHtml(note)}</i>`),
  );

  return lines;
}

export function renderDailyNewsTelegramSection(newsSection: MediaHubDailyReportView["newsSection"]) {
  const lines = [`<b>${escapeHtml(newsSection.title)}</b>`];
  for (const theme of newsSection.themes) {
    if (theme.items.length === 0) continue;
    lines.push("", `<b>${escapeHtml(theme.title)}</b>`);
    lines.push(...theme.items.map((item) => `• ${escapeHtml(item)}`));
  }
  return lines;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildDailyNewsThemes(
  summary: string[],
  locale: Locale,
  tenant: "spike" | "platform",
): DailyNewsTheme[] {
  const titles = locale === "uk" ? UK_DAILY_THEME_TITLES : EN_DAILY_THEME_TITLES;
  const normalized = normalizeSummaryLines(summary);
  const sections = parseSectionedSummary(normalized, titles);
  if (sections.length > 0) {
    return sections;
  }

  const primary: DailyNewsThemeId[] = tenant === "platform"
    ? ["key_signals", "grains", "oilseeds", "logistics", "crop_weather", "policy", "regional"]
    : ["key_signals", "grains", "oilseeds", "logistics", "crop_weather", "policy", "processing", "international"];
  const keySignals = normalized
    .filter((line) => !isKnownThemeHeading(line, titles))
    .slice(0, tenant === "platform" ? 5 : 7);
  return primary
    .map((id, index) => ({
      id,
      items: index === 0 ? keySignals : [],
      title: titles[id],
    }))
    .filter((theme) => theme.items.length > 0);
}

function parseSectionedSummary(
  summary: string[],
  titles: Record<DailyNewsThemeId, string>,
): DailyNewsTheme[] {
  const titleEntries = Object.entries(titles) as Array<[DailyNewsThemeId, string]>;
  const themes: DailyNewsTheme[] = [];
  let current: DailyNewsTheme | null = null;

  for (const line of summary) {
    const matched = titleEntries.find(([, title]) => normalizeHeading(title) === normalizeHeading(line));
    if (matched) {
      current = { id: matched[0], items: [], title: matched[1] };
      themes.push(current);
      continue;
    }
    if (!current) {
      continue;
    }
    current.items.push(stripBullet(line));
  }

  return themes.filter((theme) => theme.items.length > 0);
}

function normalizeSummaryLines(summary: string[]) {
  return summary
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^ai-assisted/i.test(line))
    .filter((line) => !/^data confidence/i.test(line))
    .filter((line) => !isUnavailablePlaceholder(line));
}

function stripBullet(value: string) {
  return value.replace(/^[•\-\s]+/, "").trim();
}

function normalizeHeading(value: string) {
  return value.replace(/[^\p{L}\p{N}\s]/gu, "").trim().toLowerCase();
}

function isKnownThemeHeading(value: string, titles: Record<DailyNewsThemeId, string>) {
  const normalized = normalizeHeading(value);
  return Object.values(titles).some((title) => normalizeHeading(title) === normalized);
}

function isUnavailablePlaceholder(value: string) {
  return /(^|\b)(data unavailable|дані недоступні|немає даних|no concrete|no specific|not available|n\/a)\b/i.test(value);
}

function getSsiIndexGroupId(
  commodity: IndexCommodityConfig | undefined,
  item: PublicLatestItem,
): SsiDailyIndexGroupId {
  if (commodity?.category === "processors" || commodity?.group === "processing") {
    return "processing";
  }
  if (commodity?.category === "seasonal-export") {
    return "seasonal";
  }
  const basis = item.basis.toLowerCase();
  if (basis.includes("parity") || basis.includes("processing")) {
    return "processing";
  }
  return "all_season";
}

function findLatestHistoryOnOrBefore(
  history: PublicHistoryItem[],
  commodityCode: string,
  commodityId: string,
  date: string,
) {
  return history
    .filter((item) =>
      (item.commodityCode === commodityCode || item.commodityId === commodityId) &&
      item.date <= date,
    )
    .sort((first, second) => second.date.localeCompare(first.date))[0] ?? null;
}

function buildIndexMoveComment(input: {
  dayChange: number | null;
  previousFridayChange: number | null;
}) {
  if (input.dayChange === null && input.previousFridayChange === null) {
    return "Для цієї позиції бракує даних для порівняння.";
  }
  if (input.previousFridayChange === null) {
    return `Денна зміна: ${formatIndexChange(input.dayChange, "USD/t")}; порівняння з минулою п'ятницею недоступне.`;
  }
  if (input.dayChange === 0 && input.previousFridayChange === 0) {
    return "Денна зміна не зафіксована; індекс на рівні минулої п'ятниці.";
  }
  if ((input.dayChange ?? 0) < 0 && input.previousFridayChange < 0) {
    return "Індекс нижчий за рівень минулої п'ятниці; денний рух додав до цього відхилення.";
  }
  if ((input.dayChange ?? 0) > 0 && input.previousFridayChange < 0) {
    return "Зростання за день скоротило відхилення від рівня минулої п'ятниці.";
  }
  if ((input.dayChange ?? 0) < 0 && input.previousFridayChange > 0) {
    return "Денне зниження зменшило приріст відносно минулої п'ятниці.";
  }
  if ((input.dayChange ?? 0) > 0 && input.previousFridayChange > 0) {
    return "Індекс вищий за рівень минулої п'ятниці; денний рух підтримав цю різницю.";
  }
  return "Денна зміна не змінила тижневу картину.";
}

function groupItemsByBasis(items: SsiDailyIndexItem[]) {
  const map = new Map<string, SsiDailyIndexItem[]>();
  for (const item of items) {
    const basis = item.basis || "Базис не зазначено";
    map.set(basis, [...(map.get(basis) ?? []), item]);
  }
  return [...map.entries()];
}

function formatBasis(basis: string, locale: Locale) {
  if (locale !== "uk") return basis;
  return basis
    .replace(/CPT Odesa, Ukraine \(export\)/i, "CPT Одеса, Україна (експорт)")
    .replace(/FCA Chop, Ukraine \(export\)/i, "FCA Чоп, Україна (експорт)")
    .replace(/CPT parity Odesa, Ukraine \(processing\)/i, "CPT паритет Одеса, Україна (переробка)");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatHumanDate(date: string, locale: Locale) {
  const parsed = parseIsoDate(date);
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

export const __mediaHubDailyReportTestHooks = {
  buildDailyNewsThemes,
  buildSsiDailyIndexFacts,
  getPreviousPublishedBusinessDay,
  getPreviousWeekFriday,
  groupSsiIndicesForDailyReport,
};
