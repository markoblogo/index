import { cortexAgentGovernanceReplayFixtures } from "../src/lib/cortex-agent-governance-replay-fixtures";
import { runCortexAgentGovernanceEvaluation } from "../src/lib/cortex-agent-governance-evaluation";

void main();

async function main() {
  const result = await runCortexAgentGovernanceEvaluation({ fixtures: cortexAgentGovernanceReplayFixtures });
  console.log(JSON.stringify({
    runId: result.runId,
    shadowOnly: true,
    summary: result.summary,
    records: result.records.map((record) => ({ fixtureId: record.fixtureId, decision: record.proposed.decision, factualSafety: record.factualSafety.passed, stop: record.proposed.stop })),
  }, null, 2));
}
