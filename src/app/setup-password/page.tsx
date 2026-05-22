import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDemoUser, getSafeRoleRedirect } from "@/lib/demo-auth";

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

  return (
    <main className="min-h-screen bg-uga-mist px-6 py-12 text-uga-dark">
      <section className="mx-auto max-w-md border border-black bg-white p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
          Account setup
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase leading-tight">
          Set permanent password
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/65">
          You signed in with a temporary password. Set a permanent password to
          continue to your UGA Index workspace.
        </p>
        {error ? (
          <p className="mt-4 border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Passwords must match and contain at least 8 characters.
          </p>
        ) : null}
        <form action="/api/setup-password" className="mt-5 grid gap-4" method="post">
          <input name="next" type="hidden" value={next ?? ""} />
          <label className="text-xs font-black uppercase tracking-[0.12em] text-black/50">
            <span className="mb-1 block">New password</span>
            <input
              className="admin-field"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="text-xs font-black uppercase tracking-[0.12em] text-black/50">
            <span className="mb-1 block">Repeat password</span>
            <input
              className="admin-field"
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
