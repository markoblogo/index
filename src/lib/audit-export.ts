import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { tenantScopedWhere } from "@1d3x/data";

export type AuditExportFilters = {
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

const MAX_AUDIT_EXPORT_ROWS = 1000;

export async function getAuditExportRows(filters: AuditExportFilters = {}) {
  const tenantScope = tenantScopedWhere();
  const createdAt: Prisma.DateTimeFilter = {};

  if (filters.dateFrom) {
    createdAt.gte = toDate(filters.dateFrom);
  }

  if (filters.dateTo) {
    createdAt.lte = toEndOfDay(filters.dateTo);
  }

  return db.auditLog.findMany({
    include: {
      actorUser: {
        select: { email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(filters.limit ?? MAX_AUDIT_EXPORT_ROWS, MAX_AUDIT_EXPORT_ROWS),
    where: {
      ...tenantScope,
      ...(filters.action ? { action: filters.action } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    },
  });
}

export function auditRowsToCsv(rows: Awaited<ReturnType<typeof getAuditExportRows>>) {
  const header = [
    "createdAt",
    "tenantId",
    "indexProductId",
    "actorRole",
    "actorEmail",
    "action",
    "entityType",
    "entityId",
    "summary",
  ];
  const records = rows.map((row) => [
    row.createdAt.toISOString(),
    row.tenantId ?? "",
    row.indexProductId ?? "",
    row.actorRole ?? "",
    row.actorUser?.email ?? "",
    row.action,
    row.entityType,
    row.entityId ?? "",
    row.summary,
  ]);

  return [header, ...records]
    .map((record) => record.map(escapeCsvValue).join(","))
    .join("\n");
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toEndOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

