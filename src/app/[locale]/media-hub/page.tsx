import Link from "next/link";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getMediaHubConfig, getMediaHubLocalePolicy, isMediaHubEnabled } from "@/lib/media-hub";
import { getPublishedWeeklyReports } from "@/lib/weekly-ai-report";

export const revalidate = 3600;

export default async function MediaHubPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  if (!isMediaHubEnabled()) {
    redirect(`/${locale}/analytics`);
  }

  const mediaHub = getMediaHubConfig();
  const localePolicy = getMediaHubLocalePolicy(locale);
  const weeklyReports = await getPublishedWeeklyReports();
  const latestWeekly = weeklyReports[0] ?? null;
  const copy =
    locale === "uk"
      ? {
          body:
            "Єдина публічна поверхня для daily, weekly та майбутнього rolling 30-day intelligence layer поверх SPIKE SPOT INDEX.",
          daily: "Daily",
          dailyText:
            "Щоденний AI brief у поточній архітектурі ще живе всередині аналітики, але саме Media Hub стає його новою продуктово-публічною домівкою.",
          day: "Daily",
          hub: mediaHub.brandName,
          month: "30 Days",
          monthText:
            "30-денний режим стане новим публічним monthly intelligence surface після переносу логіки з legacy Last30Days.",
          policy: "Локальна редакційна політика",
          policyText:
            "Spike UK працює лише з україномовними джерелами про Україну та формує україномовні саммарі. Spike EN працює лише з англомовними джерелами про Україну та формує англомовні саммарі.",
          policyTitle:
            "Spike UK = українські джерела про Україну, Spike EN = англійські джерела про Україну",
          sourceScope: "Поточна locale policy",
          title: "SPIKE Media Hub",
          weekly: "Weekly",
          weeklyText:
            latestWeekly
              ? `Останній weekly report уже доступний як публічний anchor: ${latestWeekly.title}.`
              : "Weekly report archive already forms the first stable publication layer inside Media Hub.",
        }
      : {
          body:
            "A unified public surface for daily, weekly and future rolling 30-day intelligence built above SPIKE SPOT INDEX.",
          daily: "Daily",
          dailyText:
            "The daily AI brief still lives inside analytics today, but Media Hub becomes its new public product home.",
          day: "Daily",
          hub: mediaHub.brandName,
          month: "30 Days",
          monthText:
            "The 30-day mode will become the public monthly intelligence surface after the legacy Last30Days migration.",
          policy: "Locale editorial policy",
          policyText:
            "Spike UK works only with Ukrainian-language Ukraine sources and publishes Ukrainian summaries. Spike EN works only with English-language Ukraine sources and publishes English summaries.",
          policyTitle:
            "Spike UK = Ukrainian Ukraine sources, Spike EN = English-language Ukraine sources",
          sourceScope: "Current locale policy",
          title: "SPIKE Media Hub",
          weekly: "Weekly",
          weeklyText:
            latestWeekly
              ? `The latest weekly report is already available as a public anchor: ${latestWeekly.title}.`
              : "The weekly report archive already forms the first stable publication layer inside Media Hub.",
        };

  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] text-[#f8f8f2]">
      <section className="border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-14">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.hub}
          </p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2rem,4.5vw,4.4rem)] font-black uppercase leading-[0.94] tracking-normal text-white">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-white/64">
            {copy.body}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1900px] gap-4 px-6 py-10 lg:grid-cols-3 lg:px-8 lg:py-14">
        <HubSurfaceCard
          cta={locale === "uk" ? "Відкрити аналітику" : "Open analytics"}
          href={`/${locale}/analytics`}
          text={copy.daily}
          title={copy.day}
        />
        <HubSurfaceCard
          cta={locale === "uk" ? "Відкрити weekly reports" : "Open weekly reports"}
          href={`/${locale}/analytics/weekly-reports`}
          text={copy.weeklyText}
          title={copy.weekly}
        />
        <HubSurfaceCard
          cta={locale === "uk" ? "Публічний surface в роботі" : "Public surface in progress"}
          href={`/${locale}/analytics`}
          text={copy.monthText}
          title={copy.month}
        />
      </section>

      <section className="mx-auto max-w-[1900px] px-6 pb-10 lg:px-8 lg:pb-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <HubNote title={copy.daily}>{copy.dailyText}</HubNote>
          <HubNote title={copy.policy}>{copy.policyText}</HubNote>
        </div>
      </section>

      {localePolicy ? (
        <section className="mx-auto max-w-[1900px] px-6 pb-10 lg:px-8 lg:pb-14">
          <article className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--spike-accent)]">
              {copy.sourceScope}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{copy.policyTitle}</h2>
            <dl className="mt-5 grid gap-4 text-sm leading-6 text-white/68 md:grid-cols-3">
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-white/42">
                  Market scope
                </dt>
                <dd className="mt-2 text-base font-semibold text-white">
                  {localePolicy.marketScope === "ukraine" ? "Ukraine" : "Global"}
                </dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-white/42">
                  Source language
                </dt>
                <dd className="mt-2 text-base font-semibold text-white">
                  {localePolicy.sourceLanguage === "uk" ? "Ukrainian" : "English"}
                </dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-white/42">
                  Summary language
                </dt>
                <dd className="mt-2 text-base font-semibold text-white">
                  {localePolicy.summaryLanguage === "uk" ? "Ukrainian" : "English"}
                </dd>
              </div>
            </dl>
          </article>
        </section>
      ) : null}
    </main>
  );
}

function HubSurfaceCard({
  cta,
  href,
  text,
  title,
}: {
  cta: string;
  href: string;
  text: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5 transition hover:border-[var(--spike-accent)]"
      href={href}
    >
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--spike-accent)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/64">{text}</p>
      <span className="mt-4 inline-flex rounded-full border border-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/78">
        {cta}
      </span>
    </Link>
  );
}

function HubNote({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/64">{children}</p>
    </article>
  );
}
