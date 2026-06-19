import "server-only";

import type { Locale } from "@/lib/i18n";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import type { PublicLatestItem } from "@/lib/public-api-data";

type MediaHubReportKind = "daily" | "weekly" | "monthly";
type MediaHubTenant = "spike" | "platform";

export type MediaHubLocalizedReport = {
  summary: string[];
  title: string;
};

type GeneratedPayload = {
  summary?: unknown;
  title?: unknown;
};

export async function generateMediaHubLlmReports(input: {
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}): Promise<{
  localized: Partial<Record<Locale, MediaHubLocalizedReport>>;
  model?: string;
  provider?: "openai";
  skippedReason?: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { localized: {}, skippedReason: "openai_api_key_missing" };
  }

  const locales: Locale[] = input.tenant === "spike" ? ["uk", "en"] : ["en"];
  const model = getMediaHubModel(input.kind);
  const localized: Partial<Record<Locale, MediaHubLocalizedReport>> = {};

  for (const locale of locales) {
    const generated = await generateOneLocale({ ...input, apiKey, locale, model });
    if (generated) {
      localized[locale] = generated;
    }
  }

  return {
    localized,
    model,
    provider: "openai",
    skippedReason: Object.keys(localized).length > 0 ? undefined : "openai_generation_empty",
  };
}

async function generateOneLocale(input: {
  apiKey: string;
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  model: string;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}) {
  const prompt = buildPrompt(input);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: prompt,
        max_output_tokens: input.kind === "daily" ? 900 : 1300,
        model: input.model,
        temperature: 0.3,
      }),
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const parsed = parseGeneratedJson(extractResponseText(payload));
    if (!parsed) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildPrompt(input: {
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}) {
  const isUk = input.locale === "uk";
  const tenantInstruction =
    input.tenant === "spike"
      ? isUk
        ? "You write for SPIKE SPOT INDEX Ukraine. Use all monitored Ukrainian and English materials, but write only in Ukrainian. Connect the narrative to today's SPIKE index values and visible price dynamics when index data is provided."
        : "You write for SPIKE SPOT INDEX Ukraine. Use all monitored Ukrainian and English materials, but write only in English. The market scope is Ukraine. Connect the narrative to today's SPIKE index values and visible price dynamics when index data is provided."
      : "You write for 1D3X Media Hub. Use global commodity, grain/oilseed, logistics, policy and weather context. Write only in English.";
  const reportInstruction =
    input.kind === "daily"
      ? "Create a compact daily market intelligence report. Focus only on concrete changes, trends, events and watch points. Do not list empty sections."
      : input.kind === "weekly"
        ? "Create a weekly market intelligence report. Use only sections with real information. No empty headings, no generic filler, no invented facts."
        : "Create a monthly market intelligence report. Use only recurring themes and concrete source-backed developments.";
  const indexLines = input.latestData
    .filter((item) => item.valueUsdPerMt !== null)
    .slice(0, 18)
    .map((item) => {
      const name = isUk ? item.commodityNameUk : item.commodityNameEn;
      return `${name} (${item.commodityCode}, ${item.basis}): ${item.valueUsdPerMt} USD/t, daily change ${item.changeAbs ?? "n/a"}`;
    });
  const feedLines = input.snapshots
    .flatMap((snapshot) => snapshot.feed.map((item) => ({
      item,
      snapshot,
    })))
    .slice(0, input.kind === "daily" ? 22 : 55)
    .map(({ item, snapshot }, index) =>
      `${index + 1}. [${snapshot.window}] ${item.title} | ${item.source} | ${item.summary} | tags: ${item.tags.join(", ")}`,
    );
  const topicLines = input.snapshots
    .flatMap((snapshot) => snapshot.topTopics)
    .slice(0, 18)
    .map((topic) => `${topic.label}: ${topic.count} — ${topic.hint}`);

  return [
    tenantInstruction,
    reportInstruction,
    `Period: ${input.periodStartDate} to ${input.periodEndDate}. Report kind: ${input.kind}.`,
    "Return strict JSON only. Shape: {\"title\":\"...\",\"summary\":[\"paragraph or bullet\",\"...\"]}.",
    "Rules: 4-7 summary items. Be factual and concise. Do not mention lack of data as a section. Do not invent prices, deals, forecasts, or causes. Not trading advice.",
    isUk
      ? "Ukrainian style: clear business Ukrainian, no Russian, no English section titles unless source names require it."
      : "English style: concise editorial market note, no boilerplate.",
    "",
    "Index data:",
    indexLines.length > 0 ? indexLines.join("\n") : "No index data provided.",
    "",
    "Topic clusters:",
    topicLines.length > 0 ? topicLines.join("\n") : "No topic clusters.",
    "",
    "Monitoring items:",
    feedLines.length > 0 ? feedLines.join("\n") : "No monitoring items.",
  ].join("\n");
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = payload as {
    output?: Array<{
      content?: Array<{ text?: string | { value?: string }; value?: string }>;
    }>;
    output_text?: string;
  };

  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => {
        if (typeof content.text === "string") {
          return content.text;
        }
        if (content.text && typeof content.text.value === "string") {
          return content.text.value;
        }
        return typeof content.value === "string" ? content.value : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

function parseGeneratedJson(value: string): MediaHubLocalizedReport | null {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    : trimmed;

  try {
    const parsed = JSON.parse(jsonText) as GeneratedPayload;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const summary = Array.isArray(parsed.summary)
      ? parsed.summary
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (!title || summary.length === 0) {
      return null;
    }

    return { summary, title };
  } catch {
    return null;
  }
}

function getMediaHubModel(kind: MediaHubReportKind) {
  if (kind === "daily") {
    return process.env.MEDIA_HUB_DAILY_REPORT_MODEL ||
      process.env.MEDIA_HUB_REPORT_MODEL ||
      process.env.SPIKE_AI_BRIEF_MODEL ||
      "gpt-4.1-mini";
  }

  return process.env.MEDIA_HUB_WEEKLY_REPORT_MODEL ||
    process.env.MEDIA_HUB_REPORT_MODEL ||
    process.env.SPIKE_WEEKLY_REPORT_MODEL ||
    process.env.SPIKE_AI_BRIEF_MODEL ||
    "gpt-4.1-mini";
}
