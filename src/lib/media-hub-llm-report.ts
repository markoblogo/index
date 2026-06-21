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

export async function generateMediaHubLlmReports(input: {
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  manualMaterials?: MediaHubManualMaterialDigest[];
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
  manualMaterials?: MediaHubManualMaterialDigest[];
  avoidPhrases?: string[];
  locale: Locale;
  model: string;
  periodEndDate: string;
  periodStartDate: string;
  snapshots: MediaHubWindowSnapshot[];
  tenant: MediaHubTenant;
}) {
  const prompt = buildPrompt(input);

  try {
    const requestBody: Record<string, unknown> = {
      input: prompt,
      max_output_tokens: input.kind === "daily" ? 900 : input.kind === "weekly" ? 3600 : 4200,
      model: input.model,
      temperature: 0.25,
    };

    if (input.kind !== "daily") {
      requestBody.tools = [{ type: "web_search_preview" }];
    }

    let response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok && input.kind !== "daily") {
      delete requestBody.tools;
      response = await fetch("https://api.openai.com/v1/responses", {
        body: JSON.stringify(requestBody),
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

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
  avoidPhrases?: string[];
  kind: MediaHubReportKind;
  latestData: PublicLatestItem[];
  locale: Locale;
  manualMaterials?: MediaHubManualMaterialDigest[];
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
