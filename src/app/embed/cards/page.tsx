import dynamic from "next/dynamic";

import { EmbedShell } from "@/components/embed/embed-shell";
import { SITE_CONFIG } from "@/lib/constants";
import {
  normalizeEmbedLayout,
  normalizeEmbedLocale,
  normalizeEmbedTheme,
} from "@/lib/embed";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";

const EmbedCardsContentAsync = dynamic(
  () =>
    import("@/components/embed/embed-cards-content").then(
      (module) => module.EmbedCardsContent,
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">
          Loading cards...
        </p>
      </div>
    ),
  },
);

type EmbedCardsPageProps = {
  searchParams: Promise<{
    layout?: string;
    locale?: string;
    theme?: string;
  }>;
};

export default async function EmbedCardsPage({
  searchParams,
}: EmbedCardsPageProps) {
  const params = await searchParams;
  const locale = normalizeEmbedLocale(params.locale);
  const layout = normalizeEmbedLayout(params.layout);
  normalizeEmbedTheme();
  const snapshot = await getPublicIndexSnapshot();
  const compact = layout === "compact";

  return (
    <EmbedShell compact={compact}>
      <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-uga-green">
              {SITE_CONFIG.defaultDeliveryBasis}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-uga-dark">
              UGA Index
            </h1>
          </div>
          <p className="text-xs font-semibold text-black/50">
            {new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
              dateStyle: "medium",
            }).format(new Date(snapshot.updatedAt))}
          </p>
        </div>

        <EmbedCardsContentAsync
          commodities={snapshot.commodities}
          compact={compact}
          locale={locale}
        />
      </section>
    </EmbedShell>
  );
}
