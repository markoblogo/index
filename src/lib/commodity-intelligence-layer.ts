export const COMMODITY_INTELLIGENCE_PRODUCT_NAME = "1D3X Cortex";

export type CortexVisibility = "public" | "internal" | "protected" | "secret";

export type CortexResourceKind =
  | "index-platform"
  | "monitor"
  | "execution-workspace"
  | "market-media"
  | "commodity-infra"
  | "landing"
  | "manual"
  | "repository";

export type CortexAccessMode =
  | "repo-docs"
  | "database-snapshot"
  | "api-snapshot"
  | "mediahub-source"
  | "manual-upload"
  | "public-web";

export type CortexActionMode =
  | "context-pack"
  | "draft"
  | "analysis"
  | "approval-gated-tool";

export type CortexLifecycleStage =
  | "observe-learn"
  | "assist-propose"
  | "approval-gated-act"
  | "bounded-autonomy";

export const CORTEX_LIFECYCLE: Array<{
  description: string;
  stage: CortexLifecycleStage;
}> = [
  {
    description: "Read ecosystem data, build evidence memory, learn project workflows and assemble bounded context packs.",
    stage: "observe-learn",
  },
  {
    description: "Work inside product assistants with external LLMs for answers, analysis, drafts and reviewable recommendations.",
    stage: "assist-propose",
  },
  {
    description: "Prepare tool proposals that execute only through product auth, exact confirmation, idempotency, audit and rollback paths.",
    stage: "approval-gated-act",
  },
  {
    description: "Enable bounded autonomy per capability only after evals, monitoring, permissions and product-specific safety gates prove readiness.",
    stage: "bounded-autonomy",
  },
];

export type CortexProjectResource = {
  description: string;
  id: string;
  kind: CortexResourceKind;
  name: string;
  ownerProject: "index" | "mn7r" | "cropto" | "1d3x" | "ecosystem";
  visibility: CortexVisibility;
};

export type CortexSource = {
  accessMode: CortexAccessMode;
  allowedActionModes: CortexActionMode[];
  cadence: "on-change" | "hourly" | "daily" | "weekly" | "manual";
  description: string;
  id: string;
  resourceId: string;
  rightsNote: string;
  title: string;
  visibility: CortexVisibility;
};

export type CortexEvidenceItem = {
  extractedAt: string;
  hash?: string;
  id: string;
  sourceId: string;
  summary: string;
  title: string;
  urlOrPath: string;
  visibility: CortexVisibility;
};

export type CortexContextPack = {
  createdAt: string;
  evidence: CortexEvidenceItem[];
  excluded: Array<{
    evidenceId: string;
    reason: string;
    visibility: CortexVisibility;
  }>;
  knownGaps: string[];
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  purpose: "market-report" | "monitor-index-comparison" | "execution-context" | "source-review";
  query: string;
  sourceIds: string[];
};

export const CORTEX_PROJECT_RESOURCES: CortexProjectResource[] = [
  {
    description: "Shared benchmark, MediaHub, analytics and public reporting platform.",
    id: "index-platform",
    kind: "index-platform",
    name: "Index Platform",
    ownerProject: "index",
    visibility: "internal",
  },
  {
    description: "1D3X public umbrella, landing and partner entry surface.",
    id: "1d3x-public",
    kind: "landing",
    name: "1D3X",
    ownerProject: "1d3x",
    visibility: "public",
  },
  {
    description: "Private commodity brokerage monitor and EXE operating workspace.",
    id: "mn7r-monitor",
    kind: "monitor",
    name: "MN7R Monitor",
    ownerProject: "mn7r",
    visibility: "protected",
  },
  {
    description: "Commodity infrastructure line covering Cr0pto and Liqua surfaces.",
    id: "cropto-infra",
    kind: "commodity-infra",
    name: "Cr0pto",
    ownerProject: "cropto",
    visibility: "internal",
  },
  {
    description: "MediaHub source and evidence layer for market context.",
    id: "mediahub",
    kind: "market-media",
    name: "MediaHub",
    ownerProject: "index",
    visibility: "internal",
  },
];

