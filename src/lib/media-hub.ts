import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig, type MediaHubLocalePolicy } from "@/lib/index-platform";
import type { MediaHubDailyReportView } from "@/lib/media-hub-daily-report";
import { isPlatformSite } from "@/lib/platform-site";

export type MediaHubWindowKey = "day" | "week" | "month";
export type MediaHubProfileId = "spike" | "1d3x";

export type MediaHubPulseCard = {
  label: string;
  value: number;
  tone: "sky" | "green" | "amber" | "violet";
  hint: string;
};

export type MediaHubSnapshotCard = {
  label: string;
  value: string;
  note: string;
};

export type MediaHubFeedItem = {
  id: string;
  processingState?: "accepted_after_scoring" | "fallback_accepted" | "manually_injected";
  rejectionReason?: string;
  relevanceScore?: number;
  source: string;
  sourceType: string;
  sourceUrl?: string;
  title: string;
  summary: string;
  time: string;
  tone: "normal" | "elevated";
  tags: string[];
};

export type MediaHubWindowSnapshot = {
  window: MediaHubWindowKey;
  label: string;
  progressLabel: string;
  summaryTitle: string;
  summaryBody: string[];
  dailyReport?: MediaHubDailyReportView;
  sourceCount: number;
  itemCount: number;
  topicCount: number;
  distribution: Array<{ label: string; value: number; color: string }>;
  topSources: Array<{ label: string; count: number }>;
  topTopics: Array<{ label: string; count: number; hint: string }>;
  snapshotCards: MediaHubSnapshotCard[];
  pulseCards: MediaHubPulseCard[];
  feed: MediaHubFeedItem[];
};

export type MediaHubSiteProfile = {
  id: MediaHubProfileId;
  brand: string;
  eyebrow: string;
  title: string;
  description: string;
  accentClassName: string;
  headerAccent: string;
  sourcePolicyTitle: string;
  sourcePolicyBody: string;
  localePolicy: MediaHubLocalePolicy | null;
  windows: MediaHubWindowSnapshot[];
};

export function getMediaHubWindowProgressLabel(
  window: MediaHubWindowKey,
  options: { now?: Date; timezone?: string } = {},
) {
  if (window === "day") {
    return "1/1";
  }

  const now = options.now ?? new Date();
  const timezone = options.timezone ?? "Europe/Kyiv";
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    weekday: "short",
  }).formatToParts(now);
  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const monthDay = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayLabel);

  if (window === "week") {
    const progress = weekdayIndex === 0 ? 1 : Math.min(7, weekdayIndex + 1);
    return `${progress}/7`;
  }

  return `${Math.max(1, Math.min(30, monthDay))}/30`;
}

