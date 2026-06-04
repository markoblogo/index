import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export const revalidate = 3600;

export default async function MarketIntelligencePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/analytics/weekly-reports`);
}
