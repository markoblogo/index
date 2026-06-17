import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSnapshotHash, parseBigMacCsv } from "@/lib/everyday-index/big-mac-adapter";
import { importBigMacDataset, normalizeBigMacRows } from "@/lib/everyday-index/burger-publish";

const {
  dbState,
  revalidatePathMock,
} = vi.hoisted(() => {
  const state = {
    consumerCountries: [] as Array<Record<string, unknown>>,
    consumerIndexDefinitions: [] as Array<Record<string, unknown>>,
    consumerParsedObservations: [] as Array<Record<string, unknown>>,
    consumerProductLocks: [] as Array<Record<string, unknown>>,
    consumerPublishedValues: [] as Array<Record<string, unknown>>,
    consumerRawSnapshots: [] as Array<Record<string, unknown>>,
    consumerSourceDefinitions: [] as Array<Record<string, unknown>>,
    everydayIngestionRuns: [] as Array<Record<string, unknown>>,
    ids: 0,
  };

  return {
    dbState: state,
    revalidatePathMock: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/db", () => {
  const nextId = () => `id-${++dbState.ids}`;
  const upsertBy = (
    list: Array<Record<string, unknown>>,
    match: (row: Record<string, unknown>) => boolean,
    createData: Record<string, unknown>,
    updateData: Record<string, unknown>,
  ) => {
    const existing = list.find(match);

    if (existing) {
      Object.assign(existing, updateData);
      return existing;
    }

    const created = {
      id: (createData.id as string | undefined) ?? nextId(),
      ...createData,
    };
    list.push(created);
    return created;
  };
  const updateById = (
    list: Array<Record<string, unknown>>,
    id: string,
    data: Record<string, unknown>,
  ) => {
    const existing = list.find((row) => row.id === id);

    if (!existing) {
      throw new Error(`Missing row ${id}`);
    }

    Object.assign(existing, data);
    return existing;
  };

  const fakeDb = {
    consumerCountry: {
      upsert: async ({
        create,
        update,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { iso3: string };
      }) =>
        upsertBy(
          dbState.consumerCountries,
          (row) => row.iso3 === where.iso3,
          create,
          update,
        ),
    },
    consumerIndexDefinition: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        dbState.consumerIndexDefinitions.find((row) => row.key === where.key) ?? null,
      upsert: async ({
        create,
        update,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { key: string };
      }) =>
        upsertBy(
          dbState.consumerIndexDefinitions,
          (row) => row.key === where.key,
          create,
          update,
        ),
    },
    consumerParsedObservation: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: nextId(), ...data };
        dbState.consumerParsedObservations.push(created);
        return created;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        dbState.consumerParsedObservations.find(
          (row) =>
            row.countryId === where.countryId &&
            row.indexDefinitionId === where.indexDefinitionId &&
            String(row.observedAt) === String(where.observedAt) &&
            row.productLockId === where.productLockId &&
            row.snapshotId === where.snapshotId &&
            row.sourceId === where.sourceId,
        ) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => updateById(dbState.consumerParsedObservations, where.id, data),
    },
    consumerProductLock: {
      upsert: async ({
        create,
        update,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { variantKey: string };
      }) =>
        upsertBy(
          dbState.consumerProductLocks,
          (row) => row.variantKey === where.variantKey,
          create,
          update,
        ),
    },
    consumerPublishedValue: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const rows = dbState.consumerPublishedValues.filter((row) => {
          const dateCheck =
            !where.publishedDate || String(row.publishedDate) === String(where.publishedDate);
          const countryCheck =
            !where.country ||
            dbState.consumerCountries.some(
              (country) =>
                country.id === row.countryId &&
                country.iso3 === (where.country as { iso3: string }).iso3,
            );

          return (
            row.indexDefinitionId === where.indexDefinitionId &&
            row.sourceStatus === where.sourceStatus &&
            dateCheck &&
            countryCheck
          );
        });

        return rows.sort((a, b) =>
          String(b.publishedDate).localeCompare(String(a.publishedDate)),
        )[0] ?? null;
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        dbState.consumerPublishedValues
          .filter((row) => row.indexDefinitionId === where.indexDefinitionId)
          .sort((a, b) => String(b.publishedDate).localeCompare(String(a.publishedDate))),
      findUnique: async ({
        where,
      }: {
        where: {
          indexDefinitionId_countryId_publishedDate: {
            countryId: string;
            indexDefinitionId: string;
            publishedDate: Date;
          };
        };
      }) =>
        dbState.consumerPublishedValues.find(
          (row) =>
            row.countryId === where.indexDefinitionId_countryId_publishedDate.countryId &&
            row.indexDefinitionId ===
              where.indexDefinitionId_countryId_publishedDate.indexDefinitionId &&
            String(row.publishedDate) ===
              String(where.indexDefinitionId_countryId_publishedDate.publishedDate),
        ) ?? null,
      upsert: async ({
        create,
        update,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: {
          indexDefinitionId_countryId_publishedDate: {
            countryId: string;
            indexDefinitionId: string;
            publishedDate: Date;
          };
        };
      }) =>
        upsertBy(
          dbState.consumerPublishedValues,
          (row) =>
            row.countryId === where.indexDefinitionId_countryId_publishedDate.countryId &&
            row.indexDefinitionId ===
              where.indexDefinitionId_countryId_publishedDate.indexDefinitionId &&
            String(row.publishedDate) ===
              String(where.indexDefinitionId_countryId_publishedDate.publishedDate),
          create,
          update,
        ),
    },
    consumerRawSnapshot: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: nextId(), ...data };
        dbState.consumerRawSnapshots.push(created);
        return created;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        dbState.consumerRawSnapshots.find(
          (row) =>
            row.snapshotHash === where.snapshotHash && row.sourceId === where.sourceId,
        ) ?? null,
    },
    consumerSourceDefinition: {
      upsert: async ({
        create,
        update,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { id: string };
      }) =>
        upsertBy(
          dbState.consumerSourceDefinitions,
          (row) => row.id === where.id,
          create,
          update,
        ),
    },
    everydayIngestionRun: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: nextId(), ...data };
        dbState.everydayIngestionRuns.push(created);
        return created;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => updateById(dbState.everydayIngestionRuns, where.id, data),
    },
    $transaction: async (
      callback: (tx: typeof fakeDb) => Promise<unknown>,
    ) => callback(fakeDb),
  };

  return {
    db: fakeDb,
    hasDatabaseUrl: () => true,
  };
});

