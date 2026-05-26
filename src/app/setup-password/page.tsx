import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createDemoSessionCookieValue,
  getCurrentDemoUser,
  getSafeRoleRedirect,
} from "@/lib/demo-auth";
import { SITE_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SetupPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [{ next, error }, user] = await Promise.all([
    searchParams,
    getCurrentDemoUser(),
  ]);

  if (!user) {
    redirect("/login");
  }

  if (user.passwordSetupStatus === "active") {
    redirect(getSafeRoleRedirect(user.role, next));
  }
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  return (
    <main
      className={
        isSpike
          ? "min-h-screen bg-[var(--spike-hero-bg)] px-6 py-12 text-[#f8f8f2]"
          : "min-h-screen bg-uga-mist px-6 py-12 text-uga-dark"
      }
    >
      <section
        className={
          isSpike
            ? "mx-auto max-w-md rounded-[1.25rem] border border-white/18 bg-[#050505]/92 p-6 shadow-2xl shadow-black/25"
            : "mx-auto max-w-md border border-black bg-white p-6"
        }
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
          Account setup
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase leading-tight">
          Set permanent password
        </h1>
        <p
          className={
            isSpike
              ? "mt-3 text-sm leading-6 text-white/70"
              : "mt-3 text-sm leading-6 text-black/65"
          }
        >
          You signed in with a temporary password. Set a permanent password to
          continue to your {SITE_CONFIG.name} workspace.
        </p>
        {error ? (
          <p className="mt-4 border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Passwords must match and contain at least 8 characters.
          </p>
        ) : null}
        <form action="/api/setup-password" className="mt-5 grid gap-4" method="post">
          <input name="next" type="hidden" value={next ?? ""} />
          <input
            name="setupSession"
            type="hidden"
            value={createDemoSessionCookieValue(user)}
          />
          <label
            className={
              isSpike
                ? "text-xs font-black uppercase tracking-[0.12em] text-white/55"
                : "text-xs font-black uppercase tracking-[0.12em] text-black/50"
            }
          >
            <span className="mb-1 block">New password</span>
            <input
              className={
                isSpike
                  ? "spike-login-input rounded-[0.85rem] border border-white/16 !bg-[#f8f8f2] px-4 py-3 text-base font-semibold normal-case tracking-normal !text-[#050505] caret-[var(--spike-accent)] outline-none transition"
                  : "admin-field"
              }
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label
            className={
              isSpike
                ? "text-xs font-black uppercase tracking-[0.12em] text-white/55"
                : "text-xs font-black uppercase tracking-[0.12em] text-black/50"
            }
          >
            <span className="mb-1 block">Repeat password</span>
            <input
              className={
                isSpike
                  ? "spike-login-input rounded-[0.85rem] border border-white/16 !bg-[#f8f8f2] px-4 py-3 text-base font-semibold normal-case tracking-normal !text-[#050505] caret-[var(--spike-accent)] outline-none transition"
                  : "admin-field"
              }
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <button className="border border-black bg-uga-dark px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
            Save password
          </button>
        </form>
        <Link
          className="mt-4 inline-block text-sm font-semibold text-black/60 transition hover:text-uga-green"
          href="/logout"
        >
          Sign out
        </Link>
      </section>
    </main>
  );
}
