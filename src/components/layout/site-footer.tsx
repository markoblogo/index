import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const activeIndex = getActiveIndexConfig();
  const isSpike = activeIndex.id === "spike-ua";
  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/methodology`, label: dict.nav.methodology },
    { href: `/${locale}/analytics`, label: dict.nav.analytics },
    { href: `/${locale}/subscription`, label: dict.nav.subscription },
    ...(isSpike
      ? [{ href: `/${locale}/blog`, label: locale === "uk" ? "Блог" : "Blog" }]
      : []),
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

  if (isSpike) {
    return (
      <footer className="border-t border-black bg-uga-dark text-white">
        <div className="mx-auto max-w-[1900px] px-6 py-4 text-sm text-white/70 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.45fr_0.8fr_1.45fr_1.2fr_1fr] lg:items-start">
            <section>
              <h2 className="whitespace-nowrap text-sm font-black uppercase tracking-normal text-white">
                {SITE_CONFIG.name}
              </h2>
              <p className="mt-3 max-w-md text-xs leading-5 text-white/45">
                {dict.footer.disclaimer}
                <br />
                {locale === "uk"
                  ? "Official SPIKE SPOT INDEX values are methodology-based and non-AI-generated. AI-assisted outputs are provided for analytical context only."
                  : "Official SPIKE SPOT INDEX values are methodology-based and non-AI-generated. AI-assisted outputs are provided for analytical context only."}
              </p>
            </section>

            <section>
              <h2 className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white">
                {dict.footer.navigationTitle}
              </h2>
              <nav
                className="mt-2 grid gap-1"
                aria-label={dict.footer.navigationTitle}
              >
                {navItems.map((item) => (
                  <Link
                    className="w-fit text-sm font-semibold leading-5 text-white/68 transition hover:text-uga-lime"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </section>

            <section>
              <h2 className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white">
                {dict.footer.contactsTitle}
              </h2>
              <div className="mt-2 text-sm leading-5">
                <p className="font-black text-white/80">
                  {dict.footer.addressTitle}
                </p>
                {activeIndex.contacts.address[locale].map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>

            <section>
              <div className="grid gap-2 text-sm leading-5">
                <div>
                  <p className="font-black text-white/80">
                    {dict.footer.phonesTitle}
                  </p>
                  {activeIndex.contacts.phones.map((phone) => (
                    <a
                      className="block transition hover:text-uga-lime"
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      key={phone}
                    >
                      {phone}
                    </a>
                  ))}
                </div>
                <p>
                  <span className="font-black text-white/80">
                    {dict.footer.emailTitle}
                  </span>{" "}
                  <a
                    className="transition hover:text-uga-lime"
                    href={`mailto:${activeIndex.contacts.email}`}
                  >
                    {activeIndex.contacts.email}
                  </a>
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeIndex.contacts.social.map((social) => (
                    <FooterSocialLink social={social} key={social.label} />
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white">
                {locale === "uk" ? "Правові документи" : "Legal"}
              </h2>
              <nav
                className="mt-2 grid gap-1"
                aria-label={locale === "uk" ? "Правові документи" : "Legal"}
              >
                {legalItems.map((item) => (
                  <Link
                    className="w-fit text-sm font-semibold leading-5 text-white/68 transition hover:text-uga-lime"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
                <FooterExternalLink href="https://1d3x.com">
                  Index infrastructure by 1d3x
                </FooterExternalLink>
              </nav>
            </section>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-black bg-uga-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-5 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-[1.8fr_0.8fr_1.15fr_1.05fr_1fr] lg:gap-8 lg:px-8">
        <section className="order-1">
          <h2 className="text-base font-black uppercase tracking-normal text-white">
            {SITE_CONFIG.name}
          </h2>
          <p className="mt-2 leading-5">
            {activeIndex.home.footerDemo[locale]}{" "}
            <FooterExternalLink href={activeIndex.brandUrl}>
              {activeIndex.legalName[locale]}
            </FooterExternalLink>
            .
          </p>
          <p className="mt-2.5 max-w-md text-xs leading-5 text-white/55">
            {dict.footer.disclaimer}
            <br />
            <FooterExternalLink href="https://1d3x.com">
              Index infrastructure by 1d3x
            </FooterExternalLink>
          </p>
        </section>

        <section className="order-2">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
            {dict.footer.navigationTitle}
          </h2>
          <nav
            className="mt-3 grid gap-1.5"
            aria-label={dict.footer.navigationTitle}
          >
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
            <p className="font-black text-white/80">
              {dict.footer.addressTitle}
            </p>
            {activeIndex.contacts.address[locale].map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="order-5 lg:order-4 lg:pt-[1.55rem]">
          <div className="grid gap-2.5 text-sm leading-5">
            <div>
              <p className="font-black text-white/80">
                {dict.footer.phonesTitle}
              </p>
              {activeIndex.contacts.phones.map((phone) => (
                <a
                  className="block transition hover:text-uga-lime"
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  key={phone}
                >
                  {phone}
                </a>
              ))}
            </div>
            <p>
              <span className="font-black text-white/80">
                {dict.footer.emailTitle}
              </span>{" "}
              <a
                className="transition hover:text-uga-lime"
                href={`mailto:${activeIndex.contacts.email}`}
              >
                {activeIndex.contacts.email}
              </a>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeIndex.contacts.social.map((social) => (
                <FooterSocialLink social={social} key={social.label} />
              ))}
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

function FooterSocialLink({
  social,
}: {
  social: { label: string; href: string; mark: string };
}) {
  const isLinked = social.href !== "#";

  if (!isLinked) {
    return (
      <SocialPlaceholder disabled label={social.label} mark={social.mark} />
    );
  }

  return (
    <a
      aria-label={social.label}
      href={social.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <SocialPlaceholder label={social.label} mark={social.mark} />
    </a>
  );
}

function SocialPlaceholder({
  disabled = false,
  label,
  mark,
}: {
  disabled?: boolean;
  label: string;
  mark: string;
}) {
  return (
    <span
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center border transition ${
        disabled
          ? "cursor-default border-white/12 text-white/28"
          : "border-white/28 text-white/68 hover:border-uga-lime hover:text-uga-lime"
      }`}
      role="img"
      title={label}
    >
      <SocialIcon label={label} mark={mark} />
    </span>
  );
}

