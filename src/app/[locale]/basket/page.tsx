import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default async function LocaleBasketCompatibilityRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
