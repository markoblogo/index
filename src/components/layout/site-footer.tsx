import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/methodology`, label: dict.nav.methodology },
    { href: `/${locale}/analytics`, label: dict.nav.analytics },
  ];

  return (
    <footer className="border-t border-black bg-uga-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-7 px-6 py-7 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.7fr_1.05fr_0.55fr] lg:px-8">
        <section>
          <h2 className="text-base font-black uppercase tracking-normal text-white">
            {SITE_CONFIG.name}
          </h2>
          <p className="mt-3 leading-5">{dict.footer.demo}</p>
          <p className="mt-2 leading-5">{dict.footer.partners}</p>
          <p className="mt-3 max-w-md text-xs leading-5 text-white/55">
            {dict.footer.disclaimer}
          </p>
        </section>

        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.navigationTitle}
          </h2>
          <nav className="mt-3 grid gap-2" aria-label={dict.footer.navigationTitle}>
            {navItems.map((item) => (
              <Link
                className="w-fit text-sm font-semibold text-white/70 transition hover:text-uga-lime"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.contactsTitle}
          </h2>
          <div className="mt-3 grid gap-3 text-sm leading-5">
            <div>
              <p className="font-black text-white/80">{dict.footer.addressTitle}</p>
              {dict.footer.address.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div>
              <p className="font-black text-white/80">{dict.footer.phonesTitle}</p>
              {dict.footer.phones.map((phone) => (
                <p key={phone}>{phone}</p>
              ))}
            </div>
            <div>
              <p className="font-black text-white/80">{dict.footer.emailTitle}</p>
              <p>{dict.footer.email}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.socialTitle}
          </h2>
          <div className="mt-3 flex gap-2">
            <SocialPlaceholder label="X" mark="X" />
            <SocialPlaceholder label="Bluesky" mark="B" />
            <SocialPlaceholder label="LinkedIn" mark="in" />
          </div>
        </section>
      </div>
    </footer>
  );
}

function SocialPlaceholder({ label, mark }: { label: string; mark: string }) {
  return (
    <span
      aria-label={`${label} placeholder`}
      className="inline-flex h-8 w-8 items-center justify-center border border-white/35 text-xs font-black text-white/70"
      role="img"
      title={label}
    >
      {mark}
    </span>
  );
}
