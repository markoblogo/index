import { runCortexAutonomyReadinessMonitor } from "@/lib/cortex-autonomy-readiness";

async function main() {
  console.log(JSON.stringify(await runCortexAutonomyReadinessMonitor(), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
