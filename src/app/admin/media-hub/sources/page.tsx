import Link from "next/link";
import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubSourcesPage() {
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
          Source Registry Migration
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
          This page reserves the unified source layer where Spike resources and the
          old Last30Days aggregated sources will be merged into one registry across
          daily, weekly and 30-day windows.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Link
          className="rounded-[1.2rem] border border-white/12 bg-[#050505] p-5 transition hover:border-uga-green"
          href="/admin/reports/daily"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Current live resource surface
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Daily source workspace</h2>
          <p className="mt-3 text-sm leading-6 text-white/66">
            Current Telegram/resource configuration already feeding the daily AI summary.
          </p>
        </Link>

        <Link
          className="rounded-[1.2rem] border border-white/12 bg-[#050505] p-5 transition hover:border-uga-green"
          href="/admin/reports/weekly"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Current live resource surface
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Weekly source workspace</h2>
          <p className="mt-3 text-sm leading-6 text-white/66">
            Current weekly source pool, digest filtering and editorial workflow.
          </p>
        </Link>
      </div>

      <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
        <h2 className="text-lg font-semibold text-white">Target registry model</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-white/68 lg:grid-cols-2">
          <p>Each resource will be explicitly tagged by tenant, locale, role, window and parser strategy.</p>
          <p>Spike EN and Spike UK will stop relying on mixed heuristics and use explicit source pools only.</p>
          <p>Telegram, RSS, websites, files, notes and prompt references will live in one registry.</p>
          <p>The 30-day mode will consume the same registry instead of a separate legacy Cropto source list.</p>
        </div>
      </section>
    </section>
  );
}
