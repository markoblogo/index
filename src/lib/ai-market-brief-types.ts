import type { Locale } from "@/lib/i18n";
import type { CommodityId } from "@/lib/mock-data";

export type AiAnalyticsPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
  dayChange: number;
  percentChange: number;
  respondents: number;
};

export type PublicAiMarketBrief = {
  blocks: Array<{ body: string; title: string }>;
  cardComments: Record<string, string>;
  confidence: string;
  generatedAt: string;
  inputDataHash: string;
  model: string;
  tradeDate: string;
  observability: {
    estimatedCostUsd: number | null;
    fallbackReason: string | null;
    promptTokens: number | null;
    status: string;
    totalTokens: number | null;
  };
};

export type StoredBriefOutput = {
  blocks?: Array<{ body?: string; title?: string }>;
  confidence?: string;
};

export type StoredCardComment = {
  code?: string;
  comment?: string;
};

export type AiBriefLocale = Locale;
