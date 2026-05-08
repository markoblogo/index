import Link from "next/link";
import Image from "next/image";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 lg:px-6">
        <Link className="flex items-center gap-3" href={`/${locale}`}>
          <span className="flex h-9 w-14 items-center">
            <Image
              alt={locale === "uk" ? "Логотип УЗА" : "UGA logo"}
              className="brand-logo h-7 w-auto object-contain"
              height={80}
              src={SITE_CONFIG.logoPath}
              width={140}
            />
          </span>
          <span className="border-l border-black/10 pl-3 text-sm font-black tracking-tight text-black sm:text-base">
            {SITE_CONFIG.name}
          </span>
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          <StatusPill>{dict.home.liveStatus}</StatusPill>
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
          <ThemeToggle />
          <Link
            className="hidden rounded-[3px] border border-black bg-uga-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green sm:inline-flex"
            href="/login"
          >
            {dict.nav.login}
          </Link>
        </div>
      </nav>
    </header>
  );
}
