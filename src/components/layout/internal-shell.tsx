import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE_CONFIG } from "@/lib/constants";
import type { DemoUser } from "@/lib/demo-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { InternalNav } from "@/components/layout/internal-nav";

type InternalShellProps = {
  children: ReactNode;
  user: DemoUser;
};

const baseNavByRole = {
  admin: [
    { href: "/admin", label: "Admin dashboard" },
    { href: "/admin/daily-inputs", label: "Daily input" },
    { href: "/admin/respondents", label: "Respondents" },
    { href: "/admin/calculate", label: "Publish index" },
    { href: "/admin/integrity", label: "Integrity" },
    { href: "/admin/media-hub", label: "Context" },
    { href: "/admin/manual", label: "Manual" },
    { href: "/admin/embed", label: "Website embed" },
  ],
  respondent: [{ href: "/respondent", label: "Survey form" }],
  member: [
    { href: "/member", label: "Member view" },
    { href: "/member", label: "Published indices" },
  ],
} as const;

export function InternalShell({ children, user }: InternalShellProps) {
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const navItems = baseNavByRole[user.role].map((item) => {
    if (user.role !== "admin" || !isSpike) {
      return item;
    }

    if (item.href === "/admin/respondents") {
      return { ...item, label: "Partner respondents" };
    }

    if (item.href === "/admin/calculate") {
      return { ...item, label: "Publish SPIKE SPOT INDEX" };
    }

    if (item.href === "/admin/embed") {
      return { ...item, label: "Spike embed" };
    }

    return item;
  });
  const filteredNavItems =
    user.role === "admin" && !isSpike
      ? navItems.filter((item) => item.href !== "/admin/media-hub")
      : navItems;

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
        <div className="mx-auto flex max-w-[118rem] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="flex w-fit items-center gap-3"
              href={`/${user.role}`}
            >
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
            <form action="/logout" method="post">
              <button
                className="rounded-full bg-uga-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div
        className={
          isSpike
            ? "border-b border-white/10 bg-[#16153c]"
            : "border-b border-black/10 bg-white"
        }
      >
        <div className="mx-auto max-w-[118rem] px-6 py-3 lg:px-8">
          <div
            className={
              isSpike
                ? "overflow-x-auto rounded-[1.15rem] border border-white/12 bg-[#050505]/72 px-3 py-2 shadow-xl shadow-black/10"
                : "overflow-x-auto rounded-[1.15rem] border border-black/10 bg-white px-3 py-2"
            }
          >
            <div className="min-w-max">
              <InternalNav isSpike={isSpike} items={filteredNavItems} layout="horizontal" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[118rem] px-6 py-7 lg:px-8">
        <main className={isSpike ? "spike-internal-main" : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
}
