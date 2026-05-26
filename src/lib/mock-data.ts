import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getActiveRespondentCount } from "@/lib/respondent-directory";

const activeIndex = getActiveIndexConfig();

export type CommodityId = string;

export type Commodity = {
  id: CommodityId;
  code: string;
  marker: string;
  name: Record<Locale, string>;
  latest: number | null;
  absoluteChange: number;
  percentChange: number;
  sparkline: number[];
  group?: "export" | "processing";
  vatIncluded?: boolean;
  detailMetrics?: Array<{
    label: Record<Locale, string>;
    value: Record<Locale, string>;
  }>;
};

export type Respondent = {
  id: string;
  legalName: string;
};

export type LatestQuote = {
  id: string;
  commodityId: CommodityId;
  date: string;
  basis: string;
  price: number | null;
  absoluteChange: number;
  percentChange: number;
  respondents: number;
};

export type Partner = {
  id: string;
  name: string;
  role: Record<Locale, string>;
};

export const indexUpdatedAt =
  activeIndex.id === "spike-ua"
    ? "2026-05-14T10:30:00.000Z"
    : "2026-05-08T10:30:00.000Z";

export const commodities: Commodity[] = activeIndex.commodities.map((commodity) => ({
  id: commodity.id,
  code: commodity.code,
  marker: commodity.marker,
  name: commodity.name,
  latest: commodity.basePrice,
  absoluteChange: commodity.absoluteChange,
  percentChange: commodity.percentChange,
  sparkline: commodity.sparkline,
  group: commodity.group,
  vatIncluded: commodity.vatIncluded,
  detailMetrics: commodity.detailMetrics,
}));

export const respondents: Respondent[] = activeIndex.respondents;

export const weeklySeries: Record<CommodityId, number[]> = Object.fromEntries(
  commodities.map((commodity) => [commodity.id, commodity.sparkline]),
);

export const latestQuotes: LatestQuote[] = commodities.map((commodity) => ({
  id: `${commodity.id}-2026-05-08`,
  commodityId: commodity.id,
  date: activeIndex.id === "spike-ua" ? "2026-05-14" : "2026-05-08",
  basis:
    activeIndex.id === "spike-ua" && commodity.group === "processing"
      ? "CPT parity Odesa, Ukraine (processing)"
      : activeIndex.id === "spike-ua"
        ? "CPT Odesa, Ukraine (export)"
        : activeIndex.defaultDeliveryBasis,
  price: commodity.latest,
  absoluteChange: commodity.absoluteChange,
  percentChange: commodity.percentChange,
  respondents: getActiveRespondentCount(),
}));

export const partners: Partner[] = [
  {
    id: activeIndex.id,
    name: activeIndex.legalName.en,
    role: {
      uk: activeIndex.id === "spike-ua"
        ? "Власник бренду та публічний видавець індексу"
        : "Власник бренду та публічний видавець індексу",
      en: "Brand owner and public publisher",
    },
  },
  {
    id: "data-partners",
    name: activeIndex.id === "spike-ua" ? "Spike Brokers partners" : "Spike Brokers",
    role: {
      uk:
        activeIndex.id === "spike-ua"
          ? "Партнери-респонденти щоденного збору цін"
          : "Постачальник ринкових індикативів",
      en:
        activeIndex.id === "spike-ua"
          ? "Respondent partners for daily price collection"
          : "Market indicatives provider",
    },
  },
  {
    id: "cropto-mn7r",
    name: "Cropto/MN7R",
    role: {
      uk: "Технологічний партнер платформи",
      en: "Technology partner for the platform",
    },
  },
];
