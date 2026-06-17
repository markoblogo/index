"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";
import type { WeeklyEditorialPostRow } from "@/lib/weekly-editorial-post-storage";
import { assessEditorialSyncState } from "@/lib/admin-reports";

export function WeeklyWorkflowCard({
  activeReport,
  approveAction,
  editorialPost,
  generateCoverAction,
  generateAction,
  publishAction,
  publishEditorialArticleAction,
  publicReadiness,
  republishEditorialArticleAction,
  rebuildManifestAction,
  saveNotesAction,
  scheduleTelegramAction,
  sendTelegramNowAction,
  syncEditorialArticleAction,
  unpublishEditorialArticleAction,
}: {
  activeReport: WeeklyReportRecord;
  approveAction: (formData: FormData) => Promise<void>;
  editorialPost: WeeklyEditorialPostRow | null;
  generateCoverAction: (formData: FormData) => Promise<void>;
  generateAction: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  publicReadiness: {
    canPublish: boolean;
    canScheduleTelegram: boolean;
    canSendTelegram: boolean;
    checklist: Array<{ detail: string; label: string; ok: boolean }>;
    warnings: string[];
  } | null;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  rebuildManifestAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
  scheduleTelegramAction: (formData: FormData) => Promise<void>;
  sendTelegramNowAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
}) {
  const editorialStatus =
    editorialPost?.status === "published" ? "published" : "draft";
  const canPublishEditorialArticle =
    activeReport.status === "published" && Boolean(activeReport.content?.blogDraft);
  const holdPublication = activeReport.adminEditedContent?.holdPublication === true;

  return (
    <div className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
        <Badge tone="ok">{activeReport.status}</Badge>
        <Badge>confidence {activeReport.dataConfidence}</Badge>
        <Badge>week {activeReport.weekEndDate}</Badge>
        <Badge>version {activeReport.version}</Badge>
        <Badge tone={editorialStatus === "published" ? "ok" : "warn"}>
          article {editorialStatus}
        </Badge>
        <Badge tone={holdPublication ? "danger" : undefined}>
          auto-publish {holdPublication ? "held" : "armed"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { action: rebuildManifestAction, label: "Refresh source pack" },
          { action: generateAction, label: "Build editor draft" },
          {
            action: generateCoverAction,
            disabled: !activeReport.content?.blogDraft,
            label: "Build cover",
          },
          { action: approveAction, label: "Mark ready" },
          {
            action: publishAction,
            disabled: !publicReadiness?.canPublish,
            label: "Publish weekly report",
          },
          {
            action: scheduleTelegramAction,
            disabled: !publicReadiness?.canScheduleTelegram,
            label: "Queue Telegram",
          },
          {
            action: sendTelegramNowAction,
            disabled: !publicReadiness?.canSendTelegram,
            label: "Send Telegram now",
          },
        ].map((item) => (
          <form action={item.action} key={item.label}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={item.disabled}
              type="submit"
            >
              {item.label}
            </button>
          </form>
        ))}
      </div>

      <form action={saveNotesAction} className="grid gap-3 rounded-[1rem] border border-white/10 p-4">
        <input name="reportId" type="hidden" value={activeReport.id} />
        <Area
          label="Weekly editor notes"
          name="manualNotes"
          value={activeReport.adminEditedContent?.manualNotes ?? ""}
        />
        <Area
          label="Structured weekly pack"
          name="structuredDataPack"
          value={activeReport.adminEditedContent?.structuredDataPack ?? ""}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Weekly cover asset URL"
            name="coverImageUrl"
            value={activeReport.adminEditedContent?.coverImageUrl ?? ""}
            wide
          />
          <Field
            label="Weekly cover alt text"
            name="coverImageAlt"
            value={activeReport.adminEditedContent?.coverImageAlt ?? ""}
          />
          <Field
            label="Weekly cover caption"
            name="coverImageCaption"
            value={activeReport.adminEditedContent?.coverImageCaption ?? ""}
          />
          <Field
            label="Editorial slug override"
            name="editorialSlugOverride"
            placeholder={activeReport.content?.blogDraft?.slug ?? "weekly-market-intelligence-slug"}
            value={activeReport.adminEditedContent?.editorialSlugOverride ?? ""}
            wide
          />
          <label className="flex items-start gap-3 rounded-xl border border-red-400/18 bg-red-400/6 px-4 py-3 text-sm text-white/78 md:col-span-2">
            <input
              className="mt-1 h-4 w-4"
              defaultChecked={holdPublication}
              name="holdPublication"
              type="checkbox"
              value="1"
            />
            <span>
              <span className="font-semibold text-white">Hold automatic publication</span>
              <span className="block text-white/62">
                Stops deadline fail-safe publication for both website and Telegram until manually released.
              </span>
            </span>
          </label>
        </div>
        <button className="w-fit rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]" type="submit">
          Save weekly inputs
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetadataBox activeReport={activeReport} />
        <div className="grid gap-4">
          {publicReadiness ? (
            <ReadinessBox activeReport={activeReport} readiness={publicReadiness} />
          ) : null}
          <EditorialPublishBox
            activeReport={activeReport}
            canPublishEditorialArticle={canPublishEditorialArticle}
            editorialPost={editorialPost}
            editorialSyncState={assessEditorialSyncState(activeReport, editorialPost)}
            publishEditorialArticleAction={publishEditorialArticleAction}
            republishEditorialArticleAction={republishEditorialArticleAction}
            syncEditorialArticleAction={syncEditorialArticleAction}
            unpublishEditorialArticleAction={unpublishEditorialArticleAction}
          />
        </div>
      </div>
    </div>
  );
}

