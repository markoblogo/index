import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MANIFEST_PATH = ".cortex/chunk-manifest.runtime.json";

export function validateCortexArtifactForPublish(manifest, options = {}) {
  const requiredProjects = options.requiredProjects ?? ["index", "mn7r", "cropto"];
  const minChunks = options.minChunks ?? 100;
  const errors = [];
  if (manifest?.product !== "1D3X Cortex") errors.push("unexpected product");
  if (manifest?.schemaVersion !== 1) errors.push("unsupported schema version");
  if (!Array.isArray(manifest?.chunks)) errors.push("chunks are missing");
  if (!manifest?.totals || typeof manifest.totals.chunks !== "number") {
    errors.push("manifest totals are missing");
  } else if (manifest.totals.chunks < minChunks) {
    errors.push(`manifest has ${manifest.totals.chunks} chunks; minimum is ${minChunks}`);
  }

  const owners = new Set((manifest?.chunks ?? []).map((chunk) => chunk.ownerProject));
  for (const project of requiredProjects) {
    if (!owners.has(project)) errors.push(`required project is missing: ${project}`);
  }
  return errors;
}

export function parseCortexArtifactPublishArgs(argv = process.argv.slice(2)) {
  const manifestIndex = argv.indexOf("--manifest");
  const manifestPath = manifestIndex >= 0 ? argv[manifestIndex + 1] : DEFAULT_MANIFEST_PATH;
  if (!manifestPath || manifestPath.startsWith("--")) throw new Error("--manifest requires a value");
  return { manifestPath };
}

async function main() {
  const { manifestPath } = parseCortexArtifactPublishArgs();
  const uploadUrl = String(process.env.CORTEX_ARTIFACT_UPLOAD_URL || "").trim();
  const token = String(process.env.CORTEX_ARTIFACT_UPLOAD_TOKEN || "").trim();
  if (!uploadUrl) throw new Error("CORTEX_ARTIFACT_UPLOAD_URL is required");
  if (!token) throw new Error("CORTEX_ARTIFACT_UPLOAD_TOKEN is required");

  let parsedUrl;
  try {
    parsedUrl = new URL(uploadUrl);
  } catch {
    throw new Error("CORTEX_ARTIFACT_UPLOAD_URL must be a valid URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("CORTEX_ARTIFACT_UPLOAD_URL must use http or https");
  }

  const absoluteManifestPath = path.resolve(manifestPath);
  const body = await readFile(absoluteManifestPath);
  const manifest = JSON.parse(body);
  const errors = validateCortexArtifactForPublish(manifest);
  if (errors.length > 0) throw new Error(`artifact validation failed: ${errors.join(", ")}`);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  });
  if (!response.ok) throw new Error(`artifact upload returned HTTP ${response.status}`);
  console.log(`Cortex artifact published: ${uploadUrl}`);
  console.log(`manifest=${absoluteManifestPath} chunks=${manifest.totals.chunks}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[cortex-artifact-publish] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
