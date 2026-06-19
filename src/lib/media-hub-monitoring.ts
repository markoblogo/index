import "server-only";

import { todayInputDate } from "@/lib/admin-daily-inputs";
import { getDefaultWeekEnd } from "@/lib/admin-reports";
import type { Locale } from "@/lib/i18n";
import {
  getMediaHubWindowProgressLabel,
  type MediaHubWindowSnapshot,
  type MediaHubWindowKey,
} from "@/lib/media-hub";
import { getPublishedAiMarketBrief } from "@/lib/ai-market-brief-public";
import { getRealAnalyticsHistory } from "@/lib/ai-market-brief-public";
import {
  listReportWorkspaceResources,
  type ReportWorkspaceResource,
} from "@/lib/report-workspace";
import { getSpikeUkraineEnglishRssWindows } from "@/lib/media-hub-rss";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";
import {
  getDailyTelegramDigest,
  getTelegramDigestForResourcesWindow,
  getWeeklyTelegramDigest,
  type TelegramCollectedPost,
  type TelegramSourceDigest,
} from "@/lib/telegram-source-collector";

type TopicDefinition = {
  id: string;
  labelEn: string;
  labelUk: string;
  keywords: string[];
};

const TOPIC_DEFINITIONS: TopicDefinition[] = [
  {
    id: "logistics",
    labelEn: "Logistics",
    labelUk: "Логістика",
    keywords: ["логіст", "порт", "маршрут", "відвантаж", "freight", "logistic", "route", "shipment", "port"],
  },
  {
    id: "wheat",
    labelEn: "Wheat",
    labelUk: "Пшениця",
    keywords: ["пшениц", "wheat", "11.5", "protein"],
  },
  {
    id: "corn",
    labelEn: "Corn",
    labelUk: "Кукурудза",
    keywords: ["кукуруд", "corn", "maize"],
  },
  {
    id: "crop",
    labelEn: "Crop",
    labelUk: "Урожай",
    keywords: ["урож", "посів", "crop", "harvest", "field", "yield"],
  },
  {
    id: "weather",
    labelEn: "Weather",
    labelUk: "Погода",
    keywords: ["погод", "опад", "weather", "rain", "drought", "temperature"],
  },
  {
    id: "policy",
    labelEn: "Policy",
    labelUk: "Політика",
    keywords: ["політик", "регуля", "policy", "tariff", "ministry", "usda", "tender"],
  },
  {
    id: "processing",
    labelEn: "Processing",
    labelUk: "Переробка",
    keywords: ["перероб", "завод", "processing", "crusher", "meal", "oil"],
  },
  {
    id: "export",
    labelEn: "Export",
    labelUk: "Експорт",
    keywords: ["експорт", "export", "demand", "sale", "buyer", "тендер", "попит"],
  },
];

export type MediaHubRegistryRow = {
  id: string;
  language: string;
  notes: string;
  reportKind: "daily" | "weekly";
  role: "analysis_source" | "format_reference";
  scope: "permanent" | "one_off";
  title: string;
  type: string;
  url: string;
  windows: Array<"day" | "week">;
};

export async function getSpikeMediaHubLiveWindows(locale: Locale) {
  if (locale === "en") {
    return getSpikeUkraineEnglishRssWindows(await getAiMarketBriefSourceItems(locale));
  }

  const [dailyResources, weeklyResources, dailyDigest, weeklyDigest, aiBriefItems] = await Promise.all([
    listReportWorkspaceResources({ reportKind: "daily" }),
    listReportWorkspaceResources({ reportKind: "weekly" }),
    getDailyTelegramDigest(todayInputDate()),
    getWeeklyTelegramDigest(getDefaultWeekEnd()),
    getAiMarketBriefSourceItems(locale),
  ]);
  const aiBriefPosts = aiBriefItems.map((item) => toTelegramSyntheticPost(item));

  const monthlyDigest = await getMonthlyTelegramDigest([...dailyResources, ...weeklyResources]);

  return [
    buildWindowSnapshot({
      digest: dailyDigest,
      label: locale === "uk" ? "День" : "Day",
      locale,
      resourceRows: dailyResources,
      window: "day",
      extraPosts: aiBriefPosts,
      extraSourceCount: aiBriefPosts.length > 0 ? 1 : 0,
    }),
    buildWindowSnapshot({
      digest: weeklyDigest,
      label: locale === "uk" ? "7 Днів" : "7 Days",
      locale,
      resourceRows: weeklyResources,
      window: "week",
      extraPosts: aiBriefPosts,
      extraSourceCount: aiBriefPosts.length > 0 ? 1 : 0,
    }),
    buildWindowSnapshot({
      digest: monthlyDigest,
      label: "30 Days",
      locale,
      resourceRows: [...dailyResources, ...weeklyResources],
      window: "month",
      extraPosts: aiBriefPosts,
      extraSourceCount: aiBriefPosts.length > 0 ? 1 : 0,
    }),
  ];
}

