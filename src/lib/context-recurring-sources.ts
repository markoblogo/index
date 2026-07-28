export type ContextRecurringTenant = "spike-ua" | "1d3x";

export type ContextRecurringSourceFamily = {
  cadence: "daily" | "weekly";
  claimSupportTags: string[];
  domain: string;
  expectedAdapters: Array<"pdf" | "markitdown-style" | "crawl4ai-style">;
  id: string;
  label: string;
  reportKinds: Array<"daily" | "weekly" | "monthly">;
  sourceType: "scheduled_html" | "scheduled_pdf";
  tenantIds: ContextRecurringTenant[];
  url: string;
};

export type ContextSourceOperatorMaterial = {
  extractionReceipts?: Array<{
    hasMarkdown: boolean;
    operatorReviewStatus: "ready" | "review" | "blocked";
    status: string;
    warnings: string[];
  }>;
  extractionStatus: string;
  originalUrl: string | null;
  receivedAt: Date;
  sourceDomain: string | null;
  sourceType: string;
  tenantId: string;
};

export type ContextSourceFamilyFixture = {
  expectedAdapters: ContextRecurringSourceFamily["expectedAdapters"];
  id: string;
  sourceType: ContextRecurringSourceFamily["sourceType"];
  tenantIds: ContextRecurringTenant[];
  url: string;
};

export type ContextSourceOperatorSummary = {
  blockedCount: number;
  families: Array<{
    familyId: string;
    label: string;
    rows: Array<{
      latestReceivedAt: Date | null;
      okMarkdown: boolean;
      status: "ready" | "review" | "blocked" | "missing";
      tenantId: ContextRecurringTenant;
      warnings: string[];
    }>;
  }>;
  missingCount: number;
  okMarkdownCount: number;
  readyCount: number;
  reviewCount: number;
  totalExpected: number;
};

export const CONTEXT_RECURRING_SOURCE_FAMILIES: ContextRecurringSourceFamily[] = [
  {
    cadence: "daily",
    claimSupportTags: ["global-grains", "oilseeds", "futures", "market-commentary"],
    domain: "zaner.com",
    expectedAdapters: ["crawl4ai-style"],
    id: "zaner_netags_grain_oilseed",
    label: "Zaner NetAgs grain/oilseed HTML",
    reportKinds: ["daily", "weekly", "monthly"],
    sourceType: "scheduled_html",
    tenantIds: ["1d3x", "spike-ua"],
    url: "https://www.zaner.com/3.0/market_information/ht_stream.asp?page=netags",
  },
  {
    cadence: "daily",
    claimSupportTags: ["global-grains", "oilseeds", "pdf-commentary"],
    domain: "zaner.com",
    expectedAdapters: ["pdf", "markitdown-style"],
    id: "zaner_netags_grain_oilseed_pdf",
    label: "Zaner NetAgs grain/oilseed PDF",
    reportKinds: ["daily", "weekly", "monthly"],
    sourceType: "scheduled_pdf",
    tenantIds: ["1d3x", "spike-ua"],
    url: "https://www.zaner.com/hightower/netags.pdf",
  },
  {
    cadence: "daily",
    claimSupportTags: ["vegetable-oils", "oilseeds", "processing"],
    domain: "tbcingr.com",
    expectedAdapters: ["pdf", "markitdown-style"],
    id: "tbc_edible_oils_daily",
    label: "TBC edible oils daily PDF",
    reportKinds: ["daily", "weekly", "monthly"],
    sourceType: "scheduled_pdf",
    tenantIds: ["1d3x", "spike-ua"],
    url: "https://tbcingr.com/reports/archive/edible-oils/Edible%20oils%20daily.pdf",
  },
];

export function buildContextSourceFamilyFixtures(): ContextSourceFamilyFixture[] {
  return CONTEXT_RECURRING_SOURCE_FAMILIES.map((source) => ({
    expectedAdapters: source.expectedAdapters,
    id: source.id,
    sourceType: source.sourceType,
    tenantIds: source.tenantIds,
    url: source.url,
  }));
}

export function buildContextSourceOperatorSummary(
  materials: ContextSourceOperatorMaterial[],
  families = CONTEXT_RECURRING_SOURCE_FAMILIES,
): ContextSourceOperatorSummary {
  const familyRows = families.map((family) => ({
    familyId: family.id,
    label: family.label,
    rows: family.tenantIds.map((tenantId) => {
      const matching = materials
        .filter((material) => material.tenantId === tenantId)
        .filter((material) => matchesFamily(material, family))
        .sort((first, second) => second.receivedAt.getTime() - first.receivedAt.getTime());
      const latest = matching[0];
      const receipts = latest?.extractionReceipts ?? [];
      const warnings = [...new Set(receipts.flatMap((receipt) => receipt.warnings))];
      const okMarkdown = receipts.some((receipt) => receipt.status === "ok" && receipt.hasMarkdown);
      const status: "ready" | "review" | "blocked" | "missing" = latest
        ? resolveMaterialStatus(latest)
        : "missing";

      return {
        latestReceivedAt: latest?.receivedAt ?? null,
        okMarkdown,
        status,
        tenantId,
        warnings,
      };
    }),
  }));
  const rows = familyRows.flatMap((family) => family.rows);

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    families: familyRows,
    missingCount: rows.filter((row) => row.status === "missing").length,
    okMarkdownCount: rows.filter((row) => row.okMarkdown).length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    reviewCount: rows.filter((row) => row.status === "review").length,
    totalExpected: rows.length,
  };
}

function matchesFamily(
  material: ContextSourceOperatorMaterial,
  family: ContextRecurringSourceFamily,
) {
  return material.originalUrl === family.url ||
    (material.sourceDomain === family.domain && material.sourceType === family.sourceType);
}

function resolveMaterialStatus(
  material: ContextSourceOperatorMaterial,
): "ready" | "review" | "blocked" {
  const receipts = material.extractionReceipts ?? [];
  if (receipts.some((receipt) => receipt.operatorReviewStatus === "blocked")) {
    return "blocked";
  }
  if (receipts.some((receipt) => receipt.operatorReviewStatus === "ready")) {
    return "ready";
  }
  if (material.extractionStatus === "extracted") {
    return "ready";
  }
  if (material.extractionStatus === "unsupported" || material.extractionStatus === "failed") {
    return "blocked";
  }
  return "review";
}
