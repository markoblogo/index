import {
  Prisma,
  type ConsumerCountry as DbConsumerCountry,
  type ConsumerSourceStatus as DbConsumerSourceStatus,
  type ConsumerValidationStatus as DbConsumerValidationStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { CONSUMER_PRODUCT_LOCKS, EVERYDAY_SOURCE_DEFINITIONS } from "@/lib/everyday-index/config";
import { computeSnapshotHash, getBigMacDataset, parseBigMacCsv } from "@/lib/everyday-index/big-mac-adapter";
import { validateConsumerObservation } from "@/lib/everyday-index/validation";

const BIG_MAC_SOURCE = EVERYDAY_SOURCE_DEFINITIONS.find(
  (source) => source.key === "big-mac-economist",
)!;
const BURGER_LOCK = CONSUMER_PRODUCT_LOCKS.find((lock) => lock.key === "burger")!;
const BURGER_INDEX_KEY = "burger";
const BURGER_VARIANT_KEY = "burger-big-mac";
const BURGER_RUN_KEY = "everyday-index:burger:big-mac";
const BURGER_PARSER_VERSION = "economist-big-mac-csv-v1";

type BigMacNormalizedRow = {
  countryIso3: string;
  countryName: string;
  currency: string;
  date: string;
  localPrice: number;
  usdPrice: number;
  sourceDefinedUsdRaw: number | null;
};

export type BurgerImportResult = {
  changedRows: number;
  parserVersion: string;
  publishedRows: number;
  rejectedRows: number;
  runId: string;
  rowsParsed: number;
  rowsValidated: number;
  snapshotHash: string;
  sourceUrl: string;
  startedAt: string;
  status: "completed" | "skipped" | "failed";
};

export async function importBigMacDataset(options: {
  trigger?: string;
  csvOverride?: string;
} = {}): Promise<BurgerImportResult> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required for burger persistence and publishing.");
  }

  const startedAt = new Date();
  const trigger = options.trigger ?? "manual_script";
  const run = await db.everydayIngestionRun.create({
    data: {
      metadataJson: {
        parserVersion: BURGER_PARSER_VERSION,
        sourceKey: BIG_MAC_SOURCE.key,
        sourceUrl: BIG_MAC_SOURCE.sourceUrl,
      },
      runKey: BURGER_RUN_KEY,
      status: "running",
      trigger,
    },
  });

  try {
    const dataset =
      typeof options.csvOverride === "string"
        ? {
            snapshot: {
              body: options.csvOverride,
              contentType: "text/csv",
              fetchedAt: startedAt.toISOString(),
              hash: computeSnapshotHash(options.csvOverride),
              sourceId: BIG_MAC_SOURCE.id,
              url: BIG_MAC_SOURCE.sourceUrl,
            },
            rows: parseBigMacCsv(options.csvOverride),
          }
        : await getBigMacDataset();
    const normalizedRows = normalizeBigMacRows(dataset.rows);
    const persisted = await persistBurgerObservations({
      fetchedAt: dataset.snapshot.fetchedAt,
      normalizedRows,
      runId: run.id,
      snapshotContentType: dataset.snapshot.contentType,
      snapshotHash: dataset.snapshot.hash,
      sourceUrl: dataset.snapshot.url,
      trigger,
    });

    await db.everydayIngestionRun.update({
      where: { id: run.id },
      data: {
        changedRows: persisted.changedRows,
        finishedAt: new Date(),
        metadataJson: {
          datasetDate: persisted.datasetDate,
          parserVersion: BURGER_PARSER_VERSION,
          publishedRows: persisted.publishedRows,
          rejectedRows: persisted.rejectedRows,
          rowsParsed: normalizedRows.length,
          rowsValidated: persisted.validatedRows,
          snapshotHash: dataset.snapshot.hash,
          sourceKey: BIG_MAC_SOURCE.key,
          sourceUrl: dataset.snapshot.url,
          validatedCountries: persisted.validatedCountries,
        },
        parserErrors: Prisma.JsonNull,
        publishedRows: persisted.publishedRows,
        status: "completed",
      },
    });

    revalidatePath("/");
    revalidatePath("/api/public/everyday-index");

    return {
      changedRows: persisted.changedRows,
      parserVersion: BURGER_PARSER_VERSION,
      publishedRows: persisted.publishedRows,
      rejectedRows: persisted.rejectedRows,
      runId: run.id,
      rowsParsed: normalizedRows.length,
      rowsValidated: persisted.validatedRows,
      snapshotHash: dataset.snapshot.hash,
      sourceUrl: dataset.snapshot.url,
      startedAt: startedAt.toISOString(),
      status: "completed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown burger import error.";

    await db.everydayIngestionRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        parserErrors: {
          message,
        },
        status: "failed",
      },
    });

    throw error;
  }
}