const spikeUkWindows: MediaHubWindowSnapshot[] = [
  {
    window: "day",
    label: "День",
    progressLabel: "1/1",
    summaryTitle: "Щоденний звіт MediaHub",
    summaryBody: [
      "Фокус дня зміщений у бік логістики, портового попиту та обережної реакції фермерів на зниження в експортних позиціях.",
      "У зовнішньому інформаційному шарі домінують повідомлення про темпи експорту, погодні фактори та дискусії щодо поведінки продавців на кукурудзі й пшениці.",
      "Для Spike daily це означає, що в телеграм-публікації потрібно давати не лише рух індексів, а й короткий фактажний блок із причинами та локальними наслідками.",
    ],
    sourceCount: 11,
    itemCount: 146,
    topicCount: 8,
    distribution: [
      { label: "Telegram", value: 44, color: "#7be7ff" },
      { label: "Web", value: 28, color: "#9dff7a" },
      { label: "Blogs", value: 14, color: "#ffd869" },
      { label: "Files", value: 8, color: "#ff9c6b" },
      { label: "Other", value: 6, color: "#a78bfa" },
    ],
    topSources: [
      { label: "@agroportalua", count: 21 },
      { label: "@latifundistmedia", count: 19 },
      { label: "@superagronomcom", count: 17 },
      { label: "@apk_informUA", count: 15 },
    ],
    topTopics: [
      { label: "Логістика", count: 31, hint: "Порти, маршрути, відвантаження" },
      { label: "Пшениця", count: 27, hint: "Експортний попит і корекція цін" },
      { label: "Кукурудза", count: 24, hint: "Поведінка продавців і зовнішній фон" },
      { label: "Погода", count: 13, hint: "Врожай і стан посівів" },
    ],
    snapshotCards: [
      { label: "Одеса CPT", value: "6 позицій", note: "експорт + переробка" },
      { label: "FCA Чоп", value: "1 базис", note: "експортний кордон" },
      { label: "Релевантний шум", value: "146 матеріалів", note: "після дедуплікації" },
    ],
    pulseCards: [
      { label: "Логістика", value: 9, tone: "sky", hint: "Маршрути і виконання" },
      { label: "Ціни", value: 8, tone: "green", hint: "Рівні, спреди, корекції" },
      { label: "Ризики", value: 6, tone: "amber", hint: "Погода і policy" },
    ],
    feed: [
      {
        id: "spike-uk-day-1",
        source: "@agroportalua",
        sourceType: "Telegram",
        title: "Активність у портах залишається нерівномірною по культурах",
        summary: "Повідомлення фіксує сповільнення по частині лотів і концентрацію попиту в окремих вікнах поставки.",
        time: "17:10",
        tone: "elevated",
        tags: ["Логістика", "Порти", "Кукурудза"],
      },
      {
        id: "spike-uk-day-2",
        source: "@latifundistmedia",
        sourceType: "Telegram",
        title: "Фермери стримують продажі після попереднього раунду реалізації",
        summary: "Ринок описується як малоактивний зі сторони продавців, що підтримує більш жорстку переговорну позицію.",
        time: "14:42",
        tone: "normal",
        tags: ["Кукурудза", "Продавці", "Торгівля"],
      },
      {
        id: "spike-uk-day-3",
        source: "@apk_informUA",
        sourceType: "Telegram",
        title: "Оновлено фактаж по зовнішньому ринку пшениці",
        summary: "Учасники ринку обговорюють експортні очікування та тиск міжнародного фону на локальні індикації.",
        time: "12:15",
        tone: "normal",
        tags: ["Пшениця", "Експорт", "USDA"],
      },
    ],
  },
  {
    window: "week",
    label: "7 Днів",
    progressLabel: "7/7",
    summaryTitle: "Тижневий звіт MediaHub",
    summaryBody: [
      "За тиждень ядро тем сконцентроване навколо портового попиту, балансу між експортом та переробкою, а також погодного ризику нового врожаю.",
      "Weekly report має збирати не просто текстовий реферат, а тематичні блоки: логістика, pricing, урожай, policy, міжнародний фон.",
      "У weekly-подачі потрібно зберігати форматну дисципліну Spike Brokers, але посилити її ширшим фактажем із зовнішніх каналів.",
    ],
    sourceCount: 13,
    itemCount: 612,
    topicCount: 14,
    distribution: [
      { label: "Telegram", value: 39, color: "#7be7ff" },
      { label: "Web", value: 33, color: "#9dff7a" },
      { label: "Blogs", value: 12, color: "#ffd869" },
      { label: "Files", value: 9, color: "#ff9c6b" },
      { label: "Other", value: 7, color: "#a78bfa" },
    ],
    topSources: [
      { label: "@agroportalua", count: 79 },
      { label: "@latifundistmedia", count: 73 },
      { label: "@superagronomcom", count: 69 },
      { label: "@UGAua", count: 52 },
    ],
    topTopics: [
      { label: "Логістика", count: 118, hint: "Відвантаження, маршрути, порти" },
      { label: "Експорт", count: 97, hint: "Попит, трейдинг, тижневий ритм" },
      { label: "Погода", count: 61, hint: "Урожайні ризики" },
      { label: "Політика", count: 38, hint: "Регуляторний шум" },
    ],
    snapshotCards: [
      { label: "Фокус тижня", value: "14 тем", note: "після кластеризації" },
      { label: "AI стаття", value: "1 longform", note: "blog-ready layer" },
      { label: "Telegram pack", value: "3 outputs", note: "website + TG + cover" },
    ],
    pulseCards: [
      { label: "Логістика", value: 10, tone: "sky", hint: "Тема тижня" },
      { label: "Ціни", value: 8, tone: "green", hint: "Спреди і basis" },
      { label: "Ризики", value: 7, tone: "amber", hint: "Погода і policy" },
    ],
    feed: [
      {
        id: "spike-uk-week-1",
        source: "@superagronomcom",
        sourceType: "Telegram",
        title: "Експортний темп тижня став ключовим сигналом для переговорів",
        summary: "Публікації поєднують дані по логістиці та торгову поведінку, що напряму підсилює weekly commentary.",
        time: "Thu",
        tone: "elevated",
        tags: ["Експорт", "Логістика", "Weekly"],
      },
      {
        id: "spike-uk-week-2",
        source: "@UGAua",
        sourceType: "Telegram",
        title: "Оновлення по ринку зернових і зовнішньому попиту",
        summary: "Тижневий фактаж дає опору для макро-блоку weekly report без перевантаження цифрами.",
        time: "Wed",
        tone: "normal",
        tags: ["Зернові", "Попит", "Weekly"],
      },
    ],
  },
  {
    window: "month",
    label: "30 Днів",
    progressLabel: "30/30",
    summaryTitle: "30-денний звіт MediaHub",
    summaryBody: [
      "Місячний зріз повинен стати не архівом weekly, а окремою strategic intelligence surface: структурні зсуви в потоках, стійкі теми, найчастіше цитовані джерела та повторювані ризики.",
      "Саме тут потрібен найбільш щільний monitoring layer: сотні матеріалів, зрозуміла навігація по джерелах і візуальні патерни концентрації тем.",
      "Це той шар, який має перевершити old Last30Days і стати ядром 1D3X Media Hub architecture.",
    ],
    sourceCount: 24,
    itemCount: 2384,
    topicCount: 22,
    distribution: [
      { label: "Telegram", value: 35, color: "#7be7ff" },
      { label: "Web", value: 37, color: "#9dff7a" },
      { label: "Blogs", value: 11, color: "#ffd869" },
      { label: "Files", value: 8, color: "#ff9c6b" },
      { label: "Other", value: 9, color: "#a78bfa" },
    ],
    topSources: [
      { label: "AgroPortal", count: 241 },
      { label: "Latifundist", count: 214 },
      { label: "SuperAgronom", count: 197 },
      { label: "APK Inform", count: 144 },
    ],
    topTopics: [
      { label: "Логістика", count: 428, hint: "Стійка тема за місяць" },
      { label: "Експорт", count: 371, hint: "Ринок збуту і темпи" },
      { label: "Урожай", count: 226, hint: "Погода, посіви, очікування" },
      { label: "Переробка", count: 161, hint: "Внутрішній попит" },
    ],
    snapshotCards: [
      { label: "Глибина моніторингу", value: "2.3k матеріалів", note: "після очистки шуму" },
      { label: "Пул джерел", value: "24 джерела", note: "TG + web + files" },
      { label: "Стратегічні теми", value: "22 кластери", note: "для monthly brief" },
    ],
    pulseCards: [
      { label: "Логістика", value: 10, tone: "sky", hint: "Домінує весь місяць" },
      { label: "Ціни", value: 9, tone: "green", hint: "Спреди і basis" },
      { label: "Ризики", value: 8, tone: "amber", hint: "Погода, policy, execution" },
    ],
    feed: [
      {
        id: "spike-uk-month-1",
        source: "Cross-source cluster",
        sourceType: "Monitoring",
        title: "Логістичний наратив став наскрізною рамкою місяця",
        summary: "Сотні згадок концентруються навколо роботи портів, маршрутів і ритму виконання контрактів.",
        time: "30d",
        tone: "elevated",
        tags: ["Логістика", "Кластери", "Місяць"],
      },
      {
        id: "spike-uk-month-2",
        source: "Cross-source cluster",
        sourceType: "Monitoring",
        title: "Міжнародний фон системно пояснює локальні паузи у цінах",
        summary: "Місячний шар повинен фіксувати не щоденні новини, а стабільні причинно-наслідкові зв'язки між зовнішнім і локальним ринком.",
        time: "30d",
        tone: "normal",
        tags: ["Pricing", "Міжнародний фон", "Місяць"],
      },
    ],
  },
];

