import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig, type IndexTenantId } from "@/lib/index-platform";

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
  preferredLocale: "uk" | "en";
  phone: string;
  primary: boolean;
  role: string;
  telegramChatId: string;
  telegramUsername: string;
};

export type RespondentTelegramDeliveryStatus = {
  contactCount: number;
  error: string;
  providerId: string;
  sentAt: string;
  status: "sent" | "failed" | "not_sent" | "not_linked";
  trigger: string;
};

export type RespondentDirectoryEntry = {
  auth: RespondentAuthAccount;
  collectionMode: RespondentCollectionMode;
  companyName: string;
  contacts: RespondentContactPerson[];
  id: string;
  status: RespondentStatus;
  telegramDelivery: RespondentTelegramDeliveryStatus;
};

export type RespondentContact = {
  contactPerson: string;
  companyName: string;
  id: string;
  notificationEmail: string;
  phone: string;
  status: RespondentStatus;
};

export type RespondentEmailScheduleSettings = {
  enabled: boolean;
  replyTo: string;
  sender: string;
  sendTime: string;
  subject: string;
  surveyUrl: string;
  template: string;
  timezone: string;
  workdays: string;
};

type RespondentDirectoryState = {
  respondents: RespondentDirectoryEntry[];
  schedule: RespondentEmailScheduleSettings;
};

function createDefaultRespondentEmailSchedule() {
  const activeIndex = getActiveIndexConfig();

  return {
    enabled: true,
    replyTo: activeIndex.id === "spike-ua" ? "info@spike.broker" : "inbox@uga.ua",
    sender:
      activeIndex.id === "spike-ua"
        ? "SPIKE SPOT INDEX <onboarding@resend.dev>"
        : "UGA Index <onboarding@resend.dev>",
    sendTime: "16:30",
    subject:
      activeIndex.id === "spike-ua"
        ? "SPIKE SPOT INDEX daily price survey"
        : "UGA Index daily price survey",
    surveyUrl: "/respondent",
    template:
      activeIndex.id === "spike-ua"
        ? "Please submit today's CPT Odesa / CPT parity Odesa spot price indicatives for SPIKE SPOT INDEX. Open your daily survey form using the personal link in this email."
        : "Please submit today's CPT UA Black Sea price indicatives for UGA Index. Open your daily survey form using the personal link in this email.",
    timezone: "Europe/Kyiv",
    workdays: "Monday-Friday",
  } satisfies RespondentEmailScheduleSettings;
}

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
  __indexPlatformRespondentDirectory?: Partial<
    Record<IndexTenantId, RespondentDirectoryState>
  >;
};

function getState() {
  const tenantId = getActiveIndexConfig().id;
  globalDirectory.__indexPlatformRespondentDirectory ??= {};
  globalDirectory.__indexPlatformRespondentDirectory[tenantId] ??= {
    respondents: createInitialRespondents().map(cloneRespondent),
    schedule: createDefaultRespondentEmailSchedule(),
  };

  return globalDirectory.__indexPlatformRespondentDirectory[tenantId];
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

export function getRespondentEmailSchedule() {
  return { ...getState().schedule };
}

export async function getRespondentEmailScheduleData() {
  if (!hasDatabaseUrl()) {
    return getRespondentEmailSchedule();
  }

  try {
    const schedule = await db.respondentEmailSchedule.findUnique({
      where: { id: "default" },
    });

    if (!schedule) {
      return createDefaultRespondentEmailSchedule();
    }

    return {
      enabled: schedule.enabled,
      replyTo: schedule.replyTo ?? "",
      sender: schedule.sender,
      sendTime: schedule.sendTime,
      subject: schedule.subject,
      surveyUrl: schedule.surveyUrl,
      template: schedule.template,
      timezone: schedule.timezone,
      workdays: schedule.workdays,
    } satisfies RespondentEmailScheduleSettings;
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock respondent email schedule.", error);
      return getRespondentEmailSchedule();
    }

    console.error("Failed to load respondent email schedule.", error);
    throw error;
  }
}

export async function updateRespondentEmailScheduleData(
  input: RespondentEmailScheduleSettings,
) {
  const schedule = normalizeScheduleInput(input);

  if (!hasDatabaseUrl()) {
    getState().schedule = schedule;
    return schedule;
  }

  await db.respondentEmailSchedule.upsert({
    where: { id: "default" },
    update: schedule,
    create: {
      id: "default",
      ...schedule,
    },
  });

  return schedule;
}

