import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexAgentGovernanceReplayFixture } from "@/lib/cortex-agent-governance-evaluation";
import { evaluateCortexAgentGovernanceReplayFixture } from "@/lib/cortex-agent-governance-evaluation";

export type CortexEvaluationArtifactPacket = {
  candidatePlaybook: {
    changeSummary: string;
    evidenceRefs: string[];
    id: string;
    runtimeTarget: "none";
    status: "proposed" | "rejected";
    validationGates: string[];
  };
  correlationId: string;
  createdAt: string;
  id: string;
  ledgerLinks: Array<{ ledger: "CortexAgentGovernanceEvaluationLedger" | "CortexAgentGovernanceReceiptLedger"; recordId: string }>;
  mode: "shadow-only";
  product: "1D3X Cortex";
  report: {
    abstentionQuality: "acceptable" | "not_applicable" | "needs_review";
    estimatedCost: number | null;
    factualSafety: "pass" | "fail";
    latencyMs: number | null;
    stoppingCorrect: boolean;
    unnecessaryToolCalls: number | null;
  };
  scenario: {
    constraints: string[];
    expectedSafety: "pass" | "fail";
    expectedStop: "abstain" | "continue" | "request_review";
    inputRefs: string[];
    scenarioId: string;
    task: string;
  };
  taskId: string;
  trace: {
    events: Array<{ kind: "observation" | "policy_decision" | "tool_call"; ref: string }>;
    source: "existing-ledger-refs";
    toolCalls: number;
  };
  verifierResult: {
    evidenceRefs: string[];
    namedVerifier: string;
    reasons: string[];
    review: { reviewedBy: string | null; status: "not_requested" | "reviewed" };
    rollbackNotes: string[];
    status: "abstain" | "fail" | "pass";
  };
  version: 1;
};

export type CortexEvaluationArtifactPacketRecord = CortexEvaluationArtifactPacket & { shadowOnly: true; tenantId: string };
export type CortexEvaluationArtifactPacketValidation = { errors: string[]; ok: boolean };
let storageReady: Promise<void> | null = null;

/** Builds a report-only packet from an existing governance replay fixture. */
export function buildCortexEvaluationArtifactPacket(input: {
  createdAt?: string;
  fixture: CortexAgentGovernanceReplayFixture;
  runId: string;
}): CortexEvaluationArtifactPacket {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const evaluation = evaluateCortexAgentGovernanceReplayFixture({ fixture: input.fixture, runId: input.runId });
  const rejected = input.fixture.expected.decision !== "allow";
  const packet: CortexEvaluationArtifactPacket = {
    candidatePlaybook: {
      changeSummary: rejected ? "Keep the current runtime unchanged; retain the rejected governance candidate as evaluation evidence." : "Propose a report-only governance review checklist; do not apply it to runtime.",
      evidenceRefs: [input.fixture.id],
      id: `candidate:${input.fixture.id}`,
      runtimeTarget: "none",
      status: rejected ? "rejected" : "proposed",
      validationGates: ["named verifier", "human review", "rollback notes"],
    },
    correlationId: input.fixture.input.correlationId,
    createdAt,
    id: `cortex-evaluation-artifact:${input.fixture.input.taskId}:${hashValue({ createdAt, fixtureId: input.fixture.id, runId: input.runId }).slice(0, 18)}`,
    ledgerLinks: [
      { ledger: "CortexAgentGovernanceEvaluationLedger", recordId: `${input.runId}:${input.fixture.id}` },
      { ledger: "CortexAgentGovernanceReceiptLedger", recordId: `task:${input.fixture.input.taskId}` },
    ],
    mode: "shadow-only",
    product: "1D3X Cortex",
    report: {
      abstentionQuality: evaluation.abstentionQuality,
      estimatedCost: input.fixture.baseline.estimatedCost,
      factualSafety: evaluation.factualSafety.passed ? "pass" : "fail",
      latencyMs: input.fixture.baseline.latencyMs,
      stoppingCorrect: evaluation.decisionCorrect,
      unnecessaryToolCalls: evaluation.measurements.unnecessaryToolCalls,
    },
    scenario: {
      constraints: ["read-only ledger references", "no runtime mutation", "no public output change"],
      expectedSafety: "pass",
      expectedStop: input.fixture.expected.stop,
      inputRefs: [input.fixture.id],
      scenarioId: `scenario:${input.fixture.id}`,
      task: `Evaluate governance policy for ${input.fixture.input.actionKind}.`,
    },
    taskId: input.fixture.input.taskId,
    trace: {
      events: [
        { kind: "observation", ref: `fixture:${input.fixture.id}` },
        { kind: "policy_decision", ref: `governance-evaluation:${input.runId}:${input.fixture.id}` },
      ],
      source: "existing-ledger-refs",
      toolCalls: 0,
    },
    verifierResult: {
      evidenceRefs: [input.fixture.id, `governance-evaluation:${input.runId}:${input.fixture.id}`],
      namedVerifier: "cortex-governance-deterministic-verifier",
      reasons: evaluation.factualSafety.passed && evaluation.decisionCorrect ? ["Typed policy output matches expected decision and stop condition.", "Report-only packet awaits separate named review."] : [...evaluation.factualSafety.reasons, "Expected decision or stop condition diverged."],
      review: { reviewedBy: null, status: "not_requested" },
      rollbackNotes: ["No runtime change was applied; discard this packet to roll back the evaluation artifact."],
      status: evaluation.factualSafety.passed && evaluation.decisionCorrect ? "abstain" : "fail",
    },
    version: 1,
  };
  return packet;
}

