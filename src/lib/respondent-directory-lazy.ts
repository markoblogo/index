type RespondentDirectoryModule = typeof import("@/lib/respondent-directory");

async function loadRespondentDirectoryModule() {
  return import("@/lib/respondent-directory") as Promise<
    RespondentDirectoryModule
  >;
}

export async function getActiveRespondentCount() {
  const module = await loadRespondentDirectoryModule();
  return module.getActiveRespondentCount();
}

export async function getActiveRespondentCountData() {
  const module = await loadRespondentDirectoryModule();
  return module.getActiveRespondentCountData();
}

export async function getRespondentDirectory() {
  const module = await loadRespondentDirectoryModule();
  return module.getRespondentDirectory();
}

export async function getRespondentDirectoryData() {
  const module = await loadRespondentDirectoryModule();
  return module.getRespondentDirectoryData();
}

export async function getRespondentEmailScheduleData() {
  const module = await loadRespondentDirectoryModule();
  return module.getRespondentEmailScheduleData();
}

export async function regenerateRespondentTemporaryPasswordData(
  ...args: Parameters<
    RespondentDirectoryModule["regenerateRespondentTemporaryPasswordData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.regenerateRespondentTemporaryPasswordData(...args);
}

export async function addRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["addRespondentContactData"]>
) {
  const module = await loadRespondentDirectoryModule();
  return module.addRespondentContactData(...args);
}

export async function addRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["addRespondentDirectoryEntryData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.addRespondentDirectoryEntryData(...args);
}

export async function deleteRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["deleteRespondentContactData"]>
) {
  const module = await loadRespondentDirectoryModule();
  return module.deleteRespondentContactData(...args);
}

export async function deleteRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["deleteRespondentDirectoryEntryData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.deleteRespondentDirectoryEntryData(...args);
}

export async function updateRespondentEmailScheduleData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentEmailScheduleData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.updateRespondentEmailScheduleData(...args);
}

export async function updateRespondentContactData(
  ...args: Parameters<RespondentDirectoryModule["updateRespondentContactData"]>
) {
  const module = await loadRespondentDirectoryModule();
  return module.updateRespondentContactData(...args);
}

export async function updateRespondentAuthAccountData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentAuthAccountData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.updateRespondentAuthAccountData(...args);
}

export async function updateRespondentDirectoryEntryData(
  ...args: Parameters<
    RespondentDirectoryModule["updateRespondentDirectoryEntryData"]
  >
) {
  const module = await loadRespondentDirectoryModule();
  return module.updateRespondentDirectoryEntryData(...args);
}