export async function getRespondentDirectoryData() {
  if (!hasDatabaseUrl()) {
    return getRespondentDirectory();
  }

  try {
    const kyivDateBounds = getKyivDateBounds();
    const respondents = await db.respondent.findMany({
      include: {
        authAccount: true,
        contacts: {
          orderBy: [{ primary: "desc" }, { createdAt: "asc" }],
          where: { active: true },
        },
        emailDeliveries: {
          orderBy: { sentAt: "desc" },
          take: 1,
          where: {
            sentAt: {
              gte: kyivDateBounds.start,
              lt: kyivDateBounds.end,
            },
            trigger: { startsWith: "telegram_" },
          },
        },
      },
      orderBy: [{ status: "asc" }, { legalName: "asc" }],
      where: { NOT: { status: "disabled" } },
    });

    return respondents.map((respondent) => ({
      auth: {
        lastGeneratedAt:
          respondent.authAccount?.lastGeneratedAt?.toISOString() ??
          respondent.createdAt.toISOString(),
        loginEmail:
          respondent.authAccount?.loginEmail ??
          createDemoRespondentEmail(respondent.id),
        passwordSetupStatus:
          respondent.authAccount?.passwordSetupStatus === "active"
            ? "active"
            : "temporary",
        temporaryPassword:
          respondent.authAccount?.temporaryPassword ?? "respondent",
      },
      collectionMode: respondent.collectionMode,
      companyName: respondent.legalName,
      contacts:
        respondent.contacts.length > 0
          ? respondent.contacts.map((contact) => ({
              email: contact.email ?? "",
              id: contact.id,
              name: contact.name,
              preferredLocale:
                contact.preferredLocale === "en" ? "en" : "uk",
              phone: contact.phone ?? "",
              primary: contact.primary,
              role: contact.role,
              telegramChatId: contact.telegramChatId ?? "",
              telegramUsername: contact.telegramUsername ?? "",
            }))
          : [
              {
                email: respondent.authAccount?.loginEmail ?? "",
                id: `${respondent.id}-primary`,
                name: respondent.displayName,
                preferredLocale: "uk",
                phone: "",
                primary: true,
                role: "Primary contact",
                telegramChatId: "",
                telegramUsername: "",
              },
            ],
      id: respondent.id,
      status: respondent.status === "pending" ? "pending" : "active",
      telegramDelivery: mapTelegramDeliveryStatus({
        delivery: respondent.emailDeliveries[0],
        telegramContactCount: respondent.contacts.filter(
          (contact) => contact.telegramChatId,
        ).length,
      }),
    })) satisfies RespondentDirectoryEntry[];
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock respondent directory.", error);
      return getRespondentDirectory();
    }

    console.error("Failed to load respondent directory.", error);
    throw error;
  }
}

function mapTelegramDeliveryStatus({
  delivery,
  telegramContactCount,
}: {
  delivery?: {
    error: string | null;
    providerId: string | null;
    sentAt: Date;
    status: string;
    trigger: string;
  };
  telegramContactCount: number;
}): RespondentTelegramDeliveryStatus {
  if (telegramContactCount === 0) {
    return {
      contactCount: 0,
      error: "",
      providerId: "",
      sentAt: "",
      status: "not_linked",
      trigger: "",
    };
  }

  if (!delivery) {
    return {
      contactCount: telegramContactCount,
      error: "",
      providerId: "",
      sentAt: "",
      status: "not_sent",
      trigger: "",
    };
  }

  return {
    contactCount: telegramContactCount,
    error: delivery.error ?? "",
    providerId: delivery.providerId ?? "",
    sentAt: delivery.sentAt.toISOString(),
    status: delivery.status === "sent" ? "sent" : "failed",
    trigger: delivery.trigger,
  };
}

function getKyivDateBounds(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    end: zonedDateTimeToUtc(
      `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`,
      "Europe/Kyiv",
    ),
    start: zonedDateTimeToUtc(dateKey, "Europe/Kyiv"),
  };
}

function zonedDateTimeToUtc(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const candidate = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(candidate, timeZone);

  return new Date(utcGuess.getTime() - correctedOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour === 24 ? 0 : values.hour,
      values.minute,
      values.second,
    ) - date.getTime()
  );
}

export async function getActiveRespondentCountData() {
  if (!hasDatabaseUrl()) {
    return getActiveRespondentCount();
  }

  try {
    return await db.respondent.count({
      where: {
        active: true,
        status: "active",
      },
    });
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock active respondent count.", error);
      return getActiveRespondentCount();
    }

    console.error("Failed to count active respondents.", error);
    throw error;
  }
}

