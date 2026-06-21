import type { Locale } from "@/lib/i18n";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import type { MediaHubManualMaterialDigest } from "@/lib/media-hub-manual-materials";
import type { PublicLatestItem } from "@/lib/public-api-data";

type ReportKind = "daily" | "weekly" | "monthly";
type Tenant = "spike" | "platform";

export function buildMediaHubReportPrompt(input: {
  avoidPhrases?: string[];
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  if (input.kind === "weekly" || input.kind === "monthly") {
    return input.tenant === "spike"
      ? buildSsiWeeklyMonthlyPrompt(input)
      : build1d3xWeeklyMonthlyPrompt(input);
  }

  return buildDailyPrompt(input);
}

function buildDailyPrompt(input: {
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  const isUk = input.locale === "uk";
  return [
    input.tenant === "spike"
      ? isUk
        ? "You write for SPIKE SPOT INDEX Ukraine. Use all monitored Ukrainian and English materials, but write only in Ukrainian. Connect the narrative to today's SPIKE index values when provided."
        : "You write for SPIKE SPOT INDEX Ukraine. Write only in English. Market scope is Ukraine."
      : "You write for 1D3X Media Hub. Write only in English. Scope is global grains, oilseeds and logistics.",
    "Create a compact daily market intelligence report. Focus only on concrete changes, trends, events and watch points. Do not list empty sections.",
    commonJsonRules(input),
    renderIndexData(input.latestData, isUk),
    renderSnapshotEvidence(input.snapshots, input.kind),
  ].join("\n\n");
}

export function buildSsiWeeklyMonthlyPrompt(input: {
  avoidPhrases?: string[];
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  const reportLabel = input.kind === "monthly" ? "Monthly" : "Weekly";
  return [
    "You write for Spike Spot Index, not Spike Brokers. Write in Ukrainian unless explicitly asked otherwise.",
    `Create a professional ${reportLabel} Commodity & Logistics Market report for the Ukrainian grains and oilseeds market.`,
    "Brand footer must be exactly: Spike Spot Index / https://spike.1d3x.com/",
    "Do not write: Spike Brokers – Ваш торговий партнер.",
    "No trading recommendations. No invented index values, futures prices, export volumes, destinations, dates or sources.",
    "Avoid generic phrases: ринок перебуває під тиском; залишається стабільним; демонструє зростання; свідчить про; формує баланс; нівелює.",
    input.kind === "monthly"
      ? "Monthly adaptation: focus on persistent drivers, cumulative dynamics and structural shifts. Avoid day-by-day narrative."
      : "Weekly adaptation: cover the full reporting period, not a recap of the latest daily note.",
    commonJsonRules(input),
    "Required structure inside summary array:",
    [
      "🇺🇦 SPIKE SPOT INDEX | " + reportLabel + " Commodity & Logistics Market",
      "Частина I. Логістика",
      "Основне з експорту за звітний період: 4 concise analytical theses.",
      "🚚 АВТОМОБІЛЬНІ ПЕРЕВЕЗЕННЯ: road crossings, directions, geography, top commodities if sourced.",
      "🚝 ЗАЛІЗНИЧНІ ПЕРЕВЕЗЕННЯ: rail grain/oil/meal flows, port vs land split if sourced.",
      "🚧 У НАПРЯМКУ КОРДОНУ: wagon transfer and accumulation if sourced.",
      "⚓️ У НАПРЯМКУ ПОРТУ: Big Odesa and Danube role if sourced.",
      "Частина II. Зернові",
      "📈 SPIKE Spot Commodity Index Ukraine: short SSI index link to physical/futures market.",
      "🌽 КУКУРУДЗА: CBOT/MATIF/SSI/export/new-crop only where sourced.",
      "🌾 ПШЕНИЦЯ: CBOT/Euronext/SSI/export/demand only where sourced.",
      "Частина III. Олійні та продукти переробки",
      "📈 SPIKE Spot Commodity Index Ukraine: sunflower, soybean, rapeseed where sourced.",
      "🌻 СОНЯШНИК; 🌿 РІПАК; 🌱 СОЯ: vegoils, processing, export chains where sourced.",
      "Final footer: Spike Spot Index / https://spike.1d3x.com/",
    ].join("\n"),
    renderIndexData(input.latestData, true),
    renderManualMaterials(input.manualMaterials ?? []),
    renderSnapshotEvidence(input.snapshots, input.kind),
    renderAvoidPhrases(input.avoidPhrases ?? []),
  ].join("\n\n");
}

export function build1d3xWeeklyMonthlyPrompt(input: {
  avoidPhrases?: string[];
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  const reportLabel = input.kind === "monthly" ? "Monthly" : "Weekly";
  return [
    `Create a professional ${reportLabel} Commodity & Logistics Market report for 1D3X.`,
    "Write in English. Scope is global grains, oilseeds, vegetable oils, physical/futures markets and logistics.",
    "Do not include any SSI index section. Do not become Ukraine-only unless Ukraine/Black Sea materially drives the global market.",
    "Brand footer must be exactly: 1D3X / https://1d3x.com/",
    "No trading recommendations. No invented values, destinations, dates or sources.",
    input.kind === "monthly"
      ? "Monthly adaptation: persistent drivers and cumulative shifts, using weekly reports plus fourth-week daily reports when available."
      : "Weekly adaptation: full week synthesis, not a latest-daily recap.",
    commonJsonRules(input),
    "Required structure inside summary array:",
    [
      "🌍 1D3X | " + reportLabel + " Commodity & Logistics Market",
      "Global market highlights: 5 short analytical theses.",
      "Part I. Logistics & Freight: dry bulk/container context and material corridors/chokepoints only where sourced.",
      "Part II. Grains: corn/maize, wheat, and barley/sorghum only if material.",
      "Part III. Oilseeds & Vegetable Oils: soy complex, rapeseed/canola, sunflower complex, palm oil as a driver only.",
      "Part IV. Regional focus: only relevant regions from source evidence.",
      "Final footer: 1D3X / https://1d3x.com/",
    ].join("\n"),
    renderManualMaterials(input.manualMaterials ?? []),
    renderSnapshotEvidence(input.snapshots, input.kind),
    renderAvoidPhrases(input.avoidPhrases ?? []),
  ].join("\n\n");
}

function commonJsonRules(input: {
  kind: ReportKind;
  periodEndDate: string;
  periodStartDate: string;
}) {
  return [
    `Period: ${input.periodStartDate} to ${input.periodEndDate}. Report kind: ${input.kind}.`,
    "Return strict JSON only. Shape: {\"title\":\"...\",\"summary\":[\"section or paragraph\",\"...\"]}.",
    input.kind === "daily"
      ? "Use 4-7 summary items."
      : "Use substantial sectioned summary items. Omit empty sections completely.",
    "Paraphrase source materials. Do not copy long copyrighted text. If data is missing, omit it or write data unavailable.",
  ].join("\n");
}

function renderIndexData(latestData: PublicLatestItem[], isUk: boolean) {
  const lines = latestData
    .filter((item) => item.valueUsdPerMt !== null)
    .slice(0, 20)
    .map((item) => {
      const name = isUk ? item.commodityNameUk : item.commodityNameEn;
      return `${name} (${item.commodityCode}, ${item.basis}): ${item.valueUsdPerMt} USD/t, change ${item.changeAbs ?? "n/a"}`;
    });
  return ["Index data:", lines.length > 0 ? lines.join("\n") : "No index data provided."].join("\n");
}

function renderSnapshotEvidence(snapshots: MediaHubWindowSnapshot[], kind: ReportKind) {
  const feedLimit = kind === "daily" ? 24 : 80;
  const feedLines = snapshots
    .flatMap((snapshot) => snapshot.feed.map((item) => ({ item, snapshot })))
    .slice(0, feedLimit)
    .map(({ item, snapshot }, index) =>
      `${index + 1}. [${snapshot.window}] ${item.title} | ${item.source} | ${item.summary} | tags: ${item.tags.join(", ")}`,
    );
  const topicLines = snapshots
    .flatMap((snapshot) => snapshot.topTopics)
    .slice(0, 24)
    .map((topic) => `${topic.label}: ${topic.count} — ${topic.hint}`);

  return [
    "Topic clusters:",
    topicLines.length > 0 ? topicLines.join("\n") : "No topic clusters.",
    "Monitoring items:",
    feedLines.length > 0 ? feedLines.join("\n") : "No monitoring items.",
  ].join("\n");
}

function renderManualMaterials(materials: MediaHubManualMaterialDigest[]) {
  if (materials.length === 0) {
    return "Manual weekly/monthly materials: none.";
  }

  return [
    "Manual weekly/monthly materials:",
    ...materials.slice(0, 16).map((material, index) =>
      `${index + 1}. ${material.sourceDomain || material.originalFilename || material.originalUrl || material.id} | ${material.summary || material.extractedText.slice(0, 600)}`,
    ),
  ].join("\n");
}

function renderAvoidPhrases(phrases: string[]) {
  return phrases.length > 0
    ? `Avoid repeated phrases from previous reports:\n${phrases.slice(0, 30).join("\n")}`
    : "Avoid repeated openings and boilerplate from previous reports.";
}
