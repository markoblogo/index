import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { computePublishedChange } from "@/lib/index-publish";
import type { PublicHistoryItem, PublicLatestItem } from "@/lib/public-api-data";

const INPUT_DIVERGENCE_PCT = 5;

export type CortexSsiIntegritySeverity = "info" | "warning" | "critical";
export type CortexSsiIntegrityStage = "index_snapshot" | "telegram_draft";

export type CortexSsiIntegrityFinding = {
  code: string;
  message: string;
  positionKey?: string;
  severity: CortexSsiIntegritySeverity;
};

export type CortexSsiIntegrityInput = {
  positionKey: string;
  price: number;
  respondentId: string;
};

export type CortexSsiIntegritySnapshot = {
  currentValue: number;
  positionKey: string;
  previousValue: number | null;
  snapshotDate?: string;
  storedChangeAbs: number | null;
};

export type CortexSsiIntegrityObservation = {
  createdAt: string;
  date: string;
  findings: CortexSsiIntegrityFinding[];
  id: string;
  inputs: CortexSsiIntegrityInput[];
  product: "1D3X Cortex";
  shadowOnly: true;
  snapshots: CortexSsiIntegritySnapshot[];
  stage: CortexSsiIntegrityStage;
  summary: { critical: number; info: number; warning: number };
  tenantId: string;
  telegram?: { messageHash: string; messageLength: number };
};

export type CortexSsiIntegrityDailyReport = {
  date: string;
  findings: CortexSsiIntegrityFinding[];
  observations: CortexSsiIntegrityObservation[];
  shadowOnly: true;
  status: "clear" | "warning" | "critical";
  summary: CortexSsiIntegrityObservation["summary"];
  tenantId: string;
};

export function evaluateCortexSsiIntegrity(input: {
  date: string;
  inputs?: CortexSsiIntegrityInput[];
  snapshots: CortexSsiIntegritySnapshot[];
  telegramText?: string;
}) {
  const findings = [
    ...evaluateInputRelevance(input.inputs ?? [], input.snapshots),
    ...evaluateSnapshots(input.date, input.snapshots),
    ...evaluateTelegramDraft(input.date, input.snapshots, input.telegramText),
  ];
  return { findings, summary: summarizeFindings(findings) };
}

export function buildCortexSsiIntegrityObservation(input: {
  createdAt?: string;
  date: string;
  inputs?: CortexSsiIntegrityInput[];
  snapshots: CortexSsiIntegritySnapshot[];
  stage: CortexSsiIntegrityStage;
  telegramText?: string;
  tenantId: string;
}): CortexSsiIntegrityObservation {
  const inputs = input.inputs ?? [];
  const evaluation = evaluateCortexSsiIntegrity({
    date: input.date,
    inputs,
    snapshots: input.snapshots,
    telegramText: input.telegramText,
  });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ date: input.date, inputs, snapshots: input.snapshots, stage: input.stage, telegramText: input.telegramText ?? null }))
    .digest("hex");

  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    date: input.date,
    findings: evaluation.findings,
    id: `cortex-ssi-integrity:${input.tenantId}:${input.date}:${input.stage}:${fingerprint.slice(0, 16)}`,
    inputs,
    product: "1D3X Cortex",
    shadowOnly: true,
    snapshots: input.snapshots,
    stage: input.stage,
    summary: evaluation.summary,
    telegram: input.telegramText
      ? { messageHash: createHash("sha256").update(input.telegramText).digest("hex"), messageLength: input.telegramText.length }
      : undefined,
    tenantId: input.tenantId,
  };
}

