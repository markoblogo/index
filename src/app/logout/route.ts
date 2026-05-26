import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { clearDemoSession } from "@/lib/demo-auth";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function GET() {
  const locale = await getLogoutLocale();
  redirect(`/${locale}`);
}

export async function POST() {
  const locale = await getLogoutLocale();
  await clearDemoSession();
  redirect(`/${locale}`);
}

async function getLogoutLocale() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;

  return locale && isLocale(locale) ? locale : "en";
}
