import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  getAdminCalculationData,
  publishAdminIndices,
  recalculateAdminIndices,
  todayInputDate,
  type AdminCalculationCommodity,
} from "@/lib/admin-calculate";
import { unlockTodayPublishedIndices } from "@/lib/admin-publication-lock";
import {
  generateAndStoreDailyAiMarketBriefs,
  getAiMarketBriefAdminStatus,
} from "@/lib/ai-market-brief-lazy";

const CalculationWorkspaceAsync = dynamic(
  () =>
    import("@/components/admin/calculate/calculation-workspace").then(
      (module) => module.CalculationWorkspace,
    ),
  {
    loading: () => (
      <div className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-sm">
        Loading calculation workspace...
      </div>
    ),
  },
);

const AiMarketBriefWorkspaceAsync = dynamic(
  () =>
    import("@/components/admin/calculate/ai-market-brief-workspace").then(
      (module) => module.AiMarketBriefWorkspace,
    ),
  {
    loading: () => (
      <div className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-sm">
        Loading AI Market Brief...
      </div>
    ),
  },
);

type CalculatePageProps = {
  searchParams: Promise<{
    date?: string;
    notice?: string;
  }>;
};

const noticeText: Record<string, string> = {
  recalculated_mock:
    "Recalculation completed for the current session. Configure DATABASE_URL to persist calculation rows.",
  recalculated_database: "Calculations saved with new version numbers.",
  published_mock:
    "Publish action completed. Published values are locked in the current dev session.",
  published_database:
    "Publish action completed. Published values, locks and audit logs were created.",
  ai_generated: "AI Market Brief regenerated and stored for this trade date.",
  locked: `Published ${SITE_CONFIG.name} values for this trade date are locked and cannot be recalculated or republished.`,
  unlocked:
    "Published values for this trade date were unlocked. You can correct inputs and republish before midnight.",
  unlocked_empty: "There were no locked published values for this trade date.",
  unlock_unavailable: "Manual unlock is available only for the current Kyiv trade date.",
};

export default async function AdminCalculatePage({
  searchParams,
}: CalculatePageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const date = params.date ?? todayInputDate();
  const notice = params.notice ? noticeText[params.notice] : null;
  const data = await getAdminCalculationData(date);
  const showBenchmark = SITE_CONFIG.features.externalIndicative;
  const publishableCount = data.commodities.filter(
    (commodity) =>
      isPublishableForTenant(commodity) &&
      !commodity.published?.locked &&
      !data.lockedForPublication,
  ).length;

  const aiStatus = await getAiMarketBriefAdminStatus(date);

  async function recalculateAction(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await recalculateAdminIndices(formData, currentUser);
  }

  async function publishAction(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await publishAdminIndices(formData, currentUser);
  }

  async function unlockPublicationAction(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await unlockTodayPublishedIndices(formData, currentUser);
  }

  async function regenerateAiBriefAction(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    const requestedDate = String(formData.get("date") ?? todayInputDate());
    await generateAndStoreDailyAiMarketBriefs({
      actorUserId: currentUser.userId,
      date: requestedDate,
      force: true,
      source: "admin_regenerate",
    });
    redirect(`/admin/calculate?date=${requestedDate}&notice=ai_generated`);
  }

  return (
    <section className="grid gap-6">
      <CalculationWorkspaceAsync
        data={data}
        date={date}
        notice={notice ?? undefined}
        publishableCount={publishableCount}
        publishAction={publishAction}
        recalculateAction={recalculateAction}
        showBenchmark={showBenchmark}
        unlockAction={unlockPublicationAction}
      />

      {aiStatus.enabled ? (
        <AiMarketBriefWorkspaceAsync
          aiStatus={aiStatus}
          date={date}
          regenerateAiBriefAction={regenerateAiBriefAction}
        />
      ) : null}
    </section>
  );
}

function isPublishableForTenant(commodity: AdminCalculationCommodity) {
  if (commodity.value === null) {
    return false;
  }

  if (commodity.status === "publishable") {
    return true;
  }

  return (
    SITE_CONFIG.tenantId === "spike-ua" && commodity.status === "insufficient_data"
  );
}
