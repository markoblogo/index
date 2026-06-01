#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const stagingUrl = process.env.STAGING_DATABASE_URL;
const sourceUrl = process.env.SOURCE_DATABASE_URL;
const resetStaging = process.env.RESET_STAGING_DATABASE === "1";
const allowNonStagingTarget = process.env.ALLOW_NON_STAGING_TARGET === "1";
const reportPath = process.env.MIGRATION_VALIDATION_REPORT;

const integrityChecks = [
  {
    name: "RespondentEmailDelivery respondent tenant/index ownership",
    sql: `
      SELECT red."id"
      FROM "RespondentEmailDelivery" red
      JOIN "Respondent" r ON r."id" = red."respondentId"
      WHERE red."tenantId" <> r."tenantId"
         OR red."indexProductId" <> r."indexProductId"
    `,
  },
  {
    name: "RespondentSurveyToken respondent tenant/index ownership",
    sql: `
      SELECT rst."id"
      FROM "RespondentSurveyToken" rst
      JOIN "Respondent" r ON r."id" = rst."respondentId"
      WHERE rst."tenantId" <> r."tenantId"
         OR rst."indexProductId" <> r."indexProductId"
    `,
  },
  {
    name: "PriceSubmission respondent tenant/index ownership",
    sql: `
      SELECT ps."id"
      FROM "PriceSubmission" ps
      JOIN "Respondent" r ON r."id" = ps."respondentId"
      WHERE ps."tenantId" <> r."tenantId"
         OR ps."indexProductId" <> r."indexProductId"
    `,
  },
  {
    name: "PriceSubmission commodity tenant/index ownership",
    sql: `
      SELECT ps."id"
      FROM "PriceSubmission" ps
      JOIN "Commodity" c ON c."id" = ps."commodityId"
      WHERE ps."tenantId" <> c."tenantId"
         OR ps."indexProductId" <> c."indexProductId"
    `,
  },
  {
    name: "PriceSubmission delivery basis tenant/index ownership",
    sql: `
      SELECT ps."id"
      FROM "PriceSubmission" ps
      JOIN "DeliveryBasis" db ON db."id" = ps."deliveryBasisId"
      WHERE ps."tenantId" <> db."tenantId"
         OR ps."indexProductId" <> db."indexProductId"
    `,
  },
  {
    name: "User respondent tenant/index ownership",
    sql: `
      SELECT u."id"
      FROM "User" u
      JOIN "Respondent" r ON r."id" = u."respondentId"
      WHERE u."respondentId" IS NOT NULL
        AND (u."tenantId" <> r."tenantId"
          OR u."indexProductId" <> r."indexProductId")
    `,
  },
  {
    name: "PasswordSetupToken user tenant/index ownership",
    sql: `
      SELECT pst."id"
      FROM "PasswordSetupToken" pst
      JOIN "User" u ON u."id" = pst."userId"
      WHERE pst."userId" IS NOT NULL
        AND (pst."tenantId" <> u."tenantId"
          OR pst."indexProductId" <> u."indexProductId")
    `,
  },
  {
    name: "BasketRespondent basket/respondent tenant/index ownership",
    sql: `
      SELECT br."id"
      FROM "BasketRespondent" br
      JOIN "Basket" b ON b."id" = br."basketId"
      JOIN "Respondent" r ON r."id" = br."respondentId"
      WHERE b."tenantId" <> r."tenantId"
         OR b."indexProductId" <> r."indexProductId"
    `,
  },
];

if (!stagingUrl) {
  fail("STAGING_DATABASE_URL is required.");
}

const staging = parseDatabaseUrl("STAGING_DATABASE_URL", stagingUrl);
const source = sourceUrl ? parseDatabaseUrl("SOURCE_DATABASE_URL", sourceUrl) : null;

if (source && sameDatabase(source, staging)) {
  fail("SOURCE_DATABASE_URL and STAGING_DATABASE_URL point to the same database.");
}

