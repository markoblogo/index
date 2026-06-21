import { NextResponse } from "next/server";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  ingestMediaHubFileMaterial,
  ingestMediaHubLinkMaterial,
  listRecentMediaHubManualMaterials,
  type MediaHubManualMaterialKind,
  type MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireDemoRole("admin");
  const url = new URL(request.url);
  const tenantId = normalizeTenant(url.searchParams.get("tenantId"));
  const materials = await listRecentMediaHubManualMaterials(tenantId);
  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  await requireDemoRole("admin");
  const formData = await request.formData();
  const tenantId = normalizeTenant(String(formData.get("tenantId") ?? ""));
  const kind = normalizeKind(String(formData.get("kind") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");
  const results = [];

  if (url) {
    results.push(await ingestMediaHubLinkMaterial({
      kind,
      receivedFrom: "admin",
      sourceType: "admin_link",
      tenantId,
      url,
    }));
  }

  if (file instanceof File && file.size > 0) {
    results.push(await ingestMediaHubFileMaterial({
      bytes: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      kind,
      mimeType: file.type || "application/octet-stream",
      receivedFrom: "admin",
      sourceType: "admin_upload",
      tenantId,
    }));
  }

  return NextResponse.json({ results });
}

function normalizeTenant(value: string | null): MediaHubManualMaterialTenant {
  return value === "1d3x" ? "1d3x" : "spike-ua";
}

function normalizeKind(value: string): MediaHubManualMaterialKind {
  if (value === "daily_material" || value === "monthly_material" || value === "source_candidate") {
    return value;
  }
  return "weekly_material";
}
