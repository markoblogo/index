import { redirect } from "next/navigation";
import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";
import { getMonthlyMediaHubDigest, listUnifiedMediaHubRegistry } from "@/lib/media-hub-monitoring";
import {
  resetTelegramCollectedPostsIncludedForWindow,
  setTelegramCollectedPostIncluded,
  setTelegramCollectedPostsIncludedForChannel,
  syncTelegramResourcesForWindow,
} from "@/lib/telegram-source-collector";
import { listReportWorkspaceResources } from "@/lib/report-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubMonthlyPage() {
  await requireDemoRole("admin");

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    redirect("/admin/daily-inputs");
  }

  const [digest, registry] = await Promise.all([
    getMonthlyMediaHubDigest(),
    listUnifiedMediaHubRegistry(),
  ]);

  async function syncSourcesAction() {
    "use server";

    const [dailyResources, weeklyResources] = await Promise.all([
      listReportWorkspaceResources({ reportKind: "daily" }),
      listReportWorkspaceResources({ reportKind: "weekly" }),
    ]);

    await syncTelegramResourcesForWindow({
      maxPagesPerChannel: 12,
      resources: [...dailyResources, ...weeklyResources],
      until: new Date(digest.endAt),
    });
    redirect("/admin/media-hub/monthly");
  }

  async function toggleCollectedPostAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostIncluded(
      String(formData.get("postId") ?? ""),
      String(formData.get("included") ?? "0") === "1",
    );
    redirect("/admin/media-hub/monthly");
  }

  async function toggleChannelPostsAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostsIncludedForChannel({
      channelHandle: String(formData.get("channelHandle") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      included: String(formData.get("included") ?? "0") === "1",
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirect("/admin/media-hub/monthly");
  }

  async function resetWindowFiltersAction(formData: FormData) {
    "use server";

    await resetTelegramCollectedPostsIncludedForWindow({
      endAt: String(formData.get("endAt") ?? ""),
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirect("/admin/media-hub/monthly");
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          1D3X Media Hub
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          30-Day Monitoring Workspace
        </h1>
        <p className="mt-3 max-w-5xl text-sm leading-6 text-white/68">
          Unified 30-day Telegram monitoring pool across day and weekly source
          registries. This is the first real replacement step for the old
          Last30Days logic inside the Spike admin workflow.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Included posts" value={String(digest.postCount)} />
        <StatCard
          label="Active channels"
          value={String(digest.channels.filter((channel) => channel.includedPostCount > 0).length)}
        />
        <StatCard label="Registry entries" value={String(registry.length)} />
        <StatCard label="Window" value="30 days" />
      </div>

      <TelegramDigestPreview
        digest={digest}
        generateAction={null}
        generationState={null}
        reportId={null}
        reportKind="weekly"
        resetWindowFiltersAction={resetWindowFiltersAction}
        syncSourcesAction={syncSourcesAction}
        title="30-day collected Telegram posts"
        toggleChannelPostsAction={toggleChannelPostsAction}
        toggleCollectedPostAction={toggleCollectedPostAction}
      />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-[#050505] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}
