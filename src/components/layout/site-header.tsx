import Link from "next/link";
import Image from "next/image";
import { HeaderNavLink } from "@/components/layout/header-nav-link";
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
    { href: `/${locale}/subscription`, label: dict.nav.subscription },
    ...(SITE_CONFIG.tenantId === "spike-ua"
      ? [{ href: `/${locale}/blog`, label: locale === "uk" ? "Блог" : "Blog" }]
      : []),
  ];

  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur ${
        isSpike
          ? "border-white/18 bg-[#403db6]/95"
          : "border-black bg-white/95"
      }`}
    >
      <nav
        className={`mx-auto flex h-14 items-center ${
          isSpike ? "max-w-[1900px] px-4 sm:px-6 lg:px-8" : "max-w-7xl px-4 lg:px-6"
        }`}
      >
        <Link
          className="flex h-full min-w-0 items-center gap-3 leading-none [--brand-logo-y:2px] [--brand-title-y:0px]"
          href={`/${locale}`}
        >
          <HeaderBrand locale={locale} />
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-3 lg:gap-5">
          <div className="hidden min-w-0 items-center gap-3 md:flex lg:gap-4">
            {!isSpike ? <StatusPill>{dict.home.liveStatus}</StatusPill> : null}
            {navItems.map((item) => (
              <HeaderNavLink
                href={item.href}
                isSpike={isSpike}
                key={item.href}
                label={item.label}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitcher locale={locale} />
            {!isSpike ? <ThemeToggle /> : null}
            <Link
              className={`hidden rounded-[3px] px-4 py-2 text-sm font-semibold text-white transition sm:inline-flex ${
                isSpike
                  ? "bg-[#050505] hover:bg-[#111111]"
                  : "border border-black bg-uga-dark hover:bg-uga-green"
              }`}
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
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  return (
    <>
      {SITE_CONFIG.logoHeaderPath ? (
        <span
          className={`flex h-full shrink-0 items-center justify-center overflow-visible leading-none ${
            isSpike ? "w-[8.8rem] sm:w-[11.25rem]" : "w-[3.35rem]"
          }`}
        >
          {/* Optical correction for UGA mark geometry in header lockup. */}
          <Image
            alt={locale === "uk" ? "Логотип індексу" : "Index logo"}
            className={`brand-logo block w-auto translate-y-[var(--brand-logo-y)] object-contain ${
              isSpike ? "h-[2.35rem] -translate-x-5" : "h-[2.15rem]"
            }`}
            height={isSpike ? 398 : 757}
            src={SITE_CONFIG.logoHeaderPath}
            width={isSpike ? 1517 : 1359}
          />
        </span>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 bg-uga-green text-xs font-black text-uga-dark">
          S
        </span>
      )}
      {!isSpike ? (
        <>
          <span
            aria-hidden="true"
            className="hidden h-7 w-px translate-y-[var(--brand-title-y)] bg-black/10 sm:block"
          />
          <span className="hidden h-7 translate-y-[var(--brand-title-y)] items-center text-sm font-black leading-none tracking-tight text-black sm:inline-flex sm:text-base">
            {SITE_CONFIG.name}
          </span>
        </>
      ) : null}
    </>
  );
}
