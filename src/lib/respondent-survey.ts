import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import {
  getDemoSubmission,
  setDemoSubmission,
  type DemoSubmissionStatus,
} from "@/lib/demo-submission-store";
import { commodities, respondents } from "@/lib/mock-data";
import { todayInputDate } from "@/lib/admin-daily-inputs";

export type SurveyLocale = "uk" | "en";

export type RespondentSurveyCommodity = {
  id: string;
  code: string;
  name: string;
  price: number | null;
};

export type RespondentSurveyData = {
  basisLabel: string;
  companyName: string;
  date: string;
  locale: SurveyLocale;
  source: "database" | "mock";
  status: DemoSubmissionStatus | "empty";
  commodities: RespondentSurveyCommodity[];
};

const BASIS_CODE = "FOB_BLACK_SEA";

const labels = {
  en: {
    badge: "Daily survey",
    basis: "Basis",
    company: "Company",
    date: "Date",
    draftSaved: "Draft saved.",
    lockedSubmitted: "Submitted values are locked and already transferred to UGA.",
    intro:
      "Submit today’s CPT UA Black Sea price indicatives for your company. Individual submissions are used for index calculation and are not published publicly.",
    notPublished: "Not published",
    price: "Price",
    publication: "Publication",
    saveDraft: "Save as draft",
    source: "Source",
    status: "Status",
    statusDraft: "Saved as draft",
    statusEmpty: "Not started",
    statusSubmitted: "Submitted to UGA",
    submit: "Submit",
    submitted: "Submitted",
    submittedLocked:
      "Prices are fixed in this form and transferred to UGA for processing.",
    submittedMessage: "Submitted values",
    title: "Daily respondent survey",
    unit: "Unit",
  },
  uk: {
    badge: "Щоденне опитування",
    basis: "Базис",
    company: "Компанія",
    date: "Дата",
    draftSaved: "Чернетку збережено.",
    lockedSubmitted: "Подані значення зафіксовані та вже передані в УЗА.",
    intro:
      "Подайте сьогоднішні цінові індикативи CPT UA Black Sea від вашої компанії. Індивідуальні значення використовуються для розрахунку індексу і не публікуються відкрито.",
    notPublished: "Не опубліковано",
    price: "Ціна",
    publication: "Публікація",
    saveDraft: "Зберегти чернетку",
    source: "Джерело",
    status: "Статус",
    statusDraft: "Збережено як чернетку",
    statusEmpty: "Не розпочато",
    statusSubmitted: "Передано в УЗА",
    submit: "Подати",
    submitted: "Подано",
    submittedLocked:
      "Ціни зафіксовані у формі та передані в УЗА для обробки.",
    submittedMessage: "Подані значення",
    title: "Щоденна форма респондента",
    unit: "Одиниця",
  },
} as const;

export function getSurveyLabels(locale: SurveyLocale) {
  return labels[locale];
}

export function normalizeSurveyLocale(value?: string): SurveyLocale {
  return value === "uk" ? "uk" : "en";
}

export async function getRespondentSurveyData({
  date,
  locale,
  respondentId,
}: {
  date: string;
  locale: SurveyLocale;
  respondentId: string;
}): Promise<RespondentSurveyData> {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production respondent survey.");
    }

    return getMockRespondentSurveyData({ date, locale, respondentId });
  }

  try {
    return await getDatabaseRespondentSurveyData({ date, locale, respondentId });
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock respondent survey.", error);
      return getMockRespondentSurveyData({ date, locale, respondentId });
    }

    console.error("Failed to load database respondent survey.", error);
    throw error;
  }
}

export async function saveRespondentSurvey(formData: FormData, user: DemoUser) {
  const respondentId = user.respondentId;
  const date = String(formData.get("date") ?? todayInputDate());
  const locale = normalizeSurveyLocale(String(formData.get("locale") ?? "en"));
  const intent =
    formData.get("intent") === "submit" ? "submitted" : "draft";

  if (!respondentId) {
    redirect(`/respondent?locale=${locale}&error=respondent`);
  }

  const currentData = await getRespondentSurveyData({ date, locale, respondentId });

  if (currentData.status === "submitted") {
    redirect(`/respondent?locale=${locale}&saved=locked`);
  }

  const entries = parsePrices(formData);

  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production respondent saves.");
    }

    for (const entry of entries) {
      setDemoSubmission({
        commodityId: entry.commodityId,
        date,
        price: entry.price,
        respondentId,
        source: "respondent",
        status: intent,
        updatedAt: new Date().toISOString(),
      });
    }

    redirect(`/respondent?locale=${locale}&saved=${intent}`);
  }

  await saveDatabaseRespondentSurvey({ date, entries, respondentId, status: intent, user });
  revalidatePath("/admin/daily-inputs");
  redirect(`/respondent?locale=${locale}&saved=${intent}`);
}

