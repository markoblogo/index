import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCortexSourceManifest,
  buildLocalEcosystemScanRoots,
  classifySource,
  type CortexScanRoot,
} from "@/lib/cortex-source-scanner";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("cortex source scanner", () => {
  it("classifies ecosystem files into memory source families", () => {
    expect(classifySource("src/app/[locale]/page.tsx")).toBe("site-content");
    expect(classifySource("docs/source/market-guide.pdf")).toBe("manual-book");
    expect(classifySource("docs/implementation-plan.md")).toBe("development-plan");
    expect(classifySource("scripts/cortex-source-scan.ts")).toBe("code");
    expect(classifySource("docs/report-archive.md")).toBe("archive");
    expect(classifySource("docs/action-events.md")).toBe("action-event");
  });

  it("builds a permission-aware source manifest without secret files", async () => {
    const rootPath = await createFixtureRoot();
    const roots: CortexScanRoot[] = [
      {
        ownerProject: "index",
        rootId: "fixture-index",
        rootPath,
        visibility: "internal",
      },
    ];

    const manifest = await buildCortexSourceManifest({
      generatedAt: "2026-07-06T00:00:00.000Z",
      roots,
    });

    expect(manifest.product).toBe("1D3X Cortex");
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.sources.map((source) => source.relativePath)).toEqual([
      "docs/action-events.md",
      "docs/implementation-plan.md",
      "docs/source/manual.pdf",
      "README.md",
      "scripts/cortex-source-scan.ts",
      "src/app/page.tsx",
    ]);
    expect(manifest.sources.map((source) => source.relativePath)).not.toContain(".env");
    expect(manifest.totals.byKind["site-content"]).toBe(1);
    expect(manifest.totals.byKind["manual-book"]).toBe(1);
    expect(manifest.totals.byKind["development-plan"]).toBe(1);
    expect(manifest.totals.byKind["action-event"]).toBe(1);
    expect(manifest.totals.byKind.code).toBe(1);
    expect(manifest.totals.files).toBe(6);
    expect(manifest.sources.every((source) => source.hash.length === 64)).toBe(true);
  });

  it("builds local ecosystem roots from existing paths only", async () => {
    const indexRoot = await createFixtureRoot();
    const mn7rRoot = await createFixtureRoot();
    const missingRoot = path.join(os.tmpdir(), "missing-cortex-root");

    const roots = await buildLocalEcosystemScanRoots({
      croptoRoot: missingRoot,
      indexRoot,
      mn7rRoot,
    });

    expect(roots.map((root) => root.rootId)).toEqual(["index-platform", "mn7r-monitor"]);
    expect(roots.find((root) => root.rootId === "mn7r-monitor")?.visibility).toBe("protected");
  });
});

async function createFixtureRoot() {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "cortex-source-scan-"));
  tempRoots.push(rootPath);

  await mkdir(path.join(rootPath, "docs/source"), { recursive: true });
  await mkdir(path.join(rootPath, "scripts"), { recursive: true });
  await mkdir(path.join(rootPath, "src/app"), { recursive: true });
  await writeFile(path.join(rootPath, "README.md"), "# Fixture\n");
  await writeFile(path.join(rootPath, "docs/action-events.md"), "# Actions\n");
  await writeFile(path.join(rootPath, "docs/implementation-plan.md"), "# Plan\n");
  await writeFile(path.join(rootPath, "docs/source/manual.pdf"), "manual");
  await writeFile(path.join(rootPath, "scripts/cortex-source-scan.ts"), "export {};\n");
  await writeFile(path.join(rootPath, "src/app/page.tsx"), "export default function Page() { return null; }\n");
  await writeFile(path.join(rootPath, ".env"), "SECRET=value\n");

  return rootPath;
}
