import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectRepoHealth,
  evaluateRepoHealth,
  renderRepoHealthReport,
} from "./audit-repo-health.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe("audit-repo-health", () => {
  it("collects repo shape and passes within configured limits", () => {
    const root = createFixtureRepo({ publicAssetBytes: 1024, sourceLines: 12, tests: 2 });
    const health = collectRepoHealth({ repoRoot: root });
    const evaluation = evaluateRepoHealth(health, {
      maxPublicAssetMb: 1,
      maxPublicMb: 1,
      maxSourceFileLines: 50,
      minTests: 2,
    });

    expect(health.summary.tsFiles).toBe(5);
    expect(health.summary.tests).toBe(2);
    expect(evaluation.ok).toBe(true);
    expect(renderRepoHealthReport(health, evaluation)).toContain("status: passed");
  });

  it("fails on oversized public assets, monolithic source and low tests", () => {
    const root = createFixtureRepo({ publicAssetBytes: 2048, sourceLines: 80, tests: 0 });
    const evaluation = evaluateRepoHealth(collectRepoHealth({ repoRoot: root }), {
      maxPublicAssetMb: 0.001,
      maxPublicMb: 0.001,
      maxSourceFileLines: 20,
      minTests: 1,
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.failures.some((failure) => failure.includes("public/ is"))).toBe(true);
    expect(evaluation.failures.some((failure) => failure.includes("public/large.bin"))).toBe(true);
    expect(evaluation.failures.some((failure) => failure.includes("src/lib/large.ts"))).toBe(true);
    expect(evaluation.failures.some((failure) => failure.includes("test count"))).toBe(true);
  });
});

function createFixtureRepo(input) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-health-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/lib"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/app/api/health"), { recursive: true });
  fs.writeFileSync(path.join(root, "public/large.bin"), Buffer.alloc(input.publicAssetBytes));
  fs.writeFileSync(path.join(root, "src/lib/large.ts"), Array.from({ length: input.sourceLines }, (_, index) => `export const v${index} = ${index};`).join("\n"));
  fs.writeFileSync(path.join(root, "src/components/Card.tsx"), "export function Card() { return null; }\n");
  fs.writeFileSync(path.join(root, "src/app/api/health/route.ts"), "export function GET() {}\n");
  for (let index = 0; index < input.tests; index += 1) {
    fs.writeFileSync(path.join(root, `src/lib/test-${index}.test.ts`), "import { it } from 'vitest'; it('x', () => {});\n");
  }
  return root;
}
