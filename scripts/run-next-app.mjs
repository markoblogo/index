#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const separatorIndex = args.indexOf("--");

if (separatorIndex === -1) {
  fail("Usage: run-next-app.mjs --tenant <tenant> -- <next-command> [args...]");
}

const optionArgs = args.slice(0, separatorIndex);
const nextArgs = args.slice(separatorIndex + 1);
const tenant = readOption(optionArgs, "--tenant");

if (!tenant) {
  fail("Missing --tenant.");
}

if (nextArgs.length === 0) {
  fail("Missing Next.js command.");
}

const allowedTenants = new Set(["1d3x", "uga-ua", "spike-ua"]);

if (!allowedTenants.has(tenant)) {
  fail(`Unsupported tenant "${tenant}".`);
}

const child = spawn("npx", ["next", ...nextArgs, repoRoot], {
  cwd: repoRoot,
  env: {
    ...process.env,
    INDEX_TENANT: tenant,
    NEXT_PUBLIC_INDEX_TENANT: tenant,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function readOption(values, name) {
  const index = values.indexOf(name);

  if (index === -1) {
    return null;
  }

  return values[index + 1] ?? null;
}

function fail(message) {
  console.error(`[run-next-app] ${message}`);
  process.exit(1);
}
