import Link from "next/link";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import type { MediaHubReportArchiveItem } from "@/lib/media-hub-publication-scheduler";
import type {
  MediaHubSiteProfile,
  MediaHubSnapshotCard,
  MediaHubWindowKey,
  MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import { DistributionChart } from "./distribution-chart";
import { MonitoringFeed } from "./monitoring-feed";

export function PublicMediaHub({
  archive = [],
  archiveHref,
  locale,
  profile,
  selectedWindow,
  windowHref,
}: {
  archive?: MediaHubReportArchiveItem[];
  archiveHref?: (filter: {
    date?: string;
    kind?: MediaHubReportArchiveItem["kind"];
  }) => string;
  locale: Locale;
  profile: MediaHubSiteProfile;
  selectedWindow: MediaHubWindowKey;
  windowHref: (window: MediaHubWindowKey) => string;
}) {
  const activeWindow =
    profile.windows.find((window) => window.window === selectedWindow) ?? profile.windows[0];
  const totalDistribution = activeWindow.distribution.reduce((sum, item) => sum + item.value, 0);
  const theme = getMediaHubTheme(profile.id);
  const archiveFilters: Array<{
    kind?: MediaHubReportArchiveItem["kind"];
    label: string;
  }> = [
    { label: locale === "uk" ? "Усі" : "All" },
    { kind: "daily", label: locale === "uk" ? "День" : "Daily" },
    { kind: "weekly", label: locale === "uk" ? "Тиждень" : "Weekly" },
    { kind: "monthly", label: locale === "uk" ? "Місяць" : "Monthly" },
  ];

  return (
    <div
      className="min-h-screen bg-[var(--media-hub-bg)] text-white"
      style={theme as CSSProperties}
    >
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,var(--media-hub-hero-start)_0%,var(--media-hub-hero-mid)_42%,var(--media-hub-bg)_100%)]">
        <div className="mx-auto max-w-[1900px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.7rem] border border-white/10 bg-[var(--media-hub-panel)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <h1 className="max-w-5xl text-[clamp(2.1rem,4.2vw,3.9rem)] font-black leading-[0.92] tracking-normal">
                {profile.title}
              </h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-white/70">
                {profile.description}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {profile.windows.map((window) => {
                  const active = window.window === selectedWindow;
                  const progressRatio = parseProgressRatio(window.progressLabel);

                  return (
                    <Link
                      className={`relative overflow-hidden rounded-full border px-4 py-3 transition ${
                        active
                          ? "border-[color:var(--media-hub-accent)] bg-[var(--media-hub-card-hover)]"
                          : "border-white/12 bg-[var(--media-hub-card)] hover:border-white/28 hover:bg-[var(--media-hub-card-hover)]"
                      }`}
                      href={windowHref(window.window)}
                      key={window.window}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 bg-[var(--media-hub-accent)] transition-[width]"
                        style={{ width: `${Math.round(progressRatio * 100)}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-4">
                        <span className="text-base font-black text-[var(--media-hub-accent-ink)]">
                          {window.label}
                        </span>
                        <span
                          className="text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
                        >
                          {window.progressLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-[var(--media-hub-panel)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white/48">
                    Distribution
                  </p>
                  <h2 className="mt-2 text-3xl font-black">{activeWindow.sourceCount} sources</h2>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    {locale === "uk"
                      ? "Raw monitoring знизу, редакційний summary зверху."
                      : "Raw monitoring below, editorial summary above."}
                  </p>
                </div>

                <DistributionChart
                  distribution={activeWindow.distribution}
                  total={totalDistribution}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-5 py-8 sm:px-8 lg:px-10">
        <article className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black">{activeWindow.summaryTitle}</h2>
            <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">
              {activeWindow.itemCount} items
            </span>
            <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">
              {activeWindow.topicCount} topics
            </span>
          </div>
          <div className="mt-6 max-w-6xl space-y-5">
            {activeWindow.summaryBody.map((paragraph) => (
              <p className="text-lg leading-8 text-white/78" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </section>

      {archive.length > 0 ? (
        <section className="mx-auto max-w-[1900px] px-5 pb-8 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                  Report archive
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {locale === "uk" ? "Опубліковані звіти" : "Published reports"}
                </h2>
              </div>
              {archiveHref ? (
                <div className="flex flex-wrap gap-2">
                  {archiveFilters.map((filter) => (
                    <Link
                      className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white/62 hover:border-[color:var(--media-hub-accent)] hover:text-white"
                      href={archiveHref({ kind: filter.kind })}
                      key={filter.label}
                    >
                      {filter.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {archive.slice(0, 12).map((report) => (
                <Link
                  className="rounded-[1rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2.5 transition hover:border-[color:var(--media-hub-accent)]"
                  href={archiveHref?.({
                    date: report.periodEndDate,
                    kind: report.kind,
                  }) ?? "#"}
                  key={`${report.kind}-${report.periodEndDate}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--media-hub-accent)]">
                      {report.kind}
                    </span>
                    <span className="text-xs font-black text-white/46">
                      {formatArchivePeriod(report)}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-sm font-bold text-white/78">
                    {report.summaryTitle}
                  </h3>
                  <p className="mt-1 text-xs text-white/42">
                    {report.itemCount} items · {report.sourceCount} sources
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1900px] px-5 pb-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
              Desk Snapshot
            </p>
            <div className="mt-3 grid gap-2">
              {activeWindow.snapshotCards.map((card) => (
                <SnapshotCard card={card} key={card.label} />
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
              Pulse
            </p>
            <div className="mt-3 grid gap-2">
              {activeWindow.pulseCards.map((card) => (
                <PulseCard card={card} key={card.label} />
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Topic clusters</h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/38">
                {activeWindow.topicCount} clusters
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {activeWindow.topTopics.map((topic) => (
                <article
                  className="rounded-[1rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2.5"
                  key={topic.label}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <h3 className="min-w-0 truncate text-base font-bold">{topic.label}</h3>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-black text-white/48">
                      {topic.count}
                    </span>
                    <p className="min-w-0 truncate text-sm leading-6 text-white/58">{topic.hint}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-5 pb-12 sm:px-8 lg:px-10">
        <MonitoringFeed items={activeWindow.feed} />
      </section>
    </div>
  );
}

function formatArchivePeriod(report: MediaHubReportArchiveItem) {
  if (report.kind === "daily") {
    return report.periodEndDate;
  }

  return `${report.periodStartDate} — ${report.periodEndDate}`;
}

function SnapshotCard({ card }: { card: MediaHubSnapshotCard }) {
  return (
    <article className="rounded-[1rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <p className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-white/38">
          {card.label}
        </p>
        <span className="shrink-0 text-lg font-black text-[var(--media-hub-accent)]">
          {card.value}
        </span>
        <span className="min-w-0 truncate text-sm text-white/46">{card.note}</span>
      </div>
    </article>
  );
}

function PulseCard({ card }: { card: MediaHubWindowSnapshot["pulseCards"][number] }) {
  const toneClass =
    card.tone === "sky"
      ? "bg-[#6eddf7]"
      : card.tone === "green"
        ? "bg-[#71e7a8]"
        : card.tone === "amber"
          ? "bg-[#f4b244]"
          : "bg-[#b48cff]";

  return (
    <article className="rounded-[1rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <h3 className="shrink-0 text-base font-bold">{card.label}</h3>
        <span className="shrink-0 text-sm font-black text-white/54">{card.value}</span>
        <p className="min-w-0 truncate text-sm leading-6 text-white/58">{card.hint}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/8">
        <div
          className={`h-2 rounded-full ${toneClass}`}
          style={{ width: `${Math.max(12, Math.min(100, card.value * 10))}%` }}
        />
      </div>
    </article>
  );
}

function getMediaHubTheme(profileId: MediaHubSiteProfile["id"]) {
  if (profileId === "1d3x") {
    return {
      "--media-hub-accent": "#d6ff58",
      "--media-hub-accent-ink": "#07100c",
      "--media-hub-accent-ink-muted": "rgba(7,16,12,0.72)",
      "--media-hub-bg": "#07100c",
      "--media-hub-card": "#0b1711",
      "--media-hub-card-hover": "#102417",
      "--media-hub-hero-mid": "#0a170f",
      "--media-hub-hero-start": "#183321",
      "--media-hub-panel": "#08130e",
    };
  }

  return {
    "--media-hub-accent": "#7ff348",
    "--media-hub-accent-ink": "#050505",
    "--media-hub-accent-ink-muted": "rgba(5,5,5,0.72)",
    "--media-hub-bg": "#07101c",
    "--media-hub-card": "#091222",
    "--media-hub-card-hover": "#0d1628",
    "--media-hub-hero-mid": "#0a1120",
    "--media-hub-hero-start": "#17283f",
    "--media-hub-panel": "#10192c",
  };
}

function parseProgressRatio(label: string) {
  const match = label.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    return 0;
  }
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, current / total));
}
