type RespondentDirectoryModule = typeof import("@/lib/respondent-directory");

export type {
  RespondentCollectionMode,
  RespondentDirectoryEntry,
  RespondentEmailScheduleSettings,
  RespondentPasswordStatus,
  RespondentStatus,
} from "@/lib/respondent-directory";

async function loadRespondentDirectoryModule() {
  return import("@/lib/respondent-directory") as Promise<
    RespondentDirectoryModule
  >;
}

export async function getActiveRespondentCount() {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.getActiveRespondentCount();
}

export async function getActiveRespondentCountData() {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.getActiveRespondentCountData();
}

export async function getRespondentDirectory() {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.getRespondentDirectory();
}

export async function getRespondentDirectoryData() {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.getRespondentDirectoryData();
}

export async function getRespondentEmailScheduleData() {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.getRespondentEmailScheduleData();
}

export async function regenerateRespondentTemporaryPasswordData(
  ...args: Parameters<
    RespondentDirectoryModule["regenerateRespondentTemporaryPasswordData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.regenerateRespondentTemporaryPasswordData(...args);
}

export async function resendRespondentOnboardingData(
  ...args: Parameters<RespondentDirectoryModule["resendRespondentOnboardingData"]>
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.resendRespondentOnboardingData(...args);
}

export async function addRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["addRespondentContactData"]>
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.addRespondentContactData(...args);
}

export async function addRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["addRespondentDirectoryEntryData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.addRespondentDirectoryEntryData(...args);
}

export async function deleteRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["deleteRespondentContactData"]>
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.deleteRespondentContactData(...args);
}

export async function deleteRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["deleteRespondentDirectoryEntryData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.deleteRespondentDirectoryEntryData(...args);
}

export async function updateRespondentEmailScheduleData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentEmailScheduleData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.updateRespondentEmailScheduleData(...args);
}

export async function updateRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["updateRespondentContactData"]>
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.updateRespondentContactData(...args);
}

export async function updateRespondentAuthAccountData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentAuthAccountData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.updateRespondentAuthAccountData(...args);
}

export async function updateRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentDirectoryEntryData"]
  >
) {
  const loadedModule = await loadRespondentDirectoryModule();
  return loadedModule.updateRespondentDirectoryEntryData(...args);
}
