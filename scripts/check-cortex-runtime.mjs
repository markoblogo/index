import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HEALTH_URL = "https://1d3x.com/api/internal/cortex/health";

export function validateCortexRuntimePayload(payload) {
  const errors = [];
  if (payload?.ok !== true) errors.push("runtime is not ready");
  if (payload?.product !== "1D3X Cortex") errors.push("unexpected product");
  if (payload?.service !== "cortex-runtime") errors.push("unexpected service");
  if (payload?.mode !== "observe-learn") errors.push("unexpected lifecycle mode");
  if (payload?.assistantProvider !== "configured") errors.push("assistant provider is not configured");
  if (!payload?.manifest || typeof payload.manifest.generatedAt !== "string") {
    errors.push("runtime manifest metadata is missing");
  }
  if (!payload?.manifest?.totals || typeof payload.manifest.totals.chunks !== "number") {
    errors.push("runtime manifest totals are missing");
  }
  return errors;
}

export function parseCortexRuntimeArgs(argv = process.argv.slice(2)) {
  const urlIndex = argv.indexOf("--url");
  const url = urlIndex >= 0 ? argv[urlIndex + 1] : DEFAULT_HEALTH_URL;
  if (!url || url.startsWith("--")) throw new Error("--url requires a value");
  return { url };
}

async function main() {
  const { url } = parseCortexRuntimeArgs();
  const token = String(process.env.CORTEX_INTERNAL_API_SECRET || "").trim();
  if (!token) throw new Error("CORTEX_INTERNAL_API_SECRET is required");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Cortex health returned HTTP ${response.status}`);
    const errors = validateCortexRuntimePayload(payload);
    if (errors.length > 0) throw new Error(`Cortex readiness failed: ${errors.join(", ")}`);
    console.log(`Cortex runtime ready: ${url}`);
    console.log(`manifest generated=${payload.manifest.generatedAt} chunks=${payload.manifest.totals.chunks}`);
  } finally {
    clearTimeout(timeout);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[cortex-runtime] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
