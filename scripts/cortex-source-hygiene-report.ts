import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CortexSourceManifest } from "@/lib/cortex-source-scanner";

type HygieneCategory =
  | "VALID_DOMAIN_SOURCE"
  | "VALID_PROJECT_SOURCE"
  | "GENERATED"
  | "CACHE"
  | "SESSION"
  | "BUILD_ARTIFACT"
  | "TEMPORARY"
  | "UNKNOWN";

type HygieneReport = {
  generatedAt: string;
  manifestPath: string;
  totalSources: number;
  categories: Record<HygieneCategory, {
    count: number;
    examples: string[];
  }>;
};

async function main() {
  const manifestPath = path.resolve(pickArgValue(process.argv.slice(2), "--manifest") ?? ".cortex/source-manifest.json");
  const outPath = pickArgValue(process.argv.slice(2), "--out");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as CortexSourceManifest;
  const report = buildHygieneReport(manifestPath, manifest);

  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (outPath) {
    const absoluteOut = path.resolve(outPath);
    await mkdir(path.dirname(absoluteOut), { recursive: true });
    await writeFile(absoluteOut, output);
  }

  process.stdout.write(output);
}

function buildHygieneReport(manifestPath: string, manifest: CortexSourceManifest): HygieneReport {
  const categories = emptyCategories();

  for (const source of manifest.sources) {
    const category = classifyHygieneCategory(source.relativePath);
    categories[category].count += 1;
    if (categories[category].examples.length < 10) {
      categories[category].examples.push(source.relativePath);
    }
  }

  return {
    categories,
    generatedAt: new Date().toISOString(),
    manifestPath,
    totalSources: manifest.sources.length,
  };
}

function classifyHygieneCategory(relativePath: string): HygieneCategory {
  const normalized = relativePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  if (lower.startsWith(".cortex/")) return "GENERATED";
  if (lower.startsWith(".whatsapp-session") || lower.includes("/session/")) return "SESSION";
  if (lower.includes("cache")) return "CACHE";
  if (lower.includes("/dist/") || lower.includes("/build/") || lower.includes("/.next/") || lower.includes("/coverage/") || lower.includes("/out/")) {
    return "BUILD_ARTIFACT";
  }
  if (lower.includes("/tmp/") || lower.includes("/temp/") || lower.endsWith(".tmp")) return "TEMPORARY";

  const topLevel = normalized.split("/", 1)[0] ?? normalized;
  if (topLevel === "src" || topLevel === "public") return "VALID_PROJECT_SOURCE";
  if (
    topLevel === "docs" ||
    topLevel === "scripts" ||
    topLevel === "services" ||
    topLevel === "fixtures" ||
    topLevel === "prisma" ||
    normalized === "README.md" ||
    normalized === "AGENTS.md" ||
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized.endsWith(".pdf") ||
    normalized.endsWith(".md") ||
    normalized.endsWith(".json") ||
    normalized.endsWith(".ts") ||
    normalized.endsWith(".tsx") ||
    normalized.endsWith(".mjs") ||
    normalized.endsWith(".yml")
  ) {
    return "VALID_DOMAIN_SOURCE";
  }

  return "UNKNOWN";
}

function emptyCategories(): HygieneReport["categories"] {
  return {
    BUILD_ARTIFACT: { count: 0, examples: [] },
    CACHE: { count: 0, examples: [] },
    GENERATED: { count: 0, examples: [] },
    SESSION: { count: 0, examples: [] },
    TEMPORARY: { count: 0, examples: [] },
    UNKNOWN: { count: 0, examples: [] },
    VALID_DOMAIN_SOURCE: { count: 0, examples: [] },
    VALID_PROJECT_SOURCE: { count: 0, examples: [] },
  };
}

function pickArgValue(argv: string[], key: string) {
  const pair = argv.find((value) => value.startsWith(`${key}=`));
  if (pair) return pair.slice(key.length + 1);
  const index = argv.indexOf(key);
  return index >= 0 ? argv[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
