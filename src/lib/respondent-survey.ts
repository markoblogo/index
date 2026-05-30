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
import { autoPublishSpikeDailyIndices } from "@/lib/auto-publish";
import {
  getActiveIndexTenant,
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";

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

const activeIndex = getActiveIndexTenant();
const isSpike = activeIndex.id === "spike-ua";

const labels = {
  en: {
    badge: "Daily survey",
    basis: "Basis",
    company: "Company",
    date: "Date",
    draftSaved: "Draft saved.",
    editSubmitted: "Return to form and edit",
    lockedSubmitted: `Submitted values are locked and already transferred to ${isSpike ? "Spike Brokers" : "UGA"}.`,
    intro:
      isSpike
        ? "Submit today's CPT Odesa / CPT parity Odesa spot price indicatives for your company. Individual submissions are used for index calculation and are not published publicly."
        : "Submit today’s CPT UA Black Sea price indicatives for your company. Individual submissions are used for index calculation and are not published publicly.",
    notPublished: "Not published",
    price: "Price",
    priceHintLines: [
      "corn, wheat $/t, excl. VAT (export)",
      "soybean, sunflower $/t, incl. VAT (processing)",
    ],
    publication: "Publication",
    saveDraft: "Save as draft",
    source: "Source",
    status: "Status",
    statusDraft: "Saved as draft",
    statusEmpty: "Not started",
    statusSubmitted: `Submitted to ${isSpike ? "Spike Brokers" : "UGA"}`,
    submit: "Submit",
    submittedSuccess:
      "Your data has been accepted and has been forwarded to the index calculation.",
    telegramSubmittedNotice:
      "Data accepted — it has been submitted successfully and participates in the daily index calculation.",
    submitted: "Submitted",
    submittedLocked:
      `Your data has been submitted successfully. Below is the summary that was transferred to ${isSpike ? "Spike Brokers" : "UGA"}.`,
    submittedMessage: "Data submitted successfully",
    title: "Daily respondent survey",
    unit: "Unit",
  },
  uk: {
    badge: "Щоденне опитування",
    basis: "Базис",
    company: "Компанія",
    date: "Дата",
    draftSaved: "Чернетку збережено.",
    editSubmitted: "Повернутися до анкети та редагувати",
    lockedSubmitted: `Подані значення зафіксовані та вже передані ${isSpike ? "Spike Brokers" : "в УЗА"}.`,
    intro:
      isSpike
        ? "Подайте сьогоднішні спотові цінові індикативи CPT Одеса / CPT паритет Одеса від вашої компанії. Індивідуальні значення використовуються для розрахунку індексу і не публікуються відкрито."
        : "Подайте сьогоднішні цінові індикативи CPT UA Black Sea від вашої компанії. Індивідуальні значення використовуються для розрахунку індексу і не публікуються відкрито.",
    notPublished: "Не опубліковано",
    price: "Ціна",
    priceHintLines: [
      "кукурудза, пшениця $/т, без ПДВ (експорт)",
      "соя, соняшник $/т, з ПДВ (переробка)",
    ],
    publication: "Публікація",
    saveDraft: "Зберегти чернетку",
    source: "Джерело",
    status: "Статус",
    statusDraft: "Збережено як чернетку",
    statusEmpty: "Не розпочато",
    statusSubmitted: `Передано ${isSpike ? "Spike Brokers" : "в УЗА"}`,
    submit: "Подати",
    submitted: "Подано",
    submittedSuccess:
      "Ваші дані успішно прийнято. Вони будуть використані в розрахунку індексу.",
    telegramSubmittedNotice:
      "Дані успішно прийняті. Зараз вони враховуються в сьогоднішньому розрахунку індексу.",
    submittedLocked:
      `Ви успішно заповнили дані. Нижче показано значення, які передані ${isSpike ? "Spike Brokers" : "в УЗА"} для обробки.`,
    submittedMessage: "Дані успішно подано",
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

  const entries = parsePrices(formData);
  const respondentChannel = String(formData.get("respondentChannel") ?? "web");

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

    redirect(`/respondent?locale=${locale}&saved=${intent}${respondentChannel === "telegram" ? "&channel=telegram&inTelegram=1" : ""}`);
  }

  await saveDatabaseRespondentSurvey({ date, entries, respondentId, status: intent, user });
  if (isSpike && intent === "submitted" && date === todayInputDate()) {
    await autoPublishSpikeDailyIndices(date, { replaceExisting: true });
  }
  revalidatePath("/admin/daily-inputs");
  redirect(
    `/respondent?locale=${locale}&saved=${intent}${respondentChannel === "telegram" ? "&channel=telegram&inTelegram=1" : ""}`,
  );
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
  const [bases, respondent, dbCommodities] = await Promise.all([
    db.deliveryBasis.findMany({
      where: { code: { in: getConfiguredDeliveryBasisCodes() } },
    }),
    db.respondent.findUnique({ where: { id: respondentId } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
  ]);

  const basisIds = bases.map((basis) => basis.id);

  if (basisIds.length === 0 || !respondent || dbCommodities.length === 0) {
    if (allowMockFallback()) {
      return getMockRespondentSurveyData({ date, locale, respondentId });
    }

    throw new Error("Missing basis, respondent, or commodities.");
  }

  const submissions = await db.priceSubmission.findMany({
    where: {
      tradeDate,
      deliveryBasisId: { in: basisIds },
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
    basisLabel: SITE_CONFIG.defaultDeliveryBasis,
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
  const [bases, dbCommodities] = await Promise.all([
    db.deliveryBasis.findMany({
      where: { code: { in: getConfiguredDeliveryBasisCodes() } },
    }),
    db.commodity.findMany({
      where: { id: { in: [...new Set(entries.map((entry) => entry.commodityId))] } },
    }),
  ]);
  const basisByCode = new Map(bases.map((basis) => [basis.code, basis]));
  const commodityById = new Map(
    dbCommodities.map((commodity) => [commodity.id, commodity]),
  );

  if (bases.length === 0) {
    throw new Error("Delivery bases are not seeded.");
  }

  for (const entry of entries) {
    const commodity = commodityById.get(entry.commodityId);
    const basisCode = commodity
      ? getDeliveryBasisConfigForCommodityCode(commodity.code).code
      : getConfiguredDeliveryBasisCodes()[0];
    const basis = basisByCode.get(basisCode);

    if (!basis) {
      throw new Error(`Delivery basis ${basisCode} is not seeded.`);
    }

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
