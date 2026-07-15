import { describe, expect, it } from "vitest";
import {
  assessCortexEditorialDraft,
  buildCortexEditorialQualityLedgerRecord,
  finalizeCortexEditorialQualityCandidates,
  shouldAttemptCortexEditorialRewrite,
} from "./cortex-editorial-quality-gate";

describe("Cortex editorial quality gate", () => {
  it("requests one style rewrite without changing factual authority", () => {
    const assessment = assessCortexEditorialDraft({
      draft: { summary: ["Wheat demand is stable.", "Wheat demand is stable.", ""], title: "Daily" },
      guidance: {
        active: true, benchmarkKind: "daily", reason: "test", sampleCount: 10,
        targetSentenceRange: { max: 4, min: 2 }, targetWordRange: { max: 20, min: 8 }, version: "profile-1",
      },
      kind: "daily",
    });

    expect(assessment.status).toBe("needs_rewrite");
    expect(assessment.metrics.duplicateLineCount).toBe(1);
    expect(shouldAttemptCortexEditorialRewrite(assessment)).toBe(true);
  });

  it("blocks a candidate with unsupported high-risk claims", () => {
    const assessment = assessCortexEditorialDraft({
      draft: { summary: ["Exports may rise by 20% this week."], title: "Daily" },
      evidence: [],
      kind: "daily",
    });

    expect(assessment.status).toBe("blocked");
    expect(shouldAttemptCortexEditorialRewrite(assessment)).toBe(false);
  });

  it("keeps the original selected while the loop is in shadow mode", () => {
    const record = buildCortexEditorialQualityLedgerRecord({
      kind: "weekly",
      qualityCandidates: {},
      reportId: "report-1",
      tenantId: "spike-ua",
    });

    expect(record).toMatchObject({ id: "cortex-editorial-quality:spike-ua:report-1", shadowOnly: true });
  });

  it("adds factual validation before a candidate is persisted", () => {
    const candidates = finalizeCortexEditorialQualityCandidates({
      evidence: [],
      kind: "daily",
      qualityCandidates: {
        uk: {
          original: { summary: ["Exports may rise by 20% this week."], title: "Daily" },
          originalAssessment: assessCortexEditorialDraft({ draft: { summary: [], title: "" }, kind: "daily" }),
          revised: null,
          revisedAssessment: null,
          rewriteAttempted: true,
          selected: "original",
        },
      },
    });

    expect(candidates.uk?.originalAssessment.status).toBe("blocked");
  });
});
