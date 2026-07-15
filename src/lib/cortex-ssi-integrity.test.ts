import { describe, expect, it } from "vitest";
import {
  buildCortexSsiIntegrityObservation,
  buildCortexSsiSnapshotsFromPublicData,
  evaluateCortexSsiIntegrity,
} from "@/lib/cortex-ssi-integrity";

describe("Cortex SSI integrity shadow gate", () => {
  it("flags respondent divergence and a stored day-change mismatch without changing data", () => {
    const result = evaluateCortexSsiIntegrity({
      date: "2026-07-15",
      inputs: [
        { positionKey: "CORN:CPT_ODESSA", price: 211, respondentId: "respondent-1" },
        { positionKey: "CORN:CPT_ODESSA", price: 212, respondentId: "respondent-2" },
        { positionKey: "CORN:CPT_ODESSA", price: 235, respondentId: "respondent-3" },
      ],
      snapshots: [{
        currentValue: 211,
        positionKey: "CORN:CPT_ODESSA",
        previousValue: 211,
        storedChangeAbs: 2,
      }],
    });

    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "input_vs_previous_divergence",
      "input_vs_cohort_divergence",
      "stored_day_change_mismatch",
    ]));
    expect(result.summary.critical).toBe(1);
  });

  it("uses the prior published value, not a stale stored delta, for Telegram validation", () => {
    const result = evaluateCortexSsiIntegrity({
      date: "2026-07-15",
      snapshots: [{
        currentValue: 211,
        positionKey: "CORN:CPT_ODESSA",
        previousValue: 211,
        storedChangeAbs: 0,
      }],
      telegramText: "SPIKE · 15.07.26\n• Кукурудза - 211$ (+2$)",
    });

    expect(result.findings).toContainEqual(expect.objectContaining({
      code: "telegram_snapshot_mismatch",
      severity: "critical",
    }));
  });

  it("records a stale index snapshot as a critical shadow finding", () => {
    const result = evaluateCortexSsiIntegrity({
      date: "2026-07-15",
      snapshots: [{
        currentValue: 211,
        positionKey: "CORN:CPT_ODESSA",
        previousValue: 210,
        snapshotDate: "2026-07-14",
        storedChangeAbs: 1,
      }],
    });

    expect(result.findings).toContainEqual(expect.objectContaining({
      code: "snapshot_date_mismatch",
      severity: "critical",
    }));
  });

  it("creates a stable append-only observation identity for the same evidence", () => {
    const input = {
      createdAt: "2026-07-15T16:10:00.000Z",
      date: "2026-07-15",
      snapshots: [{ currentValue: 211, positionKey: "CORN:CPT_ODESSA", previousValue: 211, storedChangeAbs: 0 }],
      stage: "index_snapshot" as const,
      tenantId: "spike-ua",
    };
    expect(buildCortexSsiIntegrityObservation(input).id).toBe(buildCortexSsiIntegrityObservation(input).id);
  });

  it("reconstructs a snapshot against the preceding published point", () => {
    const snapshots = buildCortexSsiSnapshotsFromPublicData({
      history: [{
        basis: "CPT Odesa, Ukraine (export)", changeAbs: 1, changePct: 0.48,
        commodityCode: "CORN", commodityId: "corn", commodityNameEn: "Corn", commodityNameUk: "Кукурудза",
        date: "2026-07-14", respondents: 19, status: "published", valueUsdPerMt: 211,
      }],
      latest: [{
        basis: "CPT Odesa, Ukraine (export)", changeAbs: 0, changePct: 0,
        commodityCode: "CORN", commodityId: "corn", commodityNameEn: "Corn", commodityNameUk: "Кукурудза",
        date: "2026-07-15", respondents: 19, valueUsdPerMt: 211,
      }],
    });

    expect(snapshots[0]).toMatchObject({ previousValue: 211, storedChangeAbs: 0 });
  });
});