if (!isClearlyNonProductionTarget(staging) && !allowNonStagingTarget) {
  fail(
    [
      "STAGING_DATABASE_URL does not look like a staging/copy/local database.",
      "Use a database name containing staging, stage, copy, test, dev or local,",
      "or set ALLOW_NON_STAGING_TARGET=1 after manually verifying the target.",
    ].join(" "),
  );
}

const startedAt = new Date();
const results = [];

if (source && resetStaging) {
  resetAndRestoreStaging({ sourceUrl, stagingUrl });
} else if (source) {
  console.log("SOURCE_DATABASE_URL provided, but RESET_STAGING_DATABASE is not 1. Skipping restore.");
}

run("npx", ["prisma", "migrate", "deploy"], {
  ...process.env,
  DATABASE_URL: stagingUrl,
});

run("npx", ["prisma", "validate"], {
  ...process.env,
  DATABASE_URL: stagingUrl,
});

for (const check of integrityChecks) {
  const count = Number(
    psqlScalar(
      stagingUrl,
      `SELECT COUNT(*)::int FROM (${check.sql}) AS integrity_check;`,
    ),
  );
  results.push({ count, name: check.name });
}

const failed = results.filter((item) => item.count > 0);
const finishedAt = new Date();
const report = {
  database: maskDatabaseTarget(staging),
  finishedAt: finishedAt.toISOString(),
  results,
  startedAt: startedAt.toISOString(),
  status: failed.length === 0 ? "passed" : "failed",
};

if (reportPath) {
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

for (const result of results) {
  console.log(`${result.count === 0 ? "PASS" : "FAIL"} ${result.name}: ${result.count}`);
}

if (failed.length > 0) {
  fail(`Staging migration integrity validation failed: ${failed.length} check(s) reported rows.`);
}

console.log("Staging migration validation passed.");

function resetAndRestoreStaging({ sourceUrl, stagingUrl }) {
  console.log("Resetting staging public schema before restore.");
  run("psql", [
    toPsqlUrl(stagingUrl),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    'DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";',
  ]);

  console.log("Restoring source dump into staging.");
  const shell = [
    "set -euo pipefail",
    `pg_dump --no-owner --no-acl --format=plain ${shellQuote(toPsqlUrl(sourceUrl))}`,
    `psql ${shellQuote(toPsqlUrl(stagingUrl))} -v ON_ERROR_STOP=1`,
  ].join(" | ");
  const result = spawnSync("bash", ["-lc", shell], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    fail("Failed to restore source dump into staging.");
  }
}

function psqlScalar(databaseUrl, sql) {
  const result = spawnSync(
    "psql",
    [toPsqlUrl(databaseUrl), "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    fail("psql integrity query failed.");
  }

  return result.stdout.trim();
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed.`);
  }
}

function parseDatabaseUrl(label, value) {
  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      fail(`${label} must be a PostgreSQL URL.`);
    }
    return parsed;
  } catch {
    fail(`${label} is not a valid URL.`);
  }
}

function sameDatabase(left, right) {
  return (
    left.hostname === right.hostname &&
    left.port === right.port &&
    left.pathname === right.pathname &&
    left.searchParams.get("schema") === right.searchParams.get("schema")
  );
}

function isClearlyNonProductionTarget(databaseUrl) {
  const database = databaseUrl.pathname.replace(/^\//, "").toLowerCase();
  return (
    ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ||
    /(staging|stage|copy|test|dev|local)/.test(database)
  );
}

function maskDatabaseTarget(databaseUrl) {
  return {
    database: databaseUrl.pathname.replace(/^\//, ""),
    host: databaseUrl.host,
    schema: databaseUrl.searchParams.get("schema") ?? "public",
    user: databaseUrl.username ? "<set>" : "<empty>",
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function toPsqlUrl(value) {
  const url = new URL(value);
  url.searchParams.delete("schema");
  return url.toString();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
