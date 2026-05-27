import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import { getDemoSubmission, setDemoSubmission } from "@/lib/demo-submission-store";
import { commodities, respondents, type CommodityId } from "@/lib/mock-data";
import {
  canManuallyUnlockPublicationDate,
  todayKyivDate,
} from "@/lib/admin-publication-lock";
import {
  getActiveIndexTenant,
  getConfiguredDeliveryBasisCodes,
  getDeliveryBasisConfigForCommodityCode,
} from "@/lib/tenant-basis";
import { orderDailyInputRespondents } from "@/lib/respondent-ordering";

export type DailyInputStatus =
  | "missing"
  | "saved"
  | "submitted_by_respondent"
  | "edited_by_admin";

export type DailyInputCell = {
  adminChanged: boolean;
  commodityId: string;
  enteredByAdmin: boolean;
  enteredByRespondent: boolean;
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
  publicationStatus: "not_published" | "published_locked" | "published_unlocked";
  canUnlockPublication: boolean;
  source: "database" | "mock";
  commodities: DailyInputCommodity[];
  respondents: DailyInputRespondent[];
  cells: DailyInputCell[];
};

const WARNING_THRESHOLD = 0.02;
const commodityCodeByMockId: Record<CommodityId, string> = {
  corn: "CORN",
  "wheat-115": "WHT_115",
  "feed-wheat": "FEED_WHT",
  "gmo-soybean": "GMO_SOY",
  sunflower: "SUNFLOWER",
};

export function todayInputDate() {
  return todayKyivDate();
}

export async function getDailyInputData(date: string): Promise<DailyInputData> {
  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production daily inputs.");
    }

    return getMockDailyInputData(date);
  }

  try {
    return await getDatabaseDailyInputData(date);
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Falling back to mock daily inputs.", error);
      return getMockDailyInputData(date);
    }

    console.error("Failed to load database daily inputs.", error);
    throw error;
  }
}

