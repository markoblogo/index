import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CortexChunkManifest } from "@/lib/cortex-source-chunker";

export type CortexRuntimeChunkManifestResult =
  | { ok: true; value: CortexChunkManifest }
  | { error: string; ok: false };

export async function loadCortexRuntimeChunkManifest(): Promise<CortexRuntimeChunkManifestResult> {
  const manifestUrl = normalizeEnvString(process.env.CORTEX_CHUNK_MANIFEST_URL);
  if (manifestUrl) {
    return readRemoteChunkManifest(manifestUrl);
  }

  try {
    return {
      ok: true,
      value: JSON.parse(await readFile(/*turbopackIgnore: true*/ cortexChunkManifestPath(), "utf8")) as CortexChunkManifest,
    };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    return {
      error: code === "ENOENT"
        ? "Cortex chunk manifest is not available on this server"
        : "Failed to read Cortex chunk manifest",
      ok: false,
    };
  }
}

async function readRemoteChunkManifest(manifestUrl: string): Promise<CortexRuntimeChunkManifestResult> {
  try {
    const bearerToken = normalizeEnvString(process.env.CORTEX_CHUNK_MANIFEST_BEARER_TOKEN);
    const response = await fetch(manifestUrl, {
      cache: "no-store",
      headers: bearerToken ? { authorization: `Bearer ${bearerToken}` } : undefined,
    });
    if (!response.ok) {
      return { error: "Cortex chunk manifest URL is not available", ok: false };
    }
    return { ok: true, value: await response.json() as CortexChunkManifest };
  } catch {
    return { error: "Failed to fetch Cortex chunk manifest", ok: false };
  }
}

function cortexChunkManifestPath() {
  const configuredPath = normalizeEnvString(process.env.CORTEX_CHUNK_MANIFEST_PATH);
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configuredPath);
  }
  return path.join(process.cwd(), ".cortex", "chunk-manifest.json");
}

function normalizeEnvString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}