export const CORTEX_INITIAL_SOURCES: CortexSource[] = [
  {
    accessMode: "repo-docs",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "Cortex plan, MediaHub runtime policy, source audits and database docs.",
    id: "index-docs",
    resourceId: "index-platform",
    rightsNote: "Repo-local project documentation.",
    title: "Index repository documentation",
    visibility: "internal",
  },
  {
    accessMode: "mediahub-source",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "hourly",
    description: "Public agro-commodity news, logistics, crop and policy source inventory.",
    id: "mediahub-global-sources",
    resourceId: "mediahub",
    rightsNote: "Respect source rights, robots/ToS and source-specific retention notes.",
    title: "MediaHub global source registry",
    visibility: "public",
  },
  {
    accessMode: "manual-upload",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "manual",
    description: "Materials submitted through @idex_grains_bot for SSI and 1D3X daily, weekly and monthly reports.",
    id: "mediahub-telegram-materials",
    resourceId: "mediahub",
    rightsNote: "Use project/report tags (#ssi, #1d3x, #daily, #weekly, #monthly); store source metadata and redact private submissions before model calls.",
    title: "1D3X/SSI Telegram material intake",
    visibility: "internal",
  },
  {
    accessMode: "database-snapshot",
    allowedActionModes: ["context-pack", "analysis"],
    cadence: "daily",
    description: "Published index values and locked historical public values.",
    id: "published-index-values",
    resourceId: "index-platform",
    rightsNote: "Use published values only; do not expose draft respondent submissions.",
    title: "Published Index values",
    visibility: "public",
  },
  {
    accessMode: "repo-docs",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "on-change",
    description: "MN7R public-safe docs and AI-layer contracts.",
    id: "mn7r-public-docs",
    resourceId: "mn7r-monitor",
    rightsNote: "Public-safe wording only; protected workspace records remain excluded.",
    title: "MN7R public and product docs",
    visibility: "internal",
  },
  {
    accessMode: "api-snapshot",
    allowedActionModes: ["context-pack", "analysis", "draft", "approval-gated-tool"],
    cadence: "daily",
    description: "Governed monitor signals used for monitor-vs-index comparison, assistant context and approval-gated internal tools.",
    id: "mn7r-monitor-readonly",
    resourceId: "mn7r-monitor",
    rightsNote: "Assistant/tool use must go through MN7R auth, redaction, audit and approval gates.",
    title: "MN7R governed monitor context",
    visibility: "protected",
  },
  {
    accessMode: "public-web",
    allowedActionModes: ["context-pack", "analysis", "draft"],
    cadence: "weekly",
    description: "Public Cr0pto/Liqua product surfaces and commodity-infra positioning.",
    id: "cropto-public-surfaces",
    resourceId: "cropto-infra",
    rightsNote: "Public pages only until a repo-local ingestion contract is added.",
    title: "Cr0pto public surfaces",
    visibility: "public",
  },
];

export function findCortexSource(sourceId: string, sources = CORTEX_INITIAL_SOURCES) {
  return sources.find((source) => source.id === sourceId) ?? null;
}

export function canUseVisibilityInExternalModel(
  visibility: CortexVisibility,
  options: { allowProtected?: boolean } = {},
) {
  if (visibility === "secret") {
    return false;
  }

  if (visibility === "protected") {
    return options.allowProtected === true;
  }

  return true;
}

export function buildCortexContextPack(input: {
  allowProtected?: boolean;
  createdAt?: string;
  evidence: CortexEvidenceItem[];
  knownGaps?: string[];
  purpose: CortexContextPack["purpose"];
  query: string;
  sources?: CortexSource[];
}): CortexContextPack {
  const allowedEvidence: CortexEvidenceItem[] = [];
  const excluded: CortexContextPack["excluded"] = [];

  for (const item of input.evidence) {
    const source = findCortexSource(item.sourceId, input.sources);
    const visibility = mostRestrictiveVisibility(item.visibility, source?.visibility);
    if (canUseVisibilityInExternalModel(visibility, { allowProtected: input.allowProtected })) {
      allowedEvidence.push({ ...item, visibility });
    } else {
      excluded.push({
        evidenceId: item.id,
        reason: visibility === "secret"
          ? "Secret evidence is never exported to model context."
          : "Protected evidence requires an explicit workflow allowlist.",
        visibility,
      });
    }
  }

  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    evidence: dedupeCortexEvidence(allowedEvidence),
    excluded,
    knownGaps: input.knownGaps ?? [],
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    purpose: input.purpose,
    query: input.query,
    sourceIds: Array.from(new Set(allowedEvidence.map((item) => item.sourceId))).sort(),
  };
}

function dedupeCortexEvidence(items: CortexEvidenceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function mostRestrictiveVisibility(
  evidenceVisibility: CortexVisibility,
  sourceVisibility: CortexVisibility | undefined,
): CortexVisibility {
  const rank: Record<CortexVisibility, number> = {
    public: 0,
    internal: 1,
    protected: 2,
    secret: 3,
  };
  const source = sourceVisibility ?? evidenceVisibility;
  return rank[source] > rank[evidenceVisibility] ? source : evidenceVisibility;
}
