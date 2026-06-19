import Link from "next/link";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import type {
  MediaHubSiteProfile,
  MediaHubSnapshotCard,
  MediaHubWindowKey,
  MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import { MonitoringFeed } from "./monitoring-feed";

export function PublicMediaHub({
  locale,
  profile,
  selectedWindow,
  windowHref,
}: {
  locale: Locale;
  profile: MediaHubSiteProfile;
  selectedWindow: MediaHubWindowKey;
  windowHref: (window: MediaHubWindowKey) => string;
}) {
  const activeWindow =
    profile.windows.find((window) => window.window === selectedWindow) ?? profile.windows[0];
  const totalDistribution = activeWindow.distribution.reduce((sum, item) => sum + item.value, 0);
  const theme = getMediaHubTheme(profile.id);

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
                  const progressTextOnFill = progressRatio >= 0.78;

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
                          className={`text-sm font-semibold ${
                            progressTextOnFill ? "text-[var(--media-hub-accent-ink-muted)]" : "text-white/62"
                          }`}
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

                <div className="grid gap-4 md:grid-cols-[9.5rem_1fr] md:items-center">
                  <div className="flex items-center justify-center md:justify-start">
                    <DonutChart distribution={activeWindow.distribution} total={totalDistribution} />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    {activeWindow.distribution.map((slice) => (
                      <div
                        className="flex min-w-0 items-center gap-2 rounded-[0.85rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2"
                        key={slice.label}
                        title={`${slice.label}: ${slice.value}%`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="min-w-0 truncate text-sm font-semibold text-white/82">
                          {slice.label}
                        </span>
                        <span className="ml-auto shrink-0 text-sm font-black text-white/44">{slice.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
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

function DonutChart({
  distribution,
  total,
}: {
  distribution: MediaHubWindowSnapshot["distribution"],
  total: number,
}) {
  const radius = 40;
  const strokeWidth = 15;
  let cursor = 0;

  if (total <= 0) {
    return (
      <svg
        aria-label="Source distribution"
        className="h-[9.5rem] w-[9.5rem]"
        role="img"
        viewBox="0 0 100 100"
      >
        <circle
          className="stroke-white/10"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle cx="50" cy="50" fill="var(--media-hub-bg)" r={radius - strokeWidth} />
      </svg>
    );
  }

  return (
    <svg
      aria-label="Source distribution"
      className="h-[9.5rem] w-[9.5rem]"
      role="img"
      viewBox="0 0 100 100"
    >
      {distribution.map((slice) => {
        const start = (cursor / total) * 360;
        cursor += slice.value;
        const end = (cursor / total) * 360;
        const isFullCircle = end - start >= 359.99;

        if (isFullCircle) {
          return (
            <circle
              className="cursor-help transition-opacity hover:opacity-75"
              cx="50"
              cy="50"
              fill="none"
              key={slice.label}
              r={radius - strokeWidth / 2}
              stroke={slice.color}
              strokeWidth={strokeWidth}
            >
              <title>{`${slice.label}: ${slice.value}%`}</title>
            </circle>
          );
        }

        const path = describeDonutArc(50, 50, radius, strokeWidth, start, end);

        return (
          <path
            className="cursor-help transition-opacity hover:opacity-75"
            d={path}
            fill={slice.color}
            key={slice.label}
          >
            <title>{`${slice.label}: ${slice.value}%`}</title>
          </path>
        );
      })}
      <circle cx="50" cy="50" fill="var(--media-hub-bg)" r={radius - strokeWidth} />
    </svg>
  );
}

function describeDonutArc(
  centerX: number,
  centerY: number,
  radius: number,
  strokeWidth: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(centerX, centerY, radius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerRadius = radius - strokeWidth;
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    radius,
    radius,
    0,
    largeArc,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArc,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
