"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type InternalNavItem = {
  href: string;
  label: string;
};

type InternalNavProps = {
  isSpike: boolean;
  items: readonly InternalNavItem[];
  layout?: "horizontal" | "vertical";
};

export function InternalNav({
  isSpike,
  items,
  layout = "vertical",
}: InternalNavProps) {
  const pathname = usePathname();
  const horizontal = layout === "horizontal";

  return (
    <nav className={horizontal ? "flex flex-wrap items-center gap-2" : "mt-3 grid gap-1"}>
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const className = horizontal
          ? active
            ? isSpike
              ? "rounded-full border border-uga-green bg-uga-green/12 px-4 py-2 text-sm font-semibold text-white"
              : "rounded-full border border-uga-green bg-uga-mist px-4 py-2 text-sm font-semibold text-uga-green"
            : isSpike
              ? "rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white/68 transition hover:border-uga-green hover:text-white"
              : "rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black/65 transition hover:border-uga-green hover:text-uga-green"
          : active
            ? isSpike
              ? "border-l-2 border-white bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              : "border-l-2 border-uga-green bg-uga-mist px-3 py-2 text-sm font-semibold text-uga-green"
            : isSpike
              ? "px-3 py-2 text-sm font-semibold text-white/68 transition hover:bg-white/6 hover:text-white"
              : "px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-uga-mist hover:text-uga-green";

        return (
          <Link className={className} href={item.href} key={item.label}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
