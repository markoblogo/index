import type { Locale } from "@/lib/i18n";
import type { MediaHubEvidenceItem } from "@/lib/media-hub-evidence";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import type { MediaHubLocalizedReport } from "@/lib/media-hub-llm-report";

type SsiNonDailyReportContent = {
  evidence?: MediaHubEvidenceItem[];
  localized?: Partial<Record<Locale, MediaHubLocalizedReport>>;
  summary: string[];
  windows: Array<{
    feed: MediaHubWindowSnapshot["feed"];
    summaryBody: string[];
  }>;
};

type ChannelPart = {
  fallback: string;
  sections: Array<{ heading: string; items: string[] }>;
  title: string;
};

export function buildSsiNonDailyStructuredMessages(input: {
  content: SsiNonDailyReportContent;
  kind: "weekly" | "monthly";
  locale: Locale;
  periodEndDate: string;
}) {
  const facts = collectSsiFacts(input.content, input.locale);
  const buckets = bucketFacts(facts, input.locale);
  const meta = getMeta(input.kind, input.locale);
  const parts = buildParts(buckets, input.locale);

  return parts.map((part, index) => fitSingleMessage([
    `🇺🇦 <b>${escapeHtml(meta.heading)}</b>`,
    escapeHtml(formatShortDate(input.periodEndDate)),
    "",
    `<b>${escapeHtml(part.title)}</b>`,
    "",
    ...renderPartSections(part, input.kind),
    "",
    index === parts.length - 1 ? meta.footer : meta.partFooter,
  ].join("\n")));
}

function collectSsiFacts(content: SsiNonDailyReportContent, locale: Locale) {
  const localized = content.localized?.[locale]?.summary ?? [];
  const fallbackLocalized = locale === "en" ? content.localized?.en?.summary ?? [] : [];
  const feed = content.windows.flatMap((window) => window.feed)
    .flatMap((item) => [item.title, item.summary])
    .filter(Boolean);
  const evidence = (content.evidence ?? [])
    .flatMap((item) => [item.claim, item.excerpt])
    .filter(Boolean);
  const windowSummary = content.windows.flatMap((window) => window.summaryBody);

  return dedupe([
    ...localized,
    ...fallbackLocalized,
    ...(locale === "uk" ? content.summary : []),
    ...evidence,
    ...feed,
    ...windowSummary,
  ])
    .map((item) => normalizeFact(item, locale))
    .filter((item) => item.length > 30)
    .filter((item) => locale === "uk" || isUkraineFocused(item));
}

function bucketFacts(facts: string[], locale: Locale) {
  const p = patterns(locale);
  const buckets = {
    border: [] as string[],
    corn: [] as string[],
    grains: [] as string[],
    logistics: [] as string[],
    oilseeds: [] as string[],
    port: [] as string[],
    rail: [] as string[],
    rapeseed: [] as string[],
    road: [] as string[],
    soy: [] as string[],
    sunflower: [] as string[],
    wheat: [] as string[],
  };

  for (const fact of facts) {
    if (p.road.test(fact)) buckets.road.push(fact);
    if (p.rail.test(fact)) buckets.rail.push(fact);
    if (p.border.test(fact)) buckets.border.push(fact);
    if (p.port.test(fact)) buckets.port.push(fact);
    if (p.logistics.test(fact)) buckets.logistics.push(fact);
    if (p.corn.test(fact)) buckets.corn.push(fact);
    if (p.wheat.test(fact)) buckets.wheat.push(fact);
    if (p.grains.test(fact)) buckets.grains.push(fact);
    if (p.sunflower.test(fact)) buckets.sunflower.push(fact);
    if (p.rapeseed.test(fact)) buckets.rapeseed.push(fact);
    if (p.soy.test(fact)) buckets.soy.push(fact);
    if (p.oilseeds.test(fact)) buckets.oilseeds.push(fact);
  }

  return buckets;
}

function buildParts(b: ReturnType<typeof bucketFacts>, locale: Locale): ChannelPart[] {
  const uk = locale === "uk";
  return [
    {
      fallback: uk
        ? "Логістичний блок тижня читається через портові, прикордонні та внутрішні маршрути України."
        : "Ukraine logistics this period should be read through port, border and domestic execution routes.",
      sections: [
        { heading: uk ? "📊 ОСНОВНЕ З ЕКСПОРТУ ЗА ПЕРІОД" : "📊 KEY EXPORT SIGNALS FOR THE PERIOD", items: b.logistics },
        { heading: uk ? "🚚 АВТОМОБІЛЬНІ ПЕРЕВЕЗЕННЯ" : "🚚 ROAD TRANSPORT", items: b.road },
        { heading: uk ? "🚝 ЗАЛІЗНИЧНІ ПЕРЕВЕЗЕННЯ" : "🚝 RAIL TRANSPORT", items: b.rail },
        { heading: uk ? "🚧 У напрямку кордону" : "🚧 Border direction", items: b.border },
        { heading: uk ? "⚓️ У напрямку порту" : "⚓️ Port direction", items: b.port },
      ],
      title: uk ? "Частина I. Логістика" : "Part I. Logistics",
    },
    {
      fallback: uk
        ? "Зерновий блок фокусується на експортних цінах, попиті та різниці між базисами CPT Одеса і FCA Чоп."
        : "The grains block focuses on export prices, demand and the spread between CPT Odesa and FCA Chop bases.",
      sections: [
        { heading: uk ? "📈 SPIKE Spot Commodity Index Ukraine" : "📈 SPIKE Spot Commodity Index Ukraine", items: b.grains },
        { heading: uk ? "🌽 КУКУРУДЗА" : "🌽 CORN", items: b.corn },
        { heading: uk ? "🌾 ПШЕНИЦЯ" : "🌾 WHEAT", items: b.wheat },
      ],
      title: uk ? "Частина II. Зернові" : "Part II. Grains export market",
    },
    {
      fallback: uk
        ? "Олійний блок фокусується на експорті олійних, переробці, попиті заводів і внутрішньому ринку."
        : "The oilseeds and processing block focuses on oilseed exports, crush demand and Ukraine domestic processing.",
      sections: [
        { heading: uk ? "📈 SPIKE Spot Commodity Index Ukraine" : "📈 SPIKE Spot Commodity Index Ukraine", items: b.oilseeds },
        { heading: uk ? "🌻 СОНЯШНИК" : "🌻 SUNFLOWER", items: b.sunflower },
        { heading: uk ? "🌿 РІПАК" : "🌿 RAPESEED", items: b.rapeseed },
        { heading: uk ? "🌱 СОЯ" : "🌱 SOYBEANS", items: b.soy },
      ],
      title: uk ? "Частина III. Олійні та продукти переробки" : "Part III. Oilseeds and processing products",
    },
  ];
}