export async function saveDailyInputs(formData: FormData, user: DemoUser) {
  const date = String(formData.get("date") ?? todayInputDate());

  if (!hasDatabaseUrl()) {
    if (!allowMockFallback()) {
      throw new Error("DATABASE_URL is required for production daily input saves.");
    }

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
  const activeIndex = getActiveIndexTenant();
  const basisCodes = getConfiguredDeliveryBasisCodes(activeIndex);
  const [bases, dbCommodities, dbRespondents] = await Promise.all([
    db.deliveryBasis.findMany({ where: { code: { in: basisCodes } } }),
    db.commodity.findMany({
      orderBy: { sortOrder: "asc" },
      where: { status: "published" },
    }),
    db.respondent.findMany({
      orderBy: { legalName: "asc" },
      where: { active: true, status: "active" },
    }),
  ]);

  const basisByCode = new Map(bases.map((basis) => [basis.code, basis]));
  const basisByCommodityId = new Map(
    dbCommodities
      .map((commodity) => {
        const basisConfig = getDeliveryBasisConfigForCommodityCode(
          commodity.code,
          activeIndex,
        );
        const basis = basisByCode.get(basisConfig.code);

        return basis ? ([commodity.id, basis] as const) : null;
      })
      .filter((entry): entry is readonly [string, (typeof bases)[number]] =>
        Boolean(entry),
      ),
  );
  const basisIds = [...new Set([...basisByCommodityId.values()].map((basis) => basis.id))];

  if (basisIds.length === 0 || dbCommodities.length === 0 || dbRespondents.length === 0) {
    if (allowMockFallback()) {
      return getMockDailyInputData(date);
    }

    throw new Error("Missing basis, commodities, or active respondents.");
  }

  const [submissions, indicatives, publishedIndices] = await Promise.all([
    db.priceSubmission.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
      },
    }),
    db.externalIndicative.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
        source: "spike",
      },
    }),
    db.publishedIndex.findMany({
      where: {
        tradeDate,
        deliveryBasisId: { in: basisIds },
      },
      select: { locked: true },
    }),
  ]);
  const lockedPublishedCount = publishedIndices.filter((index) => index.locked).length;
  const lockedForEditing = isPastTradeDate(date)
    ? publishedIndices.length > 0
    : lockedPublishedCount > 0;

  const indicativeByCommodity = new Map(
    indicatives.map((indicative) => [
      cellKey(indicative.commodityId, indicative.deliveryBasisId, "spike"),
      indicative.priceUsdPerMt.toNumber(),
    ]),
  );
  const submissionsByCell = new Map<string, typeof submissions>();

  for (const submission of submissions) {
    const key = cellKey(
      submission.commodityId,
      submission.deliveryBasisId,
      submission.respondentId,
    );
    const current = submissionsByCell.get(key) ?? [];
    current.push(submission);
    submissionsByCell.set(key, current);
  }

  const orderedRespondents = orderDailyInputRespondents(dbRespondents);
  const cells = dbCommodities.flatMap((commodity) =>
    orderedRespondents.map((respondent) => {
      const basis = basisByCommodityId.get(commodity.id);
      const cellSubmissions =
        basis
          ? (submissionsByCell.get(cellKey(commodity.id, basis.id, respondent.id)) ?? [])
          : [];
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
        (basis
          ? indicativeByCommodity.get(cellKey(commodity.id, basis.id, "spike"))
          : null) ??
        fallbackSpikeForCommodityCode(commodity.code, date);
      const price = selectedSubmission?.priceUsdPerMt.toNumber() ?? null;

      return buildCell({
        commodityId: commodity.id,
        adminChanged: Boolean(adminSubmission && respondentSubmission),
        enteredByAdmin: Boolean(adminSubmission),
        enteredByRespondent: Boolean(respondentSubmission),
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
    basisLabel: activeIndex.defaultDeliveryBasis,
    lockReason: lockedForEditing ? lockedInputReason() : null,
    lockedForEditing,
    publicationStatus:
      lockedPublishedCount > 0
        ? "published_locked"
        : publishedIndices.length > 0
          ? "published_unlocked"
          : "not_published",
    canUnlockPublication:
      lockedPublishedCount > 0 && canManuallyUnlockPublicationDate(date),
    source: "database",
    commodities: dbCommodities.map((commodity) => ({
      id: commodity.id,
      code: commodity.code,
      name: commodity.nameUk,
    })),
    respondents: orderedRespondents.map((respondent) => ({
      id: respondent.id,
      name: respondent.legalName,
    })),
    cells,
  };
}

function getMockDailyInputData(date: string): DailyInputData {
  const isSpikeIndex = getActiveIndexTenant().id === "spike-ua";
  const dateSeed = dateToSeed(date);
  const orderedRespondents = orderDailyInputRespondents(respondents);
  const cells = commodities.flatMap((commodity, commodityIndex) =>
    orderedRespondents.map((respondent, respondentIndex) => {
      const isMn7rMonitor = respondent.id === "MN7R_MONITOR";
      const spikeIndicative = fallbackSpikeForCommodityCode(
        commodityCodeByMockId[commodity.id],
        date,
      );
      const missing =
        !isMn7rMonitor && (commodityIndex + respondentIndex + dateSeed) % 11 === 0;
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
      const fallbackStatus = missing
        ? "missing"
        : respondentIndex % 5 === 0
          ? "edited_by_admin"
          : respondentIndex % 3 === 0
            ? "saved"
            : "submitted_by_respondent";
      const status = selectedSubmission
        ? getMockSubmissionStatus(selectedSubmission)
        : isSpikeIndex
          ? "missing"
          : fallbackStatus;

      return buildCell({
        commodityId: commodity.id,
        adminChanged: Boolean(adminSubmission && respondentSubmission),
        enteredByAdmin:
          Boolean(adminSubmission) ||
          (!isSpikeIndex &&
            !selectedSubmission &&
            (fallbackStatus === "edited_by_admin" || fallbackStatus === "saved")),
        enteredByRespondent:
          Boolean(respondentSubmission) ||
          (!isSpikeIndex &&
            !selectedSubmission &&
            fallbackStatus === "submitted_by_respondent"),
        excluded: Boolean(selectedSubmission?.excluded),
        respondentId: respondent.id,
        price: selectedSubmission?.price ?? (isSpikeIndex ? null : price),
        spikeIndicative,
        status,
      });
    }),
  );

  return {
    date,
    basisLabel: SITE_CONFIG.defaultDeliveryBasis,
    lockReason: isPastTradeDate(date) ? lockedInputReason() : null,
    lockedForEditing: isPastTradeDate(date),
    publicationStatus: isPastTradeDate(date) ? "published_locked" : "not_published",
    canUnlockPublication: false,
    source: "mock",
    commodities: commodities.map((commodity) => ({
      id: commodity.id,
      code: commodity.code,
      name: commodity.name.uk,
    })),
    respondents: orderedRespondents.map((respondent) => ({
      id: respondent.id,
      name: respondent.legalName,
    })),
    cells,
  };
}

async function isDatabaseDailyInputLocked(date: string) {
  const tradeDate = dateToUtcDate(date);
  const basisCodes = getConfiguredDeliveryBasisCodes();
  const publishedIndices = await db.publishedIndex.findMany({
    where: {
      tradeDate,
      deliveryBasis: { code: { in: basisCodes } },
    },
    select: { locked: true },
  });
  const lockedPublishedCount = publishedIndices.filter((index) => index.locked).length;

  return isPastTradeDate(date)
    ? publishedIndices.length > 0
    : lockedPublishedCount > 0;
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
        String(formData.get(`originalStatus:${commodityId}:${respondentId}`) ?? ""),
      );
      const originalPrice = Number(
        formData.get(`originalPrice:${commodityId}:${respondentId}`) ?? Number.NaN,
      );
      const unchangedRespondentSubmission =
        status === "submitted_by_respondent" &&
        Number.isFinite(originalPrice) &&
        pricesEqual(price, originalPrice);

      entries.push({
        commodityId,
        excluded: formData.get(`exclude:${commodityId}:${respondentId}`) === "on",
        inputSource: unchangedRespondentSubmission ? "respondent" : "admin",
        respondentId,
        price,
        submissionStatus: status === "saved" ? "draft" : "submitted",
      });
    }
  }

  return entries;
}

function buildCell({
  adminChanged,
  commodityId,
  enteredByAdmin,
  enteredByRespondent,
  excluded,
  respondentId,
  price,
  spikeIndicative,
  status,
}: {
  adminChanged: boolean;
  commodityId: string;
  enteredByAdmin: boolean;
  enteredByRespondent: boolean;
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
    adminChanged,
    commodityId,
    enteredByAdmin,
    enteredByRespondent,
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

function pricesEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.005;
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

function cellKey(commodityId: string, deliveryBasisId: string, respondentId: string) {
  return `${commodityId}:${deliveryBasisId}:${respondentId}`;
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
    return submission.status === "draft" ? "saved" : "submitted_by_respondent";
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
