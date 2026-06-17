"use client";

import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";
import { WeeklyWorkflowCard } from "@/components/admin/reports/weekly-workflow-card";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";
import type { WeeklyEditorialPostRow } from "@/lib/weekly-editorial-post-storage";

export function WeeklyDigestWorkspace({
  activeReport,
  approveAction,
  editorialPost,
  generateAction,
  generateCoverAction,
  generationState,
  publishAction,
  publishEditorialArticleAction,
  publicReadiness,
  rebuildManifestAction,
  republishEditorialArticleAction,
  resetWindowFiltersAction,
  saveNotesAction,
  scheduleTelegramAction,
  sendTelegramNowAction,
  syncEditorialArticleAction,
  syncSourcesAction,
  toggleChannelPostsAction,
  toggleCollectedPostAction,
  unpublishEditorialArticleAction,
  weeklyDigest,
}: {
  activeReport: WeeklyReportRecord;
  approveAction: (formData: FormData) => Promise<void>;
  editorialPost: WeeklyEditorialPostRow | null;
  generateAction: (formData: FormData) => Promise<void>;
  generateCoverAction: (formData: FormData) => Promise<void>;
  generationState: {
    generatedAt: string | null;
    isCurrent: boolean;
    signature: string;
  } | null;
  publishAction: (formData: FormData) => Promise<void>;
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  publicReadiness: {
    canPublish: boolean;
    canScheduleTelegram: boolean;
    canSendTelegram: boolean;
    checklist: Array<{ detail: string; label: string; ok: boolean }>;
    warnings: string[];
  } | null;
  rebuildManifestAction: (formData: FormData) => Promise<void>;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  resetWindowFiltersAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
  scheduleTelegramAction: (formData: FormData) => Promise<void>;
  sendTelegramNowAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  syncSourcesAction: (formData: FormData) => Promise<void>;
  toggleChannelPostsAction: (formData: FormData) => Promise<void>;
  toggleCollectedPostAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
  weeklyDigest: TelegramSourceDigest;
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <TelegramDigestPreview
        digest={weeklyDigest}
        generateAction={generateAction}
        generationState={generationState}
        reportId={activeReport.id}
        reportKind="weekly"
        resetWindowFiltersAction={resetWindowFiltersAction}
        syncSourcesAction={syncSourcesAction}
        title="Weekly collected Telegram posts"
        toggleChannelPostsAction={toggleChannelPostsAction}
        toggleCollectedPostAction={toggleCollectedPostAction}
      />
      <WeeklyWorkflowCard
        activeReport={activeReport}
        approveAction={approveAction}
        editorialPost={editorialPost}
        generateCoverAction={generateCoverAction}
        generateAction={generateAction}
        publishAction={publishAction}
        publishEditorialArticleAction={publishEditorialArticleAction}
        publicReadiness={publicReadiness}
        rebuildManifestAction={rebuildManifestAction}
        republishEditorialArticleAction={republishEditorialArticleAction}
        saveNotesAction={saveNotesAction}
        scheduleTelegramAction={scheduleTelegramAction}
        sendTelegramNowAction={sendTelegramNowAction}
        syncEditorialArticleAction={syncEditorialArticleAction}
        unpublishEditorialArticleAction={unpublishEditorialArticleAction}
      />
    </div>
  );
}
