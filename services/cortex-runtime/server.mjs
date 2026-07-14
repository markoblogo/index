import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";

const DEFAULT_DATA_DIR = "/data";
const DEFAULT_MANIFEST_NAME = "chunk-manifest.runtime.json";
const DEFAULT_MIN_CHUNKS = 100;
const DEFAULT_MAX_BYTES = 60 * 1024 * 1024;

export function validateRuntimeManifest(manifest, options = {}) {
  const requiredProjects = options.requiredProjects ?? ["index", "mn7r", "cropto"];
  const minChunks = options.minChunks ?? DEFAULT_MIN_CHUNKS;
  const errors = [];
  if (manifest?.product !== "1D3X Cortex") errors.push("unexpected product");
  if (manifest?.schemaVersion !== 1) errors.push("unsupported schema version");
  if (!Array.isArray(manifest?.chunks)) errors.push("chunks are missing");
  if (!manifest?.totals || typeof manifest.totals.chunks !== "number") {
    errors.push("manifest totals are missing");
  } else if (manifest.totals.chunks < minChunks) {
    errors.push(`manifest has ${manifest.totals.chunks} chunks; minimum is ${minChunks}`);
  } else if (Array.isArray(manifest.chunks) && manifest.totals.chunks !== manifest.chunks.length) {
    errors.push("manifest chunk total does not match chunks array");
  }
  const owners = new Set((manifest?.chunks ?? []).map((chunk) => chunk.ownerProject));
  for (const project of requiredProjects) {
    if (!owners.has(project)) errors.push(`required project is missing: ${project}`);
  }
  return errors;
}

export function manifestMetadata(manifest) {
  return {
    generatedAt: manifest?.generatedAt ?? null,
    sourceScope: manifest?.sourceScope ?? null,
    totals: manifest?.totals ?? null,
  };
}

export function createCortexRuntimeServer(options = {}) {
  const dataDir = options.dataDir ?? process.env.CORTEX_RUNTIME_DATA_DIR ?? DEFAULT_DATA_DIR;
  const manifestPath = path.join(
    dataDir,
    options.manifestName ?? process.env.CORTEX_RUNTIME_MANIFEST_NAME ?? DEFAULT_MANIFEST_NAME,
  );
  const token = options.token ?? String(process.env.CORTEX_RUNTIME_TOKEN ?? "").trim();
  const minChunks = options.minChunks ?? Number.parseInt(process.env.CORTEX_RUNTIME_MIN_CHUNKS ?? `${DEFAULT_MIN_CHUNKS}`, 10);
  const maxBytes = options.maxBytes ?? Number.parseInt(process.env.CORTEX_RUNTIME_MAX_BYTES ?? `${DEFAULT_MAX_BYTES}`, 10);

  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, { dataDir, manifestPath, maxBytes, minChunks, token });
    } catch (error) {
      console.error(`[cortex-runtime] ${error instanceof Error ? error.message : String(error)}`);
      sendJson(response, 500, { error: "Cortex runtime request failed" });
    }
  });
}

async function handleRequest(request, response, options) {
  const url = new URL(request.url ?? "/", "http://cortex-runtime.local");
  if (url.pathname === "/health" && request.method === "GET") {
    const manifest = await readManifest(options.manifestPath);
    sendJson(response, 200, {
      artifact: manifest ? manifestMetadata(manifest) : null,
      artifactReady: Boolean(manifest),
      ok: true,
      product: "1D3X Cortex",
      service: "cortex-runtime",
    });
    return;
  }

  if (url.pathname !== "/manifest") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  if (!authorized(request, options.token)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  if (request.method === "GET") {
    const manifest = await readManifest(options.manifestPath);
    if (!manifest) {
      sendJson(response, 503, { error: "Cortex runtime manifest is not available" });
      return;
    }
    sendJson(response, 200, manifest);
    return;
  }

  if (request.method === "PUT") {
    let manifest;
    try {
      const body = await readRequestBody(request, options.maxBytes);
      const decoded = decodeBody(body, request.headers["content-encoding"]);
      if (Buffer.byteLength(decoded, "utf8") > options.maxBytes) {
        sendJson(response, 413, { error: "Cortex runtime upload is too large" });
        return;
      }
      manifest = JSON.parse(decoded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON upload";
      const status = message.includes("too large") ? 413 : 400;
      sendJson(response, status, { error: status === 413 ? message : "Invalid Cortex runtime manifest JSON" });
      return;
    }
    const errors = validateRuntimeManifest(manifest, { minChunks: options.minChunks });
    if (errors.length > 0) {
      sendJson(response, 422, { error: "Invalid Cortex runtime manifest", details: errors });
      return;
    }
    await persistManifest(options.manifestPath, JSON.stringify(manifest));
    sendJson(response, 201, { manifest: manifestMetadata(manifest), ok: true, product: "1D3X Cortex" });
    return;
  }

  response.setHeader("Allow", "GET, PUT");
  sendJson(response, 405, { error: "Method not allowed" });
}

function authorized(request, token) {
  if (!token) return false;
  const provided = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice("Bearer ".length).trim()
    : "";
  const expected = Buffer.from(token);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function readRequestBody(request, maxBytes) {
  const contentLength = Number.parseInt(request.headers["content-length"] ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Cortex runtime upload is too large");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Cortex runtime upload is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function decodeBody(body, contentEncoding) {
  return contentEncoding?.toLowerCase() === "gzip"
    ? gunzipSync(body).toString("utf8")
    : body.toString("utf8");
}

async function readManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

async function persistManifest(manifestPath, serializedManifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${serializedManifest}\n`, "utf8");
  await rename(tempPath, manifestPath);
}

function sendJson(response, statusCode, body) {
  const serialized = JSON.stringify(body);
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(serialized);
}

async function main() {
  const server = createCortexRuntimeServer();
  const port = Number.parseInt(process.env.PORT ?? "8080", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`[cortex-runtime] listening on ${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[cortex-runtime] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

export { DEFAULT_DATA_DIR, DEFAULT_MANIFEST_NAME, DEFAULT_MAX_BYTES };
