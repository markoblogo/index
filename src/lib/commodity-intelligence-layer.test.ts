import { describe, expect, it } from "vitest";
import {
  buildCortexContextPack,
  CORTEX_LIFECYCLE,
  canUseVisibilityInExternalModel,
  CORTEX_INITIAL_SOURCES,
  CORTEX_PROJECT_RESOURCES,
} from "@/lib/commodity-intelligence-layer";

describe("1D3X Cortex contracts", () => {
  it("registers the first ecosystem resources", () => {
    const resourceIds = CORTEX_PROJECT_RESOURCES.map((resource) => resource.id);
    const sourceIds = CORTEX_INITIAL_SOURCES.map((source) => source.id);

    expect(resourceIds).toContain("index-platform");
    expect(resourceIds).toContain("mn7r-monitor");
    expect(resourceIds).toContain("cropto-infra");
    expect(sourceIds).toContain("mediahub-global-sources");
    expect(sourceIds).toContain("mediahub-telegram-materials");
    expect(sourceIds).toContain("mn7r-monitor-readonly");
    expect(
      CORTEX_INITIAL_SOURCES.find((source) => source.id === "mn7r-monitor-readonly")
        ?.allowedActionModes,
    ).toContain("approval-gated-tool");
  });

  it("defines the intended learning-to-autonomy lifecycle", () => {
    expect(CORTEX_LIFECYCLE.map((item) => item.stage)).toEqual([
      "observe-learn",
      "assist-propose",
      "approval-gated-act",
      "bounded-autonomy",
    ]);
  });

  it("does not allow protected or secret material into model context by default", () => {
    expect(canUseVisibilityInExternalModel("public")).toBe(true);
    expect(canUseVisibilityInExternalModel("internal")).toBe(true);
    expect(canUseVisibilityInExternalModel("protected")).toBe(false);
    expect(canUseVisibilityInExternalModel("secret")).toBe(false);
    expect(canUseVisibilityInExternalModel("protected", { allowProtected: true })).toBe(true);
  });

  it("builds a bounded context pack with evidence and exclusions", () => {
    const pack = buildCortexContextPack({
      createdAt: "2026-07-06T00:00:00.000Z",
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-public-index",
          sourceId: "published-index-values",
          summary: "Corn published at 200 USD/t.",
          title: "Published corn value",
          urlOrPath: "https://spike.1d3x.com/",
          visibility: "public",
        },
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-protected-monitor",
          sourceId: "mn7r-monitor-readonly",
          summary: "Protected monitor signal.",
          title: "Monitor snapshot",
          urlOrPath: "mn7r://readonly/snapshot",
          visibility: "protected",
        },
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-secret-note",
          sourceId: "mn7r-monitor-readonly",
          summary: "Secret note.",
          title: "Secret",
          urlOrPath: "mn7r://secret",
          visibility: "secret",
        },
      ],
      knownGaps: ["MN7R basis mapping is not finalized."],
      purpose: "monitor-index-comparison",
      query: "compare corn monitor signal with published index",
    });

    expect(pack.product).toBe("1D3X Cortex");
    expect(pack.evidence.map((item) => item.id)).toEqual(["ev-public-index"]);
    expect(pack.excluded.map((item) => item.evidenceId)).toEqual([
      "ev-protected-monitor",
      "ev-secret-note",
    ]);
    expect(pack.sourceIds).toEqual(["published-index-values"]);
    expect(pack.knownGaps).toContain("MN7R basis mapping is not finalized.");
  });

  it("can include protected evidence only when the workflow opts in", () => {
    const pack = buildCortexContextPack({
      allowProtected: true,
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-protected-monitor",
          sourceId: "mn7r-monitor-readonly",
          summary: "Protected monitor signal with redacted counterparty fields.",
          title: "Monitor snapshot",
          urlOrPath: "mn7r://readonly/snapshot",
          visibility: "protected",
        },
      ],
      purpose: "execution-context",
      query: "build execution context",
    });

    expect(pack.evidence).toHaveLength(1);
    expect(pack.excluded).toEqual([]);
  });
});