export function normalizeBigMacRows(
  rows: ReturnType<typeof parseBigMacCsv>,
): BigMacNormalizedRow[] {
  return rows
    .filter(
      (row) =>
        Number.isFinite(row.localPrice) &&
        row.localPrice > 0 &&
        Number.isFinite(row.usdPrice) &&
        row.usdPrice > 0,
    )
    .map((row) => ({
      countryIso3: row.iso3,
      countryName: row.country,
      currency: row.currency,
      date: row.date,
      localPrice: row.localPrice,
      sourceDefinedUsdRaw:
        typeof row.usdRawIndex === "number" && Number.isFinite(row.usdRawIndex)
          ? row.usdRawIndex
          : null,
      usdPrice: row.usdPrice,
    }));
}

export function validateBurgerObservation(args: {
  currency: string;
  previousPublishedPrice?: number | null;
  row: BigMacNormalizedRow;
}) {
  return validateConsumerObservation({
    observation: {
      confidence: "high",
      countryIso3: args.row.countryIso3,
      currency: args.currency,
      metadata: {
        source_country_name: args.row.countryName,
        source_defined_usd_raw: args.row.sourceDefinedUsdRaw,
        source_type: "economist_big_mac_dataset",
      },
      observedAt: args.row.date,
      parserVersion: BURGER_PARSER_VERSION,
      price: args.row.localPrice,
      productKey: "burger",
      productVariant: "Big Mac",
      sourceId: BIG_MAC_SOURCE.id,
      status: "verified",
      usdPrice: args.row.usdPrice,
    },
    previousPublishedPrice: args.previousPublishedPrice,
    productLock: BURGER_LOCK,
    source: {
      ...BIG_MAC_SOURCE,
      expectedCurrency: args.currency,
    },
  });
}

export async function getPersistedBurgerDataset() {
  const burgerDefinition = await db.consumerIndexDefinition.findUnique({
    where: { key: BURGER_INDEX_KEY },
  });

  if (!burgerDefinition) {
    return null;
  }

  const latestPublished = await db.consumerPublishedValue.findFirst({
    where: {
      indexDefinitionId: burgerDefinition.id,
      sourceStatus: "verified",
    },
    orderBy: { publishedDate: "desc" },
  });

  if (!latestPublished) {
    return null;
  }

  return {
    definitionId: burgerDefinition.id,
    latestPublishedDate: latestPublished.publishedDate,
  };
}

