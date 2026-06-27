import "server-only";

import type { Locale } from "@/lib/i18n";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import type { MediaHubManualMaterialDigest } from "@/lib/media-hub-manual-materials";
import { buildMediaHubReportPrompt } from "@/lib/media-hub-report-prompts";
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

type GenerationResult = {
  error?: string;
  report?: MediaHubLocalizedReport;
};

export async function generateMediaHubLlmReports(input: {
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  manualMaterials?: MediaHubManualMaterialDigest[];
  historicalSummaries?: string[];
  avoidPhrases?: string[];
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
  const errors: string[] = [];

  for (const locale of locales) {
    const generated = await generateOneLocale({ ...input, apiKey, locale, model });
    if (generated.report) {
      localized[locale] = generated.report;
    }
    if (generated.error) {
      errors.push(`${locale}:${generated.error}`);
    }
  }

  return {
    localized,
    model,
    provider: "openai",
    skippedReason: Object.keys(localized).length > 0
      ? undefined
      : errors[0] ? `openai_generation_empty:${errors.slice(0, 2).join("|")}` : "openai_generation_empty",
  };
}

async function generateOneLocale(input: {
  apiKey: string;
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  manualMaterials?: MediaHubManualMaterialDigest[];
  historicalSummaries?: string[];
  avoidPhrases?: string[];
  locale: Locale;
  model: string;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}): Promise<GenerationResult> {
  const prompt = buildPrompt(input);

  try {
    const attempts = [...new Set([input.model, "gpt-4o-mini"])];
    let lastError = "";

    for (const model of attempts) {
      const responses = await callResponsesApi({ ...input, model, prompt });
      if (responses.report) {
        return responses;
      }
      lastError = responses.error || lastError;

      const chat = await callChatCompletionsApi({ ...input, model, prompt });
      if (chat.report) {
        return chat;
      }
      lastError = chat.error || lastError;
    }

    return { error: lastError || "empty_result" };
  } catch (error) {
    return { error: sanitizeOpenAiError(error) };
  }
}

async function callResponsesApi(input: {
  apiKey: string;
  kind: MediaHubReportKind;
  model: string;
  prompt: string;
  tenant: MediaHubTenant;
}): Promise<GenerationResult> {
  const useWebSearch = input.kind !== "daily";
  const requestBody: Record<string, unknown> = {
    input: input.prompt,
    max_output_tokens: input.kind === "daily" ? 1700 : input.kind === "weekly" ? 3600 : 4200,
    model: input.model,
    temperature: 0.25,
  };

  if (useWebSearch) {
    requestBody.tools = [{ type: "web_search_preview" }];
  }

  let response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify(requestBody),
    headers: openAiHeaders(input.apiKey),
    method: "POST",
  });

  if (!response.ok && useWebSearch) {
    delete requestBody.tools;
    response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify(requestBody),
      headers: openAiHeaders(input.apiKey),
      method: "POST",
    });
  }

  if (!response.ok) {
    return { error: await safeOpenAiResponseError(response) };
  }

  const payload = await response.json();
  const report = parseGeneratedJson(extractResponseText(payload), input.kind);
  return report ? { report } : { error: "responses_parse_empty" };
}

async function callChatCompletionsApi(input: {
  apiKey: string;
  kind: MediaHubReportKind;
  model: string;
  prompt: string;
}): Promise<GenerationResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      max_tokens: input.kind === "daily" ? 1700 : input.kind === "weekly" ? 3600 : 4200,
      messages: [
        {
          content: "Return strict JSON only with keys title and summary. summary must be an array of strings.",
          role: "system",
        },
        {
          content: input.prompt,
          role: "user",
        },
      ],
      model: input.model,
      response_format: { type: "json_object" },
      temperature: 0.25,
    }),
    headers: openAiHeaders(input.apiKey),
    method: "POST",
  });

  if (!response.ok) {
    return { error: await safeOpenAiResponseError(response) };
  }

  const payload = await response.json();
  const report = parseGeneratedJson(extractChatCompletionText(payload), input.kind);
  return report ? { report } : { error: "chat_parse_empty" };
}

function openAiHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function buildPrompt(input: {
  avoidPhrases?: string[];
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
  historicalSummaries?: string[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}) {
  return buildMediaHubReportPrompt(input);
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

function extractChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const response = payload as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return response.choices?.[0]?.message?.content?.trim() || "";
}

function parseGeneratedJson(value: string, kind: MediaHubReportKind): MediaHubLocalizedReport | null {
  const trimmed = value.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    : trimmed;
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;

  try {
    const parsed = JSON.parse(jsonText) as GeneratedPayload;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const rawSummary = Array.isArray(parsed.summary)
      ? parsed.summary
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, kind === "daily" ? 40 : 120)
      : [];
    const summary = sanitizeGeneratedSummary(rawSummary);

    if (!title || !isUsableGeneratedSummary(summary, kind)) {
      return null;
    }

    return { summary, title };
  } catch {
    return null;
  }
}

function sanitizeGeneratedSummary(summary: string[]) {
  const result: string[] = [];
  let pendingHeading: string | null = null;

  for (const line of summary) {
    const normalized = normalizeGeneratedLine(line);
    if (!normalized || isUnavailablePlaceholder(normalized)) {
      continue;
    }

    if (isSectionHeadingOnly(normalized)) {
      if (pendingHeading) {
        continue;
      }
      pendingHeading = line;
      continue;
    }

    if (pendingHeading) {
      result.push(pendingHeading);
      pendingHeading = null;
    }
    result.push(line);
  }

  return result;
}

function isUsableGeneratedSummary(summary: string[], kind: MediaHubReportKind) {
  const minNarrativeItems = kind === "daily" ? 3 : kind === "weekly" ? 10 : 14;
  const narrativeItems = summary.filter((item) => {
    const normalized = normalizeGeneratedLine(item);
    if (!normalized) return false;
    if (isSectionHeadingOnly(normalized)) return false;
    if (isUnavailablePlaceholder(normalized)) return false;
    return normalized.split(/\s+/).length >= 7;
  });
  return narrativeItems.length >= minNarrativeItems;
}

function normalizeGeneratedLine(value: string) {
  return value
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}\s/&-]+$/gu, "")
    .trim();
}

function isUnavailablePlaceholder(value: string) {
  return [
    /\bdata (is )?(unavailable|absent|missing|not available)\b/i,
    /\bno (specific|concrete|source-backed|current|material|relevant)\b/i,
    /\bnot (available|published|reported|disclosed)\b/i,
    /\binsufficient (data|evidence|information)\b/i,
    /\bдані (відсутні|недоступні|не оприлюднені|не публікувалися|не надані)\b/i,
    /\bінформац(ія|ії) (відсутня|недоступна|не оприлюднена)\b/i,
    /\bнемає (даних|інформації|публікацій|сигналів)\b/i,
    /\bвідсутні (дані|конкретні|релевантні|опубліковані)\b/i,
    /\bn\/a\b/i,
  ].some((pattern) => pattern.test(value));
}

function isSectionHeadingOnly(value: string) {
  const normalized = value.toLowerCase();
  return [
    "key signals",
    "main signals",
    "grains",
    "oilseeds",
    "oilseeds and vegetable oils",
    "logistics",
    "logistics and freight",
    "crop weather",
    "crop weather and production",
    "trade policy and demand",
    "regional notes",
    "international context",
  ].includes(normalized);
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

async function safeOpenAiResponseError(response: Response) {
  const text = await response.text().catch(() => "");
  return `http_${response.status}:${sanitizeOpenAiError(text)}`;
}

function sanitizeOpenAiError(error: unknown) {
  return String(error instanceof Error ? error.message : error)
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-redacted")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}
