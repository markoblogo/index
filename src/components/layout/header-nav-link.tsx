"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderNavLinkProps = {
  href: string;
  isSpike: boolean;
  label: string;
};

export function HeaderNavLink({ href, isSpike, label }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const isHome = href.split("/").filter(Boolean).length === 1;
  const isActive = isHome ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const baseClass =
    "relative whitespace-nowrap pb-1 text-sm font-semibold transition after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:transition-transform";
  const inactiveClass = isSpike
    ? "text-white/62 after:scale-x-0 after:bg-white/75 hover:text-white"
    : "text-black/65 after:scale-x-0 after:bg-uga-lime hover:text-uga-green";
  const activeClass = isSpike
    ? "text-white after:scale-x-100 after:bg-white"
    : "text-uga-dark after:scale-x-100 after:bg-uga-lime";

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
      href={href}
    >
      {label}
    </Link>
  );
}