const spikeEnWindows: MediaHubWindowSnapshot[] = spikeUkWindows.map((window) => ({
  ...window,
  label:
    window.window === "day" ? "Day" : window.window === "week" ? "7 Days" : "30 Days",
  summaryTitle:
    window.window === "day"
      ? "Daily AI brief"
      : window.window === "week"
        ? "Weekly synthesis"
        : "30-day intelligence brief",
  summaryBody: translateSpikeWindow(window.window),
  topTopics: window.topTopics.map((topic) => ({
    ...topic,
    label: translateTopicLabel(topic.label),
    hint: translateTopicHint(topic.hint),
  })),
  snapshotCards: window.snapshotCards.map((card) => ({
    ...card,
    label: translateCardLabel(card.label),
    note: translateCardNote(card.note),
  })),
  pulseCards: window.pulseCards.map((card) => ({
    ...card,
    label: translateTopicLabel(card.label),
    hint: translateTopicHint(card.hint),
  })),
  feed: window.feed.map((item) => ({
    ...item,
    title: translateFeedTitle(item.id),
    summary: translateFeedSummary(item.id),
    tags: item.tags.map(translateTopicLabel),
  })),
}));

const platformWindows: MediaHubWindowSnapshot[] = [
  {
    window: "day",
    label: "Day",
    progressLabel: "1/1",
    summaryTitle: "Global commodity monitoring brief",
    summaryBody: [
      "1D3X Media Hub is meant to become the global monitoring layer above local index projects: a tight daily read first, then the raw feed, then deeper archive modes.",
      "The day view should combine international commodity signals, logistics noise, policy events and repeated entity mentions into one operator-grade editorial surface.",
      "Unlike a local index product, the 1D3X version should aggregate English-language international sources and present them as a reusable intelligence engine.",
    ],
    sourceCount: 86,
    itemCount: 618,
    topicCount: 11,
    distribution: [
      { label: "Web", value: 42, color: "#7be7ff" },
      { label: "X / Twitter", value: 18, color: "#9dff7a" },
      { label: "Blogs", value: 14, color: "#ffd869" },
      { label: "YouTube", value: 9, color: "#ff9c6b" },
      { label: "Reddit", value: 6, color: "#a78bfa" },
    ],
    topSources: [
      { label: "Reuters Commodities", count: 34 },
      { label: "AgriCensus", count: 29 },
      { label: "USDA updates", count: 28 },
      { label: "FreightWaves", count: 21 },
    ],
    topTopics: [
      { label: "Logistics", count: 103, hint: "Freight, routes, execution" },
      { label: "Corn", count: 81, hint: "US and Black Sea positioning" },
      { label: "Wheat", count: 77, hint: "Global pricing and tenders" },
      { label: "Policy", count: 39, hint: "Tariffs, trade, regulation" },
    ],
    snapshotCards: [
      { label: "Global feed", value: "618 items", note: "English sources only" },
      { label: "Regional reach", value: "12 regions", note: "US, EU, Black Sea, LATAM" },
      { label: "Signal density", value: "11 clusters", note: "fit for daily synthesis" },
    ],
    pulseCards: [
      { label: "Logistics", value: 9, tone: "sky", hint: "Routes and freight" },
      { label: "Pricing", value: 8, tone: "green", hint: "Curves, spreads, cash" },
      { label: "Risk", value: 7, tone: "amber", hint: "Weather and policy" },
    ],
    feed: [
      {
        id: "platform-day-1",
        source: "Reuters Commodities",
        sourceType: "Web",
        title: "Freight and tender headlines frame the daily commodity read",
        summary: "The daily layer should prioritize what changes positioning, not just what happened in the market.",
        time: "18:00 UTC",
        tone: "elevated",
        tags: ["Logistics", "Wheat", "Daily"],
      },
      {
        id: "platform-day-2",
        source: "AgriCensus",
        sourceType: "Web",
        title: "Corn and wheat flow updates stay central to the monitoring stack",
        summary: "Cross-source repetition is exactly the signal the 1D3X hub should structure and expose.",
        time: "15:10 UTC",
        tone: "normal",
        tags: ["Corn", "Wheat", "Pricing"],
      },
    ],
  },
  {
    window: "week",
    label: "7 Days",
    progressLabel: "7/7",
    summaryTitle: "Weekly global synthesis",
    summaryBody: [
      "The weekly 1D3X mode should read like a market-intelligence desk summary: what themes persisted, what regions dominated, and what signals mattered commercially.",
      "This is where local projects such as Spike can inherit structure discipline, while 1D3X keeps the broader international monitoring frame.",
      "The week view should also be the natural bridge toward editorial longform and SEO / LLMO-ready public articles.",
    ],
    sourceCount: 128,
    itemCount: 3224,
    topicCount: 18,
    distribution: [
      { label: "Web", value: 38, color: "#7be7ff" },
      { label: "X / Twitter", value: 19, color: "#9dff7a" },
      { label: "Blogs", value: 16, color: "#ffd869" },
      { label: "YouTube", value: 11, color: "#ff9c6b" },
      { label: "Reddit", value: 8, color: "#a78bfa" },
    ],
    topSources: [
      { label: "Reuters Commodities", count: 156 },
      { label: "AgriCensus", count: 122 },
      { label: "USDA updates", count: 118 },
      { label: "FreightWaves", count: 87 },
    ],
    topTopics: [
      { label: "Logistics", count: 403, hint: "Freight and execution" },
      { label: "Weather", count: 261, hint: "Crop risk and field conditions" },
      { label: "Corn", count: 244, hint: "US and export flows" },
      { label: "Wheat", count: 232, hint: "Global pricing and tenders" },
    ],
    snapshotCards: [
      { label: "Monitoring depth", value: "3.2k items", note: "designed for editorial triage" },
      { label: "Source registry", value: "128 sources", note: "multi-type, multi-region" },
      { label: "Longform output", value: "1 article", note: "SEO + operator summary" },
    ],
    pulseCards: [
      { label: "Logistics", value: 10, tone: "sky", hint: "Market execution layer" },
      { label: "Pricing", value: 8, tone: "green", hint: "Curves and cash tone" },
      { label: "Risk", value: 8, tone: "amber", hint: "Weather and policy" },
    ],
    feed: [
      {
        id: "platform-week-1",
        source: "Cross-source cluster",
        sourceType: "Monitoring",
        title: "Weekly narrative converges around freight, weather and export competitiveness",
        summary: "The future 1D3X weekly output should be stronger than a recap: it should synthesize stable relationships across the monitoring stack.",
        time: "7d",
        tone: "elevated",
        tags: ["Weekly", "Logistics", "Weather"],
      },
    ],
  },
  {
    window: "month",
    label: "30 Days",
    progressLabel: "30/30",
    summaryTitle: "30-day media intelligence layer",
    summaryBody: [
      "This is the mode that should explicitly outperform the old Last30Days product: more source depth, better source controls, cleaner clusters, stronger editorial outputs.",
      "The monthly layer should not feel like a giant list. It should feel like a disciplined intelligence desk with explainable signals and deep source visibility.",
      "For 1D3X, this becomes the umbrella engine. For Spike, it becomes the local-market adaptation.",
    ],
    sourceCount: 214,
    itemCount: 11842,
    topicCount: 27,
    distribution: [
      { label: "Web", value: 36, color: "#7be7ff" },
      { label: "X / Twitter", value: 21, color: "#9dff7a" },
      { label: "Blogs", value: 17, color: "#ffd869" },
      { label: "YouTube", value: 12, color: "#ff9c6b" },
      { label: "Reddit", value: 9, color: "#a78bfa" },
    ],
    topSources: [
      { label: "Reuters Commodities", count: 612 },
      { label: "AgriCensus", count: 554 },
      { label: "USDA updates", count: 408 },
      { label: "FreightWaves", count: 366 },
    ],
    topTopics: [
      { label: "Logistics", count: 1420, hint: "Persistent monthly theme" },
      { label: "Weather", count: 1017, hint: "Global crop conditions" },
      { label: "Wheat", count: 944, hint: "Tenders and price tone" },
      { label: "Corn", count: 911, hint: "Flow, demand, positioning" },
    ],
    snapshotCards: [
      { label: "Source scale", value: "214 sources", note: "the real strength layer" },
      { label: "Clean feed", value: "11.8k items", note: "after dedupe and filtering" },
      { label: "Strategic map", value: "27 clusters", note: "monthly intelligence ready" },
    ],
    pulseCards: [
      { label: "Logistics", value: 10, tone: "sky", hint: "Most persistent layer" },
      { label: "Pricing", value: 9, tone: "green", hint: "Global commodity signals" },
      { label: "Risk", value: 9, tone: "amber", hint: "Weather, policy, disruption" },
    ],
    feed: [
      {
        id: "platform-month-1",
        source: "Cross-source cluster",
        sourceType: "Monitoring",
        title: "Monthly mode is where 1D3X must visibly beat Last30Days",
        summary: "The strength has to come from scale, clustering quality, filtering controls and editorial usefulness, not from decorative UI alone.",
        time: "30d",
        tone: "elevated",
        tags: ["30 Days", "Strategy", "Monitoring"],
      },
    ],
  },
];