async function persistBurgerObservations(args: {
  fetchedAt: string;
  normalizedRows: BigMacNormalizedRow[];
  runId: string;
  snapshotContentType: string;
  snapshotHash: string;
  sourceUrl: string;
  trigger: string;
}) {
  const context = await ensureBurgerContext();
  const existingSnapshot = await db.consumerRawSnapshot.findFirst({
    where: {
      snapshotHash: args.snapshotHash,
      sourceId: context.source.id,
    },
  });
  const snapshot =
    existingSnapshot ??
    (await db.consumerRawSnapshot.create({
      data: {
        contentType: args.snapshotContentType,
        fetchedAt: new Date(args.fetchedAt),
        metadataJson: {
          parserVersion: BURGER_PARSER_VERSION,
          runId: args.runId,
          trigger: args.trigger,
        },
        snapshotHash: args.snapshotHash,
        sourceId: context.source.id,
        sourceUrl: args.sourceUrl,
      },
    }));
  const latestPublishedByCountry = await db.consumerPublishedValue.findMany({
    where: {
      indexDefinitionId: context.index.id,
    },
    orderBy: { publishedDate: "desc" },
  });
  const previousByCountryId = new Map<string, number | null>();

  for (const row of latestPublishedByCountry) {
    if (!previousByCountryId.has(row.countryId)) {
      previousByCountryId.set(
        row.countryId,
        row.localPrice ? row.localPrice.toNumber() : null,
      );
    }
  }

  let changedRows = 0;
  let publishedRows = 0;
  let rejectedRows = 0;
  let validatedRows = 0;
  const datasetDate = args.normalizedRows
    .map((row) => row.date)
    .sort()
    .at(-1) ?? null;
  const validatedCountries: string[] = [];

  await db.$transaction(async (tx) => {
    for (const row of args.normalizedRows) {
      const country = await upsertConsumerCountry(tx, row);
      const previousPublishedPrice = previousByCountryId.get(country.id) ?? null;
      const validation = validateBurgerObservation({
        currency: row.currency,
        previousPublishedPrice,
        row,
      });
      const validationStatus = validation.status;
      const sourceStatus: DbConsumerSourceStatus =
        validation.status === "accepted"
          ? "verified"
          : validation.status === "quarantined"
            ? "quarantined"
            : "stale";
      const metadataJson = {
        sourceComparisonKind: "economist_us_dataset_row",
        sourceDefinedUsdRaw: row.sourceDefinedUsdRaw,
        sourceLabel: "The Economist Big Mac dataset",
        sourceNote:
          "This is a source-defined dataset comparison, not a New York, NY retail burger reference.",
      };
      const existingObservation = await tx.consumerParsedObservation.findFirst({
        where: {
          countryId: country.id,
          indexDefinitionId: context.index.id,
          observedAt: new Date(row.date),
          productLockId: context.productLock.id,
          snapshotId: snapshot.id,
          sourceId: context.source.id,
        },
      });
      const observationData = {
        confidenceScore: new Prisma.Decimal(100),
        countryId: country.id,
        currency: row.currency,
        indexDefinitionId: context.index.id,
        localPrice: new Prisma.Decimal(row.localPrice),
        metadataJson,
        observedAt: new Date(row.date),
        parserVersion: BURGER_PARSER_VERSION,
        productLockId: context.productLock.id,
        productVariant: "Big Mac",
        snapshotId: snapshot.id,
        sourceId: context.source.id,
        sourceStatus,
        usdPrice: new Prisma.Decimal(row.usdPrice),
        validationNotes:
          validation.reasons.length > 0
            ? { reasons: validation.reasons }
            : Prisma.JsonNull,
        validationStatus: validationStatus as DbConsumerValidationStatus,
      };
      const observation = existingObservation
        ? await tx.consumerParsedObservation.update({
            where: { id: existingObservation.id },
            data: observationData,
          })
        : await tx.consumerParsedObservation.create({
            data: observationData,
          });

      if (!existingObservation) {
        changedRows += 1;
      }

      if (validation.status === "accepted") {
        validatedRows += 1;
        validatedCountries.push(country.iso3);
        const published = await publishVerifiedBurgerValues({
          countryId: country.id,
          indexDefinitionId: context.index.id,
          metadataJson,
          observationId: observation.id,
          observedAt: row.date,
          productLockId: context.productLock.id,
          tx,
          usdPrice: row.usdPrice,
          localPrice: row.localPrice,
        });

        if (published) {
          publishedRows += 1;
        }
      } else {
        rejectedRows += 1;
      }
    }
  });

  return {
    changedRows,
    datasetDate,
    publishedRows,
    rejectedRows,
    validatedCountries,
    validatedRows,
  };
}

