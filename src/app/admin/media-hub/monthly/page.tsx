import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubMonthlyPage() {
  await requireDemoRole("admin");

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    redirect("/admin/daily-inputs");
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          1D3X Media Hub
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          30-Day Intelligence
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
          This is the reserved migration slot for the legacy Last30Days product:
          rolling 30-day source aggregation, EN/UK scoped summaries, monthly report
          output and public media-hub publication surfaces.
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <StateCard
          detail="Old Cropto donor logic to migrate: source ingest, normalized 30-day feed, AI monthly summary, public intelligence page."
          label="Donor module"
          value="Cropto Last30Days"
        />
        <StateCard
          detail="Target shape inside index repo: one shared Media Hub engine with Day, Week and 30 Days windows."
          label="Target module"
          value="index/media-hub"
        />
        <StateCard
          detail="Locale policy after migration: Spike EN uses only EN-tagged sources; Spike UK uses only UK-tagged sources."
          label="Locale policy"
          value="explicit"
        />
      </section>
    </section>
  );
}

function StateCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.2rem] border border-white/12 bg-[#050505] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-white/66">{detail}</p>
    </article>
  );
}
