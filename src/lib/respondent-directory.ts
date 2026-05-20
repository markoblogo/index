export type RespondentStatus = "active" | "pending";
export type RespondentCollectionMode = "self_service" | "manual_outreach";
export type RespondentPasswordStatus = "temporary" | "active";

export type RespondentAuthAccount = {
  lastGeneratedAt: string;
  loginEmail: string;
  passwordSetupStatus: RespondentPasswordStatus;
  temporaryPassword: string;
};

export type RespondentContactPerson = {
  email: string;
  id: string;
  name: string;
  phone: string;
  primary: boolean;
  role: string;
};

export type RespondentDirectoryEntry = {
  auth: RespondentAuthAccount;
  collectionMode: RespondentCollectionMode;
  companyName: string;
  contacts: RespondentContactPerson[];
  id: string;
  status: RespondentStatus;
};

export type RespondentContact = {
  contactPerson: string;
  companyName: string;
  id: string;
  notificationEmail: string;
  phone: string;
  status: RespondentStatus;
};

type RespondentDirectoryState = {
  respondents: RespondentDirectoryEntry[];
};

const initialRespondents: RespondentDirectoryEntry[] = [
  createRespondentSeed(
    "bunge-ukraine",
    "ПІІ «БУНГЕ ЮКРЕЙН»",
    "Олена Коваль",
    "+38 (050) 410-12-01",
    "bunge@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "adm-ukraine",
    "ТОВ «АДМ ЮКРЕЙН»",
    "Андрій Мельник",
    "+38 (067) 420-18-22",
    "adm@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "hermes-trading",
    "ТОВ «Гермес-Трейдінг»",
    "Ірина Савчук",
    "+38 (063) 430-24-33",
    "hermes@uga-index.demo",
    "active",
    "manual_outreach",
  ),
  createRespondentSeed(
    "louis-dreyfus-ukraine",
    "ТОВ «Луї Дрейфус Україна»",
    "Максим Бойко",
    "+38 (050) 440-31-44",
    "ldc@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "kernel-trade",
    "ТОВ «Кернел-Трейд»",
    "Наталія Гончар",
    "+38 (067) 450-45-55",
    "kernel@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "cofco-agri-ukraine",
    "ТОВ «КОФКО АГРІ РЕСУРСІЗ УКРАЇНА»",
    "Дмитро Лисенко",
    "+38 (073) 460-58-66",
    "cofco@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "new-world-grain-ukraine",
    "ТОВ «Нью Ворлд Грейн Юкрейн»",
    "Катерина Мороз",
    "+38 (050) 470-62-77",
    "nwg@uga-index.demo",
    "active",
    "manual_outreach",
  ),
  createRespondentSeed(
    "nibulon",
    "ТОВ СП «НІБУЛОН»",
    "Сергій Ткаченко",
    "+38 (067) 480-74-88",
    "nibulon@uga-index.demo",
    "active",
    "self_service",
  ),
  createRespondentSeed(
    "agroprosperis",
    "ТОВ «Агропросперіс Трейд»",
    "Юлія Петренко",
    "+38 (050) 490-86-19",
    "agroprosperis@uga-index.demo",
    "pending",
    "manual_outreach",
  ),
  createRespondentSeed(
    "orom",
    "ТОВ «ОРОМ-ІМПЕКС»",
    "Віталій Шевченко",
    "+38 (063) 510-92-40",
    "orom@uga-index.demo",
    "pending",
    "manual_outreach",
  ),
  createRespondentSeed(
    "aeroc",
    "ТОВ «АЕРОК АГРО»",
    "Марина Романюк",
    "+38 (067) 520-13-51",
    "aeroc@uga-index.demo",
    "pending",
    "manual_outreach",
  ),
  createRespondentSeed(
    "grain-alliance",
    "ТОВ «Грейн Альянс»",
    "Павло Данилюк",
    "+38 (050) 530-27-62",
    "grain-alliance@uga-index.demo",
    "pending",
    "manual_outreach",
  ),
];

const globalDirectory = globalThis as typeof globalThis & {
  __ugaRespondentDirectory?: RespondentDirectoryState;
};

function getState() {
  globalDirectory.__ugaRespondentDirectory ??= {
    respondents: initialRespondents.map(cloneRespondent),
  };

  return globalDirectory.__ugaRespondentDirectory;
}

export function getRespondentDirectory() {
  return getState().respondents.map(cloneRespondent);
}

export function getActiveRespondentCount() {
  return getState().respondents.filter(
    (respondent) => respondent.status === "active",
  ).length;
}

export function getRespondentContactRows(): RespondentContact[] {
  return getState().respondents.map((respondent) => {
    const primary = getPrimaryContact(respondent);

    return {
      contactPerson: primary?.name ?? "",
      companyName: respondent.companyName,
      id: respondent.id,
      notificationEmail: primary?.email ?? "",
      phone: primary?.phone ?? "",
      status: respondent.status,
    };
  });
}

export const respondentContacts = getRespondentContactRows();

export function addRespondentDirectoryEntry(input: {
  collectionMode: RespondentCollectionMode;
  companyName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  contactRole: string;
  id?: string;
  status: RespondentStatus;
}) {
  const state = getState();
  const id = normalizeId(input.id || input.companyName);

  if (!id || state.respondents.some((respondent) => respondent.id === id)) {
    return;
  }

  state.respondents.push({
    auth: {
      lastGeneratedAt: new Date().toISOString(),
      loginEmail:
        input.contactEmail.trim().toLowerCase() || `${id}@uga-index.demo`,
      passwordSetupStatus: "temporary",
      temporaryPassword: generateTemporaryPassword(id),
    },
    collectionMode: input.collectionMode,
    companyName: input.companyName.trim(),
    contacts: [
      {
        email: input.contactEmail.trim(),
        id: `${id}-primary`,
        name: input.contactName.trim(),
        phone: input.contactPhone.trim(),
        primary: true,
        role: input.contactRole.trim() || "Primary contact",
      },
    ],
    id,
    status: input.status,
  });
}

