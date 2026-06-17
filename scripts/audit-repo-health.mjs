import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function sh(command) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function safeSh(command) {
  try {
    return sh(command);
  } catch {
    return "";
  }
}

function safeShRaw(command) {
  try {
    return execSync(command, {
      cwd: repoRoot,
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

function walk(dir, predicate) {
  const output = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(next);
        continue;
      }
      if (!predicate || predicate(next)) {
        output.push(next);
      }
    }
  }

  visit(path.join(repoRoot, dir));
  return output;
}

function topFiles(dir, limit = 10) {
  return walk(dir)
    .map((file) => ({
      file: path.relative(repoRoot, file),
      size: fs.statSync(file).size,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}

function countFiles(dir, extensions) {
  return walk(dir, (file) => extensions.some((extension) => file.endsWith(extension))).length;
}

function getLargestSourceFiles(limit = 15) {
  return walk("src", (file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .map((file) => {
      const lineCount = fs.readFileSync(file, "utf8").split("\n").length;
      return {
        file: path.relative(repoRoot, file),
        lines: lineCount,
      };
    })
    .sort((a, b) => b.lines - a.lines)
    .slice(0, limit);
}

function parseGitStatus() {
  return safeShRaw("git status --porcelain")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{2})\s+(.*)$/);
      if (!match) {
        return { code: "??", file: line };
      }
      return {
        code: match[1],
        file: match[2],
      };
    });
}

const publicTop = topFiles("public", 12);
const sourceTop = getLargestSourceFiles(12);
const gitStatus = parseGitStatus();

const summary = {
  tsFiles: countFiles("src", [".ts", ".tsx"]),
  libFiles: walk("src/lib", () => true).length,
  componentFiles: walk("src/components", () => true).length,
  apiRoutes: walk("src/app/api", (file) => file.endsWith("route.ts")).length,
  tests: countFiles("src", [".test.ts", ".test.tsx"]),
  publicBytes: safeSh("du -sk public | awk '{print $1}'"),
};

const lines = [
  "# Repo Health Audit",
  "",
  "## Summary",
  `- TS/TSX files: ${summary.tsFiles}`,
  `- src/lib files: ${summary.libFiles}`,
  `- src/components files: ${summary.componentFiles}`,
  `- API routes: ${summary.apiRoutes}`,
  `- tests: ${summary.tests}`,
  `- public/ size: ${summary.publicBytes ? `${(Number(summary.publicBytes) / 1024).toFixed(1)} MB` : "n/a"}`,
  "",
  "## Largest public assets",
  ...publicTop.map((item) => `- ${item.file} — ${bytesToMb(item.size)}`),
  "",
  "## Largest source files",
  ...sourceTop.map((item) => `- ${item.file} — ${item.lines} lines`),
  "",
  "## Current git worktree changes",
];

if (gitStatus.length) {
  lines.push(...gitStatus.map((item) => `- ${item.code} ${item.file}`));
} else {
  lines.push("- clean");
}

console.log(lines.join("\n"));
