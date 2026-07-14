import { NextResponse } from "next/server";
import { loadCortexRuntimeChunkManifest } from "@/lib/cortex-runtime-chunk-manifest";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isBearerTokenAuthorized(request, [
    process.env.CORTEX_INTERNAL_API_SECRET,
    process.env.CRON_SECRET,
  ])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manifest = await loadCortexRuntimeChunkManifest();
  const providerConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const ready = manifest.ok && providerConfigured;

  return NextResponse.json({
    assistantProvider: providerConfigured ? "configured" : "not_configured",
    manifest: manifest.ok
      ? {
          generatedAt: manifest.value.generatedAt,
          sourceScope: manifest.value.sourceScope,
          totals: manifest.value.totals,
        }
      : { error: manifest.error, status: "unavailable" },
    mode: "observe-learn",
    ok: ready,
    product: "1D3X Cortex",
    service: "cortex-runtime",
  }, {
    headers: { "Cache-Control": "no-store" },
    status: ready ? 200 : 503,
  });
}
