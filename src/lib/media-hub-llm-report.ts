import "server-only";

import type { Locale } from "@/lib/i18n";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import {
  buildCortexMarketReportContextPack,
  mergeCortexContextPacks,
  type CortexContextPack,
} from "@/lib/commodity-intelligence-layer";
import { buildCortexMemoryContextPack } from "@/lib/cortex-memory-context-pack";
import { loadCortexRuntimeChunkManifest } from "@/lib/cortex-runtime-chunk-manifest";
import { buildCortexIndexDbEvidence } from "@/lib/cortex-index-db-evidence";
import { hasDatabaseUrl } from "@/lib/db";
import { getCortexEditorialGuidance, type CortexEditorialGuidance } from "@/lib/cortex-editorial-shadow";
import {
  assessCortexEditorialDraft,
  shouldAttemptCortexEditorialRewrite,
  type CortexEditorialQualityCandidate,
} from "@/lib/cortex-editorial-quality-gate";
import { buildCortexMediaHubMonitoringLedgerEvidence } from "@/lib/media-hub-monitoring-ledger";
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
  qualityCandidate?: CortexEditorialQualityCandidate;
  report?: MediaHubLocalizedReport;
};

const OPENAI_REPORT_TIMEOUT_MS = 60_000;

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
  cortexContextPack: CortexContextPack;
  editorialGuidance?: CortexEditorialGuidance;
  localized: Partial<Record<Locale, MediaHubLocalizedReport>>;
  qualityCandidates?: Partial<Record<Locale, CortexEditorialQualityCandidate>>;
  model?: string;
  provider?: "openai";
  skippedReason?: string;
}> {
  const indexDbEvidence = await loadIndexDbEvidenceForReport(input);
  const monitoringLedgerEvidence = await loadMonitoringLedgerEvidenceForReport(input);
  const deterministicContextPack = buildCortexMarketReportContextPack({
    calculationEvidence: indexDbEvidence.calculationEvidence,
    latestData: input.latestData,
    manualMaterials: input.manualMaterials,
    monitoringLedgerEvidence,
    periodEndDate: input.periodEndDate,
    periodStartDate: input.periodStartDate,
    respondentInputs: indexDbEvidence.respondentInputs,
    reportKind: input.kind,
    snapshots: input.snapshots,
    tenant: input.tenant,
  });
  const cortexContextPack = await augmentReportContextWithCortexMemory(input, deterministicContextPack);
  const editorialGuidance = input.tenant === "spike"
    ? await getCortexEditorialGuidance({ kind: input.kind }).catch(() => undefined)
    : undefined;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { cortexContextPack, editorialGuidance, localized: {}, qualityCandidates: {}, skippedReason: "openai_api_key_missing" };
  }

  const locales: Locale[] = input.tenant === "spike" ? ["uk", "en"] : ["en"];
  const model = getMediaHubModel(input.kind);
  const localized: Partial<Record<Locale, MediaHubLocalizedReport>> = {};
  const qualityCandidates: Partial<Record<Locale, CortexEditorialQualityCandidate>> = {};
  const errors: string[] = [];

  for (const locale of locales) {
    const generated = await generateOneLocale({
      ...input,
      apiKey,
      cortexContextPack,
      editorialGuidance,
      locale,
      model,
    });
    if (generated.report) {
      localized[locale] = generated.report;
    }
    if (generated.qualityCandidate) {
      qualityCandidates[locale] = generated.qualityCandidate;
    }
    if (generated.error) {
      errors.push(`${locale}:${generated.error}`);
    }
  }

  return {
    cortexContextPack,
    editorialGuidance,
    localized,
    qualityCandidates,
    model,
    provider: "openai",
    skippedReason: Object.keys(localized).length > 0
      ? undefined
      : errors[0] ? `openai_generation_empty:${errors.slice(0, 2).join("|")}` : "openai_generation_empty",
  };
}

async function generateOneLocale(input: {
  apiKey: string;
  cortexContextPack: CortexContextPack;
  editorialGuidance?: CortexEditorialGuidance;
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
        return buildShadowQualityCandidate({ input, prompt, report: responses.report });
      }
      lastError = responses.error || lastError;

      const chat = await callChatCompletionsApi({ ...input, model, prompt });
      if (chat.report) {
        return buildShadowQualityCandidate({ input, prompt, report: chat.report });
      }
      lastError = chat.error || lastError;
    }

    return { error: lastError || "empty_result" };
  } catch (error) {
    return { error: sanitizeOpenAiError(error) };
  }
}

