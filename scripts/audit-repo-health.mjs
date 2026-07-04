import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_LIMITS = {
  maxPublicAssetMb: 15,
  maxPublicMb: 35,
  maxSourceFileLines: 3000,
  minTests: 35,
};

export function collectRepoHealth(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const publicTop = topFiles(repoRoot, "public", 12);
  const sourceTop = getLargestSourceFiles(repoRoot, 12);
  const gitStatus = parseGitStatus(repoRoot);
  const apiRoutes = countFiles(repoRoot, "src/app/api", ["route.ts"]);
  const tests = countFiles(repoRoot, "src", [".test.ts", ".test.tsx", ".test.mjs"]);
  const publicBytes = getDirectoryBytes(repoRoot, "public");

  return {
    gitStatus,
    publicTop,
    sourceTop,
    summary: {
      apiRoutes,
      componentFiles: countAllFiles(repoRoot, "src/components"),
      libFiles: countAllFiles(repoRoot, "src/lib"),
      publicBytes,
      tests,
      tsFiles: countFiles(repoRoot, "src", [".ts", ".tsx"]),
    },
  };
}

export function evaluateRepoHealth(health, limits = {}) {
  const resolved = { ...DEFAULT_LIMITS, ...limits };
  const failures = [];
  const warnings = [];
  const publicMb = health.summary.publicBytes / 1024 / 1024;
  const largestAsset = health.publicTop[0];
  const largestSource = health.sourceTop[0];

  if (publicMb > resolved.maxPublicMb) {
    failures.push(`public/ is ${publicMb.toFixed(1)} MB; limit is ${resolved.maxPublicMb} MB`);
  }
  if (largestAsset && largestAsset.size > resolved.maxPublicAssetMb * 1024 * 1024) {
    failures.push(`${largestAsset.file} is ${bytesToMb(largestAsset.size)}; per-asset limit is ${resolved.maxPublicAssetMb} MB`);
  }
  if (largestSource && largestSource.lines > resolved.maxSourceFileLines) {
    failures.push(`${largestSource.file} has ${largestSource.lines} lines; limit is ${resolved.maxSourceFileLines}`);
  }
  if (health.summary.tests < resolved.minTests) {
    failures.push(`test count is ${health.summary.tests}; minimum is ${resolved.minTests}`);
  }
  if (health.summary.apiRoutes > 0 && health.summary.tests / health.summary.apiRoutes < 0.35) {
    warnings.push(`test/API route ratio is ${(health.summary.tests / health.summary.apiRoutes).toFixed(2)}; add focused route/workflow tests as API surface grows`);
  }

  return {
    failures,
    limits: resolved,
    ok: failures.length === 0,
    warnings,
  };
}

export function renderRepoHealthReport(health, evaluation) {
  const lines = [
    "# Repo Health Audit",
    "",
    "## Summary",
    `- TS/TSX files: ${health.summary.tsFiles}`,
    `- src/lib files: ${health.summary.libFiles}`,
    `- src/components files: ${health.summary.componentFiles}`,
    `- API routes: ${health.summary.apiRoutes}`,
    `- tests: ${health.summary.tests}`,
    `- public/ size: ${bytesToMb(health.summary.publicBytes)}`,
    "",
    "## Health gates",
    `- public/ limit: ${evaluation.limits.maxPublicMb} MB`,
    `- public asset limit: ${evaluation.limits.maxPublicAssetMb} MB`,
    `- source file line limit: ${evaluation.limits.maxSourceFileLines}`,
    `- minimum tests: ${evaluation.limits.minTests}`,
    `- status: ${evaluation.ok ? "passed" : "failed"}`,
  ];

  if (evaluation.failures.length) {
    lines.push("", "## Failures", ...evaluation.failures.map((item) => `- ${item}`));
  }
  if (evaluation.warnings.length) {
    lines.push("", "## Warnings", ...evaluation.warnings.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    "## Largest public assets",
    ...health.publicTop.map((item) => `- ${item.file} — ${bytesToMb(item.size)}`),
    "",
    "## Largest source files",
    ...health.sourceTop.map((item) => `- ${item.file} — ${item.lines} lines`),
    "",
    "## Current git worktree changes",
  );

  if (health.gitStatus.length) {
    lines.push(...health.gitStatus.map((item) => `- ${item.code} ${item.file}`));
  } else {
    lines.push("- clean");
  }

  return lines.join("\n");
}

export function getAuditLimitsFromEnv(env = process.env) {
  return {
    maxPublicAssetMb: readPositiveNumber(env.REPO_AUDIT_MAX_PUBLIC_ASSET_MB, DEFAULT_LIMITS.maxPublicAssetMb),
    maxPublicMb: readPositiveNumber(env.REPO_AUDIT_MAX_PUBLIC_MB, DEFAULT_LIMITS.maxPublicMb),
    maxSourceFileLines: readPositiveNumber(env.REPO_AUDIT_MAX_SOURCE_FILE_LINES, DEFAULT_LIMITS.maxSourceFileLines),
    minTests: readPositiveNumber(env.REPO_AUDIT_MIN_TESTS, DEFAULT_LIMITS.minTests),
  };
}

function topFiles(repoRoot, dir, limit = 10) {
  return walk(repoRoot, dir)
    .map((file) => ({
      file: path.relative(repoRoot, file),
      size: fs.statSync(file).size,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}

function countFiles(repoRoot, dir, suffixes) {
  return walk(repoRoot, dir, (file) => suffixes.some((suffix) => file.endsWith(suffix))).length;
}

function countAllFiles(repoRoot, dir) {
  return walk(repoRoot, dir).length;
}

function getLargestSourceFiles(repoRoot, limit = 15) {
  return walk(repoRoot, "src", (file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .map((file) => ({
      file: path.relative(repoRoot, file),
      lines: fs.readFileSync(file, "utf8").split("\n").length,
    }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, limit);
}

function parseGitStatus(repoRoot) {
  return safeShRaw(repoRoot, "git status --porcelain")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{2})\s+(.*)$/);
      if (!match) return { code: "??", file: line };
      return { code: match[1], file: match[2] };
    });
}

function getDirectoryBytes(repoRoot, dir) {
  return walk(repoRoot, dir).reduce((total, file) => total + fs.statSync(file).size, 0);
}

function walk(repoRoot, dir, predicate) {
  const root = path.join(repoRoot, dir);
  if (!fs.existsSync(root)) return [];
  const output = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(next);
        continue;
      }
      if (!predicate || predicate(next)) output.push(next);
    }
  }

  visit(root);
  return output;
}

function safeShRaw(cwd, command) {
  try {
    return execSync(command, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function bytesToMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function main() {
  const health = collectRepoHealth();
  const evaluation = evaluateRepoHealth(health, getAuditLimitsFromEnv());
  console.log(renderRepoHealthReport(health, evaluation));
  if (!evaluation.ok) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || path.join(os.tmpdir(), "unknown")).href) {
  main();
}
