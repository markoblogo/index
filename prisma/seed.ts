import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculateIndexValue } from "../src/lib/index-calculation";
import { getActiveIndexConfig } from "../src/lib/index-platform";
import { hashPassword } from "../src/lib/password-hash";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://user:password@localhost:5432/uga_index?schema=public";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const activeIndex = getActiveIndexConfig();
const seedDemoHistory = shouldSeedDemoFeature("SEED_DEMO_HISTORY");
const seedDemoAdminPassword = shouldSeedDemoFeature("SEED_DEMO_ADMIN_PASSWORD");

const BASE_DATE =
  activeIndex.id === "spike-ua"
    ? new Date(Date.UTC(2026, 4, 14))
    : new Date(Date.UTC(2026, 4, 8));

const commodities = activeIndex.commodities.map((commodity) => ({
  code: commodity.dbCode,
  nameUk: commodity.name.uk,
  nameEn: commodity.name.en,
  sortOrder: commodity.sortOrder,
  basePrice: commodity.basePrice,
  group: commodity.group,
}));

const respondents = activeIndex.respondents;
const contactSeedByRespondentId: Record<
  string,
  {
    collectionMode: "self_service" | "manual_outreach";
    email: string;
    name: string;
    phone: string;
  }
> = {
  "bunge-ukraine": {
    collectionMode: "self_service",
    email: "bunge@uga-index.demo",
    name: "Олена Коваль",
    phone: "+38 (050) 410-12-01",
  },
  "adm-ukraine": {
    collectionMode: "self_service",
    email: "adm@uga-index.demo",
    name: "Андрій Мельник",
    phone: "+38 (067) 420-18-22",
  },
  "hermes-trading": {
    collectionMode: "manual_outreach",
    email: "hermes@uga-index.demo",
    name: "Ірина Савчук",
    phone: "+38 (063) 430-24-33",
  },
  "louis-dreyfus-ukraine": {
    collectionMode: "self_service",
    email: "ldc@uga-index.demo",
    name: "Максим Бойко",
    phone: "+38 (050) 440-31-44",
  },
  "kernel-trade": {
    collectionMode: "self_service",
    email: "kernel@uga-index.demo",
    name: "Наталія Гончар",
    phone: "+38 (067) 450-45-55",
  },
  "cofco-agri-resources-ukraine": {
    collectionMode: "self_service",
    email: "cofco@uga-index.demo",
    name: "Дмитро Лисенко",
    phone: "+38 (073) 460-58-66",
  },
  "new-world-grain-ukraine": {
    collectionMode: "manual_outreach",
    email: "nwg@uga-index.demo",
    name: "Катерина Мороз",
    phone: "+38 (050) 470-62-77",
  },
  nibulon: {
    collectionMode: "self_service",
    email: "nibulon@uga-index.demo",
    name: "Сергій Ткаченко",
    phone: "+38 (067) 480-74-88",
  },
};