export async function persistCortexSsiIntegrityObservation(input: {
  date: string;
  inputs?: CortexSsiIntegrityInput[];
  snapshots: CortexSsiIntegritySnapshot[];
  stage: CortexSsiIntegrityStage;
  telegramText?: string;
  tenantId: string;
}) {
  if (!hasDatabaseUrl()) return null;

  const record = buildCortexSsiIntegrityObservation(input);
  await ensureStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexSsiIntegrityLedger" ("id", "tenantId", "date", "stage", "severity", "recordJson", "createdAt") VALUES ($1, $2, $3::date, $4, $5, $6::jsonb, $7::timestamp) ON CONFLICT ("id") DO NOTHING`,
    record.id,
    record.tenantId,
    record.date,
    record.stage,
    highestSeverity(record.summary),
    JSON.stringify(record),
    record.createdAt,
  );
  return record;
}

export async function observeCortexSsiTelegramDraft(input: {
  date: string;
  history: PublicHistoryItem[];
  latest: PublicLatestItem[];
  telegramText: string;
  tenantId: string;
}) {
  return persistCortexSsiIntegrityObservation({
    date: input.date,
    snapshots: buildCortexSsiSnapshotsFromPublicData({
      history: input.history,
      latest: input.latest,
    }),
    stage: "telegram_draft",
    telegramText: input.telegramText,
    tenantId: input.tenantId,
  });
}

export async function getCortexSsiIntegrityDailyReport(input: {
  date: string;
  tenantId: string;
}): Promise<CortexSsiIntegrityDailyReport | null> {
  if (!hasDatabaseUrl()) return null;
  await ensureStorage();
  const rows = await db.$queryRawUnsafe<Array<{ recordJson: unknown }>>(
    `SELECT DISTINCT ON ("stage") "recordJson" FROM "CortexSsiIntegrityLedger" WHERE "tenantId" = $1 AND "date" = $2::date ORDER BY "stage", "createdAt" DESC`,
    input.tenantId,
    input.date,
  );
  const observations = rows.map((row) => row.recordJson as CortexSsiIntegrityObservation);
  const findings = observations.flatMap((observation) => observation.findings);
  const summary = summarizeFindings(findings);
  return {
    date: input.date,
    findings,
    observations,
    shadowOnly: true,
    status: summary.critical > 0 ? "critical" : summary.warning > 0 ? "warning" : "clear",
    summary,
    tenantId: input.tenantId,
  };
}

export function buildCortexSsiSnapshotsFromPublicData(input: {
  history: PublicHistoryItem[];
  latest: PublicLatestItem[];
}): CortexSsiIntegritySnapshot[] {
  return input.latest
    .filter((item): item is PublicLatestItem & { valueUsdPerMt: number } => item.valueUsdPerMt !== null)
    .map((item) => {
      const previous = input.history
        .filter((candidate) =>
          candidate.date < item.date &&
          (candidate.commodityCode === item.commodityCode || candidate.commodityId === item.commodityId),
        )
        .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
      return {
        currentValue: item.valueUsdPerMt,
        positionKey: `${item.commodityCode}:${item.basis}`,
        previousValue: previous?.valueUsdPerMt ?? null,
        snapshotDate: item.date,
        storedChangeAbs: item.changeAbs,
      };
    });
}

function evaluateInputRelevance(
  inputs: CortexSsiIntegrityInput[],
  snapshots: CortexSsiIntegritySnapshot[],
) {
  const previousByPosition = new Map(snapshots.map((item) => [item.positionKey, item.previousValue]));
  const findings: CortexSsiIntegrityFinding[] = [];
  const byPosition = new Map<string, CortexSsiIntegrityInput[]>();
  for (const item of inputs) {
    byPosition.set(item.positionKey, [...(byPosition.get(item.positionKey) ?? []), item]);
  }

  for (const [positionKey, rows] of byPosition) {
    if (!positionKey || !rows) continue;
    const respondentIds = new Set<string>();
    const median = medianOf(rows.map((item) => item.price));
    const previous = previousByPosition.get(positionKey) ?? null;
    for (const row of rows) {
      if (respondentIds.has(row.respondentId)) {
        findings.push({ code: "duplicate_respondent_input", message: `Duplicate respondent input for ${row.respondentId}.`, positionKey, severity: "warning" });
      }
      respondentIds.add(row.respondentId);
      if (previous !== null && percentDifference(row.price, previous) > INPUT_DIVERGENCE_PCT) {
        findings.push({ code: "input_vs_previous_divergence", message: `Respondent value differs from the prior published value by more than ${INPUT_DIVERGENCE_PCT}%.`, positionKey, severity: "warning" });
      }
      if (median !== null && percentDifference(row.price, median) > INPUT_DIVERGENCE_PCT) {
        findings.push({ code: "input_vs_cohort_divergence", message: `Respondent value differs from the cohort median by more than ${INPUT_DIVERGENCE_PCT}%.`, positionKey, severity: "warning" });
      }
    }
  }
  return findings;
}