function renderPartSections(part: ChannelPart, kind: "weekly" | "monthly") {
  const perSection = kind === "monthly" ? 5 : 4;
  const rendered = part.sections.flatMap((section) => {
    const items = dedupe(section.items).slice(0, perSection);
    return items.length > 0
      ? ["", `<b>${escapeHtml(section.heading)}</b>`, ...items.map((item) => `• ${escapeHtml(item)}`)]
      : [];
  });
  return rendered.length > 0 ? rendered : [`• ${escapeHtml(part.fallback)}`];
}

function patterns(locale: Locale) {
  if (locale === "uk") {
    return {
      border: /кордон|чоп|прикордон|переход/i,
      corn: /кукуруд/i,
      grains: /зерн|кукуруд|пшениц|ячмін|експортн|cpt|fca/i,
      logistics: /логіст|порт|одес|дунай|чоп|кордон|заліз|вагон|авто|фрахт|маршрут|перевез|експорт/i,
      oilseeds: /олій|соя|соняш|ріпак|перероб|завод|олія|шрот|макух/i,
      port: /порт|одес|дунай|чорномор/i,
      rail: /заліз|вагон|уз|станці/i,
      rapeseed: /ріпак/i,
      road: /авто|вантаж|пункт пропуск|дорог/i,
      soy: /соя|соєв/i,
      sunflower: /соняш|соняшников/i,
      wheat: /пшениц/i,
    };
  }
  return {
    border: /border|chop|crossing/i,
    corn: /corn|maize/i,
    grains: /grain|corn|wheat|barley|export|cpt|fca/i,
    logistics: /logistics|port|odesa|odessa|danube|chop|border|rail|wagon|truck|freight|route|shipment|export/i,
    oilseeds: /oilseed|soy|soybean|sunflower|rapeseed|canola|crush|processing|plant|oil|meal/i,
    port: /port|odesa|odessa|danube|chornomorsk|black sea/i,
    rail: /rail|wagon|station/i,
    rapeseed: /rapeseed|canola/i,
    road: /road|truck|border crossing/i,
    soy: /soy|soybean/i,
    sunflower: /sunflower/i,
    wheat: /wheat/i,
  };
}

function normalizeFact(value: string, locale: Locale) {
  return value
    .replace(/\bUSD\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "$")
    .replace(/\bEUR\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "€")
    .replace(/\b(?:UAH|грн\.?|грив(?:ень|ні|ня)?)\s*\/\s*(?:t|т|mt|тонн(?:а|у|и)?|тон)\b/gi, "₴")
    .replace(/^\s*(?:🔎|🌾|🌻|🏭|🚚|⚖️|🌍|📰|❗️|🇺🇦|🇫🇷)\s*/u, "")
    .replace(locale === "uk" ? /^Головні сигнали\s*:?/i : /^Main signals\s*:?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(kind: "weekly" | "monthly", locale: Locale) {
  const title = kind === "weekly" ? "Weekly Commodity & Logistics Market" : "Monthly Commodity & Logistics Market";
  return locale === "uk"
    ? {
        footer: "<i>Spike Brokers – Ваш торговий партнер 🌎</i>",
        heading: `SPIKE BROKERS | ${title}`,
        partFooter: "<i>Spike Brokers – Ваш торговий партнер 🌎\nПродовження нижче ⬇️</i>",
      }
    : {
        footer: "<i>AI-assisted SSI Media Hub digest based on index data, monitored sources and editorial filters. Not a trading recommendation.</i>\n\n🔗 <i>Powered by 1D3X Platform</i> · https://spike.1d3x.com/",
        heading: `SPIKE BROKERS | ${title}`,
        partFooter: "<i>Continuation follows in the next part.</i>",
      };
}

function isUkraineFocused(value: string) {
  return /\b(Ukraine|Ukrainian|Odesa|Odessa|Danube|Black Sea|Chop|CPT|FCA|port|border|rail|export|processing|domestic|farm|plant|crush|logistics|harvest|sowing)\b/i.test(value);
}

function fitSingleMessage(text: string) {
  return text.length <= 3900 ? text : `${text.slice(0, 3740).trim()}\n\n<i>Report shortened to fit one message.</i>`;
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year?.slice(-2)}`;
}

function dedupe(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