const directoryRespondents =
  activeIndex.id === "uga-ua"
    ? [
        ...respondents.map((respondent) => ({
          ...respondent,
          contactName:
            contactSeedByRespondentId[respondent.id]?.name ?? "Primary contact",
          contactPhone: contactSeedByRespondentId[respondent.id]?.phone ?? "",
          loginEmail:
            contactSeedByRespondentId[respondent.id]?.email ??
            `${respondent.id}@uga-index.demo`,
          collectionMode:
            contactSeedByRespondentId[respondent.id]?.collectionMode ??
            "self_service",
          status: "active",
        })),
        {
          id: "agroprosperis",
          legalName: "ТОВ «Агропросперіс Трейд»",
          contactName: "Юлія Петренко",
          contactPhone: "+38 (050) 490-86-19",
          loginEmail: "agroprosperis@uga-index.demo",
          collectionMode: "manual_outreach",
          status: "pending",
        },
        {
          id: "orom",
          legalName: "ТОВ «ОРОМ-ІМПЕКС»",
          contactName: "Віталій Шевченко",
          contactPhone: "+38 (063) 510-92-40",
          loginEmail: "orom@uga-index.demo",
          collectionMode: "manual_outreach",
          status: "pending",
        },
        {
          id: "aeroc",
          legalName: "ТОВ «АЕРОК АГРО»",
          contactName: "Марина Романюк",
          contactPhone: "+38 (067) 520-13-51",
          loginEmail: "aeroc@uga-index.demo",
          collectionMode: "manual_outreach",
          status: "pending",
        },
        {
          id: "grain-alliance",
          legalName: "ТОВ «Грейн Альянс»",
          contactName: "Павло Данилюк",
          contactPhone: "+38 (050) 530-27-62",
          loginEmail: "grain-alliance@uga-index.demo",
          collectionMode: "manual_outreach",
          status: "pending",
        },
      ]
    : respondents.map((respondent, index) => ({
        ...respondent,
        contactName: `Partner contact ${index + 1}`,
        contactPhone: "",
        loginEmail: `respondent-${index + 1}@${activeIndex.id}.demo`,
        collectionMode: "self_service",
        status: "active",
      }));