export function getMediaHubConfig() {
  return getActiveIndexConfig().mediaHub;
}

export function isMediaHubEnabled() {
  return getMediaHubConfig().enabled;
}

export function getMediaHubLocalePolicy(locale: Locale) {
  return getMediaHubConfig().localePolicies.find((policy) => policy.locale === locale) ?? null;
}

export function getMediaHubProfile(locale: Locale, selectedWindow: MediaHubWindowKey): MediaHubSiteProfile {
  if (isPlatformSite()) {
    return {
      id: "1d3x",
      brand: "1D3X Media Hub",
      eyebrow: "Global commodity intelligence layer",
      title: "1D3X Media Hub",
      description:
        "A unified day / 7 days / 30 days intelligence surface built for international commodity monitoring, source clustering and editorial outputs.",
      accentClassName: "text-[#d6ff58]",
      headerAccent: "#d6ff58",
      sourcePolicyTitle: "1D3X source policy",
      sourcePolicyBody:
        "The 1D3X version is intended to monitor international English-language commodity, logistics, policy and market structure sources.",
      localePolicy: {
        audienceLabel: "International English-language media intelligence",
        locale,
        marketScope: "global",
        sourceLanguage: "en",
        summaryLanguage: "en",
      },
      windows: rotateWindows(platformWindows, selectedWindow),
    };
  }

  const policy = getMediaHubLocalePolicy(locale);
  const windows = locale === "uk" ? spikeUkWindows : spikeEnWindows;

  return {
    id: "spike",
    brand: "1D3X Media Hub",
    eyebrow: locale === "uk" ? "Локальний intelligence layer для Spike" : "Local intelligence layer for Spike",
    title: "SPIKE Media Hub",
    description:
      locale === "uk"
        ? "Живий моніторинг день / 7 днів / 30 днів та редакційні звіти поверх SPIKE SPOT INDEX."
        : "A live day / 7 days / 30 days monitoring and editorial surface built above SPIKE SPOT INDEX.",
    accentClassName: "text-[var(--spike-accent)]",
    headerAccent: "#7ff348",
    sourcePolicyTitle:
      locale === "uk" ? "Єдиний пул джерел Spike" : "Unified Spike source pool",
    sourcePolicyBody:
      locale === "uk"
        ? "Українська й англійська версії SSI використовують спільний пул українських та англомовних джерел про український аграрний ринок; відрізняється лише мова редакційного звіту."
        : "SSI Ukrainian and English views use the same unified pool of Ukrainian and English sources about Ukraine’s agricultural market; only the editorial report language changes.",
    localePolicy: policy,
    windows: rotateWindows(windows, selectedWindow),
  };
}

