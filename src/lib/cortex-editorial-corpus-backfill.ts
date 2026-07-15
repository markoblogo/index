import { runCortexAutonomyReadinessMonitor } from "@/lib/cortex-autonomy-readiness";
import {
  evaluateCortexEditorialPromotion,
  type CortexEditorialPromotionKind,
  type CortexEditorialPromotionPolicy,
} from "@/lib/cortex-editorial-promotion";
import {
  normalizeCortexEditorialShadowListLimit,
  syncCortexEditorialShadowObservations,
  type CortexEditorialShadowObservation,
} from "@/lib/cortex-editorial-shadow";
import { getActiveIndexConfig } from "@/lib/index-platform";

const KINDS: CortexEditorialPromotionKind[] = ["daily", "weekly", "monthly"];
const DEFAULT_LIMIT_PER_KIND = 30;

export type CortexEditorialCorpusBackfillTrack = {
  kind: CortexEditorialPromotionKind;
  matchedPairs: number;
  matchedRevisedCandidates: number;
  promotionPolicy: CortexEditorialPromotionPolicy;
  revisedCandidates: number;
  scannedReports: number;
  skippedReason: string | null;
};

export type CortexEditorialCorpusBackfillResult = {
  limitPerKind: number;
  readiness: Awaited<ReturnType<typeof runCortexAutonomyReadinessMonitor>>;
  tenantId: string;
  tracks: CortexEditorialCorpusBackfillTrack[];
};

/**
 * Replays existing protected report/post history only. It never creates a
 * revised candidate, fetches a channel, or changes a delivery artifact.
 */
export async function backfillCortexEditorialEvaluationCorpus(input: {
  kind?: CortexEditorialPromotionKind;
  limitPerKind?: number;
  tenantId?: string;
} = {}): Promise<CortexEditorialCorpusBackfillResult> {
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const limitPerKind = normalizeCortexEditorialCorpusBackfillLimit(input.limitPerKind);
  const kinds = input.kind ? [input.kind] : KINDS;
  const tracks: CortexEditorialCorpusBackfillTrack[] = [];

  for (const kind of kinds) {
    const shadow = await syncCortexEditorialShadowObservations({ kind, limit: limitPerKind, tenantId });
    const promotion = await evaluateCortexEditorialPromotion({ kind, limit: limitPerKind, tenantId });
    tracks.push(buildCortexEditorialCorpusBackfillTrack({
      kind,
      observations: shadow.observations,
      promotionPolicy: promotion.policy,
      skippedReason: shadow.skippedReason ?? promotion.skippedReason,
    }));
  }

  return {
    limitPerKind,
    readiness: await runCortexAutonomyReadinessMonitor({ tenantId }),
    tenantId,
    tracks,
  };
}

export function normalizeCortexEditorialCorpusBackfillLimit(value: number | null | undefined) {
  return normalizeCortexEditorialShadowListLimit(value ?? DEFAULT_LIMIT_PER_KIND);
}

export function buildCortexEditorialCorpusBackfillTrack(input: {
  kind: CortexEditorialPromotionKind;
  observations: CortexEditorialShadowObservation[];
  promotionPolicy: CortexEditorialPromotionPolicy;
  skippedReason: string | null;
}): CortexEditorialCorpusBackfillTrack {
  const reportCandidates = new Map<string, Set<CortexEditorialShadowObservation["candidate"]>>();
  const matchedCandidates = new Map<string, Set<CortexEditorialShadowObservation["candidate"]>>();
  for (const observation of input.observations) {
    const candidates = reportCandidates.get(observation.reportId) ?? new Set();
    candidates.add(observation.candidate);
    reportCandidates.set(observation.reportId, candidates);
    if (observation.status === "matched") {
      const matched = matchedCandidates.get(observation.reportId) ?? new Set();
      matched.add(observation.candidate);
      matchedCandidates.set(observation.reportId, matched);
    }
  }

  return {
    kind: input.kind,
    matchedPairs: [...matchedCandidates.values()].filter((candidates) => candidates.has("original") && candidates.has("revised")).length,
    matchedRevisedCandidates: input.observations.filter((item) => item.candidate === "revised" && item.status === "matched").length,
    promotionPolicy: input.promotionPolicy,
    revisedCandidates: [...reportCandidates.values()].filter((candidates) => candidates.has("revised")).length,
    scannedReports: reportCandidates.size,
    skippedReason: input.skippedReason,
  };
}