async function main() {
  const deliveryBasisRecords = await Promise.all(
    activeIndex.deliveryBases.map((basis) =>
      prisma.deliveryBasis.upsert({
        where: { code: basis.code },
        update: {
          name: basis.name,
          region: basis.region,
          status: "published",
        },
        create: {
          code: basis.code,
          name: basis.name,
          region: basis.region,
          status: "published",
        },
      }),
    ),
  );
  const deliveryBasisByCode = new Map(
    deliveryBasisRecords.map((basis) => [basis.code, basis]),
  );

  const commodityRecords = await Promise.all(
    commodities.map((commodity) =>
      prisma.commodity.upsert({
        where: { code: commodity.code },
        update: {
          nameUk: commodity.nameUk,
          nameEn: commodity.nameEn,
          status: "published",
          sortOrder: commodity.sortOrder,
        },
        create: {
          code: commodity.code,
          nameUk: commodity.nameUk,
          nameEn: commodity.nameEn,
          status: "published",
          sortOrder: commodity.sortOrder,
        },
      }),
    ),
  );

  const respondentRecords = await Promise.all(
    respondents.map((respondent) =>
      prisma.respondent.upsert({
        where: { id: respondent.id },
        update: {
          legalName: respondent.legalName,
          displayName: respondent.legalName,
          active: true,
          status: "active",
        },
        create: {
          id: respondent.id,
          legalName: respondent.legalName,
          displayName: respondent.legalName,
          active: true,
          status: "active",
        },
      }),
    ),
  );

  await Promise.all(
    directoryRespondents.map(async (respondent) => {
      const status = respondent.status === "pending" ? "pending" : "active";
      const collectionMode =
        respondent.collectionMode === "manual_outreach"
          ? "manual_outreach"
          : "self_service";

      await prisma.respondent.upsert({
        where: { id: respondent.id },
        update: {
          active: status === "active",
          collectionMode,
          displayName: respondent.legalName,
          legalName: respondent.legalName,
          status,
        },
        create: {
          id: respondent.id,
          active: status === "active",
          collectionMode,
          displayName: respondent.legalName,
          legalName: respondent.legalName,
          status,
        },
      });

      await prisma.respondentContact.deleteMany({
        where: { respondentId: respondent.id },
      });
      await prisma.respondentContact.create({
        data: {
          respondentId: respondent.id,
          email: respondent.loginEmail,
          name: respondent.contactName,
          phone: respondent.contactPhone,
          primary: true,
          role: "Primary contact",
        },
      });
      await prisma.respondentAuthAccount.upsert({
        where: { respondentId: respondent.id },
        update: {
          loginEmail: respondent.loginEmail,
          passwordSetupStatus: "temporary",
          temporaryPassword: "respondent",
          lastGeneratedAt: new Date(Date.UTC(2026, 4, 20, 10)),
        },
        create: {
          respondentId: respondent.id,
          loginEmail: respondent.loginEmail,
          passwordSetupStatus: "temporary",
          temporaryPassword: "respondent",
          lastGeneratedAt: new Date(Date.UTC(2026, 4, 20, 10)),
        },
      });
    }),
  );

  const basketRecords = await Promise.all(
    activeIndex.deliveryBases.map((basis) => {
      const deliveryBasis = deliveryBasisByCode.get(basis.code);

      if (!deliveryBasis) {
        throw new Error(`Missing delivery basis ${basis.code}`);
      }

      return prisma.basket.upsert({
        where: { code: basis.basketCode },
        update: {
          name: basis.basketName,
          deliveryBasisId: deliveryBasis.id,
          weight: new Prisma.Decimal(1),
          active: true,
        },
        create: {
          code: basis.basketCode,
          name: basis.basketName,
          deliveryBasisId: deliveryBasis.id,
          weight: new Prisma.Decimal(1),
          active: true,
        },
      });
    }),
  );
  const basketByBasisCode = new Map(
    activeIndex.deliveryBases.map((basis, index) => [basis.code, basketRecords[index]]),
  );

  await Promise.all(
    basketRecords.flatMap((basket) =>
      respondentRecords.map((respondent) =>
        prisma.basketRespondent.upsert({
          where: {
            basketId_respondentId: {
              basketId: basket.id,
              respondentId: respondent.id,
            },
          },
          update: {
            weight: new Prisma.Decimal(1),
            active: true,
          },
          create: {
            basketId: basket.id,
            respondentId: respondent.id,
            weight: new Prisma.Decimal(1),
            active: true,
          },
        }),
      ),
    ),
  );

  const adminUsers =
    activeIndex.id === "spike-ua"
      ? [
          {
            email: "a.biletskiy@gmail.com",
            name: "ABV - Anton Biletskiy",
          },
          {
            email: "an@spike.broker",
            name: "AN - Arina Nimanikhina",
          },
          {
            email: "os@spike.broker",
            name: "OS - Oleksandr Solovey",
          },
        ]
      : [
          {
            email: "admin@uga.ua",
            name: "Demo Admin",
          },
        ];
  const [adminUser] = await Promise.all(
    adminUsers.map((admin) =>
      prisma.user.upsert({
        where: { email: admin.email },
        update: {
          active: true,
          name: admin.name,
          role: "admin",
          temporaryPassword: getAdminTemporaryPassword(),
          passwordSetupStatus: "temporary",
          lastGeneratedAt: new Date(),
        },
        create: {
          active: true,
          email: admin.email,
          name: admin.name,
          passwordSetupStatus: "temporary",
          role: "admin",
          temporaryPassword: getAdminTemporaryPassword(),
          lastGeneratedAt: new Date(),
        },
      }),
    ),
  );

  if (!adminUser) {
    throw new Error("Admin user was not seeded.");
  }

  await prisma.user.upsert({
    where: { email: `member@${activeIndex.id}.demo` },
    update: {
      name: "Demo Member",
      role: "member",
      active: true,
      passwordHash: hashPassword("member"),
      passwordSetupStatus: "active",
      passwordSetAt: new Date(),
    },
    create: {
      email: `member@${activeIndex.id}.demo`,
      name: "Demo Member",
      role: "member",
      active: true,
      passwordHash: hashPassword("member"),
      passwordSetupStatus: "active",
      passwordSetAt: new Date(),
    },
  });

  await Promise.all(
    directoryRespondents.map((respondent) =>
      prisma.user.upsert({
        where: { email: respondent.loginEmail },
        update: {
          name: `${respondent.legalName} respondent`,
          role: "respondent",
          respondentId: respondent.id,
          active: respondent.status === "active",
          temporaryPassword: "respondent",
          passwordSetupStatus: "temporary",
          lastGeneratedAt: new Date(),
        },
        create: {
          email: respondent.loginEmail,
          name: `${respondent.legalName} respondent`,
          role: "respondent",
          respondentId: respondent.id,
          active: respondent.status === "active",
          temporaryPassword: "respondent",
          passwordSetupStatus: "temporary",
          lastGeneratedAt: new Date(),
        },
      }),
    ),
  );

  if (seedDemoHistory) {
    for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
      const tradeDate = dateDaysBefore(dayOffset);

      for (const commodity of commodityRecords) {
        const commoditySeed = commodities.find(({ code }) => code === commodity.code);

        if (!commoditySeed) {
          continue;
        }

        const basisConfig =
          commoditySeed.group === "processing"
            ? activeIndex.deliveryBases[1] ?? activeIndex.deliveryBases[0]
            : activeIndex.deliveryBases[0];
        const deliveryBasis = deliveryBasisByCode.get(basisConfig.code);
        const basket = basketByBasisCode.get(basisConfig.code);

        if (!deliveryBasis || !basket) {
          throw new Error(`Missing seed basket for ${basisConfig.code}`);
        }

        const basePrice = commoditySeed.basePrice - dayOffset * 0.65;
        const submissions = await Promise.all(
          respondentRecords.map((respondent, respondentIndex) => {
            const price = roundMoney(basePrice + respondentIndex * 0.3 - 1.05);

            return prisma.priceSubmission.upsert({
              where: {
                tradeDate_commodityId_deliveryBasisId_respondentId_source: {
                  tradeDate,
                  commodityId: commodity.id,
                  deliveryBasisId: deliveryBasis.id,
                  respondentId: respondent.id,
                  source: "respondent",
                },
              },
              update: {
                priceUsdPerMt: new Prisma.Decimal(price),
                status: "verified",
                submittedAt: noonUtc(tradeDate),
              },
              create: {
                tradeDate,
                commodityId: commodity.id,
                deliveryBasisId: deliveryBasis.id,
                respondentId: respondent.id,
                submittedById: adminUser.id,
                source: "respondent",
                status: "verified",
                priceUsdPerMt: new Prisma.Decimal(price),
                submittedAt: noonUtc(tradeDate),
              },
            });
          }),
        );

        if (activeIndex.features.externalIndicative) {
          await prisma.externalIndicative.upsert({
            where: {
              tradeDate_commodityId_deliveryBasisId_source: {
                tradeDate,
                commodityId: commodity.id,
                deliveryBasisId: deliveryBasis.id,
                source: "spike",
              },
            },
            update: {
              priceUsdPerMt: new Prisma.Decimal(roundMoney(basePrice + 0.4)),
              status: "submitted",
              receivedAt: noonUtc(tradeDate),
              metadata: { provider: "Spike Brokers", basis: deliveryBasis.name },
            },
            create: {
              tradeDate,
              commodityId: commodity.id,
              deliveryBasisId: deliveryBasis.id,
              source: "spike",
              status: "submitted",
              priceUsdPerMt: new Prisma.Decimal(roundMoney(basePrice + 0.4)),
              receivedAt: noonUtc(tradeDate),
              metadata: { provider: "Spike Brokers", basis: deliveryBasis.name },
            },
          });
        }

        if (dayOffset >= 1 && dayOffset <= 7) {
          await seedPublishedIndex({
            adminUserId: adminUser.id,
            basketId: basket.id,
            basketWeight: basket.weight,
            commodityId: commodity.id,
            deliveryBasisId: deliveryBasis.id,
            submissions,
            tradeDate,
          });
        }
      }
    }
  }

  await prisma.respondentEmailSchedule.upsert({
    where: { id: "default" },
    update: {
      enabled: true,
      replyTo: "inbox@uga.ua",
      sender: "UGA Index <onboarding@resend.dev>",
      sendTime: "16:30",
      subject: "UGA Index daily price survey",
      surveyUrl: "/respondent",
      template:
        "Please submit today's CPT UA Black Sea price indicatives for UGA Index. Open your daily survey form using the personal link in this email.",
      timezone: "Europe/Kyiv",
      workdays: "Monday-Friday",
    },
    create: {
      id: "default",
      enabled: true,
      replyTo: "inbox@uga.ua",
      sender: "UGA Index <onboarding@resend.dev>",
      sendTime: "16:30",
      subject: "UGA Index daily price survey",
      surveyUrl: "/respondent",
      template:
        "Please submit today's CPT UA Black Sea price indicatives for UGA Index. Open your daily survey form using the personal link in this email.",
      timezone: "Europe/Kyiv",
      workdays: "Monday-Friday",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      actorRole: "admin",
      action: "seed.completed",
      entityType: "database",
      summary: `Seeded ${activeIndex.name} ${seedDemoHistory ? "demo" : "production"} data.`,
      beforeJson: Prisma.JsonNull,
      afterJson: {
        commodities: commodityRecords.length,
        respondents: respondentRecords.length,
        daysOfSubmissions: seedDemoHistory ? 14 : 0,
        daysOfSpikeIndicatives:
          seedDemoHistory && activeIndex.features.externalIndicative ? 14 : 0,
        daysOfPublishedIndices: seedDemoHistory ? 7 : 0,
        seedDemoAdminPassword,
        seedDemoHistory,
      },
    },
  });
}

