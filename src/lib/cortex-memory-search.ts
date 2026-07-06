import { COMMODITY_INTELLIGENCE_PRODUCT_NAME, type CortexVisibility } from "@/lib/commodity-intelligence-layer";
import type { CortexChunkManifest, CortexSourceChunk } from "@/lib/cortex-source-chunker";
import type { CortexScanRoot, CortexScannedSourceKind } from "@/lib/cortex-source-scanner";

export type CortexMemorySearchFilters = {
  ownerProject?: CortexScanRoot["ownerProject"][];
  sourceKind?: CortexScannedSourceKind[];
  visibility?: CortexVisibility[];
};

export type CortexMemorySearchResult = {
  chunk: Omit<CortexSourceChunk, "text">;
  score: number;
  snippet: string;
};

export type CortexMemorySearchResponse = {
  filters: CortexMemorySearchFilters;
  generatedAt: string;
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  query: string;
  results: CortexMemorySearchResult[];
  schemaVersion: 1;
  totals: {
    matchedChunks: number;
    searchedChunks: number;
  };
};

const DEFAULT_VISIBILITY: CortexVisibility[] = ["public", "internal", "protected"];
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function searchCortexMemory(input: {
  chunkManifest: CortexChunkManifest;
  filters?: CortexMemorySearchFilters;
  limit?: number;
  query: string;
}): CortexMemorySearchResponse {
  const query = input.query.trim();
  const queryTerms = tokenize(query);
  const filters = normalizeFilters(input.filters);
  const limit = input.limit ?? 8;
  const candidates = input.chunkManifest.chunks.filter((chunk) => matchesFilters(chunk, filters));
  const results = candidates
    .map((chunk) => scoreChunk(chunk, query, queryTerms))
    .filter((result): result is CortexMemorySearchResult => Boolean(result))
    .sort((left, right) => right.score - left.score || left.chunk.relativePath.localeCompare(right.chunk.relativePath))
    .slice(0, limit);

  return {
    filters,
    generatedAt: new Date().toISOString(),
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    query,
    results,
    schemaVersion: 1,
    totals: {
      matchedChunks: results.length,
      searchedChunks: candidates.length,
    },
  };
}

function scoreChunk(chunk: CortexSourceChunk, query: string, queryTerms: string[]) {
  if (!query || queryTerms.length === 0) return null;

  const text = chunk.text.toLowerCase();
  const title = chunk.title.toLowerCase();
  const path = chunk.relativePath.toLowerCase();
  const phrase = query.toLowerCase();
  let score = text.includes(phrase) ? 10 : 0;

  for (const term of queryTerms) {
    const termFrequency = countTerm(text, term);
    if (termFrequency === 0 && !title.includes(term) && !path.includes(term)) {
      continue;
    }
    score += Math.min(termFrequency, 8);
    if (title.includes(term)) score += 4;
    if (path.includes(term)) score += 2;
  }

  if (score === 0) return null;

  return {
    chunk: {
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      evidenceId: chunk.evidenceId,
      hash: chunk.hash,
      ownerProject: chunk.ownerProject,
      relativePath: chunk.relativePath,
      rootId: chunk.rootId,
      sourceHash: chunk.sourceHash,
      sourceId: chunk.sourceId,
      sourceKind: chunk.sourceKind,
      title: chunk.title,
      tokenEstimate: chunk.tokenEstimate,
      visibility: chunk.visibility,
    },
    score,
    snippet: buildSnippet(chunk.text, queryTerms),
  };
}

function buildSnippet(text: string, queryTerms: string[]) {
  const lower = text.toLowerCase();
  const firstMatch = queryTerms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, firstMatch - 140);
  const end = Math.min(text.length, start + 420);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function normalizeFilters(filters: CortexMemorySearchFilters = {}) {
  return {
    ownerProject: filters.ownerProject && filters.ownerProject.length > 0 ? filters.ownerProject : undefined,
    sourceKind: filters.sourceKind && filters.sourceKind.length > 0 ? filters.sourceKind : undefined,
    visibility: filters.visibility && filters.visibility.length > 0 ? filters.visibility : DEFAULT_VISIBILITY,
  };
}

function matchesFilters(chunk: CortexSourceChunk, filters: CortexMemorySearchFilters) {
  if (filters.ownerProject && !filters.ownerProject.includes(chunk.ownerProject)) return false;
  if (filters.sourceKind && !filters.sourceKind.includes(chunk.sourceKind)) return false;
  if (filters.visibility && !filters.visibility.includes(chunk.visibility)) return false;
  return true;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));
}

function countTerm(text: string, term: string) {
  let count = 0;
  let cursor = text.indexOf(term);
  while (cursor >= 0) {
    count += 1;
    cursor = text.indexOf(term, cursor + term.length);
  }
  return count;
}
