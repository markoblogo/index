import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-black/10 bg-uga-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 text-sm text-white/70 lg:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p>
            {SITE_CONFIG.name} · {dict.footer.rights}
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/55">
            {dict.footer.disclaimer}
          </p>
        </div>
        <p className="lg:text-right">{dict.footer.partners}</p>
      </div>
    </footer>
  );
}
