import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import {
  buildCortexEcosystemEvidenceContextPack,
  CORTEX_ECOSYSTEM_SOURCE_REGISTRY,
  persistCortexEcosystemEvidenceEvent,
  type CortexEcosystemEvidenceInput,
  type CortexEcosystemProject,
} from "@/lib/cortex-ecosystem-evidence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const projects = parseProjects(url.searchParams.get("projects"));
  if (projects === null) return NextResponse.json({ error: "projects is invalid" }, { status: 400 });
  const tenantId = url.searchParams.get("tenantId")?.trim() || "ecosystem";
  const includeProtected = url.searchParams.get("includeProtected") === "1";
  const contextPack = await buildCortexEcosystemEvidenceContextPack({ includeProtected, projects, tenantId });
  return NextResponse.json({
    contextPack,
    registry: CORTEX_ECOSYSTEM_SOURCE_REGISTRY.map((source) => ({
      cadence: source.cadence,
      description: source.description,
      id: source.id,
      maxAgeHours: source.maxAgeHours,
      project: source.project,
      supportedTypes: source.supportedTypes,
      visibility: source.visibility,
    })),
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const event = await persistCortexEcosystemEvidenceEvent(payload as CortexEcosystemEvidenceInput);
    return NextResponse.json({ event, status: event ? "recorded" : "database_unavailable" }, { status: event ? 201 : 503 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid evidence event" }, { status: 400 });
  }
}

function isAuthorized(request: Request) {
  return isBearerTokenAuthorized(request, [process.env.CORTEX_INTERNAL_API_SECRET, process.env.CRON_SECRET]);
}

function parseProjects(value: string | null): CortexEcosystemProject[] | null | undefined {
  if (!value) return undefined;
  const projects = value.split(",").map((item) => item.trim()).filter(Boolean);
  return projects.every((project) => project === "index" || project === "mediahub" || project === "mn7r" || project === "cropto" || project === "ecosystem")
    ? projects as CortexEcosystemProject[]
    : null;
}