export function validateCortexEvaluationArtifactPacket(value: unknown): CortexEvaluationArtifactPacketValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: ["packet must be an object"], ok: false };
  const packet = value as Partial<CortexEvaluationArtifactPacket>;
  for (const key of ["id", "taskId", "correlationId", "createdAt"] as const) if (typeof packet[key] !== "string" || !packet[key]?.trim()) errors.push(`${key} is required`);
  if (packet.mode !== "shadow-only") errors.push("mode must be shadow-only");
  if (packet.product !== "1D3X Cortex" || packet.version !== 1) errors.push("product/version is invalid");
  if (!packet.scenario || !packet.trace || !packet.report || !packet.candidatePlaybook || !packet.verifierResult) errors.push("all five artifacts are required");
  if (!Array.isArray(packet.ledgerLinks) || packet.ledgerLinks.length === 0) errors.push("existing ledger links are required");
  if (packet.candidatePlaybook?.runtimeTarget !== "none") errors.push("candidate must not target runtime");
  if (!packet.candidatePlaybook?.validationGates?.includes("named verifier") || !packet.candidatePlaybook?.validationGates?.includes("human review") || !packet.candidatePlaybook?.validationGates?.includes("rollback notes")) errors.push("candidate promotion gates are incomplete");
  if (!packet.verifierResult?.namedVerifier?.trim()) errors.push("named verifier is required");
  if (!packet.verifierResult?.rollbackNotes?.length) errors.push("rollback notes are required");
  if (packet.verifierResult?.status === "pass" && packet.verifierResult.review.status !== "reviewed") errors.push("pass requires named review before promotion consideration");
  return { errors, ok: errors.length === 0 };
}

export async function persistCortexEvaluationArtifactPacket(input: { packet: CortexEvaluationArtifactPacket; tenantId: string }) {
  const validation = validateCortexEvaluationArtifactPacket(input.packet);
  if (!validation.ok) throw new Error(`Invalid Cortex evaluation artifact packet: ${validation.errors.join("; ")}`);
  if (!hasDatabaseUrl()) return null;
  const record: CortexEvaluationArtifactPacketRecord = { ...input.packet, shadowOnly: true, tenantId: input.tenantId };
  await ensureStorage();
  await db.$executeRawUnsafe(`INSERT INTO "CortexEvaluationArtifactPacketLedger" ("id", "tenantId", "taskId", "correlationId", "verifierStatus", "packetJson", "createdAt") VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamp) ON CONFLICT ("id") DO NOTHING`, record.id, record.tenantId, record.taskId, record.correlationId, record.verifierResult.status, JSON.stringify(record), record.createdAt);
  return record;
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEvaluationArtifactPacketLedger" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "verifierStatus" TEXT NOT NULL, "packetJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEvaluationArtifactPacketLedger_task_idx" ON "CortexEvaluationArtifactPacketLedger"("tenantId", "taskId", "createdAt" DESC)`);
  })();
  await storageReady;
}

function hashValue(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
