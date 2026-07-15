import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateCortexOperationalFixture, type CortexOperationalEvalFixture } from "@/lib/cortex-operational-evaluation";

async function main() {
  const requestedFixture = argumentValue("--fixture");
  const fixturePaths = requestedFixture
    ? [path.resolve(requestedFixture)]
    : (await readdir(path.resolve("fixtures/cortex-operational")))
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => path.resolve("fixtures/cortex-operational", name));
  const results = await Promise.all(fixturePaths.map(async (fixturePath) => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as CortexOperationalEvalFixture;
    return { fixture: fixturePath, ...evaluateCortexOperationalFixture(fixture) };
  }));
  console.log(JSON.stringify({ ok: results.every((result) => result.ok), results }, null, 2));
  if (results.some((result) => !result.ok)) process.exit(1);
}

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

void main();
