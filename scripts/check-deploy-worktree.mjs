import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

if (process.env.ALLOW_DIRTY_DEPLOY === "1") {
  console.log("[deploy-guard] ALLOW_DIRTY_DEPLOY=1, skipping worktree check.");
  process.exit(0);
}

function sh(command) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function loadVercelIgnoreRules() {
  const file = path.join(repoRoot, ".vercelignore");
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function isIgnoredByPrefix(file, rules) {
  return rules.some((rule) => {
    if (rule.includes("*")) return false;
    return file === rule || file.startsWith(`${rule}/`);
  });
}

const sensitiveRoots = [
  "src/",
  "prisma/",
  "public/",
  "scripts/",
  "package.json",
  "next.config.ts",
  "vercel.json",
  ".vercelignore",
];

const rules = loadVercelIgnoreRules();
const rawStatus = sh("git status --porcelain");
const problems = rawStatus
  .split("\n")
  .map((line) => line.trimEnd())
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^(.{2})\s+(.*)$/);
    return match ? match[2] : line;
  })
  .filter((file) => sensitiveRoots.some((root) => file === root || file.startsWith(root)))
  .filter((file) => !isIgnoredByPrefix(file, rules));

if (problems.length === 0) {
  console.log("[deploy-guard] Worktree is safe for deploy.");
  process.exit(0);
}

console.error("[deploy-guard] Refusing deploy from a dirty worktree.");
console.error("[deploy-guard] Commit, stash, or explicitly ignore these paths first:");
for (const file of problems) {
  console.error(`- ${file}`);
}
console.error("[deploy-guard] Override only if intentional: ALLOW_DIRTY_DEPLOY=1");
process.exit(1);
