import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function getArgValue(name) {
  const exact = args.find((arg) => arg.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);

  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];

  return null;
}

const project = getArgValue("project");
const profile = getArgValue("profile") ?? project;
const dryRun = args.includes("--dry-run");

if (!project) {
  console.error("[deploy-profile] Missing --project <name>.");
  process.exit(1);
}

const profileRules = {
  "1d3x": [
    "public/files/spike-spot-index-global-partner-deck-2026.pdf",
    "public/files/spike-spot-index-respondents-presentation.pdf",
    "public/files/spike-respondent-onboarding-uk.png",
    "public/files/spike-index-methodology.pdf",
    "public/files/spike-index-methodology-uk.pdf",
    "public/files/spike-index-methodology-en.pdf",
    "public/files/uga-index-market-intelligence.pdf",
    "public/files/uga-index-methodology.pdf",
    "public/files/spot-market-handbook-ua.pdf",
    "public/files/spot-market-handbook-en.pdf",
    "public/files/spot-market-handbook-ua.epub",
    "public/files/spot-market-handbook-en.epub",
    "public/files/spot-market-handbook-cover-ua.png",
    "public/files/spot-market-handbook-cover-en.jpg",
  ],
  "uga-index": [
    "public/files/spike-spot-index-global-partner-deck-2026.pdf",
    "public/files/spike-spot-index-respondents-presentation.pdf",
    "public/files/spike-respondent-onboarding-uk.png",
    "public/files/spike-index-methodology.pdf",
    "public/files/spike-index-methodology-uk.pdf",
    "public/files/spike-index-methodology-en.pdf",
    "public/files/1D3X_Local_Commodity_Index_Partner_Program.pdf",
    "public/brand/operational-model.png",
    "public/brand/repeatable-playbook.png",
  ],
  "spike-ua-index": [
    "public/files/1D3X_Local_Commodity_Index_Partner_Program.pdf",
    "public/files/uga-index-market-intelligence.pdf",
    "public/files/uga-index-methodology.pdf",
    "public/brand/operational-model.png",
    "public/brand/repeatable-playbook.png",
    "public/brand/uga-logo.png",
    "public/brand/uga-logo-header.png",
  ],
};

const rules = profileRules[profile] ?? [];

function bytesToMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function existingFileSize(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return 0;
  return fs.statSync(absolutePath).size;
}

function describeRules() {
  const files = rules
    .map((file) => ({
      file,
      size: existingFileSize(file),
    }))
    .filter((entry) => entry.size > 0);

  const total = files.reduce((sum, entry) => sum + entry.size, 0);

  console.log(`[deploy-profile] project=${project}`);
  console.log(`[deploy-profile] profile=${profile}`);
  console.log(`[deploy-profile] matched files=${files.length}`);
  console.log(`[deploy-profile] estimated skipped payload=${bytesToMb(total)}`);

  if (files.length) {
    for (const entry of files) {
      console.log(`- ${entry.file} (${bytesToMb(entry.size)})`);
    }
  } else {
    console.log("[deploy-profile] no extra ignore rules matched existing files.");
  }
}

function appendRules(baseContent) {
  if (!rules.length) return baseContent;
  const suffix = `\n# auto-generated deploy profile: ${profile}\n${rules.join("\n")}\n`;
  return `${baseContent.replace(/\s*$/, "")}${suffix}`;
}

if (dryRun) {
  describeRules();
  process.exit(0);
}

const vercelIgnorePath = path.join(repoRoot, ".vercelignore");
const original = fs.existsSync(vercelIgnorePath)
  ? fs.readFileSync(vercelIgnorePath, "utf8")
  : "";

describeRules();

try {
  fs.writeFileSync(vercelIgnorePath, appendRules(original), "utf8");
  execFileSync(
    "npx",
    ["vercel", "--prod", "--yes", "--scope", "abvcreative", "--project", project],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
} finally {
  fs.writeFileSync(vercelIgnorePath, original, "utf8");
}
