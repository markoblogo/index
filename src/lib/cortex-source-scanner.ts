import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { COMMODITY_INTELLIGENCE_PRODUCT_NAME, type CortexVisibility } from "@/lib/commodity-intelligence-layer";

export type CortexScannedSourceKind =
  | "action-event"
  | "archive"
  | "code"
  | "development-plan"
  | "manual-book"
  | "repo-doc"
  | "site-content";

export type CortexScanRoot = {
  ownerProject: "index" | "mn7r" | "cropto" | "1d3x" | "ecosystem";
  rootPath: string;
  rootId: string;
  visibility: CortexVisibility;
};

export type CortexSourceManifestEntry = {
  evidenceId: string;
  extractedAt: string;
  hash: string;
  ownerProject: CortexScanRoot["ownerProject"];
  relativePath: string;
  rootId: string;
  sizeBytes: number;
  sourceId: string;
  sourceKind: CortexScannedSourceKind;
  title: string;
  urlOrPath: string;
  visibility: CortexVisibility;
};

export type CortexSourceManifest = {
  generatedAt: string;
  product: typeof COMMODITY_INTELLIGENCE_PRODUCT_NAME;
  roots: Array<Omit<CortexScanRoot, "rootPath"> & { rootPath: string }>;
  schemaVersion: 1;
  sources: CortexSourceManifestEntry[];
  totals: {
    byKind: Record<CortexScannedSourceKind, number>;
    byProject: Record<CortexScanRoot["ownerProject"], number>;
    files: number;
    sizeBytes: number;
  };
};

const IGNORED_DIRS = new Set([
  ".cortex",
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
  "tmp",
]);

const SECRET_FILE_PATTERNS = [
  /^\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /secret/i,
  /credentials/i,
];

const SCANNED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".pdf",
  ".png",
  ".prisma",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export async function buildCortexSourceManifest(input: {
  generatedAt?: string;
  roots: CortexScanRoot[];
}): Promise<CortexSourceManifest> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sources = (
    await Promise.all(input.roots.map((root) => scanRoot(root, generatedAt)))
  ).flat();

  sources.sort((left, right) =>
    `${left.ownerProject}:${left.relativePath}`.localeCompare(`${right.ownerProject}:${right.relativePath}`),
  );

  return {
    generatedAt,
    product: COMMODITY_INTELLIGENCE_PRODUCT_NAME,
    roots: input.roots.map((root) => ({
      ownerProject: root.ownerProject,
      rootId: root.rootId,
      rootPath: path.resolve(root.rootPath),
      visibility: root.visibility,
    })),
    schemaVersion: 1,
    sources,
    totals: summarizeSources(sources),
  };
}

async function scanRoot(root: CortexScanRoot, extractedAt: string) {
  const absoluteRoot = path.resolve(root.rootPath);
  const files = await listFiles(absoluteRoot);

  return Promise.all(
    files.map(async (filePath): Promise<CortexSourceManifestEntry> => {
      const relativePath = toPosixPath(path.relative(absoluteRoot, filePath));
      const bytes = await readFile(filePath);
      const sourceKind = classifySource(relativePath);
      const hash = createHash("sha256").update(bytes).digest("hex");

      return {
        evidenceId: `cortex:source-scan:${root.rootId}:${hash.slice(0, 16)}`,
        extractedAt,
        hash,
        ownerProject: root.ownerProject,
        relativePath,
        rootId: root.rootId,
        sizeBytes: bytes.byteLength,
        sourceId: sourceIdForKind(sourceKind),
        sourceKind,
        title: path.basename(relativePath),
        urlOrPath: `${root.rootId}:${relativePath}`,
        visibility: root.visibility,
      };
    }),
  );
}

async function listFiles(root: string): Promise<string[]> {
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    return shouldScanFile(root) ? [root] : [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...await listFiles(nextPath));
      }
      continue;
    }

    if (entry.isFile() && shouldScanFile(nextPath)) {
      files.push(nextPath);
    }
  }

  return files;
}

function shouldScanFile(filePath: string) {
  const basename = path.basename(filePath);
  if (SECRET_FILE_PATTERNS.some((pattern) => pattern.test(basename))) {
    return false;
  }
  return SCANNED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function classifySource(relativePath: string): CortexScannedSourceKind {
  const normalized = toPosixPath(relativePath);
  const lower = normalized.toLowerCase();

  if (lower.includes("audit") || lower.includes("event") || lower.includes("action")) {
    return "action-event";
  }
  if (lower.includes("archive") || lower.includes("history") || lower.includes("report")) {
    return "archive";
  }
  if (
    lower.includes("roadmap") ||
    lower.includes("todo") ||
    lower.includes("implementation-plan") ||
    lower.includes("release") ||
    lower.includes("/adr/") ||
    lower.includes("product-status") ||
    lower.includes("revival")
  ) {
    return "development-plan";
  }
  if (
    lower.includes("manual") ||
    lower.includes("guide") ||
    lower.includes("book") ||
    lower.endsWith(".pdf")
  ) {
    return "manual-book";
  }
  if (
    lower.startsWith("src/app/") ||
    lower.startsWith("app/") ||
    lower.startsWith("pages/") ||
    lower.includes("/blog/") ||
    lower.includes("site")
  ) {
    return "site-content";
  }
  if (/\.(ts|tsx|js|mjs|cjs|prisma|sql)$/i.test(lower) || lower.startsWith("scripts/")) {
    return "code";
  }
  return "repo-doc";
}

function sourceIdForKind(kind: CortexScannedSourceKind) {
  const sourceIds: Record<CortexScannedSourceKind, string> = {
    "action-event": "ecosystem-action-events",
    archive: "ecosystem-content-archives",
    code: "ecosystem-code-snapshots",
    "development-plan": "ecosystem-development-plans",
    "manual-book": "ecosystem-manuals-books",
    "repo-doc": "index-docs",
    "site-content": "ecosystem-site-content",
  };
  return sourceIds[kind];
}

function summarizeSources(sources: CortexSourceManifestEntry[]): CortexSourceManifest["totals"] {
  const byKind = emptyKindTotals();
  const byProject: CortexSourceManifest["totals"]["byProject"] = {
    "1d3x": 0,
    cropto: 0,
    ecosystem: 0,
    index: 0,
    mn7r: 0,
  };

  let sizeBytes = 0;
  for (const source of sources) {
    byKind[source.sourceKind] += 1;
    byProject[source.ownerProject] += 1;
    sizeBytes += source.sizeBytes;
  }

  return {
    byKind,
    byProject,
    files: sources.length,
    sizeBytes,
  };
}

function emptyKindTotals(): Record<CortexScannedSourceKind, number> {
  return {
    "action-event": 0,
    archive: 0,
    code: 0,
    "development-plan": 0,
    "manual-book": 0,
    "repo-doc": 0,
    "site-content": 0,
  };
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}
