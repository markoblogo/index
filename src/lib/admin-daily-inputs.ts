import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { db } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import { getDemoSubmission, setDemoSubmission } from "@/lib/demo-submission-store";
import { commodities, respondents, type CommodityId } from "@/lib/mock-data";

export type DailyInputStatus =
  | "missing"
  | "saved"
  | "submitted_by_respondent"
  | "edited_by_admin";

export type DailyInputCell = {
  commodityId: string;
  excluded: boolean;
  respondentId: string;
  price: number | null;
  spikeIndicative: number;
  difference: number | null;
  deviationPct: number | null;
  warning: boolean;
  status: DailyInputStatus;
};

export type DailyInputCommodity = {
  id: string;
  code: string;
  name: string;
};

export type DailyInputRespondent = {
  id: string;
  name: string;
};

export type DailyInputData = {
  date: string;
  basisLabel: string;
  lockReason: string | null;
  lockedForEditing: boolean;
  publicationStatus: "not_published" | "published_locked";
  source: "database" | "mock";
  commodities: DailyInputCommodity[];
  respondents: DailyInputRespondent[];
  cells: DailyInputCell[];
};

const BASIS_CODE = "FOB_BLACK_SEA";
const WARNING_THRESHOLD = 0.02;
const commodityCodeByMockId: Record<CommodityId, string> = {
  corn: "CORN",
  "wheat-115": "WHT_115",
  "feed-wheat": "FEED_WHT",
  "gmo-soybean": "GMO_SOY",
};

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function todayInputDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(new Date());
}

export async function getDailyInputData(date: string): Promise<DailyInputData> {
  if (!hasDatabaseUrl()) {
    return getMockDailyInputData(date);
  }

  try {
    return await getDatabaseDailyInputData(date);
  } catch (error) {
    console.warn("Falling back to mock daily inputs.", error);
    return getMockDailyInputData(date);
  }
}

