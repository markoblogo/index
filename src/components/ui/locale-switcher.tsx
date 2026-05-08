"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, type Locale, locales } from "@/lib/i18n";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <div
      aria-label="Language switcher"
      className="ui-control inline-flex h-9 items-center border border-black bg-white p-1 text-xs font-black uppercase text-black"
    >
      {locales.map((item, index) => {
        const href = buildLocaleHref(pathname, item);
        const label = item === "uk" ? "UA" : "EN";

        return (
          <span className="inline-flex items-center" key={item}>
            {index > 0 ? <span className="px-1 text-black/30">|</span> : null}
            <Link
              aria-current={item === locale ? "page" : undefined}
              className={
                item === locale
                  ? "ui-control bg-uga-dark px-2.5 py-1 text-white"
                  : "ui-control px-2.5 py-1 text-black/55 transition hover:text-uga-green"
              }
              href={href}
              onClick={() => setLocaleCookie(item)}
            >
              {label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

function buildLocaleHref(pathname: string, nextLocale: Locale) {
  const segments = pathname.split("/");

  if (segments[1] && locales.includes(segments[1] as Locale)) {
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return `/${nextLocale}`;
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