function rotateWindows(
  windows: MediaHubWindowSnapshot[],
  selectedWindow: MediaHubWindowKey,
) {
  const active = windows.find((window) => window.window === selectedWindow) ?? windows[0];
  const rest = windows.filter((window) => window.window !== active.window);

  return [active, ...rest];
}

function translateSpikeWindow(window: MediaHubWindowKey) {
  if (window === "day") {
    return [
      "The day focus shifts toward logistics, port demand and cautious farmer reaction to export-side price softness.",
      "External monitoring is dominated by export tempo updates, weather-driven discussion and commentary on selling behavior in corn and wheat.",
      "For Spike daily publication, this means the Telegram post should combine index values with a compact factual explanation block, not just a numerical recap.",
    ];
  }

  if (window === "week") {
    return [
      "Across the week, the core narrative concentrates around port demand, export-versus-processing balance and weather risk for the new crop.",
      "The weekly report should be structured into thematic blocks: logistics, pricing, crop, policy and international market context.",
      "Spike should preserve its disciplined house format while materially strengthening it with denser external-source factual context.",
    ];
  }

  return [
    "The monthly layer should become a strategic intelligence surface, not just an archive of weekly notes: stable flow shifts, recurring themes, most-cited sources and persistent risks.",
    "This is where the monitoring depth has to be highest: hundreds or thousands of items, strong source navigation and explainable visual patterns of thematic concentration.",
    "This is the layer that must ultimately outperform the old Last30Days product and become the core of the 1D3X Media Hub architecture.",
  ];
}

