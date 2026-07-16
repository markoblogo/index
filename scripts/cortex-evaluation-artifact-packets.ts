import { cortexAgentGovernanceReplayFixtures } from "../src/lib/cortex-agent-governance-replay-fixtures";
import { buildCortexEvaluationArtifactPacket, persistCortexEvaluationArtifactPacket } from "../src/lib/cortex-evaluation-artifact-packet";

void main();

async function main() {
  const runId = `governance-replay:${new Date().toISOString().slice(0, 10)}`;
  const packets = cortexAgentGovernanceReplayFixtures.map((fixture) => buildCortexEvaluationArtifactPacket({ fixture, runId }));
  for (const packet of packets) await persistCortexEvaluationArtifactPacket({ packet, tenantId: "spike-ua" });
  console.log(JSON.stringify({ count: packets.length, example: packets[0], mode: "shadow-only", runId }, null, 2));
}
