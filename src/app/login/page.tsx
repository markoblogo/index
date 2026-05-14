import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authenticateDemoUser } from "@/lib/demo-allowlist";
import { getCurrentDemoUser, getRoleHome, setDemoSession } from "@/lib/demo-auth";
import { SITE_CONFIG } from "@/lib/constants";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, cookieStore, currentUser] = await Promise.all([
    searchParams,
    cookies(),
    getCurrentDemoUser(),
  ]);
  const locale = resolveLoginLocale(params.locale, cookieStore.get(LOCALE_COOKIE)?.value);
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const copy = getLoginCopy(locale, isSpike);

  if (currentUser) {
    redirect(getRoleHome(currentUser.role));
  }

  async function login(formData: FormData) {
    "use server";

    const loginValue = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const localeValue = String(formData.get("locale") ?? "en");
    const resolvedLocale = resolveLoginLocale(localeValue);
    const user = authenticateDemoUser({ login: loginValue, password });

    if (!user) {
      redirect(`/login?locale=${resolvedLocale}&error=invalid`);
    }

    await setDemoSession(user);
    redirect(getRoleHome(user.role));
  }

  return (
    <main
      className={
        isSpike
          ? "flex min-h-screen items-center justify-center px-5 py-10 text-[#f8f8f2] [background:var(--spike-hero-bg)]"
          : "flex min-h-screen items-center justify-center bg-uga-mist px-5 py-10 text-black"
      }
    >
      <section
        className={
          isSpike
            ? "w-full max-w-[520px] overflow-hidden rounded-[1.45rem] border border-white/18 bg-[#050505]/92 shadow-2xl shadow-black/35 backdrop-blur"
            : "w-full max-w-[440px] border border-black bg-white"
        }
      >
        <div className={isSpike ? "border-b border-white/12 p-6" : "border-b border-black p-5"}>
          <p
            className={
              isSpike
                ? "text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]"
                : "text-xs font-black uppercase tracking-[0.18em] text-uga-green"
            }
          >
            {copy.brand}
          </p>
          <h1
            className={
              isSpike
                ? "mt-4 text-[clamp(2.4rem,7vw,4rem)] font-black uppercase leading-[0.9] tracking-normal text-[#f8f8f2]"
                : "mt-3 text-3xl font-black uppercase leading-tight tracking-normal text-black"
            }
          >
            {copy.title}
          </h1>
          <p
            className={
              isSpike
                ? "mt-4 text-sm font-semibold leading-6 text-white/62"
                : "mt-3 text-sm font-semibold leading-6 text-black/65"
            }
          >
            {copy.helper}
          </p>
        </div>

        <form action={login} className={isSpike ? "grid gap-4 p-6" : "grid gap-4 p-5"}>
          <input name="locale" type="hidden" value={locale} />
          <label
            className={
              isSpike
                ? "grid gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/52"
                : "grid gap-2 text-sm font-black uppercase tracking-[0.12em] text-black/55"
            }
          >
            {copy.email}
            <input
              autoComplete="username"
              className={
                isSpike
                  ? "rounded-[0.85rem] border border-white/16 bg-black px-4 py-3 text-base font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/34 focus:border-[var(--spike-accent)]"
                  : "border border-black bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-black outline-none transition focus:border-uga-green"
              }
              name="email"
              placeholder={copy.emailPlaceholder}
              required
              type="text"
            />
          </label>
          <label
            className={
              isSpike
                ? "grid gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/52"
                : "grid gap-2 text-sm font-black uppercase tracking-[0.12em] text-black/55"
            }
          >
            {copy.password}
            <input
              autoComplete="current-password"
              className={
                isSpike
                  ? "rounded-[0.85rem] border border-white/16 bg-black px-4 py-3 text-base font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/34 focus:border-[var(--spike-accent)]"
                  : "border border-black bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-black outline-none transition focus:border-uga-green"
              }
              name="password"
              placeholder="••••••••"
              required
              type="password"
            />
          </label>

          {params.error === "invalid" ? (
            <p
              className={
                isSpike
                  ? "rounded-[0.85rem] border border-[var(--spike-pink)]/60 bg-[var(--spike-pink)]/12 px-3 py-2 text-sm font-semibold text-white"
                  : "border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              }
            >
              {copy.error}
            </p>
          ) : null}

          {isSpike ? (
            <button
              className="w-full rounded-full bg-[var(--spike-accent)] px-5 py-3 text-base font-black text-[#050505] transition hover:bg-white"
              type="submit"
            >
              {copy.submit}
            </button>
          ) : (
            <Button className="w-full" type="submit">
              {copy.submit}
            </Button>
          )}
        </form>

        <div className={isSpike ? "border-t border-white/12 px-6 py-5" : "border-t border-black px-5 py-4"}>
          <p
            className={
              isSpike
                ? "text-xs font-black uppercase tracking-[0.2em] text-[var(--spike-pink)]"
                : "text-xs font-black uppercase tracking-[0.14em] text-black/45"
            }
          >
            {copy.demoTitle}
          </p>
          <div
            className={
              isSpike
                ? "mt-3 grid gap-1.5 text-xs font-semibold leading-5 text-white/56"
                : "mt-2 grid gap-1 text-xs font-semibold leading-5 text-black/60"
            }
          >
            <p>{copy.adminCredentials}</p>
            <p>{copy.respondentCredentials}</p>
            <p>{copy.shortCredentials}</p>
          </div>
          <Link
            className={
              isSpike
                ? "mt-5 inline-flex text-sm font-black text-[var(--spike-accent)] underline-offset-4 transition hover:text-white hover:underline"
                : "mt-4 inline-flex text-sm font-black text-uga-green underline-offset-4 transition hover:text-black hover:underline"
            }
            href={`/${locale}`}
          >
            {copy.back}
          </Link>
        </div>
      </section>
    </main>
  );
}

