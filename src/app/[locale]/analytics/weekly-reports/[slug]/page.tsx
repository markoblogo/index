import { notFound } from "next/navigation";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import type { Locale } from "@/lib/i18n";
import { getPublishedWeeklyReportBySlug } from "@/lib/weekly-ai-report";

export const revalidate = 3600;

export default async function WeeklyReportDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { slug } = await params;
  const report = await getPublishedWeeklyReportBySlug(slug);

  if (!report) {
    notFound();
  }

  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] px-6 py-10 text-[#f8f8f2] lg:px-8 lg:py-14">
      <div className="mx-auto max-w-[1900px]">
        <WeeklyReportView report={report} />
      </div>
    </main>
  );
}
