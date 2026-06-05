import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
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
  if (SITE_CONFIG.tenantId === "spike-ua") {
    const section = params.view === "daily" ? "daily" : "weekly";
    const search = new URLSearchParams();
    if (params.lang) search.set("lang", params.lang);
    if (params.notice) search.set("notice", params.notice);
    if (params.preview) search.set("preview", params.preview);
    if (params.reportId) search.set("reportId", params.reportId);
    if (params.week) search.set("week", params.week);
    redirect(`/admin/media-hub/${section}${search.toString() ? `?${search.toString()}` : ""}`);
  }
  redirect(buildLegacyReportsUrl(params));
}