async function publishVerifiedBurgerValues(args: {
  countryId: string;
  indexDefinitionId: string;
  localPrice: number;
  metadataJson: Record<string, string | number | null>;
  observationId: string;
  observedAt: string;
  productLockId: string;
  tx: Prisma.TransactionClient;
  usdPrice: number;
}) {
  const publishedDate = new Date(args.observedAt);
  const existing = await args.tx.consumerPublishedValue.findUnique({
    where: {
      indexDefinitionId_countryId_publishedDate: {
        countryId: args.countryId,
        indexDefinitionId: args.indexDefinitionId,
        publishedDate,
      },
    },
  });

  await args.tx.consumerPublishedValue.upsert({
    where: {
      indexDefinitionId_countryId_publishedDate: {
        countryId: args.countryId,
        indexDefinitionId: args.indexDefinitionId,
        publishedDate,
      },
    },
    update: {
      indexVsUsReference: null,
      indexVsMedian: null,
      localPrice: new Prisma.Decimal(args.localPrice),
      metadataJson: args.metadataJson,
      note:
        "Verified Burger/Big Mac value from The Economist structured dataset. USA/New York reference remains unavailable.",
      observationId: args.observationId,
      productLockId: args.productLockId,
      sourceStatus: "verified",
      usdPrice: new Prisma.Decimal(args.usdPrice),
      wageObservationId: null,
    },
    create: {
      countryId: args.countryId,
      indexDefinitionId: args.indexDefinitionId,
      indexVsUsReference: null,
      indexVsMedian: null,
      localPrice: new Prisma.Decimal(args.localPrice),
      metadataJson: args.metadataJson,
      note:
        "Verified Burger/Big Mac value from The Economist structured dataset. USA/New York reference remains unavailable.",
      observationId: args.observationId,
      productLockId: args.productLockId,
      publishedDate,
      sourceStatus: "verified",
      usdPrice: new Prisma.Decimal(args.usdPrice),
    },
  });

  return !existing;
}

async function ensureBurgerContext() {
  const index = await db.consumerIndexDefinition.upsert({
    where: { key: BURGER_INDEX_KEY },
    update: {
      enabled: true,
      label: "Burger Index",
    },
    create: {
      enabled: true,
      key: BURGER_INDEX_KEY,
      label: "Burger Index",
    },
  });
  const productLock = await db.consumerProductLock.upsert({
    where: { variantKey: BURGER_VARIANT_KEY },
    update: {
      enabled: true,
      indexDefinitionId: index.id,
      rulesJson: BURGER_LOCK.rules,
      title: BURGER_LOCK.label,
      variant: BURGER_LOCK.variant,
    },
    create: {
      enabled: true,
      indexDefinitionId: index.id,
      rulesJson: BURGER_LOCK.rules,
      title: BURGER_LOCK.label,
      variant: BURGER_LOCK.variant,
      variantKey: BURGER_VARIANT_KEY,
    },
  });
  const source = await db.consumerSourceDefinition.upsert({
    where: { id: BIG_MAC_SOURCE.id },
    update: {
      enabled: true,
      expectedCurrency: null,
      indexDefinitionId: index.id,
      parserKey: BIG_MAC_SOURCE.parserKey,
      priority: BIG_MAC_SOURCE.priority,
      sourceType: BIG_MAC_SOURCE.sourceType,
      sourceUrl: BIG_MAC_SOURCE.sourceUrl,
    },
    create: {
      enabled: true,
      expectedCurrency: null,
      id: BIG_MAC_SOURCE.id,
      indexDefinitionId: index.id,
      parserKey: BIG_MAC_SOURCE.parserKey,
      priority: BIG_MAC_SOURCE.priority,
      sourceType: BIG_MAC_SOURCE.sourceType,
      sourceUrl: BIG_MAC_SOURCE.sourceUrl,
    },
  });

  return {
    index,
    productLock,
    source,
  };
}

async function upsertConsumerCountry(
  tx: Prisma.TransactionClient,
  row: BigMacNormalizedRow,
): Promise<DbConsumerCountry> {
  const iso2 = inferIso2(row.countryIso3);

  return tx.consumerCountry.upsert({
    where: { iso3: row.countryIso3 },
    update: {
      burgerCovered: true,
      currency: row.currency,
      enabled: true,
      iso2,
      name: row.countryName,
    },
    create: {
      burgerCovered: true,
      currency: row.currency,
      enabled: true,
      iso2,
      iso3: row.countryIso3,
      name: row.countryName,
    },
  });
}

function inferIso2(iso3: string) {
  const iso2ByIso3: Record<string, string> = {
    AUS: "AU",
    CAN: "CA",
    DEU: "DE",
    FRA: "FR",
    GBR: "GB",
    JPN: "JP",
    USA: "US",
  };

  return iso2ByIso3[iso3] ?? iso3.slice(0, 2);
}
