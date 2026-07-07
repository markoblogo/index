import { createHash } from "node:crypto";
import {
  COMMODITY_INTELLIGENCE_PRODUCT_NAME,
  type CortexVisibility,
} from "@/lib/commodity-intelligence-layer";
import type { CortexChunkManifest, CortexSourceChunk } from "@/lib/cortex-source-chunker";
import type { CortexScannedSourceKind } from "@/lib/cortex-source-scanner";

export type CortexMn7rSnapshotEvidence = {
  id: string;
  sourceId: string;
  title: string;
  summary: string;
  extractedAt: string;
  urlOrPath: string;
  visibility: CortexVisibility;
  metadata?: Record<string, unknown>;
};

export type CortexMn7rSourceSnapshot = {
  product: "1D3X Cortex";
  ownerProject: "mn7r";
  schemaVersion: 1;
  generatedAt: string;
  evidence: CortexMn7rSnapshotEvidence[];
  totals?: Record<string, unknown>;
};

export function buildCortexMn7rSnapshotChunkManifest(input: {
  generatedAt?: string;
  snapshot: CortexMn7rSourceSnapshot;
}): CortexChunkManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const chunks = input.snapshot.evidence.map((evidence, index) =>
    buildChunk(evidence, index),
  );

  return {
    chunks,
    generatedAt,
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    schemaVersion: 1,
    sourceResults: input.snapshot.evidence.map((evidence) => ({
      chunkCount: 1,
      relativePath: evidencePath(evidence),
      rootId: "mn7r-protected-source-snapshot",
      status: "chunked",
    })),
    sourceScope: "all",
    totals: {
      chunks: chunks.length,
      skippedSources: 0,
      sources: input.snapshot.evidence.length,
      textBytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.text), 0),
    },
  };
}

export function mergeCortexChunkManifests(input: {
  base?: CortexChunkManifest | null;
  generatedAt?: string;
  mn7r: CortexChunkManifest;
}): CortexChunkManifest {
  if (!input.base) return input.mn7r;
  const chunksById = new Map<string, CortexSourceChunk>();
  for (const chunk of input.base.chunks) chunksById.set(chunk.chunkId, chunk);
  for (const chunk of input.mn7r.chunks) chunksById.set(chunk.chunkId, chunk);
  const chunks = [...chunksById.values()].sort((left, right) => left.chunkId.localeCompare(right.chunkId));
  const sourceResults = [
    ...input.base.sourceResults,
    ...input.mn7r.sourceResults,
  ];

  return {
    chunks,
    generatedAt: input.generatedAt ?? input.mn7r.generatedAt,
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    schemaVersion: 1,
    sourceResults,
    sourceScope: "all",
    totals: {
      chunks: chunks.length,
      skippedSources: sourceResults.filter((result) => result.status === "skipped").length,
      sources: sourceResults.length,
      textBytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.text), 0),
    },
  };
}

function buildChunk(
  evidence: CortexMn7rSnapshotEvidence,
  index: number,
): CortexSourceChunk {
  const sourceHash = hashJson({
    id: evidence.id,
    metadata: evidence.metadata,
    summary: evidence.summary,
    title: evidence.title,
  });
  const text = renderEvidenceText(evidence);
  const hash = createHash("sha256").update(text).digest("hex");
  const relativePath = evidencePath(evidence);

  return {
    chunkId: `cortex:mn7r-snapshot:${sourceHash.slice(0, 16)}:0`,
    chunkIndex: 0,
    evidenceId: evidence.id,
    hash,
    ownerProject: "mn7r",
    relativePath,
    rootId: "mn7r-protected-source-snapshot",
    sourceHash,
    sourceId: evidence.sourceId,
    sourceKind: sourceKindForEvidence(evidence),
    text,
    title: evidence.title || `MN7R source evidence ${index + 1}`,
    tokenEstimate: Math.ceil(text.length / 4),
    visibility: evidence.visibility,
  };
}

function renderEvidenceText(evidence: CortexMn7rSnapshotEvidence) {
  const metadata = evidence.metadata
    ? JSON.stringify(redactUnsafeMetadata(evidence.metadata), null, 2)
    : "{}";
  return [
    `Title: ${evidence.title}`,
    `Source ID: ${evidence.sourceId}`,
    `Visibility: ${evidence.visibility}`,
    `Extracted at: ${evidence.extractedAt}`,
    `Path: ${evidence.urlOrPath}`,
    "",
    "Summary:",
    evidence.summary,
    "",
    "Metadata:",
    metadata,
  ].join("\n").trim();
}

function redactUnsafeMetadata(metadata: Record<string, unknown>) {
  const denied = new Set([
    "actorDisplayName",
    "actorUserId",
    "brokerEmail",
    "brokerName",
    "brokerUserId",
    "buyerName",
    "clientId",
    "companyName",
    "note",
    "operatorLabel",
    "operatorUserId",
    "sellerName",
  ]);
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !denied.has(key)),
  );
}

function evidencePath(evidence: CortexMn7rSnapshotEvidence) {
  return `${sanitizePathSegment(evidence.sourceId)}/${sanitizePathSegment(evidence.id)}.json`;
}

function sanitizePathSegment(value: string) {
  return value
    .replace(/^mn7r:/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "evidence";
}

function sourceKindForEvidence(evidence: CortexMn7rSnapshotEvidence): CortexScannedSourceKind {
  if (evidence.sourceId === "mn7r-index-correlation-signals") {
    return "development-plan";
  }
  return "action-event";
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
