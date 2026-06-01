import Link from "next/link";
import { getAuditExportRows } from "@/lib/audit-export";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAuditPage() {
  const rows = await getAuditExportRows({ limit: 50 });

  return (
    <section className="border border-black bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            Governance
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase">Audit log</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="border border-black bg-uga-dark px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
            href="/api/admin/audit-export"
          >
            Export CSV
          </Link>
          <Link
            className="border border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black"
            href="/api/admin/audit-export?format=json"
          >
            Export JSON
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border border-black text-left text-sm">
          <thead className="bg-uga-dark text-white">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-black/10" key={row.id}>
                <td className="whitespace-nowrap px-3 py-2">
                  {row.createdAt.toISOString()}
                </td>
                <td className="px-3 py-2 font-semibold">{row.action}</td>
                <td className="px-3 py-2">
                  {row.actorUser?.email ?? row.actorRole ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {row.entityType}
                  {row.entityId ? `:${row.entityId}` : ""}
                </td>
                <td className="max-w-xl px-3 py-2">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
