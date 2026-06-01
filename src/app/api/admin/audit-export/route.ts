import { NextResponse } from "next/server";
import { auditRowsToCsv, getAuditExportRows } from "@/lib/audit-export";
import { requireDemoRole } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireDemoRole("admin");

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const rows = await getAuditExportRows({
    action: url.searchParams.get("action") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 500),
  });

  if (format === "json") {
    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        tenantId: row.tenantId,
        indexProductId: row.indexProductId,
        actorRole: row.actorRole,
        actorEmail: row.actorUser?.email ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        beforeJson: row.beforeJson,
        afterJson: row.afterJson,
      })),
    });
  }

  return new NextResponse(auditRowsToCsv(rows), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="audit-export.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

