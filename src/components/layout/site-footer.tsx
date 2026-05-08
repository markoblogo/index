import Link from "next/link";
import type { ReactNode } from "react";
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
  const legalItems = [
    {
      href: `/${locale}/privacy`,
      label: locale === "uk" ? "Політика конфіденційності" : "Privacy Policy",
    },
    {
      href: `/${locale}/terms`,
      label: locale === "uk" ? "Умови використання" : "Terms of Use",
    },
    {
      href: `/${locale}/risk-disclosure`,
      label: locale === "uk" ? "Розкриття ризиків" : "Risk Disclosure",
    },
  ];

  return (
    <footer className="border-t border-black bg-uga-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-5 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-[1.8fr_0.8fr_1.15fr_1.05fr_1fr] lg:gap-8 lg:px-8">
        <section className="order-1">
          <h2 className="text-base font-black uppercase tracking-normal text-white">
            {SITE_CONFIG.name}
          </h2>
          <p className="mt-2 leading-5">
            {locale === "uk" ? "Демо для " : "Demo for the "}
            <FooterExternalLink href="https://uga.ua/">
              {locale === "uk"
                ? "Української зернової асоціації"
                : "Ukrainian Grain Association"}
            </FooterExternalLink>
            .
          </p>
          <p className="mt-1.5 leading-5">
            {locale === "uk" ? "Індикативи: " : "Indicatives: "}
            <FooterExternalLink href="https://spike.broker/en/">
              Spike Brokers
            </FooterExternalLink>
            {" · "}
            {locale === "uk" ? "Технологія: " : "Technology: "}
            <FooterExternalLink href="https://cr0pto.com">Cropto</FooterExternalLink>
            /<FooterExternalLink href="https://mn7r.com">MN7R</FooterExternalLink>
          </p>
          <p className="mt-2.5 max-w-md text-xs leading-5 text-white/55">
            {dict.footer.disclaimer}
          </p>
        </section>

        <section className="order-2">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.navigationTitle}
          </h2>
          <nav className="mt-3 grid gap-1.5" aria-label={dict.footer.navigationTitle}>
            {navItems.map((item) => (
              <Link
                className="w-fit text-sm font-semibold leading-5 text-white/70 transition hover:text-uga-lime"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="order-4 lg:order-3">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.contactsTitle}
          </h2>
          <div className="mt-3 text-sm leading-5">
            <p className="font-black text-white/80">{dict.footer.addressTitle}</p>
            {dict.footer.address.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="order-5 lg:order-4 lg:pt-[1.55rem]">
          <div className="grid gap-2.5 text-sm leading-5">
            <div>
              <p className="font-black text-white/80">{dict.footer.phonesTitle}</p>
              <a className="block transition hover:text-uga-lime" href="tel:+380444923968">
                +38 (044) 492-39-68
              </a>
              <a className="block transition hover:text-uga-lime" href="tel:+380444923969">
                +38 (044) 492-39-69
              </a>
            </div>
            <p>
              <span className="font-black text-white/80">{dict.footer.emailTitle}</span>{" "}
              <a className="transition hover:text-uga-lime" href="mailto:inbox@uga.ua">
                {dict.footer.email}
              </a>
            </p>
            <div className="flex gap-2 pt-1">
              <SocialPlaceholder label="X" mark="X" />
              <SocialPlaceholder label="Bluesky" mark="B" />
              <SocialPlaceholder label="LinkedIn" mark="in" />
              <SocialPlaceholder label="Telegram" mark="tg" />
            </div>
          </div>
        </section>

        <section className="order-3 lg:order-5">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {locale === "uk" ? "Правові документи" : "Legal"}
          </h2>
          <nav
            className="mt-3 grid gap-1.5"
            aria-label={locale === "uk" ? "Правові документи" : "Legal"}
          >
            {legalItems.map((item) => (
              <Link
                className="w-fit text-sm font-semibold leading-5 text-white/70 transition hover:text-uga-lime"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </footer>
  );
}

function SocialPlaceholder({ label, mark }: { label: string; mark: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center border border-white/35 text-[0.68rem] font-black text-white/70"
      role="img"
      title={label}
    >
      {mark}
    </span>
  );
}

function FooterExternalLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      className="font-semibold text-white/80 underline-offset-4 transition hover:text-uga-lime hover:underline"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
