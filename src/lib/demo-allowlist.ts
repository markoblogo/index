import { getActiveIndexConfig } from "@/lib/index-platform";
import { db, hasDatabaseUrl } from "@/lib/db";
import { verifyPassword } from "@/lib/password-hash";
import {
  getRespondentDirectory,
  getRespondentDirectoryData,
} from "@/lib/respondent-directory";

export type DemoAllowlistRole = "admin" | "respondent";

export type DemoAllowlistUser = {
  userId: string;
  email: string;
  password: string;
  role: DemoAllowlistRole;
  name: string;
  respondentId?: string;
  companyName?: string;
  passwordSetupStatus: "temporary" | "active";
};

const ugaAllowlist: DemoAllowlistUser[] = [
  {
    userId: "demo-admin",
    email: "admin@uga.ua",
    password: "admin",
    role: "admin",
    name: "UGA Administrator",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-bunge",
    email: "bunge@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "Bunge Ukraine respondent",
    respondentId: "bunge-ukraine",
    companyName: "ПІІ «БУНГЕ ЮКРЕЙН»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-adm",
    email: "adm@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "ADM Ukraine respondent",
    respondentId: "adm-ukraine",
    companyName: "ТОВ «АДМ ЮКРЕЙН»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-hermes",
    email: "hermes@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "Hermes Trading respondent",
    respondentId: "hermes-trading",
    companyName: "ТОВ «Гермес-Трейдінг»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-ldc",
    email: "ldc@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "Louis Dreyfus Ukraine respondent",
    respondentId: "louis-dreyfus-ukraine",
    companyName: "ТОВ «Луї Дрейфус Україна»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-kernel",
    email: "kernel@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "Kernel Trade respondent",
    respondentId: "kernel-trade",
    companyName: "ТОВ «Кернел-Трейд»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-cofco",
    email: "cofco@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "COFCO Ukraine respondent",
    respondentId: "cofco-agri-resources-ukraine",
    companyName: "ТОВ «КОФКО АГРІ РЕСУРСІЗ УКРАЇНА»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-nwg",
    email: "nwg@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "New World Grain Ukraine respondent",
    respondentId: "new-world-grain-ukraine",
    companyName: "ТОВ «Нью Ворлд Грейн Юкрейн»",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "respondent-nibulon",
    email: "nibulon@uga-index.demo",
    password: "respondent",
    role: "respondent",
    name: "Nibulon respondent",
    respondentId: "nibulon",
    companyName: "ТОВ СП «НІБУЛОН»",
    passwordSetupStatus: "temporary",
  },
];

const spikeAllowlist: DemoAllowlistUser[] = [
  {
    userId: "spike-demo-admin",
    email: "admin@spike-ua.demo",
    password: "admin",
    role: "admin",
    name: "Spike Brokers Administrator",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "spike-respondent-1",
    email: "respondent-1@spike-ua.demo",
    password: "respondent",
    role: "respondent",
    name: "Spike Brokers partner respondent",
    respondentId: "spike-partner-1",
    companyName: "Spike Brokers Partner 1",
    passwordSetupStatus: "temporary",
  },
  {
    userId: "spike-respondent-2",
    email: "respondent-2@spike-ua.demo",
    password: "respondent",
    role: "respondent",
    name: "Spike Brokers partner respondent",
    respondentId: "spike-partner-2",
    companyName: "Spike Brokers Partner 2",
    passwordSetupStatus: "temporary",
  },
];

export const demoAllowlist =
  getActiveIndexConfig().id === "spike-ua" ? spikeAllowlist : ugaAllowlist;

export function getDemoAllowlist() {
  const activeIndex = getActiveIndexConfig();
  const adminUser =
    activeIndex.id === "spike-ua" ? spikeAllowlist[0] : ugaAllowlist[0];

  return [
    adminUser,
    ...getRespondentDirectory().map(
      (respondent): DemoAllowlistUser => ({
        userId: `respondent-${respondent.id}`,
        email: respondent.auth.loginEmail,
        password: respondent.auth.temporaryPassword,
        role: "respondent",
        name: `${respondent.companyName} respondent`,
        respondentId: respondent.id,
        companyName: respondent.companyName,
        passwordSetupStatus: respondent.auth.passwordSetupStatus,
      }),
    ),
  ].filter((user): user is DemoAllowlistUser => Boolean(user));
}

