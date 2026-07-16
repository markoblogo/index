import { describe, expect, it } from "vitest";
import {
  buildCortexAgentGovernanceApproval,
  buildCortexAgentGovernanceReceipt,
  createCortexAgentGovernanceApprovalUseGuard,
  CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS,
  validateCortexAgentGovernanceReceipt,
} from "@/lib/cortex-agent-governance-capability";

function receipt(overrides: Record<string, unknown> = {}) {
  return buildCortexAgentGovernanceReceipt({
    actionKind: "external_model_handoff",
    actionPayload: { model: "gpt-test", provider: "openai" },
    correlationId: "correlation-1",
    evidence: { knownGapCount: 0, protectedEvidenceCount: 0, totalCount: 1 },
    sourceVisibility: "protected",
    taskId: "task-1",
    ...overrides,
  });
}

describe("Cortex agent governance capability", () => {
  it("builds a shadow-only allow receipt without storing action content", () => {
    const value = receipt();
    expect(value).toMatchObject({ decision: "allow", mode: "shadow-first", stop: "continue", telemetry: { toolCalls: 0 } });
    expect(JSON.stringify(value)).not.toContain("gpt-test");
    expect(validateCortexAgentGovernanceReceipt(value)).toEqual({ errors: [], ok: true });
  });

  it("requires review or abstains instead of allowing missing evidence", () => {
    const missing = receipt({ evidence: { knownGapCount: 1, protectedEvidenceCount: 0, totalCount: 0 } });
    const gap = receipt({ evidence: { knownGapCount: 1, protectedEvidenceCount: 0, totalCount: 1 } });
    expect(missing).toMatchObject({ decision: "require_approval", stop: "abstain" });
    expect(gap).toMatchObject({ decision: "require_approval", stop: "request_review" });
  });

  it("records a public/protected boundary as deny plus abstain and rejects tool-call overflow", () => {
    const publicBoundary = receipt({ evidence: { knownGapCount: 0, protectedEvidenceCount: 1, totalCount: 1 }, sourceVisibility: "public" });
    const overflow = receipt();
    overflow.telemetry.toolCalls = CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS + 1;
    expect(publicBoundary).toMatchObject({ decision: "deny", stop: "abstain" });
    expect(validateCortexAgentGovernanceReceipt(publicBoundary)).toEqual({ errors: [], ok: true });
    expect(validateCortexAgentGovernanceReceipt(overflow).errors).toContain("toolCalls exceeds toolCallLimit");
  });

  it("binds approval to the exact action fingerprint and allows one use only", () => {
    const value = receipt();
    const approval = buildCortexAgentGovernanceApproval({
      actionFingerprint: value.actionFingerprint,
      approvalId: "approval-1",
      expiresAt: "2026-07-17T08:00:00.000Z",
      issuedAt: "2026-07-16T08:00:00.000Z",
    });
    const guard = createCortexAgentGovernanceApprovalUseGuard();
    expect(guard.consume({ actionFingerprint: value.actionFingerprint, approval, now: "2026-07-16T09:00:00.000Z" })).toEqual({ ok: true, used: true });
    expect(guard.consume({ actionFingerprint: value.actionFingerprint, approval, now: "2026-07-16T09:00:00.000Z" })).toMatchObject({ ok: false, used: false });
    expect(guard.consume({ actionFingerprint: "sha256:other", approval, now: "2026-07-16T09:00:00.000Z" })).toMatchObject({ ok: false, used: false });
  });
});
