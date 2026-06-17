type WeeklyAiReportModule = typeof import("@/lib/weekly-ai-report");

async function loadWeeklyAiReportModule() {
  return import("@/lib/weekly-ai-report") as Promise<WeeklyAiReportModule>;
}

export async function getPublishedWeeklyReports() {
  const module = await loadWeeklyAiReportModule();
  return module.getPublishedWeeklyReports();
}

export async function getPublishedWeeklyReportBySlug(slug: string) {
  const module = await loadWeeklyAiReportModule();
  return module.getPublishedWeeklyReportBySlug(slug);
}

export async function getWeeklyTelegramDigest(weekEndDate: string, reportId: string | null) {
  const module = await loadWeeklyAiReportModule();
  return module.getWeeklyTelegramDigest(weekEndDate, reportId);
}

export async function autoPrepareWeeklyReportDraft(week?: string) {
  const module = await loadWeeklyAiReportModule();
  return module.autoPrepareWeeklyReportDraft(week);
}

export async function autoPublishDueWeeklyReports(week?: string) {
  const module = await loadWeeklyAiReportModule();
  return module.autoPublishDueWeeklyReports(week);
}

export async function sendDueWeeklyReports() {
  const module = await loadWeeklyAiReportModule();
  return module.sendDueWeeklyReports();
}

export async function approveWeeklyReport(reportId: string, actorUserId: string) {
  const module = await loadWeeklyAiReportModule();
  return module.approveWeeklyReport(reportId, actorUserId);
}

export async function buildWeeklySourceManifest(reportId: string) {
  const module = await loadWeeklyAiReportModule();
  return module.buildWeeklySourceManifest(reportId);
}

export async function ensureWeeklyReport(weekEndDate: string, language: "uk" | "en") {
  const module = await loadWeeklyAiReportModule();
  return module.ensureWeeklyReport(weekEndDate, language);
}

export async function generateWeeklyCoverAsset(
  reportId: string,
  actorUserId: string,
) {
  const module = await loadWeeklyAiReportModule();
  return module.generateWeeklyCoverAsset(reportId, actorUserId);
}

export async function generateWeeklyReportDraft(
  reportId: string,
  actorUserId: string,
) {
  const module = await loadWeeklyAiReportModule();
  return module.generateWeeklyReportDraft(reportId, actorUserId);
}

export async function getWeeklyReportById(id: string) {
  const module = await loadWeeklyAiReportModule();
  return module.getWeeklyReportById(id);
}

export async function listWeeklyReports() {
  const module = await loadWeeklyAiReportModule();
  return module.listWeeklyReports();
}

export async function publishWeeklyReport(reportId: string, actorUserId: string) {
  const module = await loadWeeklyAiReportModule();
  return module.publishWeeklyReport(reportId, actorUserId);
}

export async function saveWeeklyReportAdminInputs(
  reportId: string,
  payload: Record<string, unknown>,
) {
  const module = await loadWeeklyAiReportModule();
  return module.saveWeeklyReportAdminInputs(reportId, payload);
}

export async function scheduleWeeklyReportTelegram(reportId: string, actorUserId: string) {
  const module = await loadWeeklyAiReportModule();
  return module.scheduleWeeklyReportTelegram(reportId, actorUserId);
}

export async function sendWeeklyReportTelegramNow(reportId: string, actorUserId: string) {
  const module = await loadWeeklyAiReportModule();
  return module.sendWeeklyReportTelegramNow(reportId, actorUserId);
}