function resolveLoginLocale(...values: Array<string | undefined>): Locale {
  for (const value of values) {
    if (value && isLocale(value)) {
      return value;
    }
  }

  return "en";
}

type LoginCopy = {
  adminCredentials: string;
  back: string;
  brand: string;
  demoTitle: string;
  email: string;
  emailPlaceholder: string;
  error: string;
  helper: string;
  password: string;
  respondentCredentials: string;
  shortCredentials: string;
  submit: string;
  title: string;
};

const ugaLoginCopy: Record<
  Locale,
  LoginCopy
> = {
  en: {
    adminCredentials: "Admin: admin@uga.ua / admin",
    back: "Back to public site",
    brand: "UGA Index",
    demoTitle: "Demo access",
    email: "Email",
    emailPlaceholder: "admin@uga.ua",
    error: "Invalid demo credentials.",
    helper: "Use demo credentials to preview administrator or respondent workflows.",
    password: "Password",
    respondentCredentials: "Respondent: bunge@uga-index.demo / respondent",
    shortCredentials: "Short aliases: admin/admin or respondent/respondent",
    submit: "Sign in",
    title: "Sign in to UGA Index",
  },
  uk: {
    adminCredentials: "Адміністратор: admin@uga.ua / admin",
    back: "Назад до публічного сайту",
    brand: "UGA Index",
    demoTitle: "Демо-доступ",
    email: "Email",
    emailPlaceholder: "admin@uga.ua",
    error: "Невірні демо-дані для входу.",
    helper:
      "Використайте демо-доступ для перегляду сценарію адміністратора або респондента.",
    password: "Пароль",
    respondentCredentials: "Респондент: bunge@uga-index.demo / respondent",
    shortCredentials: "Швидкий вхід: admin/admin або respondent/respondent",
    submit: "Увійти",
    title: "Вхід до UGA Index",
  },
};

const spikeLoginCopy: Record<Locale, LoginCopy> = {
  en: {
    adminCredentials: "Admin: admin@spike-ua.demo / admin",
    back: "Back to public site",
    brand: "SPIKE Spot Commodity Index Ukraine",
    demoTitle: "Spike demo access",
    email: "Email",
    emailPlaceholder: "admin@spike-ua.demo",
    error: "Invalid Spike demo credentials.",
    helper:
      "Use Spike demo credentials to preview administrator or respondent-partner workflows.",
    password: "Password",
    respondentCredentials: "Respondent: respondent-1@spike-ua.demo / respondent",
    shortCredentials: "Short aliases: admin/admin or respondent/respondent",
    submit: "Sign in",
    title: "Sign in to Spike Index",
  },
  uk: {
    adminCredentials: "Адміністратор: admin@spike-ua.demo / admin",
    back: "Назад до публічного сайту",
    brand: "SPIKE Spot Commodity Index Ukraine",
    demoTitle: "Демо-доступ Spike",
    email: "Email",
    emailPlaceholder: "admin@spike-ua.demo",
    error: "Невірні демо-дані Spike для входу.",
    helper:
      "Використайте демо-доступ Spike для перегляду сценарію адміністратора або партнера-респондента.",
    password: "Пароль",
    respondentCredentials: "Респондент: respondent-1@spike-ua.demo / respondent",
    shortCredentials: "Швидкий вхід: admin/admin або respondent/respondent",
    submit: "Увійти",
    title: "Вхід до Spike Index",
  },
};

function getLoginCopy(locale: Locale, isSpike: boolean) {
  return isSpike ? spikeLoginCopy[locale] : ugaLoginCopy[locale];
}
