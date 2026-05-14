import { getActiveIndexConfig } from "@/lib/index-platform";

export type DemoAllowlistRole = "admin" | "respondent";

export type DemoAllowlistUser = {
  userId: string;
  email: string;
  password: string;
  role: DemoAllowlistRole;
  name: string;
  respondentId?: string;
  companyName?: string;
  passwordSetupStatus: "temporary";
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
    return demoAllowlist.find((user) => user.role === "admin") ?? null;
  }

  if (
    normalizedLogin === "respondent" &&
    normalizedPassword === "respondent"
  ) {
    return (
      demoAllowlist.find((user) => user.role === "respondent") ??
      null
    );
  }

  return (
    demoAllowlist.find(
      (user) =>
        user.email.toLowerCase() === normalizedLogin &&
        user.password === normalizedPassword,
    ) ?? null
  );
}
