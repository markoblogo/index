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
  historicalSummaries?: string[];
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

  return input.tenant === "spike"
    ? buildSsiDailyReportPrompt(input)
    : build1d3xDailyReportPrompt(input);
}

export function buildSsiDailyReportPrompt(input: {
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  const isUk = input.locale === "uk";
  return [
    isUk
      ? "You write for SPIKE SPOT INDEX Ukraine. Use all monitored Ukrainian and English materials, but write only in Ukrainian. Market scope is Ukraine."
      : "You write for SPIKE SPOT INDEX Ukraine. Write only in English. Market scope is Ukraine.",
    "Create only the market/news part of the daily report. The deterministic index section is rendered by code before your text.",
    "Use SPIKE index data only as context for main signals; do not repeat every index line and do not invent missing index values.",
    "Required non-empty sections in summary array. Put section headings as standalone items, followed by bullet text items without bullet symbols.",
    isUk
      ? [
          "🔎 Головні сигнали",
          "🌾 Ринок зернових",
          "🌻 Олійні та продукти переробки",
          "🏭 Переробка, попит та внутрішній ринок",
        ].join("\n")
      : [
          "🔎 Key signals",
          "🌽 Grains",
          "🌱 Oilseeds and vegetable oils",
          "🚢 Logistics and freight",
          "🌦 Crop weather and production",
          "⚖️ Trade policy and demand",
          "🏭 Processing and domestic demand",
          "🌍 International context",
        ].join("\n"),
    "Omit thematic sections that have no concrete source-backed facts. Keep daily shorter than weekly and prioritize price movement + drivers.",
    "For this daily report include only sections that have market-relevant facts and avoid logistics/policy/global digressions unless directly impacting Ukraine prices.",
    noHallucinationRules(),
    commonJsonRules(input),
    renderIndexData(input.latestData, isUk),
    renderManualMaterials(input.manualMaterials ?? [], input.kind),
    renderSnapshotEvidence(input.snapshots, input.kind),
  ].join("\n\n");
}

export function build1d3xDailyReportPrompt(input: {
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: Tenant;
}) {
  return [
    "You write for 1D3X Media Hub. Write only in English. Scope is global grains, oilseeds, vegetable oils, physical/futures markets and logistics.",
    "Create a compact daily market/news report. 1D3X has no index section; do not include SPIKE Spot Commodity Index Ukraine.",
    "Use API/scheduled materials as primary evidence when present. The report must discuss concrete market events, not only source counts or topic names.",
    "Ignore general trucking, LNG, crude/shadow-fleet, automotive, coal, infrastructure or finance stories unless they explicitly mention grains, oilseeds, vegetable oils, crop weather, export tenders, futures, ports/freight for agricultural commodities, or Black Sea grain flows.",
    "Do not infer grain or oilseed impact from generic logistics or energy stories. If concrete grain/oilseed evidence is thin, use web search to find current global grain, oilseed, vegetable oil, crop-weather and trade-policy signals for the period.",
    "Do not write phrases like 'the feed contains N items', 'densest source contribution', or 'led by Logistics'. Translate monitoring evidence into market implications.",
    "Required non-empty sections in summary array. Put section headings as standalone items, followed by bullet text items without bullet symbols.",
    [
      "🔎 Key signals",
      "🌽 Grains",
      "🌱 Oilseeds and vegetable oils",
      "🚢 Logistics and freight",
      "🌦 Crop weather and production",
      "⚖️ Trade policy and demand",
      "🌍 Regional notes",
    ].join("\n"),
    "Omit thematic sections that have no concrete source-backed facts. Do not become Ukraine-only unless Ukraine/Black Sea materially drives the global market.",
    noHallucinationRules(),
    commonJsonRules(input),
    renderManualMaterials(input.manualMaterials ?? [], input.kind),
    renderSnapshotEvidence(input.snapshots, input.kind),
  ].join("\n\n");
}

export function buildSsiWeeklyMonthlyPrompt(input: {
  avoidPhrases?: string[];
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  historicalSummaries?: string[];
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
    "Do not write the old Spike Brokers partner footer.",
    "No trading recommendations. No invented index values, futures prices, export volumes, destinations, dates or sources.",
    "Avoid generic phrases: ринок перебуває під тиском; залишається стабільним; демонструє зростання; свідчить про; формує баланс; нівелює.",
    input.kind === "monthly"
      ? "Monthly adaptation: synthesize the previous three weekly reports plus the current/fourth week evidence. Focus on persistent drivers, cumulative dynamics and structural shifts. Avoid day-by-day narrative."
      : "Weekly adaptation: cover the full reporting period, not a recap of the latest daily note.",
    input.kind === "monthly"
      ? "Monthly report must be materially larger than daily/weekly notes: target 45-80 summary array items with 3-6 concrete narrative items under every sourced section. Do not stop after headings."
      : "Weekly report target: 25-45 summary array items with concrete narrative items under every sourced section.",
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
    renderManualMaterials(input.manualMaterials ?? [], input.kind),
    renderHistoricalContext(input.historicalSummaries ?? []),
    renderSnapshotEvidence(input.snapshots, input.kind),
    renderAvoidPhrases(input.avoidPhrases ?? []),
  ].join("\n\n");
}

function noHallucinationRules() {
  return [
    "No-hallucination rules:",
    "Do not invent prices, volumes, sources, dates, destinations or causes.",
    "If data is unavailable, omit the item completely. Never write that data is unavailable, absent, missing or not published.",
    "Do not write trading recommendations.",
    "Do not copy long passages from sources.",
    "Use concise professional commodity-market language.",
  ].join("\n");
}

export function build1d3xWeeklyMonthlyPrompt(input: {
  avoidPhrases?: string[];
  kind: ReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  historicalSummaries?: string[];
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
      ? "Monthly adaptation: synthesize the previous three weekly reports plus current/fourth week evidence. Cover persistent drivers and cumulative shifts, not a short digest."
      : "Weekly adaptation: full week synthesis, not a latest-daily recap.",
    input.kind === "monthly"
      ? "Monthly report must be materially larger than daily/weekly notes: target 45-80 summary array items with 3-6 concrete narrative items under every sourced section. Do not stop after headings."
      : "Weekly report target: 25-45 summary array items with concrete narrative items under every sourced section.",
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
    renderManualMaterials(input.manualMaterials ?? [], input.kind),
    renderHistoricalContext(input.historicalSummaries ?? []),
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
      ? "Use section headings plus concise bullet-text items; keep the full summary under 28 array items."
      : input.kind === "weekly"
        ? "Use substantial sectioned summary items. Target 25-45 summary array items. Omit empty sections completely."
        : "Use a full monthly report, not a digest. Target 45-80 summary array items. Omit empty sections completely.",
    "Paraphrase source materials. Do not copy long copyrighted text. If data is missing, omit that item or section completely.",
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
  const feedLimit = kind === "daily" ? 24 : kind === "weekly" ? 90 : 140;
  const feedLines = snapshots
    .flatMap((snapshot) => snapshot.feed.map((item) => ({ item, snapshot })))
    .filter(({ item }) => scoreEvidenceText(`${item.source} ${item.title} ${item.summary} ${item.tags.join(" ")}`) > 0)
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

function renderManualMaterials(materials: MediaHubManualMaterialDigest[], kind: ReportKind) {
  const ranked = materials
    .map((material) => ({ material, score: scoreManualMaterial(material) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score);

  if (ranked.length === 0) {
    return "Additional API/manual evidence: none.";
  }

  return [
    "Additional API/manual evidence:",
    ...ranked.slice(0, kind === "daily" ? 24 : kind === "weekly" ? 44 : 70).map(({ material }, index) =>
      `${index + 1}. ${material.sourceDomain || material.originalFilename || material.originalUrl || material.id} | ${formatMaterialEvidence(material)}`,
    ),
    ...renderVisualEvidence(ranked.map(({ material }) => material)),
  ].join("\n");
}

function formatMaterialEvidence(material: MediaHubManualMaterialDigest) {
  const source = material.summary || material.extractedText;
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(provider|source|published|url|routing|tags):/i.test(line))
    .filter((line) => !line.startsWith("{") && !line.startsWith("["));
  return (lines.join(" ") || source).replace(/\s+/g, " ").slice(0, 700);
}

function renderVisualEvidence(materials: MediaHubManualMaterialDigest[]) {
  const visualLines = materials
    .flatMap((material) =>
      material.assets
        .filter((asset) => asset.assetType === "preview_image" || asset.assetType === "visual_summary")
        .filter((asset) => asset.visualSummary || asset.extractedText)
        .map((asset) => {
          const label = material.originalFilename || material.sourceDomain || material.originalUrl || material.id;
          const page = asset.pageNumber ? ` page ${asset.pageNumber}` : "";
          const confidence = typeof asset.confidence === "number" ? ` confidence ${asset.confidence.toFixed(2)}` : "";
          const evidence = asset.visualSummary || asset.extractedText;
          return {
            line: `Visual evidence: ${label}${page}${confidence} | ${evidence}`,
            score: scoreEvidenceText(`${label} ${evidence}`),
          };
        }),
    )
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .map((item) => item.line)
    .slice(0, 12);

  return visualLines.length > 0
    ? ["Visual/file evidence for admin review and report grounding:", ...visualLines]
    : [];
}

function renderHistoricalContext(items: string[]) {
  if (items.length === 0) {
    return "Recent report context: none available.";
  }

  return [
    "Recent report context (use only when source-backed):",
    ...items.slice(0, 48).map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

function scoreManualMaterial(material: MediaHubManualMaterialDigest) {
  const domain = (material.sourceDomain || "").toLowerCase();
  const visualText = material.assets
    .map((asset) => `${asset.visualSummary} ${asset.extractedText}`)
    .join(" ");
  const text = `${domain} ${material.summary} ${material.extractedText} ${visualText}`.toLowerCase();
  return scoreEvidenceText(text, domain);
}

function scoreEvidenceText(text: string, domain = "") {
  if (
    domain.includes("wikipedia.org") ||
    domain.includes("seedoilfreecertified.com") ||
    /un comtrade release \d/i.test(text)
  ) {
    return -20;
  }
  if (/(4d lidar|class 8 safety|truckload market cycle|domestic transportation|lng import terminal|coking coal|ethane|lpg|shadow fleet|subsea cable|automotive)/i.test(text)) {
    return -10;
  }

  let score = 0;
  if (/(usda|ers\.usda|ams\.usda|brownfieldagnews|farmprogress|agriculture\.com|agweb|barchart|nasdaq|graincentral|world-grain)/i.test(domain)) {
    score += 6;
  }
  if (/(wheat|corn|maize|soybean|soybeans|soy oil|soymeal|oilseed|rapeseed|canola|sunflower|palm oil|vegetable oil|grain|barley|sorghum)/i.test(text)) {
    score += 5;
  }
  if (/(futures|cbot|euronext|matif|basis|tender|export|import|stocks|production|harvest|crop|weather|drought|rain|yield|usda|wasde)/i.test(text)) {
    score += 4;
  }
  if (/(freight|port|vessel|shipping|rail|barge|black sea|bosphorus|danube)/i.test(text)) {
    score += 1;
  }
  if (/(пшениц|кукурудз|соняшник|соя|ріпак|зерн|олій|експорт|порт|урожай)/i.test(text)) {
    score += 5;
  }
  return score;
}

function renderAvoidPhrases(phrases: string[]) {
  return phrases.length > 0
    ? `Avoid repeated phrases from previous reports:\n${phrases.slice(0, 30).join("\n")}`
    : "Avoid repeated openings and boilerplate from previous reports.";
}
