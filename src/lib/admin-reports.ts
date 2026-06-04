import type { ReportWorkspaceResource } from "@/lib/report-workspace";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";
import type { WeeklyEditorialPostRow } from "@/lib/weekly-editorial-post-storage";

export type ReportAdminLocale = "en" | "uk";
export type ReportsSection = "daily" | "weekly";
export type WeeklyPreviewMode = "editorial" | "telegram" | "website";

export const reportsNoticeMap: Record<string, string> = {
  approved: "Weekly report approved.",
  article_published: "Editorial layer published.",
  article_republished: "Published editorial layer synced.",
  article_synced: "Editorial layer draft synced.",
  article_unpublished: "Editorial layer moved back to draft.",
  config_saved: "Report settings saved.",
  cover_generated: "Weekly cover asset generated.",
  generated: "Weekly draft generated.",
  manifest: "Weekly source manifest rebuilt.",
  notes_saved: "Weekly editor inputs saved.",
  post_filters_reset: "Digest filters reset for this window.",
  post_filter_updated: "Collected post filter updated.",
  published: "Weekly report published.",
  report_ready: "Weekly report loaded.",
  resource_added: "Resource added.",
  resource_toggled: "Resource status updated.",
  scheduled: "Weekly Telegram send scheduled.",
  sent: "Weekly report sent to Telegram.",
  sources_synced: "Telegram sources synced.",
};

export function normalizeAdminLocale(value?: string): ReportAdminLocale {
  return value === "en" ? "en" : "uk";
}

export function normalizeWeeklyPreviewMode(value?: string): WeeklyPreviewMode {
  if (value === "telegram" || value === "editorial") {
    return value;
  }

  return "website";
}

export function buildReportsUrl(
  section: ReportsSection,
  params: {
    lang?: string;
    notice?: string;
    preview?: string;
    reportId?: string;
    week?: string;
  } = {},
) {
  const search = new URLSearchParams();

  if (params.lang) {
    search.set("lang", params.lang);
  }
  if (params.reportId) {
    search.set("reportId", params.reportId);
  }
  if (params.preview && section === "weekly") {
    search.set("preview", params.preview);
  }
  if (params.week && section === "weekly") {
    search.set("week", params.week);
  }
  if (params.notice) {
    search.set("notice", params.notice);
  }

  const suffix = search.toString();
  return `/admin/reports/${section}${suffix ? `?${suffix}` : ""}`;
}

export function buildLegacyReportsUrl(params: {
  lang?: string;
  notice?: string;
  preview?: string;
  reportId?: string;
  week?: string;
  view?: string;
}) {
  const section = params.view === "daily" ? "daily" : "weekly";
  return buildReportsUrl(section, params);
}

export function formatDigestDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getDefaultWeekEnd() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diff = utcDay >= 6 ? utcDay - 6 : utcDay + 1;
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() - diff);
  return target.toISOString().slice(0, 10);
}