function evaluateSnapshots(date: string, snapshots: CortexSsiIntegritySnapshot[]) {
  const findings: CortexSsiIntegrityFinding[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.snapshotDate && snapshot.snapshotDate !== date) {
      findings.push({ code: "snapshot_date_mismatch", message: `Current index snapshot is dated ${snapshot.snapshotDate}, not report date ${date}.`, positionKey: snapshot.positionKey, severity: "critical" });
    }
    if (snapshot.previousValue === null) {
      findings.push({ code: "previous_value_unavailable", message: "No prior published value is available for day-over-day validation.", positionKey: snapshot.positionKey, severity: "info" });
      continue;
    }
    const expected = computePublishedChange(snapshot.currentValue, snapshot.previousValue, { displayRounding: "whole" }).changeAbs;
    if (expected !== snapshot.storedChangeAbs) {
      findings.push({ code: "stored_day_change_mismatch", message: `Stored day change ${snapshot.storedChangeAbs ?? "n/a"} does not equal deterministic change ${expected ?? "n/a"}.`, positionKey: snapshot.positionKey, severity: "critical" });
    }
  }
  return findings;
}

function evaluateTelegramDraft(date: string, snapshots: CortexSsiIntegritySnapshot[], telegramText?: string) {
  if (!telegramText) return [];
  const findings: CortexSsiIntegrityFinding[] = [];
  if (!telegramText.includes(date.slice(8, 10))) {
    findings.push({ code: "telegram_date_mismatch", message: "Telegram draft does not contain the report day.", severity: "critical" });
  }
  for (const snapshot of snapshots) {
    const value = `${Math.round(snapshot.currentValue)}$`;
    const expected = computePublishedChange(snapshot.currentValue, snapshot.previousValue, { displayRounding: "whole" }).changeAbs;
    const change = `${expected !== null && expected > 0 ? "+" : ""}${expected ?? 0}$`;
    if (!telegramText.includes(value) || !telegramText.includes(`(${change})`)) {
      findings.push({ code: "telegram_snapshot_mismatch", message: "Telegram draft does not reproduce a current snapshot value and deterministic day change.", positionKey: snapshot.positionKey, severity: "critical" });
    }
  }
  return findings;
}

function summarizeFindings(findings: CortexSsiIntegrityFinding[]) {
  return findings.reduce((summary, finding) => {
    summary[finding.severity] += 1;
    return summary;
  }, { critical: 0, info: 0, warning: 0 });
}

function highestSeverity(summary: CortexSsiIntegrityObservation["summary"]) {
  return summary.critical > 0 ? "critical" : summary.warning > 0 ? "warning" : "info";
}

function medianOf(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function percentDifference(value: number, reference: number) {
  return reference === 0 ? 0 : Math.abs(value - reference) / Math.abs(reference) * 100;
}

async function ensureStorage() {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexSsiIntegrityLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "date" DATE NOT NULL, "stage" TEXT NOT NULL, "severity" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexSsiIntegrityLedger_pkey" PRIMARY KEY ("id"))`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexSsiIntegrityLedger_tenant_date_idx" ON "CortexSsiIntegrityLedger"("tenantId", "date" DESC, "createdAt" DESC)`);
}