function getMockRespondentSurveyData({
  date,
  locale,
  respondentId,
}: {
  date: string;
  locale: SurveyLocale;
  respondentId: string;
}): RespondentSurveyData {
  const companyName =
    respondents.find((respondent) => respondent.id === respondentId)?.legalName ??
    "Selected respondent";
  const storedSubmissions = commodities.map((commodity) =>
    getDemoSubmission({
      commodityId: commodity.id,
      date,
      respondentId,
      source: "respondent",
    }),
  );
  const submitted = storedSubmissions.some(
    (submission) => submission?.status === "submitted",
  );
  const drafted = storedSubmissions.some((submission) => submission?.status === "draft");

  return {
    basisLabel: SITE_CONFIG.defaultDeliveryBasis,
    companyName,
    date,
    locale,
    source: "mock",
    status: submitted ? "submitted" : drafted ? "draft" : "empty",
    commodities: commodities.map((commodity, index) => ({
      id: commodity.id,
      code: commodity.code,
      name:
        locale === "uk"
          ? commodity.name.uk
          : `${commodity.name.uk} / ${commodity.name.en}`,
      price: storedSubmissions[index]?.price ?? null,
    })),
  };
}

async function getDatabaseRespondentSurveyData({
  date,
  locale,
  respondentId,
}: {
  date: string;
  locale: SurveyLocale;
  respondentId: string;
}): Promise<RespondentSurveyData> {
  const tradeDate = dateToUtcDate(date);
  const [basis, respondent, dbCommodities] = await Promise.all([
    db.deliveryBasis.findUnique({ where: { code: BASIS_CODE } }),
    db.respondent.findUnique({ where: { id: respondentId } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
  ]);

  if (!basis || !respondent || dbCommodities.length === 0) {
    if (allowMockFallback()) {
      return getMockRespondentSurveyData({ date, locale, respondentId });
    }

    throw new Error("Missing basis, respondent, or commodities.");
  }

  const submissions = await db.priceSubmission.findMany({
    where: {
      tradeDate,
      deliveryBasisId: basis.id,
      respondentId,
      source: "respondent",
    },
  });
  const submissionByCommodity = new Map(
    submissions.map((submission) => [submission.commodityId, submission]),
  );
  const submitted = submissions.some((submission) => submission.status === "submitted");
  const drafted = submissions.some((submission) => submission.status === "draft");

  return {
    basisLabel: basis.name,
    companyName: respondent.legalName,
    date,
    locale,
    source: "database",
    status: submitted ? "submitted" : drafted ? "draft" : "empty",
    commodities: dbCommodities.map((commodity) => {
      const submission = submissionByCommodity.get(commodity.id);

      return {
        id: commodity.id,
        code: commodity.code,
        name:
          locale === "uk"
            ? commodity.nameUk
            : `${commodity.nameUk} / ${commodity.nameEn}`,
        price: submission?.priceUsdPerMt.toNumber() ?? null,
      };
    }),
  };
}

async function saveDatabaseRespondentSurvey({
  date,
  entries,
  respondentId,
  status,
  user,
}: {
  date: string;
  entries: Array<{ commodityId: string; price: number }>;
  respondentId: string;
  status: DemoSubmissionStatus;
  user: DemoUser;
}) {
  const tradeDate = dateToUtcDate(date);
  const basis = await db.deliveryBasis.findUnique({
    where: { code: BASIS_CODE },
  });

  if (!basis) {
    throw new Error("CPT UA Black Sea delivery basis is not seeded.");
  }

  for (const entry of entries) {
    const saved = await db.priceSubmission.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_respondentId_source: {
          tradeDate,
          commodityId: entry.commodityId,
          deliveryBasisId: basis.id,
          respondentId,
          source: "respondent",
        },
      },
      update: {
        priceUsdPerMt: new Prisma.Decimal(entry.price),
        status,
        submittedAt: status === "submitted" ? new Date() : null,
      },
      create: {
        tradeDate,
        commodityId: entry.commodityId,
        deliveryBasisId: basis.id,
        respondentId,
        source: "respondent",
        status,
        priceUsdPerMt: new Prisma.Decimal(entry.price),
        submittedAt: status === "submitted" ? new Date() : null,
      },
    });

    await db.auditLog.create({
      data: {
        actorRole: "respondent",
        action:
          status === "submitted"
            ? "respondent_submission.submitted"
            : "respondent_submission.draft_saved",
        entityType: "PriceSubmission",
        entityId: saved.id,
        summary: `${user.username} saved ${entry.price} USD/t for ${entry.commodityId} on ${date}.`,
        beforeJson: Prisma.JsonNull,
        afterJson: {
          priceUsdPerMt: saved.priceUsdPerMt.toNumber(),
          respondentId,
          source: saved.source,
          status: saved.status,
        },
      },
    });
  }
}

function parsePrices(formData: FormData) {
  const entries: Array<{ commodityId: string; price: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("price:") || typeof value !== "string") {
      continue;
    }

    const [, commodityId] = key.split(":");
    const price = Number(value);

    if (commodityId && Number.isFinite(price) && price > 0) {
      entries.push({ commodityId, price });
    }
  }

  return entries;
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