async function seedPublishedIndex({
  adminUserId,
  basketId,
  basketWeight,
  commodityId,
  deliveryBasisId,
  submissions,
  tradeDate,
}: {
  adminUserId: string;
  basketId: string;
  basketWeight: Prisma.Decimal;
  commodityId: string;
  deliveryBasisId: string;
  submissions: Array<{
    id: string;
    respondentId: string;
    priceUsdPerMt: Prisma.Decimal;
  }>;
  tradeDate: Date;
}) {
  const calculationResult = calculateIndexValue({
    date: isoDate(tradeDate),
    commodityId,
    deliveryBasisId,
    basketWeight: basketWeight.toNumber(),
    submissions: submissions.map((submission) => ({
      respondentId: submission.respondentId,
      price: submission.priceUsdPerMt.toNumber(),
    })),
  });

  const calculation = await prisma.indexCalculation.upsert({
    where: {
      tradeDate_commodityId_deliveryBasisId_basketId: {
        tradeDate,
        commodityId,
        deliveryBasisId,
        basketId,
      },
    },
    update: {
      status: "published",
      medianUsdPerMt:
        calculationResult.median === null
          ? null
          : new Prisma.Decimal(calculationResult.median),
      valueUsdPerMt:
        calculationResult.rawValue === null
          ? null
          : new Prisma.Decimal(calculationResult.rawValue),
      publicValueUsdPerMt:
        calculationResult.value === null
          ? null
          : new Prisma.Decimal(calculationResult.value),
      rawCount: calculationResult.rawCount,
      usedCount: calculationResult.usedCount,
      basketWeight,
      version: 1,
      calculatedById: adminUserId,
      calculatedAt: noonUtc(tradeDate),
    },
    create: {
      tradeDate,
      commodityId,
      deliveryBasisId,
      basketId,
      status: "published",
      medianUsdPerMt:
        calculationResult.median === null
          ? null
          : new Prisma.Decimal(calculationResult.median),
      valueUsdPerMt:
        calculationResult.rawValue === null
          ? null
          : new Prisma.Decimal(calculationResult.rawValue),
      publicValueUsdPerMt:
        calculationResult.value === null
          ? null
          : new Prisma.Decimal(calculationResult.value),
      rawCount: calculationResult.rawCount,
      usedCount: calculationResult.usedCount,
      basketWeight,
      version: 1,
      calculatedById: adminUserId,
      calculatedAt: noonUtc(tradeDate),
    },
  });

  await prisma.indexCalculationItem.deleteMany({
    where: { calculationId: calculation.id },
  });

  const excludedByRespondent = new Map(
    calculationResult.excluded.map((item) => [item.respondentId, item]),
  );

  await prisma.indexCalculationItem.createMany({
    data: submissions.map((submission) => {
      const excluded = excludedByRespondent.get(submission.respondentId);

      return {
        calculationId: calculation.id,
        priceSubmissionId: submission.id,
        respondentId: submission.respondentId,
        priceUsdPerMt: submission.priceUsdPerMt,
        included: !excluded,
        deviationPct: excluded
          ? new Prisma.Decimal(excluded.deviationPct)
          : new Prisma.Decimal(0),
        exclusionReason: excluded ? "outside_2pct_median_band" : null,
      };
    }),
  });

  if (calculationResult.value !== null) {
    const previous = await prisma.publishedIndex.findFirst({
      where: {
        tradeDate: { lt: tradeDate },
        commodityId,
        deliveryBasisId,
        basketId,
        status: "published",
        locked: true,
      },
      orderBy: { tradeDate: "desc" },
    });
    const change =
      previous === null
        ? { changeAbs: null, changePct: null }
        : computePublishedChange(
            calculationResult.value,
            previous.valueUsdPerMt.toNumber(),
          );

    await prisma.publishedIndex.upsert({
      where: {
        tradeDate_commodityId_deliveryBasisId_basketId: {
          tradeDate,
          commodityId,
          deliveryBasisId,
          basketId,
        },
      },
      update: {
        calculationId: calculation.id,
        status: "published",
        valueUsdPerMt: new Prisma.Decimal(calculationResult.value),
        changeAbsUsdPerMt:
          change.changeAbs === null ? null : new Prisma.Decimal(change.changeAbs),
        changePct:
          change.changePct === null ? null : new Prisma.Decimal(change.changePct),
        locked: true,
        publishedById: adminUserId,
        publishedAt: noonUtc(tradeDate),
      },
      create: {
        tradeDate,
        commodityId,
        deliveryBasisId,
        basketId,
        calculationId: calculation.id,
        status: "published",
        valueUsdPerMt: new Prisma.Decimal(calculationResult.value),
        changeAbsUsdPerMt:
          change.changeAbs === null ? null : new Prisma.Decimal(change.changeAbs),
        changePct:
          change.changePct === null ? null : new Prisma.Decimal(change.changePct),
        locked: true,
        publishedById: adminUserId,
        publishedAt: noonUtc(tradeDate),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        actorRole: "admin",
        action: "index.published",
        entityType: "PublishedIndex",
        entityId: calculation.id,
        summary: `Published index for ${commodityId} on ${isoDate(tradeDate)}.`,
        beforeJson: Prisma.JsonNull,
        afterJson: {
          tradeDate: isoDate(tradeDate),
          commodityId,
          deliveryBasisId,
          valueUsdPerMt: calculationResult.value,
          changeAbsUsdPerMt: change.changeAbs,
          changePct: change.changePct,
          locked: true,
        },
      },
    });
  }
}

function dateDaysBefore(dayOffset: number) {
  return new Date(
    Date.UTC(
      BASE_DATE.getUTCFullYear(),
      BASE_DATE.getUTCMonth(),
      BASE_DATE.getUTCDate() - dayOffset,
    ),
  );
}

function noonUtc(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
  );
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function computePublishedChange(currentValue: number, previousValue: number) {
  const changeAbs = Math.round((currentValue - previousValue) * 10) / 10;
  const changePct = Math.round((changeAbs / previousValue) * 10000) / 100;

  return { changeAbs, changePct };
}

function shouldSeedDemoFeature(name: string) {
  const value = process.env[name];

  if (value === "1" || value === "true") {
    return true;
  }

  if (value === "0" || value === "false") {
    return false;
  }

  return process.env.UGA_INDEX_RUNTIME_MODE !== "production";
}

function getAdminTemporaryPassword() {
  return seedDemoAdminPassword ? "admin" : null;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
