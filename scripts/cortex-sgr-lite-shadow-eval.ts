import { cortexSgrLiteReplayFixtures } from "../src/lib/cortex-sgr-lite-replay-fixtures";
import { runCortexSgrLiteShadowEvaluation } from "../src/lib/cortex-sgr-lite-shadow-evaluation";

void main();

async function main() {
  const result = await runCortexSgrLiteShadowEvaluation({ fixtures: cortexSgrLiteReplayFixtures });
  console.log(JSON.stringify({
    runId: result.runId,
    shadowOnly: true,
    summary: result.summary,
    records: result.records.map((record) => ({
      fixtureId: record.fixtureId,
      factualSafety: record.factualSafety.passed,
      nextAction: record.checkpoint.nextAction.kind,
      stopDecisionCorrect: record.stopDecision.correct,
    })),
  }, null, 2));
}
