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
};

export function InternalNav({ isSpike, items }: InternalNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-3 grid gap-1">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const className = active
          ? isSpike
            ? "border-l-2 border-white bg-white/10 px-3 py-2 text-sm font-semibold text-white"
            : "border-l-2 border-uga-green bg-uga-mist px-3 py-2 text-sm font-semibold text-uga-green"
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