async function buildShadowQualityCandidate(input: {
  input: {
    apiKey: string;
    editorialGuidance?: CortexEditorialGuidance;
    kind: MediaHubReportKind;
    model: string;
  };
  prompt: string;
  report: MediaHubLocalizedReport;
}): Promise<GenerationResult> {
  const originalAssessment = assessCortexEditorialDraft({
    draft: input.report,
    guidance: input.input.editorialGuidance,
    kind: input.input.kind,
  });
  let revised: MediaHubLocalizedReport | null = null;
  let revisedAssessment: CortexEditorialQualityCandidate["revisedAssessment"] = null;
  const rewriteAttempted = Boolean(input.input.editorialGuidance?.active && shouldAttemptCortexEditorialRewrite(originalAssessment));

  if (rewriteAttempted) {
    const result = await callBoundedEditorialRewrite({
      apiKey: input.input.apiKey,
      kind: input.input.kind,
      model: input.input.model,
      original: input.report,
      prompt: input.prompt,
      reasons: originalAssessment.reasons,
    });
    if (result.report) {
      revised = result.report;
      revisedAssessment = assessCortexEditorialDraft({
        draft: revised,
        guidance: input.input.editorialGuidance,
        kind: input.input.kind,
      });
    }
  }

  return {
    qualityCandidate: {
      original: input.report,
      originalAssessment,
      revised,
      revisedAssessment,
      rewriteAttempted,
      selected: "original",
    },
    report: input.report,
  };
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
    max_output_tokens: getMaxOutputTokens(input.kind),
    model: input.model,
    temperature: 0.25,
  };

  if (useWebSearch) {
    requestBody.tools = [{ type: "web_search_preview" }];
  }

  let response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    body: JSON.stringify(requestBody),
    headers: openAiHeaders(input.apiKey),
    method: "POST",
  }, OPENAI_REPORT_TIMEOUT_MS);

  if (!response.ok && useWebSearch) {
    delete requestBody.tools;
    response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      body: JSON.stringify(requestBody),
      headers: openAiHeaders(input.apiKey),
      method: "POST",
    }, OPENAI_REPORT_TIMEOUT_MS);
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
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      max_tokens: getMaxOutputTokens(input.kind),
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
  }, OPENAI_REPORT_TIMEOUT_MS);

  if (!response.ok) {
    return { error: await safeOpenAiResponseError(response) };
  }

  const payload = await response.json();
  const report = parseGeneratedJson(extractChatCompletionText(payload), input.kind);
  return report ? { report } : { error: "chat_parse_empty" };
}

async function callBoundedEditorialRewrite(input: {
  apiKey: string;
  kind: MediaHubReportKind;
  model: string;
  original: MediaHubLocalizedReport;
  prompt: string;
  reasons: string[];
}): Promise<GenerationResult> {
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        input.prompt,
        "\n\nEDITORIAL QUALITY REWRITE (shadow candidate only):",
        "Rewrite the JSON draft below once. Keep the same factual scope and do not add, remove or alter facts, numbers, dates, sources, citations, or claims.",
        `Fix only these observable editorial issues: ${input.reasons.join("; ")}.`,
        "Return strict JSON only with keys title and summary.",
        JSON.stringify(input.original),
      ].join("\n"),
      max_output_tokens: getMaxOutputTokens(input.kind),
      model: input.model,
      temperature: 0.1,
    }),
    headers: openAiHeaders(input.apiKey),
    method: "POST",
  }, OPENAI_REPORT_TIMEOUT_MS);
  if (!response.ok) return { error: await safeOpenAiResponseError(response) };
  const payload = await response.json();
  const report = parseGeneratedJson(extractResponseText(payload), input.kind);
  return report ? { report } : { error: "editorial_rewrite_parse_empty" };
}

function openAiHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function buildPrompt(input: {
  avoidPhrases?: string[];
  cortexContextPack: CortexContextPack;
  editorialGuidance?: CortexEditorialGuidance;
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

async function loadIndexDbEvidenceForReport(input: {
  kind: MediaHubReportKind;
  periodEndDate: string;
  periodStartDate: string;
  tenant: MediaHubTenant;
}) {
  if (input.tenant !== "spike" || !hasDatabaseUrl()) {
    return { calculationEvidence: [], respondentInputs: [] };
  }

  try {
    return await buildCortexIndexDbEvidence({
      limit: input.kind === "daily" ? 120 : input.kind === "weekly" ? 300 : 600,
      periodEndDate: input.periodEndDate,
      periodStartDate: input.periodStartDate,
      tenantId: "spike-ua",
    });
  } catch (error) {
    console.error("Failed to load Cortex Index DB evidence.", error);
    return { calculationEvidence: [], respondentInputs: [] };
  }
}

async function loadMonitoringLedgerEvidenceForReport(input: {
  kind: MediaHubReportKind;
  periodEndDate: string;
  periodStartDate: string;
}) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    return await buildCortexMediaHubMonitoringLedgerEvidence({
      limit: input.kind === "daily" ? 120 : input.kind === "weekly" ? 300 : 600,
      periodEndDate: input.periodEndDate,
      periodStartDate: input.periodStartDate,
    });
  } catch (error) {
    console.error("Failed to load Cortex Context monitoring ledger evidence.", error);
    return [];
  }
}

async function augmentReportContextWithCortexMemory(
  input: {
    kind: MediaHubReportKind;
    latestData: PublicLatestItem[];
    manualMaterials?: MediaHubManualMaterialDigest[];
    periodEndDate: string;
    periodStartDate: string;
    snapshots: MediaHubWindowSnapshot[];
    tenant: MediaHubTenant;
  },
  deterministicContextPack: CortexContextPack,
) {
  if (process.env.MEDIA_HUB_CORTEX_MEMORY_CONTEXT_ENABLED === "0") {
    return deterministicContextPack;
  }

  const chunkManifest = await loadCortexRuntimeChunkManifest();
  if (!chunkManifest.ok) {
    return deterministicContextPack;
  }

  const memoryContext = buildCortexMemoryContextPack({
    allowProtected: false,
    chunkManifest: chunkManifest.value,
    maxEvidence: normalizeInteger(process.env.MEDIA_HUB_CORTEX_MEMORY_MAX_EVIDENCE, 8, 1, 20),
    maxTokens: normalizeInteger(process.env.MEDIA_HUB_CORTEX_MEMORY_MAX_TOKENS, 2_400, 200, 8_000),
    purpose: "market-report",
    query: buildReportMemoryQuery(input),
  });

  return mergeCortexContextPacks({
    primary: deterministicContextPack,
    secondary: memoryContext.pack,
  });
}

function buildReportMemoryQuery(input: {
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}) {
  const indexTerms = input.latestData
    .slice(0, 12)
    .map((item) => `${item.commodityCode} ${item.commodityNameEn} ${item.basis}`)
    .join(" ");
  const manualTerms = (input.manualMaterials ?? [])
    .slice(0, 8)
    .map((item) => item.summary || item.extractedText || item.originalUrl || item.sourceDomain || "")
    .join(" ");
  const feedTerms = input.snapshots
    .flatMap((snapshot) => snapshot.feed.slice(0, 12))
    .map((item) => `${item.title} ${item.summary} ${item.tags.join(" ")}`)
    .join(" ");
  const tenantLabel = input.tenant === "spike"
    ? "SPIKE Spot Index Ukraine SSI"
    : "1D3X global commodity market";

  return [
    tenantLabel,
    `${input.kind} report`,
    `${input.periodStartDate} ${input.periodEndDate}`,
    indexTerms,
    manualTerms,
    feedTerms,
  ].join(" ").replace(/\s+/g, " ").trim().slice(0, 2_400);
}

function normalizeInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
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
          .slice(0, kind === "daily" ? 40 : kind === "weekly" ? 140 : 220)
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
  const minNarrativeItems = kind === "daily" ? 3 : kind === "weekly" ? 14 : 22;
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

function getMaxOutputTokens(kind: MediaHubReportKind) {
  return kind === "daily" ? 2200 : kind === "weekly" ? 6500 : 9000;
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