export function buildOperationalReadiness({
  activeWeeklyReport,
  dailyResources,
  hasDatabase,
  weeklyResources,
}: {
  activeWeeklyReport: WeeklyReportRecord | null;
  dailyResources: ReportWorkspaceResource[];
  hasDatabase: boolean;
  weeklyResources: ReportWorkspaceResource[];
}) {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasDailyTelegramTarget = Boolean(
    process.env.SPIKE_TELEGRAM_BOT_TOKEN &&
      (process.env.SPIKE_AI_TELEGRAM_CHAT_ID ||
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID ||
        process.env.UGA_TELEGRAM_ADMIN_CHAT_ID),
  );
  const hasWeeklyTelegramTarget = Boolean(
    process.env.SPIKE_TELEGRAM_BOT_TOKEN &&
      (process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ||
        process.env.SPIKE_AI_TELEGRAM_CHAT_ID ||
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID ||
        process.env.UGA_TELEGRAM_ADMIN_CHAT_ID),
  );
  const hasEditorialModel = Boolean(
    process.env.SPIKE_WEEKLY_EDITORIAL_MODEL ||
      process.env.SPIKE_WEEKLY_REPORT_MODEL ||
      process.env.SPIKE_AI_BRIEF_MODEL,
  );
  const dailyAnalysisSources = dailyResources.filter(
    (resource) => resource.role === "analysis_source" && resource.enabled,
  ).length;
  const weeklyAnalysisSources = weeklyResources.filter(
    (resource) => resource.role === "analysis_source" && resource.enabled,
  ).length;

  const items = [
    {
      detail: hasDatabase
        ? "Database-backed reports, resources and collected Telegram posts can be stored."
        : "DATABASE_URL is missing, so report creation and persistent source storage are unavailable in this environment.",
      label: "Database",
      ok: hasDatabase,
    },
    {
      detail: hasOpenAi
        ? "AI generation is available for daily and weekly editorial steps."
        : "OPENAI_API_KEY is missing, so generation falls back to deterministic content instead of the editorial model.",
      label: "AI generation",
      ok: hasOpenAi,
    },
    {
      detail:
        dailyAnalysisSources > 0
          ? `${dailyAnalysisSources} enabled daily analysis sources configured.`
          : "No enabled daily analysis sources configured yet.",
      label: "Daily sources",
      ok: dailyAnalysisSources > 0,
    },
    {
      detail:
        weeklyAnalysisSources > 0
          ? `${weeklyAnalysisSources} enabled weekly analysis sources configured.`
          : "No enabled weekly analysis sources configured yet.",
      label: "Weekly sources",
      ok: weeklyAnalysisSources > 0,
    },
    {
      detail: hasDailyTelegramTarget
        ? "Daily Telegram delivery target is configured."
        : "Daily Telegram target is not fully configured yet.",
      label: "Daily Telegram",
      ok: hasDailyTelegramTarget,
    },
    {
      detail: hasWeeklyTelegramTarget
        ? "Weekly Telegram delivery target is configured, including the cover-first weekly pack flow."
        : "Weekly Telegram target is not fully configured yet.",
      label: "Weekly Telegram",
      ok: hasWeeklyTelegramTarget,
    },
    {
      detail: hasEditorialModel
        ? "A weekly editorial model is configured for the narrative report/blog layer."
        : "No explicit weekly editorial model is configured.",
      label: "Weekly editorial model",
      ok: hasEditorialModel,
    },
    {
      detail: activeWeeklyReport
        ? `Weekly report context is loaded for ${activeWeeklyReport.weekEndDate} (${activeWeeklyReport.language.toUpperCase()}).`
        : "No active weekly report is loaded yet.",
      label: "Weekly report context",
      ok: Boolean(activeWeeklyReport),
    },
  ];

  const warnings: string[] = [];

  if (!hasDatabase) {
    warnings.push(
      "Weekly report actions currently show the workflow, but cannot persist reports or collected posts until DATABASE_URL is configured.",
    );
  }
  if (weeklyAnalysisSources === 0) {
    warnings.push(
      "Weekly generation should not be trusted until the configured Telegram channels are actually attached as enabled analysis sources.",
    );
  }
  if (!hasWeeklyTelegramTarget) {
    warnings.push(
      "Weekly Telegram publish flow is incomplete until the bot token and target chat ID are both configured.",
    );
  }

  return {
    canRunWeeklyGeneration: hasDatabase && weeklyAnalysisSources > 0,
    items,
    warnings,
  };
}

export function assessWeeklyWorkflowSurface(
  report: WeeklyReportRecord,
  digest: TelegramSourceDigest,
  editorialPost: WeeklyEditorialPostRow | null,
) {
  const totalExcluded = digest.channels.reduce(
    (sum, channel) => sum + channel.excludedPostCount,
    0,
  );
  const manifestSignature = report.sourceManifest?.telegramDigest?.signature ?? null;
  const digestMatchesCurrent = manifestSignature === digest.signature;
  const editorialSyncState = assessEditorialSyncState(report, editorialPost);

  return {
    digestMatchesCurrent,
    editorialMatchesCurrent: editorialSyncState.isCurrent,
    editorialSlug:
      editorialPost?.slug ||
      report.adminEditedContent?.editorialSlugOverride?.trim() ||
      report.content?.blogDraft?.slug ||
      "n/a",
    editorialStatusLabel: editorialPost
      ? editorialPost.status === "published"
        ? "published"
        : "draft"
      : "not materialized",
    excludedPosts: totalExcluded,
  };
}

export function assessEditorialSyncState(
  report: WeeklyReportRecord,
  editorialPost: WeeklyEditorialPostRow | null,
) {
  const currentSignature = buildEditorialDraftSignature(report);
  const storedSignature = editorialPost
    ? buildEditorialStoredSignature(editorialPost)
    : null;

  return {
    currentSignature,
    isCurrent: Boolean(storedSignature) && storedSignature === currentSignature,
    storedSignature,
  };
}

function buildEditorialDraftSignature(report: WeeklyReportRecord) {
  const draft = report.content?.blogDraft;
  const slug =
    report.adminEditedContent?.editorialSlugOverride?.trim() || draft?.slug || "";
  const payload = JSON.stringify({
    coverImageAlt:
      report.adminEditedContent?.coverImageAlt?.trim() || draft?.coverAlt || "",
    coverImageUrl: report.adminEditedContent?.coverImageUrl?.trim() || "",
    intro: draft?.intro || "",
    sections: draft?.sections || [],
    seoDescription: draft?.seoDescription || "",
    slug,
    subtitle: draft?.subtitle || "",
    title: draft?.title || "",
  });

  return shortHash(payload);
}

