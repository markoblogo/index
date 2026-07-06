import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMMODITY_INTELLIGENCE_PRODUCT_NAME } from "@/lib/commodity-intelligence-layer";
import type {
  CortexSourceLedger,
  CortexSourceManifest,
  CortexSourceManifestEntry,
} from "@/lib/cortex-source-scanner";

export type CortexChunkStatus = "chunked" | "skipped";

export type CortexSourceChunk = {
  chunkId: string;
  chunkIndex: number;
  evidenceId: string;
  hash: string;
  ownerProject: CortexSourceManifestEntry["ownerProject"];
  relativePath: string;
  rootId: string;
  sourceHash: string;
  sourceId: string;
  sourceKind: CortexSourceManifestEntry["sourceKind"];
  text: string;
  title: string;
  tokenEstimate: number;
  visibility: CortexSourceManifestEntry["visibility"];
};

export type CortexChunkSourceResult = {
  chunkCount: number;
  reason?: string;
  relativePath: string;
  rootId: string;
  status: CortexChunkStatus;
};

export type CortexChunkManifest = {
  chunks: CortexSourceChunk[];
  generatedAt: string;
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  schemaVersion: 1;
  sourceResults: CortexChunkSourceResult[];
  sourceScope: "all" | "queue";
  totals: {
    chunks: number;
    skippedSources: number;
    sources: number;
    textBytes: number;
  };
};

const CHUNK_SIZE = 3_200;
const CHUNK_OVERLAP = 250;
const MAX_TEXT_BYTES = 1_000_000;

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export async function buildCortexChunkManifest(input: {
  generatedAt?: string;
  ledger: CortexSourceLedger;
  sourceScope?: "all" | "queue";
}): Promise<CortexChunkManifest> {
  const sourceScope = input.sourceScope ?? "queue";
  const sources = sourceScope === "all"
    ? input.ledger.manifest.sources
    : input.ledger.chunkingQueue;
  const rootPaths = rootPathMap(input.ledger.manifest);
  const chunks: CortexSourceChunk[] = [];
  const sourceResults: CortexChunkSourceResult[] = [];

  for (const source of sources) {
    const rootPath = rootPaths.get(source.rootId);
    if (!rootPath) {
      sourceResults.push(skippedSource(source, "missing-root"));
      continue;
    }

    const sourcePath = path.join(rootPath, source.relativePath);
    const extracted = await extractChunkableText(sourcePath, source);
    if (!extracted.text) {
      sourceResults.push(skippedSource(source, extracted.reason));
      continue;
    }

    const sourceChunks = chunkText(source, extracted.text);
    chunks.push(...sourceChunks);
    sourceResults.push({
      chunkCount: sourceChunks.length,
      relativePath: source.relativePath,
      rootId: source.rootId,
      status: "chunked",
    });
  }

  return {
    chunks,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    schemaVersion: 1,
    sourceResults,
    sourceScope,
    totals: {
      chunks: chunks.length,
      skippedSources: sourceResults.filter((result) => result.status === "skipped").length,
      sources: sources.length,
      textBytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.text), 0),
    },
  };
}

async function extractChunkableText(sourcePath: string, source: CortexSourceManifestEntry) {
  const extension = path.extname(source.relativePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) {
    return { reason: `unsupported-extension:${extension || "none"}`, text: "" };
  }
  if (source.sizeBytes > MAX_TEXT_BYTES) {
    return { reason: `too-large:${source.sizeBytes}`, text: "" };
  }

  const bytes = await readFile(sourcePath);
  const text = normalizeText(bytes.toString("utf8"));
  if (!text) {
    return { reason: "empty-text", text: "" };
  }
  return { text };
}

function chunkText(source: CortexSourceManifestEntry, text: string) {
  const chunks: CortexSourceChunk[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < text.length) {
    const end = Math.min(cursor + CHUNK_SIZE, text.length);
    const chunkTextValue = text.slice(cursor, end).trim();
    if (chunkTextValue) {
      const hash = createHash("sha256").update(chunkTextValue).digest("hex");
      chunks.push({
        chunkId: `cortex:chunk:${source.rootId}:${source.hash.slice(0, 16)}:${chunkIndex}`,
        chunkIndex,
        evidenceId: source.evidenceId,
        hash,
        ownerProject: source.ownerProject,
        relativePath: source.relativePath,
        rootId: source.rootId,
        sourceHash: source.hash,
        sourceId: source.sourceId,
        sourceKind: source.sourceKind,
        text: chunkTextValue,
        title: source.title,
        tokenEstimate: Math.ceil(chunkTextValue.length / 4),
        visibility: source.visibility,
      });
      chunkIndex += 1;
    }

    if (end === text.length) break;
    cursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }

  return chunks;
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function rootPathMap(manifest: CortexSourceManifest) {
  return new Map(manifest.roots.map((root) => [root.rootId, root.rootPath]));
}

function skippedSource(source: CortexSourceManifestEntry, reason = "not-chunkable"): CortexChunkSourceResult {
  return {
    chunkCount: 0,
    reason,
    relativePath: source.relativePath,
    rootId: source.rootId,
    status: "skipped",
  };
}
