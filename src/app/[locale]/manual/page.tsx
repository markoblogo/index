import { redirect } from "next/navigation";
import { ManualPageShell } from "@/components/manual/manual-ui";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getSsiPublicManual } from "@/lib/ssi-manual-content";

type ManualPageProps = {
  params: Promise<{ locale: Locale }>;
};

export default async function PublicManualPage({ params }: ManualPageProps) {
  const { locale } = await params;

  if (getActiveIndexConfig().id !== "spike-ua") {
    redirect(`/${locale}`);
  }

  const manual = getSsiPublicManual(locale);

  return <ManualPageShell {...manual} />;
}
