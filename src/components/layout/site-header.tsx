import Link from "next/link";
import Image from "next/image";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/methodology`, label: dict.nav.methodology },
    { href: `/${locale}/analytics`, label: dict.nav.analytics },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-black bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 lg:px-6">
        <Link className="flex items-center gap-3" href={`/${locale}`}>
          <span className="flex h-10 w-16 items-center">
            <Image
              alt={locale === "uk" ? "Логотип УЗА" : "UGA logo"}
              className="h-8 w-auto object-contain"
              height={80}
              src={SITE_CONFIG.logoPath}
              width={140}
            />
          </span>
          <span className="border-l border-black/10 pl-3 font-semibold tracking-tight text-uga-dark">
            {SITE_CONFIG.name}
          </span>
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          <span className="rounded-full border border-black px-3 py-1 text-xs font-semibold lowercase tracking-tight text-uga-dark">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-uga-lime align-middle" />
            {dict.home.liveStatus}
          </span>
          {navItems.map((item) => (
            <Link
              className="text-sm font-semibold text-black/65 transition hover:text-uga-green"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} />
          <Link
            className="hidden rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green sm:inline-flex"
            href="/login"
          >
            {dict.nav.login}
          </Link>
        </div>
      </nav>
    </header>
  );
}
