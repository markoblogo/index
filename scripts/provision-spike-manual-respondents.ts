import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { INDEX_CONFIGS } from "../src/lib/index-platform";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const spikeConfig = INDEX_CONFIGS["spike-ua"];
const manualRespondents = spikeConfig.respondents.filter(
  (respondent) => respondent.seedAuthContact === false,
);

if (manualRespondents.length === 0) {
  throw new Error("No manual-only Spike respondents are configured.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const records = await Promise.all(
    manualRespondents.map((respondent) =>
      prisma.respondent.upsert({
        where: { id: respondent.id },
        update: {
          active: true,
          collectionMode: respondent.collectionMode ?? "manual_outreach",
          displayName: respondent.legalName,
          legalName: respondent.legalName,
          status: "active",
        },
        create: {
          id: respondent.id,
          active: true,
          collectionMode: respondent.collectionMode ?? "manual_outreach",
          displayName: respondent.legalName,
          legalName: respondent.legalName,
          status: "active",
        },
      }),
    ),
  );

  console.log(
    JSON.stringify({
      count: records.length,
      respondents: records.map((respondent) => ({
        collectionMode: respondent.collectionMode,
        id: respondent.id,
        legalName: respondent.legalName,
      })),
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
  await prisma.$disconnect();
  });