export async function addRespondentDirectoryEntryData(
  input: Parameters<typeof addRespondentDirectoryEntry>[0],
) {
  if (!hasDatabaseUrl()) {
    addRespondentDirectoryEntry(input);
    return;
  }

  const id = normalizeId(input.id || input.companyName);

  if (!id) {
    return;
  }

  const loginEmail =
    input.contactEmail.trim().toLowerCase() || createDemoRespondentEmail(id);
  const temporaryPassword = generateTemporaryPassword(id);

  await db.$transaction(async (tx) => {
    await tx.respondent.upsert({
      where: { id },
      update: {
        active: input.status === "active",
        collectionMode: input.collectionMode,
        displayName: input.companyName.trim(),
        legalName: input.companyName.trim(),
        status: input.status,
      },
      create: {
        id,
        active: input.status === "active",
        collectionMode: input.collectionMode,
        displayName: input.companyName.trim(),
        legalName: input.companyName.trim(),
        status: input.status,
      },
    });

    await tx.respondentContact.create({
      data: {
        respondentId: id,
        email: input.contactEmail.trim() || null,
        name: input.contactName.trim(),
        phone: input.contactPhone.trim() || null,
        preferredLocale: normalizeContactLocale(input.preferredLocale),
        primary: true,
        role: input.contactRole.trim() || "Primary contact",
        telegramChatId: normalizeTelegramChatId(input.telegramChatId),
        telegramUsername: normalizeTelegramUsername(input.telegramUsername),
      },
    });

    await tx.respondentAuthAccount.upsert({
      where: { respondentId: id },
      update: {
        loginEmail,
        passwordSetupStatus: "temporary",
        temporaryPassword,
        lastGeneratedAt: new Date(),
      },
      create: {
        respondentId: id,
        loginEmail,
        passwordSetupStatus: "temporary",
        temporaryPassword,
        lastGeneratedAt: new Date(),
      },
    });

    await tx.user.upsert({
      where: { email: loginEmail },
      update: {
        active: input.status === "active",
        name: `${input.companyName.trim()} respondent`,
        respondentId: id,
        role: "respondent",
      },
      create: {
        active: input.status === "active",
        email: loginEmail,
        name: `${input.companyName.trim()} respondent`,
        respondentId: id,
        role: "respondent",
      },
    });
  });
}

export async function updateRespondentDirectoryEntryData(
  input: Parameters<typeof updateRespondentDirectoryEntry>[0],
) {
  if (!hasDatabaseUrl()) {
    updateRespondentDirectoryEntry(input);
    return;
  }

  await db.respondent.update({
    where: { id: input.id },
    data: {
      active: input.status === "active",
      collectionMode: input.collectionMode,
      displayName: input.companyName.trim(),
      legalName: input.companyName.trim(),
      status: input.status,
    },
  });
}

export async function deleteRespondentDirectoryEntryData(id: string) {
  if (!hasDatabaseUrl()) {
    deleteRespondentDirectoryEntry(id);
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { respondentId: id } });
    await tx.respondentAuthAccount.deleteMany({ where: { respondentId: id } });
    await tx.respondentContact.updateMany({
      where: { respondentId: id },
      data: { active: false, primary: false },
    });
    await tx.basketRespondent.updateMany({
      where: { respondentId: id },
      data: { active: false },
    });
    await tx.respondent.update({
      where: { id },
      data: {
        active: false,
        status: "disabled",
      },
    });
  });
}

export async function addRespondentContactData(
  input: Parameters<typeof addRespondentContact>[0],
) {
  if (!hasDatabaseUrl()) {
    addRespondentContact(input);
    return;
  }

  await db.$transaction(async (tx) => {
    if (input.primary) {
      await tx.respondentContact.updateMany({
        where: { respondentId: input.respondentId },
        data: { primary: false },
      });
    }

    await tx.respondentContact.create({
      data: {
        respondentId: input.respondentId,
        email: input.email.trim() || null,
        name: input.name.trim(),
        phone: input.phone.trim() || null,
        preferredLocale: normalizeContactLocale(input.preferredLocale),
        primary: input.primary,
        role: input.role.trim() || "Contact",
        telegramChatId: normalizeTelegramChatId(input.telegramChatId),
        telegramUsername: normalizeTelegramUsername(input.telegramUsername),
      },
    });
  });
}