async function getAiMarketBriefSourceItems(locale: Locale) {
  try {
    const [history, activeRespondentCount] = await Promise.all([
      getRealAnalyticsHistory(),
      getActiveRespondentCountData(),
    ]);
    const brief = await getPublishedAiMarketBrief({
      activeRespondentCount,
      history,
      locale,
    });
    if (!brief) {
      return [];
    }

    return [{
      publishedAt: brief.generatedAt,
      source: "SPIKE AI Market Brief",
      summary: brief.blocks.map((block) => `${block.title}: ${block.body}`).join("\n\n"),
      title: `SPIKE AI Market Brief · ${brief.tradeDate}`,
      topicTags: ["markets", "trade"],
      url: `https://spike.1d3x.com/${locale}/analytics`,
    }];
  } catch {
    return [];
  }
}

function toTelegramSyntheticPost(item: Awaited<ReturnType<typeof getAiMarketBriefSourceItems>>[number]): TelegramCollectedPost {
  const id = `ai-market-brief-${item.publishedAt}`;
  return {
    channelHandle: "spike-ai-market-brief",
    channelTitle: item.source,
    externalPostId: id,
    id,
    included: true,
    peerId: null,
    postUrl: item.url,
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    text: `${item.title}\n\n${item.summary}`,
  };
}

export async function getMonthlyMediaHubDigest() {
  const [dailyResources, weeklyResources] = await Promise.all([
    listReportWorkspaceResources({ reportKind: "daily" }),
    listReportWorkspaceResources({ reportKind: "weekly" }),
  ]);

  return getMonthlyTelegramDigest([...dailyResources, ...weeklyResources]);
}

export async function listUnifiedMediaHubRegistry() {
  const [dailyResources, weeklyResources] = await Promise.all([
    listReportWorkspaceResources({ reportKind: "daily" }),
    listReportWorkspaceResources({ reportKind: "weekly" }),
  ]);

  const map = new Map<string, MediaHubRegistryRow>();

  for (const resource of dailyResources) {
    mergeRegistryResource(map, resource, "day");
  }
  for (const resource of weeklyResources) {
    mergeRegistryResource(map, resource, "week");
  }

  return [...map.values()].sort((a, b) => {
    const roleSort = a.role === b.role ? 0 : a.role === "analysis_source" ? -1 : 1;
    if (roleSort !== 0) {
      return roleSort;
    }
    return a.title.localeCompare(b.title);
  });
}

async function getMonthlyTelegramDigest(resources: ReportWorkspaceResource[]) {
  const endAt = new Date();
  const startAt = new Date(endAt.getTime() - 30 * 24 * 60 * 60 * 1000);

  return getTelegramDigestForResourcesWindow({
    endAt,
    resources: resources.filter((resource) => resource.enabled),
    startAt,
    syncUntil: endAt,
  });
}

