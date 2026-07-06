import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildCortexMemoryContextPack } from "@/lib/cortex-memory-context-pack";
import type { CortexMemorySearchFilters } from "@/lib/cortex-memory-search";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";
import type { CortexContextPack, CortexVisibility } from "@/lib/commodity-intelligence-layer";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import type { CortexScanRoot, CortexScannedSourceKind } from "@/lib/cortex-source-scanner";

export const dynamic = "force-dynamic";

type ContextPackRequestBody = {
  allowProtected?: unknown;
  filters?: {
    ownerProject?: unknown;
    sourceKind?: unknown;
    visibility?: unknown;
  };
  maxEvidence?: unknown;
  maxTokens?: unknown;
  purpose?: unknown;
  query?: unknown;
};

type ParsedContextPackRequest = {
  allowProtected: boolean;
  filters: CortexMemorySearchFilters;
  maxEvidence: number;
  maxTokens: number;
  purpose: CortexContextPack["purpose"];
  query: string;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const parsed = parseRequestBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const chunkManifest = await readChunkManifest();
  if (!chunkManifest.ok) {
    return NextResponse.json({ error: chunkManifest.error }, { status: 503 });
  }

  const artifact = buildCortexMemoryContextPack({
    allowProtected: parsed.value.allowProtected,
    chunkManifest: chunkManifest.value,
    filters: parsed.value.filters,
    maxEvidence: parsed.value.maxEvidence,
    maxTokens: parsed.value.maxTokens,
    purpose: parsed.value.purpose,
    query: parsed.value.query,
  });

  return NextResponse.json(artifact);
}

function isAuthorized(request: Request) {
  return isBearerTokenAuthorized(request, [
    process.env.CORTEX_INTERNAL_API_SECRET,
    process.env.CRON_SECRET,
  ]);
}

async function readJsonBody(request: Request): Promise<ContextPackRequestBody> {
  try {
    return await request.json() as ContextPackRequestBody;
  } catch {
    return {};
  }
}

function parseRequestBody(body: ContextPackRequestBody):
  | { ok: true; value: ParsedContextPackRequest }
  | { error: string; ok: false } {
  if (typeof body.query !== "string" || body.query.trim().length === 0) {
    return { error: "query is required", ok: false };
  }

  const purpose = parsePurpose(body.purpose);
  if (!purpose) {
    return { error: "purpose is invalid or missing", ok: false };
  }

  const filters = parseFilters(body.filters ?? {});
  if (!filters.ok) return filters;

  return {
    ok: true,
    value: {
      allowProtected: body.allowProtected === true,
      filters: filters.value,
      maxEvidence: normalizeInteger(body.maxEvidence, 8, 1, 20),
      maxTokens: normalizeInteger(body.maxTokens, 2_400, 200, 12_000),
      purpose,
      query: body.query.trim(),
    },
  };
}

async function readChunkManifest():
  Promise<{ ok: true; value: CortexChunkManifest } | { error: string; ok: false }> {
  try {
    return {
      ok: true,
      value: JSON.parse(await readFile(cortexChunkManifestPath(), "utf8")) as CortexChunkManifest,
    };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    return {
      error: code === "ENOENT"
        ? "Cortex chunk manifest is not available on this server"
        : "Failed to read Cortex chunk manifest",
      ok: false,
    };
  }
}

function cortexChunkManifestPath() {
  return path.join(process.cwd(), ".cortex", "chunk-manifest.json");
}

function parseFilters(value: ContextPackRequestBody["filters"]):
  | { ok: true; value: CortexMemorySearchFilters }
  | { error: string; ok: false } {
  const ownerProject = parseStringArray(value?.ownerProject);
  const sourceKind = parseStringArray(value?.sourceKind);
  const visibility = parseStringArray(value?.visibility);
  const parsedOwners = parseOwnerList(ownerProject);
  const parsedKinds = parseSourceKindList(sourceKind);
  const parsedVisibility = parseVisibilityList(visibility);
  if (!parsedOwners.ok) return parsedOwners;
  if (!parsedKinds.ok) return parsedKinds;
  if (!parsedVisibility.ok) return parsedVisibility;

  return {
    ok: true,
    value: {
      ownerProject: parsedOwners.value,
      sourceKind: parsedKinds.value,
      visibility: parsedVisibility.value,
    },
  };
}

function parseStringArray(value: unknown) {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return null;
}

function parseOwnerList(value: string[] | null | undefined):
  | { ok: true; value?: CortexScanRoot["ownerProject"][] }
  | { error: string; ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { error: "filters.ownerProject must be an array of strings", ok: false };
  const owners: CortexScanRoot["ownerProject"][] = [];
  for (const owner of value) {
    if (owner === "index" || owner === "mn7r" || owner === "cropto" || owner === "1d3x" || owner === "ecosystem") {
      owners.push(owner);
    } else {
      return { error: `Invalid ownerProject: ${owner}`, ok: false };
    }
  }
  return { ok: true, value: owners.length > 0 ? owners : undefined };
}

function parseSourceKindList(value: string[] | null | undefined):
  | { ok: true; value?: CortexScannedSourceKind[] }
  | { error: string; ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { error: "filters.sourceKind must be an array of strings", ok: false };
  const kinds: CortexScannedSourceKind[] = [];
  for (const kind of value) {
    if (
      kind === "action-event" ||
      kind === "archive" ||
      kind === "code" ||
      kind === "development-plan" ||
      kind === "manual-book" ||
      kind === "repo-doc" ||
      kind === "site-content"
    ) {
      kinds.push(kind);
    } else {
      return { error: `Invalid sourceKind: ${kind}`, ok: false };
    }
  }
  return { ok: true, value: kinds.length > 0 ? kinds : undefined };
}

function parseVisibilityList(value: string[] | null | undefined):
  | { ok: true; value?: CortexVisibility[] }
  | { error: string; ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { error: "filters.visibility must be an array of strings", ok: false };
  const visibilityValues: CortexVisibility[] = [];
  for (const visibility of value) {
    if (visibility === "public" || visibility === "internal" || visibility === "protected" || visibility === "secret") {
      visibilityValues.push(visibility);
    } else {
      return { error: `Invalid visibility: ${visibility}`, ok: false };
    }
  }
  return { ok: true, value: visibilityValues.length > 0 ? visibilityValues : undefined };
}

function parsePurpose(value: unknown): CortexContextPack["purpose"] | null {
  if (
    value === "action-analysis" ||
    value === "codebase-review" ||
    value === "execution-context" ||
    value === "market-report" ||
    value === "monitor-index-comparison" ||
    value === "project-recommendation" ||
    value === "source-review"
  ) {
    return value;
  }
  return null;
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}