const FIXTURE_CSV = `date,iso_a3,currency_code,name,local_price,dollar_ex,dollar_price,USD_raw
2026-01-01,DEU,EUR,Germany,5.5,0.9,6.11,0.12
2026-01-01,GBR,GBP,United Kingdom,4.5,0.8,5.63,0.03
2026-01-01,USA,USD,United States,5.8,1,5.8,0`;

describe("burger publish pipeline", () => {
  beforeEach(() => {
    dbState.consumerCountries.length = 0;
    dbState.consumerIndexDefinitions.length = 0;
    dbState.consumerParsedObservations.length = 0;
    dbState.consumerProductLocks.length = 0;
    dbState.consumerPublishedValues.length = 0;
    dbState.consumerRawSnapshots.length = 0;
    dbState.consumerSourceDefinitions.length = 0;
    dbState.everydayIngestionRuns.length = 0;
    dbState.ids = 0;
    revalidatePathMock.mockReset();
  });

  it("parses fixture CSV rows and normalizes burger values", () => {
    const rows = parseBigMacCsv(FIXTURE_CSV);
    const normalized = normalizeBigMacRows(rows);

    expect(rows).toHaveLength(3);
    expect(normalized[0]).toEqual(
      expect.objectContaining({
        countryIso3: "DEU",
        localPrice: 5.5,
        sourceDefinedUsdRaw: 0.12,
        usdPrice: 6.11,
      }),
    );
  });

  it("produces a stable snapshot hash for the same payload", () => {
    expect(computeSnapshotHash(FIXTURE_CSV)).toBe(computeSnapshotHash(FIXTURE_CSV));
  });

  it("publishes valid burger observations idempotently", async () => {
    const first = await importBigMacDataset({
      csvOverride: FIXTURE_CSV,
      trigger: "test",
    });
    const second = await importBigMacDataset({
      csvOverride: FIXTURE_CSV,
      trigger: "test",
    });

    expect(first.publishedRows).toBe(3);
    expect(second.publishedRows).toBe(0);
    expect(dbState.consumerRawSnapshots).toHaveLength(1);
    expect(dbState.consumerParsedObservations).toHaveLength(3);
    expect(dbState.consumerPublishedValues).toHaveLength(3);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("rejects or quarantines invalid rows and keeps prior good publications", async () => {
    await importBigMacDataset({
      csvOverride: FIXTURE_CSV,
      trigger: "test",
    });

    const badCsv = `date,iso_a3,currency_code,name,local_price,dollar_ex,dollar_price,USD_raw
2026-02-01,DEU,EUR,Germany,8.5,0.9,9.44,0.52`;
    const result = await importBigMacDataset({
      csvOverride: badCsv,
      trigger: "test",
    });

    expect(result.rejectedRows).toBe(1);
    expect(dbState.consumerPublishedValues).toHaveLength(3);
    expect(
      dbState.consumerPublishedValues.find(
        (row) =>
          row.countryId ===
          dbState.consumerCountries.find((country) => country.iso3 === "DEU")?.id,
      )?.publishedDate,
    ).toEqual(new Date("2026-01-01"));
  });
});