export async function saveDailyInputs(formData: FormData, user: DemoUser) {
  const date = String(formData.get("date") ?? todayInputDate());

  if (!hasDatabaseUrl()) {
    if (isPastTradeDate(date)) {
      redirect(`/admin/daily-inputs?date=${date}&saved=locked`);
    }

    for (const entry of parseSubmittedPrices(formData)) {
      setDemoSubmission({
        commodityId: entry.commodityId,
        date,
        excluded: entry.excluded,
        price: entry.price,
        respondentId: entry.respondentId,
        source: entry.inputSource,
        status: entry.submissionStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    redirect(`/admin/daily-inputs?date=${date}&saved=mock`);
  }

  const entries = parseSubmittedPrices(formData);

  if (entries.length === 0) {
    redirect(`/admin/daily-inputs?date=${date}&saved=empty`);
  }

  if (await isDatabaseDailyInputLocked(date)) {
    redirect(`/admin/daily-inputs?date=${date}&saved=locked`);
  }

  await saveDatabaseDailyInputs(date, entries, user);
  revalidatePath("/admin/daily-inputs");
  redirect(`/admin/daily-inputs?date=${date}&saved=database`);
}

async function getDatabaseDailyInputData(date: string): Promise<DailyInputData> {
  const tradeDate = dateToUtcDate(date);
  const [basis, dbCommodities, dbRespondents] = await Promise.all([
    db.deliveryBasis.findUnique({ where: { code: BASIS_CODE } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
    db.respondent.findMany({
      orderBy: { legalName: "asc" },
      where: { active: true },
    }),
  ]);

  if (!basis || dbCommodities.length === 0 || dbRespondents.length === 0) {
    return getMockDailyInputData(date);
  }

  const [submissions, indicatives, lockedPublishedCount] = await Promise.all([
    db.priceSubmission.findMany({
      where: {
        tradeDate,
        deliveryBasisId: basis.id,
      },
    }),
    db.externalIndicative.findMany({
      where: {
        tradeDate,
        deliveryBasisId: basis.id,
        source: "spike",
      },
    }),
    db.publishedIndex.count({
      where: {
        tradeDate,
        deliveryBasisId: basis.id,
        locked: true,
      },
    }),
  ]);
  const lockedForEditing = isPastTradeDate(date) && lockedPublishedCount > 0;

  const indicativeByCommodity = new Map(
    indicatives.map((indicative) => [
      indicative.commodityId,
      indicative.priceUsdPerMt.toNumber(),
    ]),
  );
  const submissionsByCell = new Map<string, typeof submissions>();

  for (const submission of submissions) {
    const key = cellKey(submission.commodityId, submission.respondentId);
    const current = submissionsByCell.get(key) ?? [];
    current.push(submission);
    submissionsByCell.set(key, current);
  }

  const cells = dbCommodities.flatMap((commodity) =>
    dbRespondents.map((respondent) => {
      const cellSubmissions =
        submissionsByCell.get(cellKey(commodity.id, respondent.id)) ?? [];
      const adminSubmission = cellSubmissions.find(
        (submission) => submission.source === "admin",
      );
      const respondentSubmission = cellSubmissions.find(
        (submission) => submission.source === "respondent",
      );
      const selectedSubmission = selectLatestDatabaseSubmission(
        adminSubmission,
        respondentSubmission,
      );
      const spikeIndicative =
        indicativeByCommodity.get(commodity.id) ??
        fallbackSpikeForCommodityCode(commodity.code, date);
      const price = selectedSubmission?.priceUsdPerMt.toNumber() ?? null;

      return buildCell({
        commodityId: commodity.id,
        excluded: false,
        respondentId: respondent.id,
        price,
        spikeIndicative,
        status: getDatabaseSubmissionStatus(selectedSubmission),
      });
    }),
  );

  return {
    date,
    basisLabel: basis.name,
    lockReason: lockedForEditing ? lockedInputReason() : null,
    lockedForEditing,
    publicationStatus: lockedPublishedCount > 0 ? "published_locked" : "not_published",
    source: "database",
    commodities: dbCommodities.map((commodity) => ({
      id: commodity.id,
      code: commodity.code,
      name: commodity.nameUk,
    })),
    respondents: dbRespondents.map((respondent) => ({
      id: respondent.id,
      name: respondent.legalName,
    })),
    cells,
  };
}

function getMockDailyInputData(date: string): DailyInputData {
  const dateSeed = dateToSeed(date);
  const cells = commodities.flatMap((commodity, commodityIndex) =>
    respondents.map((respondent, respondentIndex) => {
      const spikeIndicative = fallbackSpikeForCommodityCode(
        commodityCodeByMockId[commodity.id],
        date,
      );
      const missing = (commodityIndex + respondentIndex + dateSeed) % 11 === 0;
      const rawOffset = (respondentIndex - 3.5) * 0.45 + commodityIndex * 0.2;
      const largeOffset =
        (commodityIndex === 1 && respondentIndex === 6) ||
        (commodityIndex === 3 && respondentIndex === 1)
          ? spikeIndicative * 0.031
          : 0;
      const price = missing
        ? null
        : roundMoney(spikeIndicative + rawOffset + largeOffset);
      const adminSubmission = getDemoSubmission({
        commodityId: commodity.id,
        date,
        respondentId: respondent.id,
        source: "admin",
      });
      const respondentSubmission = getDemoSubmission({
        commodityId: commodity.id,
        date,
        respondentId: respondent.id,
        source: "respondent",
      });
      const selectedSubmission = selectLatestMockSubmission(
        adminSubmission,
        respondentSubmission,
      );

      return buildCell({
        commodityId: commodity.id,
        excluded: Boolean(selectedSubmission?.excluded),
        respondentId: respondent.id,
        price: selectedSubmission?.price ?? price,
        spikeIndicative,
        status: selectedSubmission
          ? getMockSubmissionStatus(selectedSubmission)
          : missing
            ? "missing"
            : respondentIndex % 5 === 0
              ? "edited_by_admin"
              : respondentIndex % 3 === 0
                ? "saved"
                : "submitted_by_respondent",
      });
    }),
  );

  return {
    date,
    basisLabel: SITE_CONFIG.defaultDeliveryBasis,
    lockReason: isPastTradeDate(date) ? lockedInputReason() : null,
    lockedForEditing: isPastTradeDate(date),
    publicationStatus: isPastTradeDate(date) ? "published_locked" : "not_published",
    source: "mock",
    commodities: commodities.map((commodity) => ({
      id: commodity.id,
      code: commodity.code,
      name: commodity.name.uk,
    })),
    respondents: respondents.map((respondent) => ({
      id: respondent.id,
      name: respondent.legalName,
    })),
    cells,
  };
}

async function isDatabaseDailyInputLocked(date: string) {
  if (!isPastTradeDate(date)) {
    return false;
  }

  const tradeDate = dateToUtcDate(date);
  const basis = await db.deliveryBasis.findUnique({
    where: { code: BASIS_CODE },
  });

  if (!basis) {
    return false;
  }

  const lockedPublishedCount = await db.publishedIndex.count({
    where: {
      tradeDate,
      deliveryBasisId: basis.id,
      locked: true,
    },
  });

  return lockedPublishedCount > 0;
}

function isPastTradeDate(date: string) {
  return date < todayInputDate();
}

function lockedInputReason() {
  return "This trade date already has locked published index values. Price inputs can only be corrected on the same trade date until midnight.";
}

async function saveDatabaseDailyInputs(
  date: string,
  entries: Array<SubmittedDailyInput>,
  user: DemoUser,
) {
  const tradeDate = dateToUtcDate(date);
  const basis = await db.deliveryBasis.findUnique({
    where: { code: BASIS_CODE },
  });

  if (!basis) {
    throw new Error("CPT UA Black Sea delivery basis is not seeded.");
  }

  for (const entry of entries) {
    const existing = await db.priceSubmission.findUnique({
      where: {
        tradeDate_commodityId_deliveryBasisId_respondentId_source: {
          tradeDate,
          commodityId: entry.commodityId,
          deliveryBasisId: basis.id,
          respondentId: entry.respondentId,
          source: entry.inputSource,
        },
      },
    });

    const saved = await db.priceSubmission.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_respondentId_source: {
          tradeDate,
          commodityId: entry.commodityId,
          deliveryBasisId: basis.id,
          respondentId: entry.respondentId,
          source: entry.inputSource,
        },
      },
      update: {
        priceUsdPerMt: new Prisma.Decimal(entry.price),
        status: entry.inputSource === "admin" ? "verified" : entry.submissionStatus,
        submittedAt: new Date(),
      },
      create: {
        tradeDate,
        commodityId: entry.commodityId,
        deliveryBasisId: basis.id,
        respondentId: entry.respondentId,
        source: entry.inputSource,
        status: entry.inputSource === "admin" ? "verified" : entry.submissionStatus,
        priceUsdPerMt: new Prisma.Decimal(entry.price),
        submittedAt: new Date(),
      },
    });

    if (!existing || !existing.priceUsdPerMt.equals(saved.priceUsdPerMt)) {
      await db.auditLog.create({
        data: {
          actorRole: "admin",
          action: existing ? "price_submission.updated" : "price_submission.created",
          entityType: "PriceSubmission",
          entityId: saved.id,
          summary: `Admin saved ${entry.price} USD/t for ${entry.commodityId} on ${date}.`,
          beforeJson: existing
            ? {
                priceUsdPerMt: existing.priceUsdPerMt.toNumber(),
                status: existing.status,
              }
            : Prisma.JsonNull,
          afterJson: {
            priceUsdPerMt: saved.priceUsdPerMt.toNumber(),
            status: saved.status,
            source: saved.source,
            username: user.username,
            excludedFromDemoCalculation: entry.excluded,
          },
        },
      });
    }
  }
}

type SubmittedDailyInput = {
  commodityId: string;
  excluded: boolean;
  inputSource: "admin" | "respondent";
  respondentId: string;
  price: number;
  submissionStatus: "draft" | "submitted";
};

function parseSubmittedPrices(formData: FormData) {
  const entries: SubmittedDailyInput[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("price:") || typeof value !== "string") {
      continue;
    }

    const [, commodityId, respondentId] = key.split(":");
    const price = Number(value);

    if (
      commodityId &&
      respondentId &&
      Number.isFinite(price) &&
      price > 0
    ) {
      const status = normalizeInputStatus(
        String(formData.get(`status:${commodityId}:${respondentId}`) ?? ""),
      );
      entries.push({
        commodityId,
        excluded: formData.get(`exclude:${commodityId}:${respondentId}`) === "on",
        inputSource: status === "submitted_by_respondent" ? "respondent" : "admin",
        respondentId,
        price,
        submissionStatus: status === "saved" ? "draft" : "submitted",
      });
    }
  }

  return entries;
}

function buildCell({
  commodityId,
  excluded,
  respondentId,
  price,
  spikeIndicative,
  status,
}: {
  commodityId: string;
  excluded: boolean;
  respondentId: string;
  price: number | null;
  spikeIndicative: number;
  status: DailyInputStatus;
}): DailyInputCell {
  const difference = price === null ? null : roundMoney(price - spikeIndicative);
  const deviationPct =
    price === null ? null : (Math.abs(price - spikeIndicative) / spikeIndicative) * 100;

  return {
    commodityId,
    excluded,
    respondentId,
    price,
    spikeIndicative,
    difference,
    deviationPct,
    warning:
      price !== null &&
      Math.abs(price - spikeIndicative) / spikeIndicative > WARNING_THRESHOLD,
    status,
  };
}

function normalizeInputStatus(value: string): DailyInputStatus {
  if (
    value === "saved" ||
    value === "submitted_by_respondent" ||
    value === "edited_by_admin"
  ) {
    return value;
  }

  return "edited_by_admin";
}

function fallbackSpikeForCommodityCode(code: string, date: string) {
  const commodity = commodities.find(
    (item) => commodityCodeByMockId[item.id] === code || item.code === code,
  );
  const base = commodity?.latest ?? 210;
  const seed = dateToSeed(date);
  return roundMoney(base + ((seed % 7) - 3) * 0.35);
}

function cellKey(commodityId: string, respondentId: string) {
  return `${commodityId}:${respondentId}`;
}

function selectLatestDatabaseSubmission<T extends { updatedAt: Date }>(
  adminSubmission: T | undefined,
  respondentSubmission: T | undefined,
) {
  if (!adminSubmission) {
    return respondentSubmission;
  }

  if (!respondentSubmission) {
    return adminSubmission;
  }

  return respondentSubmission.updatedAt > adminSubmission.updatedAt
    ? respondentSubmission
    : adminSubmission;
}

function selectLatestMockSubmission<
  T extends { updatedAt: string },
>(adminSubmission: T | undefined, respondentSubmission: T | undefined) {
  if (!adminSubmission) {
    return respondentSubmission;
  }

  if (!respondentSubmission) {
    return adminSubmission;
  }

  return respondentSubmission.updatedAt > adminSubmission.updatedAt
    ? respondentSubmission
    : adminSubmission;
}

function getDatabaseSubmissionStatus(
  submission:
    | {
        source: "admin" | "respondent" | "spike";
        status: "draft" | "submitted" | "verified" | "published";
      }
    | undefined,
): DailyInputStatus {
  if (!submission) {
    return "missing";
  }

  if (submission.source === "respondent") {
    return "submitted_by_respondent";
  }

  if (submission.source === "admin") {
    return submission.status === "draft" ? "saved" : "edited_by_admin";
  }

  return "missing";
}

function getMockSubmissionStatus(submission: {
  source: "admin" | "respondent";
}): DailyInputStatus {
  return submission.source === "respondent"
    ? "submitted_by_respondent"
    : "edited_by_admin";
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateToSeed(date: string) {
  return date.replaceAll("-", "").split("").reduce((sum, char) => sum + Number(char), 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