function translateTopicLabel(value: string) {
  const map: Record<string, string> = {
    "Логістика": "Logistics",
    "Пшениця": "Wheat",
    "Кукурудза": "Corn",
    "Погода": "Weather",
    "Експорт": "Export",
    "Урожай": "Crop",
    "Переробка": "Processing",
    "Зернові": "Grains",
    "Продавці": "Sellers",
    "Торгівля": "Trade",
    "Політика": "Policy",
    "Міжнародний фон": "International context",
    "Місяць": "Month",
    "Кластери": "Clusters",
    "Щотижня": "Weekly",
    "Ціни": "Pricing",
    "Ризики": "Risk",
    "Weekly": "Weekly",
  };

  return map[value] ?? value;
}

function translateTopicHint(value: string) {
  const map: Record<string, string> = {
    "Порти, маршрути, відвантаження": "Ports, routes and shipments",
    "Експортний попит і корекція цін": "Export demand and price correction",
    "Поведінка продавців і зовнішній фон": "Seller behavior and external market tone",
    "Врожай і стан посівів": "Crop outlook and field conditions",
    "Відвантаження, маршрути, порти": "Shipments, routes and ports",
    "Попит, трейдинг, тижневий ритм": "Demand, trading and weekly tempo",
    "Урожайні ризики": "Crop risk",
    "Регуляторний шум": "Regulatory noise",
    "Стійка тема за місяць": "Persistent monthly theme",
    "Ринок збуту і темпи": "Sales channels and export tempo",
    "Погода, посіви, очікування": "Weather, crops and expectations",
    "Внутрішній попит": "Domestic demand",
    "Маршрути і виконання": "Routes and execution",
    "Рівні, спреди, корекції": "Levels, spreads, corrections",
    "Погода і policy": "Weather and policy",
    "Тема тижня": "Theme of the week",
    "Спреди і basis": "Spreads and basis",
    "Домінує весь місяць": "Dominates the month",
    "Погода, policy, execution": "Weather, policy, execution",
  };

  return map[value] ?? value;
}

