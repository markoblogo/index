import type { Locale } from "@/lib/i18n";
import { partners } from "@/lib/mock-data";

export function PartnerStrip({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {partners.map((partner) => (
        <article
          className="rounded-[3px] border border-black/10 bg-white p-5 "
          key={partner.id}
        >
          <p className="text-xl font-semibold text-black">{partner.name}</p>
          <p className="mt-2 text-sm leading-6 text-black/60">
            {partner.role[locale]}
          </p>
        </article>
      ))}
    </div>
  );
}
