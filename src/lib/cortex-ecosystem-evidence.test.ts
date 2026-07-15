import { describe, expect, it } from "vitest";
import {
  buildCortexEcosystemEvidenceEvent,
  buildCortexMediaHubEcosystemEvidenceEvents,
  buildCortexSsiEcosystemEvidenceEvents,
  CORTEX_ECOSYSTEM_SOURCE_REGISTRY,
  validateCortexEcosystemEvidenceEvent,
} from "@/lib/cortex-ecosystem-evidence";

describe("Cortex ecosystem evidence layer", () => {
  it("registers the first ecosystem sources with explicit visibility and freshness limits", () => {
    expect(CORTEX_ECOSYSTEM_SOURCE_REGISTRY.map((source) => source.id)).toEqual(expect.arrayContaining([
      "ssi-respondent-inputs",
      "ssi-index-snapshots",
      "ssi-telegram-drafts",
      "mediahub-source-snapshots",
      "mediahub-report-drafts",
      "mediahub-publications",
      "mn7r-monitor-observations",
    ]));
    expect(CORTEX_ECOSYSTEM_SOURCE_REGISTRY.every((source) => source.maxAgeHours > 0)).toBe(true);
  });

  it("maps SSI input and index checks into immutable evidence events", () => {
    const events = buildCortexSsiEcosystemEvidenceEvents({
      createdAt: "2026-07-15T12:00:00.000Z",
      date: "2026-07-15",
      findings: [{ code: "input_vs_previous_divergence", severity: "warning" }],
      inputs: [{ respondentId: "broker-1" }, { respondentId: "broker-2" }],
      snapshots: [{ positionKey: "CORN:CPT_ODESSA" }],
      stage: "index_snapshot",
      tenantId: "spike-ua",
    });

    expect(events.map((event) => event.eventType)).toEqual(["ssi-respondent-inputs", "ssi-index-snapshot"]);
    expect(events.every((event) => validateCortexEcosystemEvidenceEvent(event).ok)).toBe(true);
    expect(events[0].knownGaps).toEqual(["integrity:input_vs_previous_divergence"]);
  });

  it("keeps MediaHub raw source snapshots protected while report drafts stay internal", () => {
    const events = buildCortexMediaHubEcosystemEvidenceEvents({
      contextPack: {
        evidence: [
          { sourceId: "mediahub-raw-monitoring-items", visibility: "protected" },
          { sourceId: "published-index-values", visibility: "public" },
        ],
        knownGaps: ["manual material coverage is incomplete"],
        sourceIds: ["mediahub-raw-monitoring-items", "published-index-values"],
      },
      kind: "daily",
      periodEndDate: "2026-07-15",
      periodStartDate: "2026-07-15",
      reportId: "report-1",
      tenantId: "spike-ua",
    });

    expect(events.map((event) => event.visibility)).toEqual(["protected", "internal"]);
    expect(events.every((event) => validateCortexEcosystemEvidenceEvent(event).ok)).toBe(true);
  });

  it("rejects an unregistered source and keeps event identity stable", () => {
    const input = {
      entity: { id: "task-1", type: "mn7r-monitor-comparison" },
      eventType: "mn7r-monitor-observation" as const,
      knownGaps: [],
      metrics: { matchedChunks: 3 },
      occurredAt: "2026-07-15T12:00:00.000Z",
      project: "mn7r" as const,
      provenance: { parentEventIds: [], sourceId: "mn7r-monitor-observations", sourceVersion: "v1" },
      recordedAt: "2026-07-15T12:01:00.000Z",
      summary: "MN7R observation.",
      tenantId: "mn7r",
      visibility: "protected" as const,
    };
    expect(buildCortexEcosystemEvidenceEvent(input).id).toBe(buildCortexEcosystemEvidenceEvent(input).id);
    expect(validateCortexEcosystemEvidenceEvent({ ...input, provenance: { ...input.provenance, sourceId: "unknown" } }).ok).toBe(false);
  });
});
