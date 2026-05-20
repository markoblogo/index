import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE_CONFIG } from "@/lib/constants";
import type { DemoUser } from "@/lib/demo-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type InternalShellProps = {
  children: ReactNode;
  user: DemoUser;
};

const navByRole = {
  admin: [
    { href: "/admin", label: "Admin dashboard" },
    { href: "/admin/daily-inputs", label: "Daily input" },
    { href: "/admin/respondents", label: "Respondents" },
    { href: "/admin/calculate", label: "Calculate & publish" },
  ],
  respondent: [
    { href: "/respondent", label: "Survey form" },
  ],
  member: [
    { href: "/member", label: "Member view" },
    { href: "/member", label: "Published indices" },
  ],
} as const;

export function InternalShell({ children, user }: InternalShellProps) {
  const navItems = navByRole[user.role];
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  return (
    <div
      className={
        isSpike
          ? "spike-internal-shell min-h-screen text-[#f8f8f2]"
          : "uga-internal-shell min-h-screen bg-uga-mist text-uga-dark"
      }
    >
      <header
        className={
          isSpike
            ? "spike-internal-header border-b border-white/10 bg-[#050505]"
            : "border-b border-black/10 bg-white"
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link className="flex w-fit items-center gap-3" href={`/${user.role}`}>
              {SITE_CONFIG.logoPath ? (
                <Image
                  alt={`${SITE_CONFIG.name} logo`}
                  className={
                    isSpike
                      ? "h-10 w-auto object-contain invert"
                      : "brand-logo h-10 w-auto object-contain"
                  }
                  height={80}
                  src={SITE_CONFIG.logoPath}
                  width={140}
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-uga-green text-sm font-black text-uga-dark">
                  S
                </span>
              )}
              <span
                className={
                  isSpike
                    ? "border-l border-white/15 pl-3 text-xl font-semibold tracking-tight text-white"
                    : "border-l border-black/10 pl-3 text-xl font-semibold tracking-tight"
                }
              >
                {SITE_CONFIG.name}
              </span>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-uga-green px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  Preview mode
                </span>
              </div>
              <p className="mt-2 text-sm text-black/60">
                Signed in as {user.email} · {user.role}
                {user.respondentName ? ` · ${user.respondentName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isSpike ? <ThemeToggle /> : null}
            <Link
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black/65 transition hover:border-uga-green hover:text-uga-green"
              href="/"
            >
              Public site
            </Link>
            <Link
              className="rounded-full bg-uga-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green"
              href="/logout"
            >
              Logout
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-7 lg:grid-cols-[16rem_1fr] lg:px-8">
        <aside
          className={
            isSpike
              ? "spike-internal-sidebar rounded-[1.2rem] border border-white/18 bg-[#050505]/88 p-4 shadow-2xl shadow-black/20"
              : "border border-black bg-white p-4"
          }
        >
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
            Navigation
          </p>
          <nav className="mt-3 grid gap-1">
            {navItems.map((item) => (
              <Link
                className="px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-uga-mist hover:text-uga-green"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className={isSpike ? "spike-internal-main" : undefined}>{children}</main>
      </div>
    </div>
  );
}