function buildWindowSnapshot(input: {
  digest: TelegramSourceDigest;
  extraPosts?: TelegramCollectedPost[];
  extraSourceCount?: number;
  label: string;
  locale: Locale;
  resourceRows: ReportWorkspaceResource[];
  window: MediaHubWindowKey;
}): MediaHubWindowSnapshot {
  const includedPosts = [
    ...input.digest.channels.flatMap((channel) =>
      channel.posts.filter((post) => post.included),
    ),
    ...(input.extraPosts ?? []),
  ];
  const topTopics = scoreTopics(includedPosts, input.locale).slice(0, 4);
  const activeSources = input.digest.channels.filter((channel) => channel.includedPostCount > 0);
  const configuredSources = input.resourceRows.filter((resource) => resource.enabled);
  const configuredSourceCount = configuredSources.length + (input.extraSourceCount ?? 0);
  const distribution = buildDistribution(input.resourceRows);
  const pulseCards = topTopics.slice(0, 3).map((topic, index) => ({
    hint: topic.hint,
    label: topic.label,
    tone:
      (index === 0
        ? "sky"
        : index === 1
          ? "green"
          : "amber") as "sky" | "green" | "amber",
    value: normalizePulseValue(topic.count, includedPosts.length),
  }));
  const summaryBody = buildSummaryBody({
    activeSources,
    includedPosts,
    locale: input.locale,
    topTopics,
    window: input.window,
  });

  return {
    distribution,
    feed: buildFeed(includedPosts, input.locale),
    itemCount: includedPosts.length,
    label: input.label,
    progressLabel: getMediaHubWindowProgressLabel(input.window, {
      timezone: "Europe/Kyiv",
    }),
    pulseCards,
    snapshotCards: [
      {
        label: input.locale === "uk" ? "Джерела" : "Sources",
        note:
          input.locale === "uk"
            ? `${activeSources.length} active in window`
            : `${activeSources.length} active in window`,
        value: String(configuredSourceCount),
      },
      {
        label: input.locale === "uk" ? "Матеріали" : "Items",
        note: input.locale === "uk" ? "included only" : "included only",
        value: String(includedPosts.length),
      },
      {
        label: input.locale === "uk" ? "Теми" : "Topics",
        note: input.locale === "uk" ? "keyword clusters" : "keyword clusters",
        value: String(topTopics.length),
      },
    ],
    sourceCount: configuredSourceCount,
    summaryBody,
    summaryTitle:
      input.window === "day"
        ? "Daily AI brief"
        : input.window === "week"
          ? "Weekly synthesis"
          : "30-day intelligence brief",
    topSources: buildTopSources(activeSources, configuredSources),
    topTopics,
    topicCount: topTopics.length,
    window: input.window,
  };
}