export function authenticateDemoUser({
  login,
  password,
}: {
  login: string;
  password: string;
}) {
  const normalizedLogin = login.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedLogin === "admin" && normalizedPassword === "admin") {
    return getDemoAllowlist().find((user) => user.role === "admin") ?? null;
  }

  if (
    normalizedLogin === "respondent" &&
    normalizedPassword === "respondent"
  ) {
    return (
      getDemoAllowlist().find((user) => user.role === "respondent") ??
      null
    );
  }

  return (
    getDemoAllowlist().find(
      (user) =>
        user.email.toLowerCase() === normalizedLogin &&
        user.password === normalizedPassword,
    ) ?? null
  );
}

export async function authenticateAllowlistedUser({
  login,
  password,
}: {
  login: string;
  password: string;
}) {
  const normalizedLogin = login.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (hasDatabaseUrl()) {
    if (normalizedLogin === "admin" && normalizedPassword === "admin") {
      return authenticateDatabaseUser(getDatabaseAdminEmail(), normalizedPassword);
    }

    if (
      normalizedLogin === "respondent" &&
      normalizedPassword === "respondent"
    ) {
      return authenticateFirstDatabaseRespondent(normalizedPassword);
    }

    return authenticateDatabaseUser(normalizedLogin, normalizedPassword);
  }

  const allowlist = await getDemoAllowlistData();

  if (normalizedLogin === "admin" && normalizedPassword === "admin") {
    return allowlist.find((user) => user.role === "admin") ?? null;
  }

  if (
    normalizedLogin === "respondent" &&
    normalizedPassword === "respondent"
  ) {
    return allowlist.find((user) => user.role === "respondent") ?? null;
  }

  return (
    allowlist.find(
      (user) =>
        user.email.toLowerCase() === normalizedLogin &&
        user.password === normalizedPassword,
    ) ?? null
  );
}

function getDatabaseAdminEmail() {
  const activeIndex = getActiveIndexConfig();
  return activeIndex.id === "uga-ua"
    ? "admin@uga.ua"
    : `admin@${activeIndex.id}.demo`;
}

async function authenticateDatabaseUser(login: string, password: string) {
  const user = await db.user.findFirst({
    include: {
      respondent: {
        include: {
          authAccount: true,
        },
      },
    },
    where: {
      active: true,
      email: login,
      role: { in: ["admin", "respondent"] },
    },
  });

  if (!user) {
    return null;
  }

  const respondentAuth = user.respondent?.authAccount;
  const passwordHash = respondentAuth?.passwordHash ?? user.passwordHash;
  const temporaryPassword =
    respondentAuth?.temporaryPassword ?? user.temporaryPassword;

  const passwordMatches =
    verifyPassword(password, passwordHash) ||
    (temporaryPassword !== null && temporaryPassword === password);

  if (!passwordMatches) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    password,
    role: user.role === "respondent" ? "respondent" : "admin",
    name: user.name,
    respondentId: user.respondentId ?? undefined,
    companyName: user.respondent?.legalName,
    passwordSetupStatus:
      respondentAuth?.passwordSetupStatus === "active" ||
      user.passwordSetupStatus === "active"
        ? "active"
        : "temporary",
  } satisfies DemoAllowlistUser;
}

async function authenticateFirstDatabaseRespondent(password: string) {
  const user = await db.user.findFirst({
    include: {
      respondent: {
        include: {
          authAccount: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    where: {
      active: true,
      role: "respondent",
      respondent: {
        status: "active",
      },
    },
  });

  return user ? authenticateDatabaseUser(user.email, password) : null;
}

export async function getDemoAllowlistData() {
  if (getActiveIndexConfig().id === "spike-ua") {
    return spikeAllowlist;
  }

  return [
    ugaAllowlist[0],
    ...(await getRespondentDirectoryData()).map(
      (respondent): DemoAllowlistUser => ({
        userId: `respondent-${respondent.id}`,
        email: respondent.auth.loginEmail,
        password: respondent.auth.temporaryPassword,
        role: "respondent",
        name: `${respondent.companyName} respondent`,
        respondentId: respondent.id,
        companyName: respondent.companyName,
        passwordSetupStatus: respondent.auth.passwordSetupStatus,
      }),
    ),
  ].filter((user): user is DemoAllowlistUser => Boolean(user));
}