function SocialIcon({ label, mark }: { label: string; mark: string }) {
  const normalized = label.toLowerCase();

  if (normalized === "substack") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M4 3h16v2.8H4V3Zm0 4.7h16v2.8H4V7.7Zm0 4.7h16V21l-8-4.45L4 21v-8.6Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (normalized === "bluesky") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M7.2 4.1c1.95 1.48 4.05 4.48 4.8 6.1.75-1.62 2.85-4.62 4.8-6.1 1.4-1.06 3.68-1.88 3.68.73 0 .52-.3 4.39-.48 5.02-.62 2.22-2.87 2.79-4.87 2.45 3.5.6 4.4 2.58 2.47 4.56-3.66 3.77-5.26-.95-5.67-2.16-.08-.22-.11-.32-.13-.23-.02-.09-.05.01-.13.23-.41 1.21-2.01 5.93-5.67 2.16-1.93-1.98-1.03-3.96 2.47-4.56-2 .34-4.25-.23-4.87-2.45-.18-.63-.48-4.5-.48-5.02 0-2.61 2.28-1.79 3.68-.73Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (normalized === "telegram") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M21.55 4.15 18.3 19.48c-.25 1.08-.89 1.35-1.8.84l-4.98-3.67-2.4 2.31c-.27.27-.49.49-1 .49l.35-5.05 9.2-8.31c.4-.35-.09-.55-.62-.2L5.68 13.05.78 11.52c-1.06-.33-1.08-1.06.22-1.57L20.15 2.57c.89-.33 1.66.2 1.4 1.58Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (normalized === "linkedin") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M5.35 8.9h3.32V19H5.35V8.9Zm1.66-4.85a1.93 1.93 0 1 1 0 3.86 1.93 1.93 0 0 1 0-3.86ZM10.62 8.9h3.18v1.38h.05c.44-.84 1.52-1.72 3.13-1.72 3.35 0 3.97 2.2 3.97 5.07V19h-3.32v-4.76c0-1.14-.02-2.6-1.58-2.6-1.59 0-1.83 1.24-1.83 2.52V19h-3.32V8.9Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return <span className="text-[0.62rem] font-black">{mark.slice(0, 2)}</span>;
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
