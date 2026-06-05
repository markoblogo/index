import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type {
  MediaHubSiteProfile,
  MediaHubSnapshotCard,
  MediaHubWindowKey,
  MediaHubWindowSnapshot,
} from "@/lib/media-hub";

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
  const activeWindow = profile.windows[0];
  const totalDistribution = activeWindow.distribution.reduce((sum, item) => sum + item.value, 0);
  const donutStops = buildDonutStops(activeWindow.distribution, totalDistribution);

  return (
    <main className="min-h-screen bg-[#07101c] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,#17283f_0%,#0a1120_42%,#07101c_100%)]">
        <div className="mx-auto max-w-[1900px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[#10192c]/85 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <p className={`text-sm font-black uppercase tracking-[0.22em] ${profile.accentClassName}`}>
                {profile.brand}
              </p>
              <h1 className="mt-4 max-w-5xl text-[clamp(2.4rem,5vw,4.6rem)] font-black leading-[0.92] tracking-normal">
                {profile.title}
              </h1>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-white/70">
                {profile.description}
              </p>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {profile.windows.map((window) => {
                  const active = window.window === selectedWindow;

                  return (
                    <Link
                      className={`rounded-full border px-5 py-4 transition ${
                        active
                          ? "border-transparent bg-[linear-gradient(90deg,#f5da69_0%,#c3833b_100%)] text-[#10131d]"
                          : "border-white/12 bg-[#091222] text-white/82 hover:border-white/28 hover:bg-[#0d1628]"
                      }`}
                      href={windowHref(window.window)}
                      key={window.window}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-lg font-black">{window.label}</span>
                        <span className={`text-sm font-semibold ${active ? "text-[#10131d]/75" : "text-white/42"}`}>
                          {window.progressLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#10192c]/85 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white/48">
                    Distribution
                  </p>
                  <h2 className="mt-3 text-3xl font-black">{activeWindow.sourceCount} sources</h2>
                  <p className="mt-3 text-sm leading-6 text-white/64">
                    {locale === "uk"
                      ? "Summary-first зверху, raw monitoring layer знизу. Саме тут має жити сила сотень джерел і тисяч матеріалів."
                      : "Summary-first above, raw monitoring below. This is where the strength of hundreds of sources and thousands of items has to live."}
                  </p>
                  <div className="mt-5 space-y-3">
                    {activeWindow.topSources.map((source) => (
                      <div
                        className="flex items-center justify-between rounded-full border border-white/10 bg-[#0a1222] px-4 py-2.5"
                        key={source.label}
                      >
                        <span className="text-sm font-semibold text-white/84">{source.label}</span>
                        <span className="text-sm font-black text-white/44">{source.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="flex items-center justify-center">
                    <div
                      aria-label="Source distribution"
                      className="relative h-[16rem] w-[16rem] rounded-full border border-white/8"
                      style={{
                        background: `conic-gradient(${donutStops})`,
                      }}
                    >
                      <div className="absolute inset-[2.2rem] rounded-full bg-[#08101d]" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeWindow.distribution.map((slice) => (
                      <div
                        className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-[#0a1222] px-4 py-3"
                        key={slice.label}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="text-sm font-semibold text-white/82">{slice.label}</span>
                        <span className="ml-auto text-sm font-black text-white/44">{slice.value}%</span>
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
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black">{activeWindow.summaryTitle}</h2>
              <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">
                {activeWindow.itemCount} items
              </span>
              <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">
                {activeWindow.topicCount} topics
              </span>
            </div>
            <div className="mt-6 space-y-5">
              {activeWindow.summaryBody.map((paragraph) => (
                <p className="text-lg leading-8 text-white/78" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          <div className="grid gap-6">
            <section className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                Desk Snapshot
              </p>
              <div className="mt-4 grid gap-3">
                {activeWindow.snapshotCards.map((card) => (
                  <SnapshotCard card={card} key={card.label} />
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                Pulse
              </p>
              <div className="mt-4 grid gap-3">
                {activeWindow.pulseCards.map((card) => (
                  <PulseCard card={card} key={card.label} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-5 pb-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Topic clusters</h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/38">
                {activeWindow.topicCount} clusters
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {activeWindow.topTopics.map((topic) => (
                <article
                  className="rounded-[1.2rem] border border-white/10 bg-[#091222] p-4"
                  key={topic.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{topic.label}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/48">
                      {topic.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/64">{topic.hint}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Monitoring feed</h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/38">
                live window preview
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {activeWindow.feed.map((item) => (
                <article
                  className={`rounded-[1.2rem] border p-4 ${
                    item.tone === "elevated"
                      ? "border-[#7be7ff]/30 bg-[#0b1628]"
                      : "border-white/10 bg-[#091222]"
                  }`}
                  key={item.id}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/42">
                    <span>{item.sourceType}</span>
                    <span>•</span>
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-7 text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/66">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/60"
                        key={`${item.id}-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-5 pb-12 sm:px-8 lg:px-10">
        <article className="rounded-[2rem] border border-white/10 bg-[#0d1629] p-6">
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${profile.accentClassName}`}>
            {profile.sourcePolicyTitle}
          </p>
          <p className="mt-4 max-w-5xl text-base leading-7 text-white/72">
            {profile.sourcePolicyBody}
          </p>
          {profile.localePolicy ? (
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <PolicyStat
                label="Market scope"
                value={profile.localePolicy.marketScope === "ukraine" ? "Ukraine" : "Global"}
              />
              <PolicyStat
                label="Source language"
                value={profile.localePolicy.sourceLanguage === "uk" ? "Ukrainian" : "English"}
              />
              <PolicyStat
                label="Summary language"
                value={profile.localePolicy.summaryLanguage === "uk" ? "Ukrainian" : "English"}
              />
              <PolicyStat
                label="Audience"
                value={profile.localePolicy.audienceLabel}
              />
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function SnapshotCard({ card }: { card: MediaHubSnapshotCard }) {
  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-[#091222] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">{card.label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="text-2xl font-black text-[#7be7ff]">{card.value}</span>
        <span className="text-sm text-white/46">{card.note}</span>
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
    <article className="rounded-[1.15rem] border border-white/10 bg-[#091222] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{card.label}</h3>
        <span className="text-sm font-black text-white/54">{card.value}</span>
      </div>
      <div className="mt-3 h-3 rounded-full bg-white/8">
        <div
          className={`h-3 rounded-full ${toneClass}`}
          style={{ width: `${Math.max(12, Math.min(100, card.value * 10))}%` }}
        />
      </div>
      <p className="mt-2 text-sm leading-6 text-white/58">{card.hint}</p>
    </article>
  );
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[#091222] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/82">{value}</p>
    </div>
  );
}

function buildDonutStops(
  distribution: MediaHubWindowSnapshot["distribution"],
  total: number,
) {
  let cursor = 0;

  return distribution
    .map((slice) => {
      const start = cursor;
      const end = cursor + (slice.value / total) * 100;
      cursor = end;

      return `${slice.color} ${start}% ${end}%`;
    })
    .join(", ");
}
