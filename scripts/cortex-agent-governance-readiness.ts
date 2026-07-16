import { recordCortexAgentGovernanceReadinessSnapshot } from "../src/lib/cortex-agent-governance-readiness";

void main();

async function main() {
  const snapshot = await recordCortexAgentGovernanceReadinessSnapshot({ tenantId: "spike-ua" });
  console.log(JSON.stringify(snapshot ?? { configured: false, mode: "shadow-first" }, null, 2));
}