export function updateRespondentDirectoryEntry(input: {
  collectionMode: RespondentCollectionMode;
  companyName: string;
  id: string;
  status: RespondentStatus;
}) {
  const respondent = getState().respondents.find((item) => item.id === input.id);

  if (!respondent) {
    return;
  }

  respondent.collectionMode = input.collectionMode;
  respondent.companyName = input.companyName.trim() || respondent.companyName;
  respondent.status = input.status;
}

export function updateRespondentAuthAccount(input: {
  loginEmail: string;
  passwordSetupStatus: RespondentPasswordStatus;
  respondentId: string;
}) {
  const respondent = getState().respondents.find(
    (item) => item.id === input.respondentId,
  );

  if (!respondent) {
    return;
  }

  respondent.auth.loginEmail =
    input.loginEmail.trim().toLowerCase() || respondent.auth.loginEmail;
  respondent.auth.passwordSetupStatus = input.passwordSetupStatus;
}

export function regenerateRespondentTemporaryPassword(respondentId: string) {
  const respondent = getState().respondents.find(
    (item) => item.id === respondentId,
  );

  if (!respondent) {
    return;
  }

  respondent.auth.temporaryPassword = generateTemporaryPassword(respondentId);
  respondent.auth.passwordSetupStatus = "temporary";
  respondent.auth.lastGeneratedAt = new Date().toISOString();
}

export function deleteRespondentDirectoryEntry(id: string) {
  const state = getState();
  state.respondents = state.respondents.filter(
    (respondent) => respondent.id !== id,
  );
}

export function addRespondentContact(input: {
  email: string;
  name: string;
  phone: string;
  primary: boolean;
  respondentId: string;
  role: string;
}) {
  const respondent = getState().respondents.find(
    (item) => item.id === input.respondentId,
  );

  if (!respondent || !input.name.trim()) {
    return;
  }

  if (input.primary) {
    respondent.contacts = respondent.contacts.map((contact) => ({
      ...contact,
      primary: false,
    }));
  }

  respondent.contacts.push({
    email: input.email.trim(),
    id: `${input.respondentId}-${Date.now().toString(36)}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    primary: input.primary || respondent.contacts.length === 0,
    role: input.role.trim() || "Contact",
  });
}

export function updateRespondentContact(input: {
  contactId: string;
  email: string;
  name: string;
  phone: string;
  primary: boolean;
  respondentId: string;
  role: string;
}) {
  const respondent = getState().respondents.find(
    (item) => item.id === input.respondentId,
  );

  if (!respondent) {
    return;
  }

  respondent.contacts = respondent.contacts.map((contact) => {
    if (contact.id !== input.contactId) {
      return input.primary ? { ...contact, primary: false } : contact;
    }

    return {
      ...contact,
      email: input.email.trim(),
      name: input.name.trim() || contact.name,
      phone: input.phone.trim(),
      primary: input.primary,
      role: input.role.trim() || contact.role,
    };
  });

  if (!respondent.contacts.some((contact) => contact.primary) && respondent.contacts[0]) {
    respondent.contacts[0] = { ...respondent.contacts[0], primary: true };
  }
}

export function deleteRespondentContact(input: {
  contactId: string;
  respondentId: string;
}) {
  const respondent = getState().respondents.find(
    (item) => item.id === input.respondentId,
  );

  if (!respondent || respondent.contacts.length <= 1) {
    return;
  }

  const wasPrimary = respondent.contacts.some(
    (contact) => contact.id === input.contactId && contact.primary,
  );
  respondent.contacts = respondent.contacts.filter(
    (contact) => contact.id !== input.contactId,
  );

  if (wasPrimary && respondent.contacts[0]) {
    respondent.contacts[0] = { ...respondent.contacts[0], primary: true };
  }
}

export const respondentEmailSchedule = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  enabled: true,
  sender: "UGA Index <noreply@uga-index.demo>",
  sendTime: "16:30",
  surveyUrl: "/respondent",
  timezone: "Europe/Kyiv",
};

function createRespondentSeed(
  id: string,
  companyName: string,
  contactName: string,
  phone: string,
  email: string,
  status: RespondentStatus,
  collectionMode: RespondentCollectionMode,
): RespondentDirectoryEntry {
  return {
    auth: {
      lastGeneratedAt: "2026-05-20T10:00:00.000Z",
      loginEmail: email,
      passwordSetupStatus: "temporary",
      temporaryPassword: "respondent",
    },
    collectionMode,
    companyName,
    contacts: [
      {
        email,
        id: `${id}-primary`,
        name: contactName,
        phone,
        primary: true,
        role: "Primary contact",
      },
    ],
    id,
    status,
  };
}

function cloneRespondent(
  respondent: RespondentDirectoryEntry,
): RespondentDirectoryEntry {
  return {
    ...respondent,
    auth: { ...respondent.auth },
    contacts: respondent.contacts.map((contact) => ({ ...contact })),
  };
}

function getPrimaryContact(respondent: RespondentDirectoryEntry) {
  return respondent.contacts.find((contact) => contact.primary) ?? respondent.contacts[0];
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"«»]/g, "")
    .replace(/[^a-z0-9а-яіїєґ]+/giu, "-")
    .replace(/^-+|-+$/g, "");
}

function generateTemporaryPassword(seed: string) {
  const fragment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `UGA-${normalizeId(seed).slice(0, 4).toUpperCase()}-${fragment}`;
}