function buildEditorialStoredSignature(post: WeeklyEditorialPostRow) {
  return shortHash(
    JSON.stringify({
      coverImageAlt: post.coverImageAlt || "",
      coverImageUrl: post.coverImageUrl || "",
      intro: post.intro,
      sections: post.sectionsJson,
      seoDescription: post.seoDescription,
      slug: post.slug,
      subtitle: post.subtitle,
      title: post.title,
    }),
  );
}

function shortHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

export function humanizeWeeklyStatus(status: WeeklyReportRecord["status"]) {
  switch (status) {
    case "draft":
      return "setup";
    case "needs_inputs":
      return "waiting for inputs";
    case "needs_review":
      return "editor review";
    case "approved":
      return "ready to publish";
    case "published":
      return "published on site";
    case "telegram_scheduled":
      return "telegram queued";
    case "telegram_sent":
      return "telegram sent";
    case "failed":
      return "attention needed";
    default:
      return status;
  }
}

export function assessWeeklyReportPublicReadiness(report: WeeklyReportRecord) {
  const content = report.content;
  const holdPublication = report.adminEditedContent?.holdPublication === true;
  const approvedForWebsite = report.status === "approved";
  const approvedForTelegram =
    report.status === "approved" ||
    report.status === "published" ||
    report.status === "telegram_scheduled" ||
    report.status === "telegram_sent";
  const textChunks = [
    report.title,
    content?.methodology ?? "",
    content?.disclaimer ?? "",
    ...(content?.executiveSummary ?? []),
    ...(content?.parts.flatMap((part) =>
      [part.title, ...part.sections.map((section) => `${section.title} ${section.body}`)],
    ) ?? []),
    ...(content?.telegramMessages ?? []),
  ];
  const text = textChunks.join(" ").toLowerCase();
  const bannedPhrases = ["source-grounded", "datapack", "framework", "black-box", "n/a", "tokens", "cost", "debug"];
  const hasBannedPhrase = bannedPhrases.some((phrase) => text.includes(phrase));
  const mixedHeader = (content?.parts ?? []).some(
    (part) =>
      /[A-Za-z]/.test(part.title) && /[А-ЯІЇЄҐа-яіїєґ]/.test(part.title),
  );
  const hasThreeParts = (content?.parts.length ?? 0) === 3;
  const hasDisclaimer = Boolean(content?.disclaimer?.trim());
  const hasSourceManifest = Boolean(report.sourceManifest);
  const hasNoNA = !(content?.telegramMessages ?? []).some((message) => /n\/a/i.test(message));

  return {
    canPublish:
      !holdPublication &&
      approvedForWebsite &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    canScheduleTelegram:
      !holdPublication &&
      approvedForTelegram &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    canSendTelegram:
      !holdPublication &&
      approvedForTelegram &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    checklist: [
      {
        detail: holdPublication ? "Manual hold is enabled. Deadline fail-safe is paused." : "No manual hold. Deadline fail-safe is armed.",
        label: "Auto-publish hold",
        ok: !holdPublication,
      },
      {
        detail: approvedForWebsite ? "Weekly report is approved for website publication." : "Website publication is still blocked by workflow state.",
        label: "Approved for website",
        ok: approvedForWebsite,
      },
      {
        detail: approvedForTelegram ? "Weekly report can move to Telegram distribution." : "Telegram distribution is still blocked by workflow state.",
        label: "Approved for Telegram",
        ok: approvedForTelegram,
      },
      {
        detail: hasSourceManifest ? "Source manifest is attached." : "Source manifest is missing.",
        label: "Has source manifest",
        ok: hasSourceManifest,
      },
      {
        detail: hasThreeParts ? "Three weekly report parts are present." : "Weekly report must contain exactly three parts.",
        label: "Has three parts",
        ok: hasThreeParts,
      },
      {
        detail: hasDisclaimer ? "Disclaimer is present." : "Disclaimer is missing.",
        label: "Has disclaimer",
        ok: hasDisclaimer,
      },
      {
        detail: hasNoNA ? "Telegram content has no n/a values." : "Telegram content still contains n/a.",
        label: "No n/a in Telegram",
        ok: hasNoNA,
      },
      {
        detail: !hasBannedPhrase ? "No banned public phrases detected." : "Banned public phrases detected in content.",
        label: "No banned phrases",
        ok: !hasBannedPhrase,
      },
      {
        detail: !mixedHeader ? "Headers use a consistent language." : "Mixed-language headers detected.",
        label: "No mixed headers",
        ok: !mixedHeader,
      },
    ],
    warnings: [
      ...(holdPublication ? ["Automatic publication is manually held."] : []),
      ...(hasBannedPhrase ? ["Banned public phrases detected."] : []),
      ...(hasNoNA ? [] : ["Telegram messages contain n/a."]),
      ...(mixedHeader ? ["Mixed Ukrainian/English headers detected."] : []),
    ],
  };
}
