import { readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateCortexOperationalFixture, type CortexOperationalEvalFixture } from "@/lib/cortex-operational-evaluation";

async function main() {
  const fixturePath = path.resolve(argumentValue("--fixture") ?? "fixtures/cortex-operational/monitor-index-comparison.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as CortexOperationalEvalFixture;
  const result = evaluateCortexOperationalFixture(fixture);
  console.log(JSON.stringify({ fixture: fixturePath, ...result }, null, 2));
  if (!result.ok) process.exit(1);
}

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

void main();
