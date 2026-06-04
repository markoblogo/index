import { redirect } from "next/navigation";

type WeeklyReportRedirectPageProps = {
  searchParams: Promise<{
    lang?: string;
    notice?: string;
    reportId?: string;
    week?: string;
  }>;
};

export default async function WeeklyReportRedirectPage({
  searchParams,
}: WeeklyReportRedirectPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.notice) {
    query.set("notice", params.notice);
  }
  if (params.lang) {
    query.set("lang", params.lang);
  }
  if (params.reportId) {
    query.set("reportId", params.reportId);
  }
  if (params.week) {
    query.set("week", params.week);
  }

  redirect(`/admin/reports${query.size > 0 ? `?${query.toString()}` : ""}`);
}