function buildTopSources(
  activeSources: TelegramSourceDigest["channels"],
  configuredSources: ReportWorkspaceResource[],
) {
  const active = activeSources
    .map((channel) => ({
      count: channel.includedPostCount,
      label: channel.channelTitle || `@${channel.channelHandle}`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (active.length > 0) {
    return active;
  }

  return configuredSources
    .slice(0, 4)
    .map((resource) => ({
      count: 0,
      label: resource.title,
    }));
}

function buildDistribution(resources: ReportWorkspaceResource[]) {
  const counts = new Map<string, number>();
  const labelMap = new Map<string, string>([
    ["telegram_channel", "Telegram"],
    ["website", "Web"],
    ["blog", "Blogs"],
    ["file", "Files"],
    ["note", "Notes"],
    ["prompt", "Prompts"],
  ]);
  const colors = new Map<string, string>([
    ["Telegram", "#7be7ff"],
    ["Web", "#9dff7a"],
    ["Blogs", "#ffd869"],
    ["Files", "#ff9c6b"],
    ["Notes", "#a78bfa"],
    ["Prompts", "#f472b6"],
  ]);

  for (const resource of resources.filter((resource) => resource.enabled)) {
    const label = labelMap.get(resource.type) ?? "Other";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0) || 1;

  return [...counts.entries()]
    .map(([label, count]) => ({
      color: colors.get(label) ?? "#94a3b8",
      label,
      value: Math.max(1, Math.round((count / total) * 100)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildFeed(posts: TelegramCollectedPost[], locale: Locale) {
  return [...posts]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 6)
    .map((post) => ({
      id: post.id,
      source: post.channelTitle || `@${post.channelHandle}`,
      sourceType: "Telegram",
      summary: summarizeText(post.text),
      tags: inferPostTags(post.text, locale),
      time: formatRelativeWindowDate(post.publishedAt),
      title: extractTitle(post.text),
      tone: post.text.length > 300 ? ("elevated" as const) : ("normal" as const),
    }));
}

function scoreTopics(posts: TelegramCollectedPost[], locale: Locale) {
  const rows = TOPIC_DEFINITIONS.map((topic) => {
    const count = posts.reduce((sum, post) => {
      const haystack = post.text.toLowerCase();
      return sum + (topic.keywords.some((keyword) => haystack.includes(keyword)) ? 1 : 0);
    }, 0);

    return {
      count,
      hint:
        locale === "uk"
          ? buildTopicHintUk(topic.id)
          : buildTopicHintEn(topic.id),
      label: locale === "uk" ? topic.labelUk : topic.labelEn,
    };
  })
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count);

  return rows.length > 0
    ? rows
    : [
        {
          count: posts.length,
          hint: locale === "uk" ? "Поточне вікно збору" : "Current collection window",
          label: locale === "uk" ? "Моніторинг" : "Monitoring",
        },
      ];
}

function buildSummaryBody(input: {
  activeSources: TelegramSourceDigest["channels"];
  includedPosts: TelegramCollectedPost[];
  locale: Locale;
  topTopics: Array<{ count: number; hint: string; label: string }>;
  window: MediaHubWindowKey;
}) {
  const topTopicLabels = input.topTopics.slice(0, 3).map((topic) => topic.label).join(", ");
  const topSources = input.activeSources
    .sort((a, b) => b.includedPostCount - a.includedPostCount)
    .slice(0, 2)
    .map((source) => source.channelTitle || `@${source.channelHandle}`)
    .join(", ");

  if (input.locale === "uk") {
    return [
      `${windowLabelUk(input.window)} вікно зараз містить ${input.includedPosts.length} включених Telegram-постів з ${input.activeSources.length} активних джерел.`,
      `Найсильніші тематичні кластери: ${topTopicLabels || "моніторинг поточного вікна"}. Найщільніше джерельне покриття зараз дають ${topSources || "підключені канали"}.`,
      "Цей шар уже можна використовувати як редакторський preview перед генерацією summary, а далі він має бути розширений веб-, блог- і file-ingestion блоками.",
    ];
  }

  return [
    `The ${input.window} window currently contains ${input.includedPosts.length} included Telegram posts across ${input.activeSources.length} active sources.`,
    `The strongest topic clusters are ${topTopicLabels || "current monitoring context"}. The densest source coverage currently comes from ${topSources || "the connected channels"}.`,
    "This layer is already useful as an editorial preview before summary generation, and should next be expanded with web, blog and file ingestion.",
  ];
}

function mergeRegistryResource(
  map: Map<string, MediaHubRegistryRow>,
  resource: ReportWorkspaceResource,
  window: "day" | "week",
) {
  const key = [
    resource.role,
    resource.type,
    resource.title.trim().toLowerCase(),
    resource.url.trim().toLowerCase(),
    resource.language,
  ].join("::");
  const existing = map.get(key);

  if (existing) {
    if (!existing.windows.includes(window)) {
      existing.windows.push(window);
    }
    return;
  }

  map.set(key, {
    id: resource.id,
    language: resource.language,
    notes: resource.notes,
    reportKind: resource.reportKind,
    role: resource.role,
    scope: resource.scope,
    title: resource.title,
    type: resource.type,
    url: resource.url,
    windows: [window],
  });
}

function extractTitle(text: string) {
  return text.split("\n").map((line) => line.trim()).find((line) => line.length > 0)?.slice(0, 120) ?? "Monitoring item";
}

function summarizeText(text: string) {
  return text.replace(/\s+/g, " ").slice(0, 240).trim();
}

function inferPostTags(text: string, locale: Locale) {
  const lower = text.toLowerCase();
  const tags = TOPIC_DEFINITIONS.filter((topic) =>
    topic.keywords.some((keyword) => lower.includes(keyword)),
  )
    .slice(0, 3)
    .map((topic) => (locale === "uk" ? topic.labelUk : topic.labelEn));

  return tags.length > 0 ? tags : [locale === "uk" ? "Моніторинг" : "Monitoring"];
}

function normalizePulseValue(count: number, total: number) {
  if (total <= 0) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round((count / total) * 40)));
}

function windowLabelUk(window: MediaHubWindowKey) {
  if (window === "day") return "Денне";
  if (window === "week") return "Тижневе";
  return "30-денне";
}

function buildTopicHintUk(topicId: string) {
  const map: Record<string, string> = {
    logistics: "Маршрути, порти, виконання",
    wheat: "Пшениця і експортний тон",
    corn: "Кукурудза і поведінка продавців",
    crop: "Урожай, поля, очікування",
    weather: "Погодні ризики",
    policy: "Регуляторний і policy шум",
    processing: "Переробка і внутрішній попит",
    export: "Попит, експорт, тендери",
  };
  return map[topicId] ?? "Тематичний кластер";
}

function buildTopicHintEn(topicId: string) {
  const map: Record<string, string> = {
    logistics: "Routes, ports and execution",
    wheat: "Wheat and export tone",
    corn: "Corn and seller behavior",
    crop: "Crop, field and outlook",
    weather: "Weather risk",
    policy: "Regulatory and policy noise",
    processing: "Processing and domestic demand",
    export: "Demand, export and tenders",
  };
  return map[topicId] ?? "Topic cluster";
}

function formatRelativeWindowDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

export async function getMediaHubOverviewStats() {
  const [windows, registry] = await Promise.all([
    getSpikeMediaHubLiveWindows("uk"),
    listUnifiedMediaHubRegistry(),
  ]);

  return {
    daily: windows[0],
    monthly: windows[2],
    registryCount: registry.length,
    weekly: windows[1],
  };
}