function MetadataBox({ activeReport }: { activeReport: WeeklyReportRecord }) {
  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <h3 className="text-base font-semibold text-white">Run details</h3>
      <div className="mt-3 grid gap-2 text-sm text-white/68">
        <p><span className="font-semibold text-white">Draft model:</span> {activeReport.aiModel ?? "not generated yet"}</p>
        <p><span className="font-semibold text-white">Draft built at:</span> {activeReport.aiGeneratedAt ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Telegram target time:</span> {activeReport.telegramSendAt ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Telegram message IDs:</span> {activeReport.telegramMessageIds.length > 0 ? activeReport.telegramMessageIds.join(", ") : "n/a"}</p>
        <p><span className="font-semibold text-white">Cover asset ID:</span> {activeReport.adminEditedContent?.coverAssetId ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Auto-publish hold:</span> {activeReport.adminEditedContent?.holdPublication ? "on" : "off"}</p>
        <p><span className="font-semibold text-white">Missing items:</span> {activeReport.missingInputs.length}</p>
        <p><span className="font-semibold text-white">Warnings:</span> {activeReport.aiWarnings.length}</p>
      </div>
    </div>
  );
}

function ReadinessBox({
  activeReport,
  readiness,
}: {
  activeReport: WeeklyReportRecord;
  readiness: {
    checklist: Array<{ detail: string; label: string; ok: boolean }>;
    warnings: string[];
  };
}) {
  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <h3 className="text-base font-semibold text-white">Publish checks</h3>
      <div className="mt-3 grid gap-2">
        {readiness.checklist.map((item) => (
          <div className="flex items-start gap-3" key={item.label}>
            <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-black ${item.ok ? "bg-uga-green text-white" : "bg-red-500 text-white"}`}>
              {item.ok ? "✓" : "!"}
            </span>
            <div className="text-sm text-white/68">
              <p className="font-semibold text-white">{item.label}</p>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {readiness.warnings.length > 0 ? (
        <div className="mt-4 rounded-[1rem] border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {readiness.warnings.join(" ")}
        </div>
      ) : null}
      {activeReport.adminEditedContent?.holdPublication ? (
        <div className="mt-4 rounded-[1rem] border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          Auto-publication is manually held. Cron will not publish this weekly report or send it to Telegram until the hold is removed.
        </div>
      ) : null}
    </div>
  );
}

function EditorialPublishBox({
  activeReport,
  canPublishEditorialArticle,
  editorialPost,
  editorialSyncState,
  publishEditorialArticleAction,
  republishEditorialArticleAction,
  syncEditorialArticleAction,
  unpublishEditorialArticleAction,
}: {
  activeReport: WeeklyReportRecord;
  canPublishEditorialArticle: boolean;
  editorialPost: WeeklyEditorialPostRow | null;
  editorialSyncState: {
    currentSignature: string;
    isCurrent: boolean;
    storedSignature: string | null;
  };
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
}) {
  const status = editorialPost
    ? (editorialPost.status === "published" ? "published" : "draft")
    : "not_materialized";
  const weeklyReportUrl = `/${activeReport.language === "uk" ? "uk" : "en"}/analytics/weekly-reports/${activeReport.slug}`;
  const effectiveSlug =
    editorialPost?.slug ||
    activeReport.adminEditedContent?.editorialSlugOverride?.trim() ||
    activeReport.content?.blogDraft?.slug ||
    "n/a";
  const publicUrl =
    editorialPost?.status === "published" && effectiveSlug !== "n/a"
      ? `/${activeReport.language === "uk" ? "uk" : "en"}/market-intelligence/${effectiveSlug}`
      : null;
  const predictedUrl =
    effectiveSlug !== "n/a"
      ? `/${activeReport.language === "uk" ? "uk" : "en"}/market-intelligence/${effectiveSlug}`
      : "n/a";

  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Public editorial post</h3>
          <p className="mt-1 text-sm text-white/62">
            Separate persisted public entity for SEO and LLMO distribution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={syncEditorialArticleAction}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!activeReport.content?.blogDraft}
              type="submit"
            >
              {editorialPost ? "Sync draft" : "Materialize draft"}
            </button>
          </form>
          <form action={republishEditorialArticleAction}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-uga-green/35 px-3 py-1 text-xs font-semibold text-uga-green transition hover:border-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!activeReport.content?.blogDraft}
              type="submit"
            >
              Republish / sync
            </button>
          </form>
          <form
            action={
              status === "published"
                ? unpublishEditorialArticleAction
                : publishEditorialArticleAction
            }
          >
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-amber-400/35 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!canPublishEditorialArticle && status !== "published"}
              type="submit"
            >
              {status === "published" ? "Unpublish" : "Publish market-intelligence article"}
            </button>
          </form>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-white/68">
        <p><span className="font-semibold text-white">Status:</span> {status === "not_materialized" ? "not materialized" : status}</p>
        <p><span className="font-semibold text-white">Sync state:</span> {editorialSyncState.isCurrent ? "current" : "source changed since last sync"}</p>
        <p><span className="font-semibold text-white">Weekly report URL:</span> {weeklyReportUrl}</p>
        <p><span className="font-semibold text-white">URL:</span> {publicUrl ?? predictedUrl}</p>
        <p><span className="font-semibold text-white">Slug:</span> {effectiveSlug}</p>
        <p><span className="font-semibold text-white">Slug override:</span> {activeReport.adminEditedContent?.editorialSlugOverride?.trim() || "none"}</p>
        <p><span className="font-semibold text-white">Published at:</span> {editorialPost?.publishedAt?.toISOString() ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Current signature:</span> {editorialSyncState.currentSignature}</p>
        <p><span className="font-semibold text-white">Stored signature:</span> {editorialSyncState.storedSignature ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Source:</span> {activeReport.content?.blogDraft ? "weekly blogDraft available" : "blogDraft missing"}</p>
        {publicUrl ? (
          <p>
            <span className="font-semibold text-white">Public URL:</span>{" "}
            <Link className="text-uga-green underline-offset-2 hover:underline" href={publicUrl}>
              {publicUrl}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "danger" | "ok" | "warn";
}) {
  const className =
    tone === "ok"
      ? "rounded-full bg-uga-green/15 px-3 py-1 text-uga-green"
      : tone === "warn"
        ? "rounded-full border border-amber-400/30 px-3 py-1 text-amber-100"
        : tone === "danger"
          ? "rounded-full border border-red-400/40 px-3 py-1 text-red-200"
          : "rounded-full border border-white/12 px-3 py-1 text-white/72";

  return <span className={className}>{children}</span>;
}

function Field({
  label,
  name,
  placeholder,
  value,
  wide = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-2 text-sm font-semibold text-white/78 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <input
        className="rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function Area({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-white/78">
      {label}
      <textarea
        className="min-h-28 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
        defaultValue={value}
        name={name}
      />
    </label>
  );
}