export async function updateRespondentContactData(
  input: Parameters<typeof updateRespondentContact>[0],
) {
  if (!hasDatabaseUrl()) {
    updateRespondentContact(input);
    return;
  }

  await db.$transaction(async (tx) => {
    if (input.primary) {
      await tx.respondentContact.updateMany({
        where: { respondentId: input.respondentId },
        data: { primary: false },
      });
    }

    await tx.respondentContact.update({
      where: { id: input.contactId },
      data: {
        email: input.email.trim() || null,
        name: input.name.trim(),
        phone: input.phone.trim() || null,
        preferredLocale: normalizeContactLocale(input.preferredLocale),
        primary: input.primary,
        role: input.role.trim() || "Contact",
        telegramChatId: normalizeTelegramChatId(input.telegramChatId),
        telegramUsername: normalizeTelegramUsername(input.telegramUsername),
      },
    });
  });
}

export async function deleteRespondentContactData(input: {
  contactId: string;
  respondentId: string;
}) {
  if (!hasDatabaseUrl()) {
    deleteRespondentContact(input);
    return;
  }

  const contactCount = await db.respondentContact.count({
    where: { respondentId: input.respondentId, active: true },
  });

  if (contactCount <= 1) {
    return;
  }

  await db.respondentContact.update({
    where: { id: input.contactId },
    data: { active: false, primary: false },
  });

  const primaryCount = await db.respondentContact.count({
    where: {
      active: true,
      primary: true,
      respondentId: input.respondentId,
    },
  });

  if (primaryCount === 0) {
    const firstContact = await db.respondentContact.findFirst({
      where: { active: true, respondentId: input.respondentId },
      orderBy: { createdAt: "asc" },
    });

    if (firstContact) {
      await db.respondentContact.update({
        where: { id: firstContact.id },
        data: { primary: true },
      });
    }
  }
}

export async function updateRespondentAuthAccountData(
  input: Parameters<typeof updateRespondentAuthAccount>[0],
) {
  if (!hasDatabaseUrl()) {
    updateRespondentAuthAccount(input);
    return;
  }

  const loginEmail = input.loginEmail.trim().toLowerCase();

  await db.$transaction(async (tx) => {
    const auth = await tx.respondentAuthAccount.upsert({
      where: { respondentId: input.respondentId },
      update: {
        loginEmail,
        passwordSetupStatus: input.passwordSetupStatus,
      },
      create: {
        respondentId: input.respondentId,
        loginEmail,
        passwordSetupStatus: input.passwordSetupStatus,
        temporaryPassword: generateTemporaryPassword(input.respondentId),
        lastGeneratedAt: new Date(),
      },
    });
    const respondent = await tx.respondent.findUnique({
      where: { id: input.respondentId },
    });

    if (respondent) {
      await tx.user.upsert({
        where: { email: auth.loginEmail },
        update: {
          active: respondent.active,
          name: `${respondent.legalName} respondent`,
          respondentId: respondent.id,
          role: "respondent",
        },
        create: {
          active: respondent.active,
          email: auth.loginEmail,
          name: `${respondent.legalName} respondent`,
          respondentId: respondent.id,
          role: "respondent",
        },
      });
    }
  });
}

export async function regenerateRespondentTemporaryPasswordData(
  respondentId: string,
) {
  if (!hasDatabaseUrl()) {
    regenerateRespondentTemporaryPassword(respondentId);
    return;
  }

  const temporaryPassword = generateTemporaryPassword(respondentId);
  const generatedAt = new Date();

  await db.$transaction(async (tx) => {
    const auth = await tx.respondentAuthAccount.update({
      where: { respondentId },
      data: {
        lastGeneratedAt: generatedAt,
        passwordHash: null,
        passwordSetAt: null,
        passwordSetupStatus: "temporary",
        temporaryPassword,
      },
    });

    await tx.user.updateMany({
      where: { OR: [{ respondentId }, { email: auth.loginEmail }] },
      data: {
        lastGeneratedAt: generatedAt,
        passwordHash: null,
        passwordSetAt: null,
        passwordSetupStatus: "temporary",
        temporaryPassword,
      },
    });
  });
}

