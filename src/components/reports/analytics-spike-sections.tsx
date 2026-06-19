import type { PublicAiMarketBrief } from "@/lib/ai-market-brief-types";
import type { Locale } from "@/lib/i18n";

export function AnalyticsSpikeSections({
  aiBrief,
  aiCopy,
  locale,
}: {
  aiBrief: PublicAiMarketBrief | null;
  aiCopy: SpikeAiCopy;
  locale: Locale;
}) {
  return (
    <>
      {aiBrief ? (
        <AiMarketBriefSection brief={aiBrief} copy={aiCopy} locale={locale} />
      ) : null}
    </>
  );
}

function AiMarketBriefSection({
  brief,
  copy,
  locale,
}: {
  brief: PublicAiMarketBrief;
  copy: SpikeAiCopy;
  locale: Locale;
}) {
  return (
    <section className="border-y border-white/10 bg-[#101010]">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[0.76fr_1.24fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-normal text-white">
            {copy.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/64">
            {copy.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em]">
            <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
              {copy.aiAssistedBadge}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.generatedLabel}: {brief.generatedAt}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.confidenceLabel}:{" "}
              {mapBriefConfidenceLabel(brief.confidence, locale)}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.officialUnchangedBadge}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {brief.blocks[0] ? (
            <article className="rounded-[1rem] border border-[var(--spike-accent)]/60 bg-[#f8f8f2] p-5 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[0].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
                {brief.blocks[0].body}
              </p>
            </article>
          ) : null}
          {brief.blocks.slice(1, 3).map((block) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505]"
              key={block.title}
            >
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {block.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {block.body}
              </p>
            </article>
          ))}
          {brief.blocks[3] ? (
            <article className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[3].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {brief.blocks[3].body}
              </p>
            </article>
          ) : null}
          <p className="rounded-[1rem] border border-white/10 bg-black/45 p-4 text-xs font-semibold leading-5 text-white/58 md:col-span-2">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

type SpikeAiCopy = {
  aiAssistedBadge: string;
  confidenceLabel: string;
  description: string;
  disclaimer: string;
  eyebrow: string;
  generatedLabel: string;
  officialUnchangedBadge: string;
  title: string;
};

function mapBriefConfidenceLabel(confidence: string, locale: Locale) {
  if (locale === "uk") {
    return confidence === "strong"
      ? "висока"
      : confidence === "limited"
        ? "обмежена"
        : "нормальна";
  }

  return confidence;
}
