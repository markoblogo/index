import { describe, expect, it } from "vitest";
import {
  buildAiAnalyticsResult,
  buildAnalyticsFactPack,
  buildHistoricalScenarios,
  classifyMarketRegimes,
  detectMarketAnomalies,
  findSimilarEpisodes,
  sanitizeInsightCard,
  type AiInsightCard,
} from "@/lib/analytics/ai-analytics";
import {
  buildDataQualitySummary,
  buildMarketPulseRows,
  buildSpreadLeaderboard,
  normalizeHistory,
  type IndexHistoryPoint,
} from "@/lib/analytics/experimental-analytics";

const instruments = [
  { id: "corn", label: "Кукурудза" },
  { id: "feed-wheat", label: "Фураж" },
  { id: "sunflower", label: "Соняшник" },
];

function dateFrom(start: string, offset: number) {
  const date = new Date(`${start}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function point(
  commodityId: string,
  date: string,
  value: number,
  respondents = 12,
): IndexHistoryPoint {
  return { commodityId, date, respondents, value };
}

function sampleHistory() {
  return Array.from({ length: 180 }, (_, index) => {
    const date = dateFrom("2026-01-01", index);
    return [
      point("corn", date, 200 + index * 0.18 + Math.sin(index / 9) * 3),
      point("feed-wheat", date, 195 + index * 0.08 + Math.cos(index / 7) * 2),
      point("sunflower", date, 700 + index * 0.35 + Math.sin(index / 11) * 9),
    ];
  }).flat();
}

function buildPack(history = sampleHistory()) {
  const normalized = normalizeHistory(history);
  const pulseRows = buildMarketPulseRows(normalized, instruments);
  const quality = buildDataQualitySummary(normalized, instruments);
  const spreadRows = buildSpreadLeaderboard(normalized, [
    { a: "corn", b: "feed-wheat", id: "corn-feed", label: "Кукурудза / фураж" },
  ]);

  return buildAnalyticsFactPack({
    history: normalized,
    instruments,
    pulseRows,
    qualityRows: quality.rows,
    spreadRows,
  });
}

describe("AI analytics deterministic layer", () => {
  it("builds a fact pack with unique evidence ids and no raw respondent names", () => {
    const factPack = buildPack();
    const ids = factPack.evidence.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(factPack.instruments[0]).toHaveProperty("respondents");
    expect(JSON.stringify(factPack)).not.toContain("respondentName");
  });

  it("detects anomalies from price extremes and data quality rows", () => {
    const history = [
      ...sampleHistory(),
      point("corn", dateFrom("2026-07-01", 0), 420, 12),
      point("feed-wheat", dateFrom("2026-07-01", 0), 160, 2),
    ];
    const anomalies = detectMarketAnomalies(buildPack(history));

    expect(anomalies.some((item) => item.kind === "price_extreme")).toBe(true);
    expect(anomalies.some((item) => item.kind === "data_quality")).toBe(true);
  });

  it("classifies market regimes without throwing on incomplete rows", () => {
    const regimes = classifyMarketRegimes(buildPack());

    expect(regimes).toHaveLength(3);
    expect(regimes.every((row) => row.instrumentId)).toBe(true);
  });

  it("finds similar episodes and scenario distributions for a long series", () => {
    const history = sampleHistory();
    const episodes = findSimilarEpisodes({ history, instrumentId: "corn" });
    const scenarios = buildHistoricalScenarios(episodes);

    expect(episodes.length).toBeGreaterThan(0);
    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].horizon).toBe("7D");
  });

  it("builds full AI analytics result with daily and weekly cards", () => {
    const history = sampleHistory();
    const result = buildAiAnalyticsResult({
      factPack: buildPack(history),
      history,
      selectedInstrumentId: "corn",
    });

    expect(result.dailyBrief.type).toBe("daily_brief");
    expect(result.weeklyBrief.type).toBe("weekly_brief");
    expect(result.marketRegimes.length).toBe(3);
  });

  it("sanitizes forbidden trading language", () => {
    const card: AiInsightCard = {
      confidence: "high",
      details: ["buy corn now"],
      evidenceIds: [],
      id: "bad",
      summary: "bad",
      title: "bad",
      type: "daily_brief",
    };

    expect(sanitizeInsightCard(card).summary).toBe(
      "Аналітичний опис недоступний для публічного показу.",
    );
  });
});
