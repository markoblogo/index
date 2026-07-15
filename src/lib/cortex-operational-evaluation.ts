import type { CortexContextPack } from "@/lib/commodity-intelligence-layer";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";
import {
  validateCortexMarketWorkforcePacket,
  type CortexMarketWorkforcePacket,
} from "@/lib/cortex-market-workforce-ledger";

export type CortexOperationalSynthesis = {
  claims: Array<{ evidenceIds: string[]; text: string }>;
  knownGaps: string[];
};

export type CortexOperationalEvalFixture = {
  contextPack: CortexContextPack;
  expected: {
    allowedVisibilities?: CortexVisibility[];
    minCandidates?: number;
    requireApprovalGate?: boolean;
    requireKnownGaps?: boolean;
  };
  id: string;
  packet: CortexMarketWorkforcePacket;
  synthesis: CortexOperationalSynthesis;
};

export type CortexOperationalEvalResult = {
  failures: string[];
  fixtureId: string;
  ok: boolean;
};

/** Offline-only quality gate for saved context and decision packets. */
export function evaluateCortexOperationalFixture(
  fixture: CortexOperationalEvalFixture,
): CortexOperationalEvalResult {
  const failures: string[] = [];
  const packetValidation = validateCortexMarketWorkforcePacket(fixture.packet);
  failures.push(...packetValidation.errors.map((error) => `packet: ${error}`));

  const evidenceIds = new Set(fixture.contextPack.evidence.map((item) => item.id));
  const allowedVisibilities = fixture.expected.allowedVisibilities;
  if (allowedVisibilities) {
    for (const evidence of fixture.contextPack.evidence) {
      if (!allowedVisibilities.includes(evidence.visibility)) {
        failures.push(`evidence visibility is outside fixture scope: ${evidence.id} (${evidence.visibility})`);
      }
    }
  }
  for (const claim of fixture.synthesis.claims) {
    if (!claim.text.trim()) failures.push("synthesis contains an empty claim");
    if (!claim.evidenceIds.length) failures.push(`claim has no citations: ${claim.text}`);
    for (const evidenceId of claim.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) failures.push(`claim cites unavailable evidence: ${evidenceId}`);
    }
  }

  if ((fixture.expected.minCandidates ?? 0) > fixture.packet.candidates.length) {
    failures.push(`expected at least ${fixture.expected.minCandidates} candidates`);
  }
  if (fixture.expected.requireApprovalGate && !fixture.packet.humanApproval.required) {
    failures.push("human approval gate is required");
  }
  if (fixture.expected.requireKnownGaps) {
    for (const gap of fixture.contextPack.knownGaps) {
      const recorded = [...fixture.packet.assumed, ...fixture.packet.blockedBy, ...fixture.synthesis.knownGaps]
        .some((item) => item.toLocaleLowerCase().includes(gap.toLocaleLowerCase()));
      if (!recorded) failures.push(`known gap is not carried into the packet: ${gap}`);
    }
  }

  return { failures, fixtureId: fixture.id, ok: failures.length === 0 };
}
