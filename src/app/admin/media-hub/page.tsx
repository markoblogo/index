import Link from "next/link";
import { redirect } from "next/navigation";
import { ManualHelpCard } from "@/components/manual/manual-ui";
import { requireDemoRole } from "@/lib/demo-auth";
import { getMediaHubConfig, isMediaHubEnabled } from "@/lib/media-hub";
import { getMediaHubOverviewStats } from "@/lib/media-hub-monitoring";
import { getSsiHelpBlock } from "@/lib/ssi-manual-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubPage() {
  await requireDemoRole("admin");

  if (!isMediaHubEnabled()) {
    redirect("/admin/daily-inputs");
  }

  const mediaHub = getMediaHubConfig();
  const overview = await getMediaHubOverviewStats();

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          {mediaHub.brandName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Spike Media Hub
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
          Unified editorial control surface for daily, weekly and rolling 30-day
          intelligence. Daily and weekly are already live here; 30-day and unified
          source registry are the next migration targets from the legacy Cropto
          intelligence module.
        </p>
      </header>

      <ManualHelpCard dark help={getSsiHelpBlock("adminMediaHub")} />

      <section className="grid gap-4 xl:grid-cols-5">
        <HubCard
          cta="Open daily"
          description={`Collected posts window, daily summary controls and live monitoring. ${overview.daily.itemCount} included posts right now.`}
          href="/admin/media-hub/daily"
          label="Live now"
          title="Daily"
        />
        <HubCard
          cta="Open weekly"
          description={`Weekly digest filtering, report workflow and editorial layer. ${overview.weekly.itemCount} included posts in the active 7-day window.`}
          href="/admin/media-hub/weekly"
          label="Live now"
          title="Weekly"
        />
        <HubCard
          cta="Open 30 days"
          description={`Rolling 30-day monitoring pool is now live. ${overview.monthly.itemCount} included posts across the current 30-day window.`}
          href="/admin/media-hub/monthly"
          label="Live now"
          title="30 Days"
        />
        <HubCard
          cta="Open sources"
          description={`Unified registry across day and week windows. ${overview.registryCount} grouped source entries currently configured.`}
          href="/admin/media-hub/sources"
          label="Live now"
          title="Sources"
        />
        <HubCard
          cta="Open materials"
          description="Telegram/admin intake for links and files used in next weekly or monthly Media Hub reports."
          href="/admin/media-hub/materials"
          label="New"
          title="Materials"
        />
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5 xl:grid-cols-3">
        <article className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Current IA
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Spike now moves from scattered analytics/report pages into one Media Hub
            with three time windows: day, week and 30 days.
          </p>
        </article>
        <article className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Tenant policy
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Hidden for UGA. Active for Spike now. The same architecture is intended
            to become the basis for 1D3X Media Hub later.
          </p>
        </article>
        <article className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Next merge
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Merge Spike source resources with legacy Last30Days aggregated inputs into
            one registry, then expose locale-specific source pools for EN and UK.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {mediaHub.localePolicies.map((policy) => (
          <article
            className="rounded-[1.35rem] border border-white/12 bg-[#050505] p-5"
            key={policy.locale}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-uga-green">
              {policy.locale === "uk" ? "Spike UK policy" : "Spike EN policy"}
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
              {policy.locale === "uk"
                ? "Українська локаль працює лише з українськими джерелами про Україну"
                : "English locale works only with English-language Ukraine sources"}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/72 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Market scope
                </dt>
                <dd className="mt-2 font-medium text-white">
                  {policy.marketScope === "ukraine" ? "Ukraine" : "Global"}
                </dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Source language
                </dt>
                <dd className="mt-2 font-medium text-white">
                  {policy.sourceLanguage === "uk" ? "Ukrainian" : "English"}
                </dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Summary language
                </dt>
                <dd className="mt-2 font-medium text-white">
                  {policy.summaryLanguage === "uk" ? "Ukrainian" : "English"}
                </dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Editorial mode
                </dt>
                <dd className="mt-2 font-medium text-white">{policy.audienceLabel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </section>
  );
}

function HubCard({
  cta,
  description,
  href,
  label,
  title,
}: {
  cta: string;
  description: string;
  href: string;
  label: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-[1.35rem] border border-white/12 bg-[#050505] p-5 transition hover:border-uga-green hover:bg-black/90"
      href={href}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-uga-green">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/66">{description}</p>
      <span className="mt-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
        {cta}
      </span>
    </Link>
  );
}
