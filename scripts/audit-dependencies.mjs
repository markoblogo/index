import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function reachesAllowedRoot(vulnerabilities, allowedRoots, name, seen = new Set()) {
  if (allowedRoots.has(name)) return true;
  if (seen.has(name)) return false;
  seen.add(name);
  return (vulnerabilities[name]?.effects ?? []).some((effect) =>
    reachesAllowedRoot(vulnerabilities, allowedRoots, effect, seen),
  );
}

export function findUnreviewed(vulnerabilities, policy, today) {
  const allowedRoots = new Set(Object.keys(policy.allowed_roots ?? {}));
  const unknown = [];
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (
      vulnerability.severity === "critical" ||
      !reachesAllowedRoot(vulnerabilities, allowedRoots, name)
    ) {
      unknown.push(`${name} (${vulnerability.severity})`);
    }
  }
  if (!policy.review_by || today > policy.review_by) {
    unknown.push(`dependency risk review expired on ${policy.review_by ?? "an unspecified date"}`);
  }
  return unknown;
}

function main() {
  const policy = JSON.parse(
    fs.readFileSync(new URL("../config/dependency-audit-allowlist.json", import.meta.url), "utf8"),
  );
  const audit = spawnSync(
    "npm",
    ["audit", "--omit=dev", "--package-lock-only", "--json"],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (!audit.stdout.trim()) {
    console.error(audit.stderr || "npm audit returned no JSON output");
    process.exit(1);
  }

  const report = JSON.parse(audit.stdout);
  const vulnerabilities = report.vulnerabilities ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const unknown = findUnreviewed(vulnerabilities, policy, today);
  const counts = report.metadata?.vulnerabilities ?? {};
  console.log(
    `Dependency audit: ${counts.total ?? 0} known advisories; ${Object.keys(vulnerabilities).length} packages; review by ${policy.review_by}.`,
  );

  if (unknown.length) {
    console.error("Unreviewed dependency risk:\n- " + unknown.join("\n- "));
    process.exit(1);
  }

  if (Object.keys(vulnerabilities).length) {
    console.log("All current advisory paths terminate at reviewed upstream roots.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
