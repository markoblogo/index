type WeeklyAiReportModule = typeof import("@/lib/weekly-ai-report");

async function loadWeeklyAiReportModule() {
  return import("@/lib/weekly-ai-report") as Promise<WeeklyAiReportModule>;
}

export async function getPublishedWeeklyReports() {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.getPublishedWeeklyReports();
}

export async function getPublishedWeeklyReportBySlug(slug: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.getPublishedWeeklyReportBySlug(slug);
}

export async function getWeeklyTelegramDigest(weekEndDate: string, reportId: string | null) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.getWeeklyTelegramDigest(weekEndDate, reportId);
}

export async function autoPrepareWeeklyReportDraft(week?: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.autoPrepareWeeklyReportDraft(week);
}

export async function autoPublishDueWeeklyReports(week?: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.autoPublishDueWeeklyReports(week);
}

export async function sendDueWeeklyReports() {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.sendDueWeeklyReports();
}

export async function approveWeeklyReport(reportId: string, actorUserId: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.approveWeeklyReport(reportId, actorUserId);
}

export async function buildWeeklySourceManifest(reportId: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.buildWeeklySourceManifest(reportId);
}

export async function ensureWeeklyReport(weekEndDate: string, language: "uk" | "en") {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.ensureWeeklyReport(weekEndDate, language);
}

export async function generateWeeklyCoverAsset(
  reportId: string,
  actorUserId: string,
) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.generateWeeklyCoverAsset(reportId, actorUserId);
}

export async function generateWeeklyReportDraft(
  reportId: string,
  actorUserId: string,
) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.generateWeeklyReportDraft(reportId, actorUserId);
}

export async function getWeeklyReportById(id: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.getWeeklyReportById(id);
}

export async function listWeeklyReports() {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.listWeeklyReports();
}

export async function publishWeeklyReport(reportId: string, actorUserId: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.publishWeeklyReport(reportId, actorUserId);
}

export async function saveWeeklyReportAdminInputs(
  reportId: string,
  payload: Record<string, unknown>,
) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.saveWeeklyReportAdminInputs(reportId, payload);
}

export async function scheduleWeeklyReportTelegram(reportId: string, actorUserId: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.scheduleWeeklyReportTelegram(reportId, actorUserId);
}

export async function sendWeeklyReportTelegramNow(reportId: string, actorUserId: string) {
  const loadedModule = await loadWeeklyAiReportModule();
  return loadedModule.sendWeeklyReportTelegramNow(reportId, actorUserId);
}
