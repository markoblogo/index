import {
  buildCortexContextPack,
  COMMODITY_INTELLIGENCE_PRODUCT_NAME,
  type CortexContextPack,
} from "@/lib/commodity-intelligence-layer";
import { searchCortexMemory, type CortexMemorySearchFilters } from "@/lib/cortex-memory-search";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

export type CortexMemoryContextPackArtifact = {
  constraints: {
    allowProtected: boolean;
    maxEvidence: number;
    maxTokens: number;
  };
  generatedAt: string;
  modelContextText: string;
  pack: CortexContextPack;
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  schemaVersion: 1;
  search: {
    filters: CortexMemorySearchFilters;
    matchedChunks: number;
    query: string;
    searchedChunks: number;
  };
};

export function buildCortexMemoryContextPack(input: {
  allowProtected?: boolean;
  chunkManifest: CortexChunkManifest;
  filters?: CortexMemorySearchFilters;
  maxEvidence?: number;
  maxTokens?: number;
  purpose: CortexContextPack["purpose"];
  query: string;
}): CortexMemoryContextPackArtifact {
  const maxEvidence = input.maxEvidence ?? 8;
  const maxTokens = input.maxTokens ?? 2_400;
  const search = searchCortexMemory({
    chunkManifest: input.chunkManifest,
    filters: input.filters,
    limit: maxEvidence * 2,
    query: input.query,
  });

  const selected = [];
  let tokenTotal = 0;
  for (const result of search.results) {
    if (selected.length >= maxEvidence) break;
    if (tokenTotal + result.chunk.tokenEstimate > maxTokens) continue;
    selected.push(result);
    tokenTotal += result.chunk.tokenEstimate;
  }

  const pack = buildCortexContextPack({
    allowProtected: input.allowProtected,
    evidence: selected.map((result) => ({
      extractedAt: search.generatedAt,
      hash: result.chunk.hash,
      id: result.chunk.chunkId,
      sourceId: result.chunk.sourceId,
      summary: result.snippet,
      title: `${result.chunk.ownerProject}:${result.chunk.relativePath}#${result.chunk.chunkIndex}`,
      urlOrPath: `${result.chunk.rootId}:${result.chunk.relativePath}#${result.chunk.chunkIndex}`,
      visibility: result.chunk.visibility,
    })),
    knownGaps: buildKnownGaps(search.results.length, selected.length),
    purpose: input.purpose,
    query: input.query,
  });

  return {
    constraints: {
      allowProtected: Boolean(input.allowProtected),
      maxEvidence,
      maxTokens,
    },
    generatedAt: search.generatedAt,
    modelContextText: renderModelContextText(pack),
    pack,
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    schemaVersion: 1,
    search: {
      filters: search.filters,
      matchedChunks: search.totals.matchedChunks,
      query: search.query,
      searchedChunks: search.totals.searchedChunks,
    },
  };
}

function buildKnownGaps(matchedResults: number, selectedResults: number) {
  const gaps: string[] = [];
  if (matchedResults === 0) {
    gaps.push("No local Cortex memory chunks matched the query.");
  }
  if (selectedResults < matchedResults) {
    gaps.push("Some matched chunks were omitted by maxEvidence or maxTokens constraints.");
  }
  return gaps;
}

function renderModelContextText(pack: CortexContextPack) {
  const evidence = pack.evidence.map((item, index) => [
    `[${index + 1}] ${item.title}`,
    `sourceId: ${item.sourceId}`,
    `visibility: ${item.visibility}`,
    `path: ${item.urlOrPath}`,
    `summary: ${item.summary}`,
  ].join("\n"));
  const excluded = pack.excluded.map((item) =>
    `- ${item.evidenceId}: ${item.reason} (${item.visibility})`,
  );
  const gaps = pack.knownGaps.map((gap) => `- ${gap}`);

  return [
    `${pack.product} bounded context pack`,
    `purpose: ${pack.purpose}`,
    `query: ${pack.query}`,
    "",
    "Approved evidence:",
    evidence.length > 0 ? evidence.join("\n\n") : "- none",
    "",
    "Excluded evidence:",
    excluded.length > 0 ? excluded.join("\n") : "- none",
    "",
    "Known gaps:",
    gaps.length > 0 ? gaps.join("\n") : "- none",
  ].join("\n");
}
