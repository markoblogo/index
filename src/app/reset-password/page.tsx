import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { getPasswordResetTokenState } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const { error, token } = await searchParams;
  const tokenState = token
    ? await getPasswordResetTokenState(token)
    : { locale: "en" as const, state: "invalid" as const };
  const locale = tokenState.locale;
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const copy = getResetPasswordCopy(locale);
  const isValid = tokenState.state === "valid";
  const showPasswordError = error === "invalid";
  const showLinkError = !isValid || error === "expired";

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
          {copy.label}
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase leading-tight">
          {copy.title}
        </h1>
        <p
          className={
            isSpike
              ? "mt-3 text-sm leading-6 text-white/70"
              : "mt-3 text-sm leading-6 text-black/65"
          }
        >
          {isValid ? copy.helper : copy.invalidHelper}
        </p>

        {showPasswordError ? (
          <p className="mt-4 border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {copy.passwordError}
          </p>
        ) : null}

        {showLinkError ? (
          <p className="mt-4 border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {copy.linkError}
          </p>
        ) : null}

        {isValid ? (
          <form action="/api/reset-password" className="mt-5 grid gap-4" method="post">
            <input name="token" type="hidden" value={token ?? ""} />
            <label
              className={
                isSpike
                  ? "text-xs font-black uppercase tracking-[0.12em] text-white/55"
                  : "text-xs font-black uppercase tracking-[0.12em] text-black/50"
              }
            >
              <span className="mb-1 block">{copy.passwordLabel}</span>
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
              <span className="mb-1 block">{copy.confirmLabel}</span>
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
              {copy.submit}
            </button>
          </form>
        ) : null}

        <Link
          className="mt-4 inline-block text-sm font-semibold text-black/60 transition hover:text-uga-green"
          href={`/login?locale=${locale}`}
        >
          {copy.back}
        </Link>
      </section>
    </main>
  );
}

function getResetPasswordCopy(locale: "uk" | "en") {
  if (locale === "uk") {
    return {
      back: "Повернутися до входу",
      confirmLabel: "Повторіть пароль",
      helper: "Встановіть новий постійний пароль для входу в сервіс.",
      invalidHelper:
        "Посилання для скидання недійсне або вже використане. Запросіть нове на сторінці входу.",
      label: "Скидання пароля",
      linkError:
        "Посилання недійсне, прострочене або вже було використане. Запросіть нове посилання.",
      passwordError: "Паролі мають збігатися та містити щонайменше 8 символів.",
      passwordLabel: "Новий пароль",
      submit: "Зберегти пароль",
      title: "Встановіть новий пароль",
    };
  }

  return {
    back: "Back to sign in",
    confirmLabel: "Repeat password",
    helper: "Set a new permanent password for your account.",
    invalidHelper:
      "This reset link is invalid or already used. Request a new one from the sign-in page.",
    label: "Password reset",
    linkError:
      "The reset link is invalid, expired or already used. Request a new link.",
    passwordError: "Passwords must match and contain at least 8 characters.",
    passwordLabel: "New password",
    submit: "Save password",
    title: "Set new password",
  };
}