export function addRespondentDirectoryEntry(input: {
  collectionMode: RespondentCollectionMode;
  companyName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  contactRole: string;
  preferredLocale?: string;
  telegramChatId?: string;
  telegramUsername?: string;
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
        input.contactEmail.trim().toLowerCase() || createDemoRespondentEmail(id),
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
        preferredLocale: normalizeContactLocale(input.preferredLocale),
        phone: input.contactPhone.trim(),
        primary: true,
        role: input.contactRole.trim() || "Primary contact",
        telegramChatId: normalizeTelegramChatId(input.telegramChatId) ?? "",
        telegramUsername: normalizeTelegramUsername(input.telegramUsername) ?? "",
      },
    ],
    id,
    status: input.status,
    telegramDelivery: {
      contactCount: input.telegramChatId ? 1 : 0,
      error: "",
      providerId: "",
      sentAt: "",
      status: input.telegramChatId ? "not_sent" : "not_linked",
      trigger: "",
    },
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
  preferredLocale?: string;
  primary: boolean;
  respondentId: string;
  role: string;
  telegramChatId?: string;
  telegramUsername?: string;
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
    preferredLocale: normalizeContactLocale(input.preferredLocale),
    phone: input.phone.trim(),
    primary: input.primary || respondent.contacts.length === 0,
    role: input.role.trim() || "Contact",
    telegramChatId: normalizeTelegramChatId(input.telegramChatId) ?? "",
    telegramUsername: normalizeTelegramUsername(input.telegramUsername) ?? "",
  });
}

export function updateRespondentContact(input: {
  contactId: string;
  email: string;
  name: string;
  phone: string;
  preferredLocale?: string;
  primary: boolean;
  respondentId: string;
  role: string;
  telegramChatId?: string;
  telegramUsername?: string;
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
      preferredLocale: normalizeContactLocale(input.preferredLocale),
      phone: input.phone.trim(),
      primary: input.primary,
      role: input.role.trim() || contact.role,
      telegramChatId: normalizeTelegramChatId(input.telegramChatId) ?? "",
      telegramUsername: normalizeTelegramUsername(input.telegramUsername) ?? "",
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

export const respondentEmailSchedule = createDefaultRespondentEmailSchedule();

function createInitialRespondents() {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id !== "spike-ua") {
    return initialRespondents;
  }

  return activeIndex.respondents.map((respondent, index) =>
    createRespondentSeed(
      respondent.id,
      respondent.legalName,
      `Partner contact ${index + 1}`,
      "",
      `respondent-${index + 1}@spike-ua.demo`,
      "active",
      "self_service",
    ),
  );
}

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
          preferredLocale: "uk",
          phone,
          primary: true,
          role: "Primary contact",
          telegramChatId: "",
          telegramUsername: "",
        },
    ],
    id,
    status,
    telegramDelivery: {
      contactCount: 0,
      error: "",
      providerId: "",
      sentAt: "",
      status: "not_linked",
      trigger: "",
    },
  };
}

function cloneRespondent(
  respondent: RespondentDirectoryEntry,
): RespondentDirectoryEntry {
  return {
    ...respondent,
    auth: { ...respondent.auth },
    contacts: respondent.contacts.map((contact) => ({ ...contact })),
    telegramDelivery: { ...respondent.telegramDelivery },
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
  const prefix = getActiveIndexConfig().id === "spike-ua" ? "SPIKE" : "UGA";
  return `${prefix}-${normalizeId(seed).slice(0, 4).toUpperCase()}-${fragment}`;
}

function createDemoRespondentEmail(id: string) {
  return `${id}@${getActiveIndexConfig().id === "spike-ua" ? "spike-ua" : "uga-index"}.demo`;
}

function normalizeTelegramUsername(value?: string) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized || null;
}

function normalizeTelegramChatId(value?: string) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeContactLocale(value?: string): "uk" | "en" {
  return value === "en" ? "en" : "uk";
}

function normalizeScheduleInput(
  input: RespondentEmailScheduleSettings,
): RespondentEmailScheduleSettings {
  const defaultSchedule = createDefaultRespondentEmailSchedule();

  return {
    enabled: input.enabled,
    replyTo: input.replyTo.trim(),
    sender: input.sender.trim() || defaultSchedule.sender,
    sendTime: normalizeSendTime(input.sendTime),
    subject: input.subject.trim() || defaultSchedule.subject,
    surveyUrl: input.surveyUrl.trim() || defaultSchedule.surveyUrl,
    template: input.template.trim() || defaultSchedule.template,
    timezone: input.timezone.trim() || defaultSchedule.timezone,
    workdays: input.workdays.trim() || defaultSchedule.workdays,
  };
}

function normalizeSendTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value.trim())
    ? value.trim()
    : createDefaultRespondentEmailSchedule().sendTime;
}
