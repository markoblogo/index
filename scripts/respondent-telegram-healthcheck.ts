import { db } from "@/lib/db";
import { formatHealthText, getRespondentTelegramDeliveryHealth } from "@/lib/respondent-telegram-healthcheck";

type Options = {
  date?: string;
  includeAll?: boolean;
  strict?: boolean;
  json?: boolean;
};

function parseArgs(argv: string[]): Options {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Usage: npm run monitor:respondent-telegram -- [--date YYYY-MM-DD] [--all] [--strict] [--json]\n" +
        "  --date YYYY-MM-DD  Check specific Kyiv date\n" +
        "  --all               Print all Telegram-active respondents\n" +
        "  --strict            Exit with code 1 if any missing/failed deliveries found\n" +
        "  --json              Output machine-readable JSON",
    );
    process.exit(0);
  }

  const date = pickArgValue(argv, "--date");
  const includeAll = argv.includes("--all");
  const strict = argv.includes("--strict");
  const json = argv.includes("--json");

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  return { date, includeAll, strict, json };
}

function pickArgValue(argv: string[], key: string) {
  const valueAsPair = argv.find((value) => value.startsWith(`${key}=`));
  if (valueAsPair) {
    return valueAsPair.substring(key.length + 1);
  }

  const index = argv.findIndex((value) => value === key);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }

  return undefined;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  const health = await getRespondentTelegramDeliveryHealth({
    date: options.date,
    includeNoDeliveryOnly: !options.includeAll,
  });

  if (options.json) {
    console.log(JSON.stringify(health, null, 2));
  } else {
    console.log(formatHealthText(health));
  }

  if (options.strict && health.failedOrMissingLatest.length > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    console.error(`Healthcheck failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    db.$disconnect().catch(() => undefined);
  });
