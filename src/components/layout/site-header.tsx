import Link from "next/link";
import Image from "next/image";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";

const HEADER_LOGO_PATH = "/brand/uga-logo-header.png";

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
      <nav className="mx-auto flex h-14 max-w-7xl items-center px-4 lg:px-6">
        <Link
          className="flex h-full min-w-0 items-center gap-3 leading-none [--brand-logo-y:2px] [--brand-title-y:0px]"
          href={`/${locale}`}
        >
          <HeaderBrand locale={locale} />
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-3 lg:gap-5">
          <div className="hidden min-w-0 items-center gap-3 md:flex lg:gap-4">
            <StatusPill>{dict.home.liveStatus}</StatusPill>
            {navItems.map((item) => (
              <Link
                className="whitespace-nowrap text-sm font-semibold text-black/65 transition hover:text-uga-green"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitcher locale={locale} />
            <ThemeToggle />
            <Link
              className="hidden rounded-[3px] border border-black bg-uga-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green sm:inline-flex"
              href="/login"
            >
              {dict.nav.login}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

function HeaderBrand({ locale }: { locale: Locale }) {
  return (
    <>
      <span className="flex h-full w-[3.35rem] shrink-0 items-center justify-center overflow-visible leading-none">
        {/* Optical correction for UGA mark geometry in header lockup. */}
        <Image
          alt={locale === "uk" ? "Логотип УЗА" : "UGA logo"}
          className="brand-logo block h-[2.15rem] w-auto translate-y-[var(--brand-logo-y)] object-contain"
          height={757}
          src={HEADER_LOGO_PATH}
          width={1359}
        />
      </span>
      <span
        aria-hidden="true"
        className="hidden h-7 w-px translate-y-[var(--brand-title-y)] bg-black/10 sm:block"
      />
      <span className="hidden h-7 translate-y-[var(--brand-title-y)] items-center text-sm font-black leading-none tracking-tight text-black sm:inline-flex sm:text-base">
        {SITE_CONFIG.name}
      </span>
    </>
  );
}
