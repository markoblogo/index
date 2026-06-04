import { redirect } from "next/navigation";
import { buildLegacyReportsUrl } from "@/lib/admin-reports";

type ReportsIndexPageProps = {
  searchParams: Promise<{
    lang?: string;
    notice?: string;
    preview?: string;
    reportId?: string;
    view?: string;
    week?: string;
  }>;
};

export default async function ReportsIndexPage({
  searchParams,
}: ReportsIndexPageProps) {
  const params = await searchParams;
  redirect(buildLegacyReportsUrl(params));
}