function translateCardLabel(value: string) {
  const map: Record<string, string> = {
    "Одеса CPT": "Odesa CPT",
    "Релевантний шум": "Relevant noise",
    "Фокус тижня": "Weekly focus",
    "AI стаття": "AI article",
    "Telegram pack": "Telegram pack",
    "Глибина моніторингу": "Monitoring depth",
    "Пул джерел": "Source footprint",
    "Стратегічні теми": "Strategic topics",
  };

  return map[value] ?? value;
}

function translateCardNote(value: string) {
  const map: Record<string, string> = {
    "експорт + переробка": "export + processing",
    "експортний кордон": "border export basis",
    "після дедуплікації": "after dedupe",
    "після кластеризації": "after clustering",
    "blog-ready layer": "blog-ready layer",
    "website + TG + cover": "website + TG + cover",
    "після очистки шуму": "after noise cleanup",
    "TG + web + files": "TG + web + files",
    "для monthly brief": "for monthly brief",
  };

  return map[value] ?? value;
}

function translateFeedTitle(id: string) {
  const map: Record<string, string> = {
    "spike-uk-day-1": "Port-side activity remains uneven across commodities",
    "spike-uk-day-2": "Farmers are holding back after the previous selling round",
    "spike-uk-day-3": "External wheat market context is back in focus",
    "spike-uk-week-1": "Weekly export tempo became a key negotiation signal",
    "spike-uk-week-2": "Grain-market updates reinforce the weekly macro block",
    "spike-uk-month-1": "Logistics became the dominant narrative across the month",
    "spike-uk-month-2": "International market tone systematically explains local pricing pauses",
  };

  return map[id] ?? id;
}

function translateFeedSummary(id: string) {
  const map: Record<string, string> = {
    "spike-uk-day-1":
      "The item points to slower execution in part of the market and concentrated demand in selected shipment windows.",
    "spike-uk-day-2":
      "The market is described as quiet on the seller side, reinforcing a firmer negotiation stance in corn.",
    "spike-uk-day-3":
      "Participants discuss export expectations and the way the international wheat tone filters into local indications.",
    "spike-uk-week-1":
      "This type of item directly strengthens the weekly commentary because it combines logistics facts with trading behavior.",
    "spike-uk-week-2":
      "The weekly fact pattern supports a macro block in the report without overloading the reader with raw numbers.",
    "spike-uk-month-1":
      "Hundreds of mentions cluster around ports, routes and execution rhythm, which is exactly what the monthly intelligence layer should surface.",
    "spike-uk-month-2":
      "The monthly layer should emphasize stable cause-effect relationships between global market tone and local pauses in pricing.",
  };

  return map[id] ?? id;
}
