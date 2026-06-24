import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

type SourceConfig = {
  handle: string;
  peerId: string;
  label: string;
  kind: "text_weekly" | "image_prices";
};

const SOURCES: SourceConfig[] = [
  {
    handle: "spike_brokers",
    peerId: "1198567788",
    label: "SPIKE Brokers weekly market",
    kind: "text_weekly",
  },
  {
    handle: "kernelprices",
    peerId: "1330198986",
    label: "INERCO prices",
    kind: "image_prices",
  },
  {
    handle: "SoftComTrading",
    peerId: "1922040516",
    label: "Zaria Trade prices",
    kind: "image_prices",
  },
];

const DEFAULT_FROM = "2020-01-01";
const DEFAULT_TO = "2025-09-01";
const SESSION_PATH = path.join(process.cwd(), ".local", "telegram-archive.session");
const OUTPUT_ROOT = path.join(process.cwd(), "data", "spike-historical", "raw", "telegram");

type CliOptions = {
  from: Date;
  to: Date;
  limit?: number;
  sourceHandles: Set<string>;
  skipMedia: boolean;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const getValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const has = (name: string) => args.includes(name);
  const sourceArg = getValue("--source");
  const limitArg = getValue("--limit");

  return {
    from: startOfDay(getValue("--from") ?? DEFAULT_FROM),
    to: endOfDay(getValue("--to") ?? DEFAULT_TO),
    limit: limitArg ? Number(limitArg) : undefined,
    sourceHandles: new Set(
      sourceArg
        ? sourceArg
            .split(",")
            .map((value) => value.trim().replace(/^@/, ""))
            .filter(Boolean)
        : SOURCES.map((source) => source.handle),
    ),
    skipMedia: has("--skip-media"),
  };
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function readSession() {
  if (!existsSync(SESSION_PATH)) {
    return "";
  }
  return (await readFile(SESSION_PATH, "utf8")).trim();
}

async function persistSession(session: string) {
  await mkdir(path.dirname(SESSION_PATH), { recursive: true });
  await writeFile(SESSION_PATH, `${session}\n`, "utf8");
}

async function createClient() {
  const apiId = Number(getRequiredEnv("TELEGRAM_API_ID"));
  const apiHash = getRequiredEnv("TELEGRAM_API_HASH");
  const session = new StringSession(await readSession());
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  if (session.save()) {
    await client.connect();
  } else {
    const rl = createInterface({ input, output });
    await client.start({
      phoneNumber: async () => rl.question("Telegram phone number: "),
      password: async () => rl.question("Telegram 2FA password, if enabled: "),
      phoneCode: async () => rl.question("Telegram login code: "),
      onError: (error) => console.error("[telegram-login]", error.message),
    });
    rl.close();
    await persistSession(client.session.save() as unknown as string);
  }

  return client;
}

function messageDate(message: Api.Message) {
  return new Date(message.date * 1000);
}

function serializeMessage(source: SourceConfig, message: Api.Message, mediaPath?: string | null) {
  const senderId = message.fromId
    ? "userId" in message.fromId
      ? String(message.fromId.userId)
      : "channelId" in message.fromId
        ? String(message.fromId.channelId)
        : null
    : null;

  return {
    source: {
      handle: source.handle,
      peerId: source.peerId,
      label: source.label,
      kind: source.kind,
    },
    telegram: {
      id: message.id,
      date: messageDate(message).toISOString(),
      groupedId: message.groupedId ? String(message.groupedId) : null,
      senderId,
    },
    text: message.message || "",
    hasMedia: Boolean(message.media),
    mediaPath,
  };
}

async function collectSource(client: TelegramClient, source: SourceConfig, options: CliOptions) {
  const outputDir = path.join(OUTPUT_ROOT, source.handle);
  const mediaDir = path.join(outputDir, "media");
  await mkdir(mediaDir, { recursive: true });

  const jsonlPath = path.join(outputDir, "messages.jsonl");
  const records: string[] = [];
  let scanned = 0;
  let kept = 0;
  let mediaDownloaded = 0;
  const entity = await client.getEntity(source.handle);

  for await (const rawMessage of client.iterMessages(entity, { limit: options.limit })) {
    if (!(rawMessage instanceof Api.Message)) {
      continue;
    }
    scanned += 1;
    const date = messageDate(rawMessage);
    if (date > options.to) {
      continue;
    }
    if (date < options.from) {
      break;
    }

    let mediaPath: string | null = null;
    if (rawMessage.media && !options.skipMedia) {
      const extension = inferMediaExtension(rawMessage);
      const filename = `${date.toISOString().slice(0, 10)}_${rawMessage.id}${extension}`;
      const absoluteMediaPath = path.join(mediaDir, filename);
      try {
        const media = await client.downloadMedia(rawMessage, {});
        if (media instanceof Buffer) {
          await writeFile(absoluteMediaPath, media);
          mediaPath = path.relative(process.cwd(), absoluteMediaPath);
          mediaDownloaded += 1;
        }
      } catch (error) {
        console.warn("[media-download-failed]", source.handle, rawMessage.id, error instanceof Error ? error.message : error);
      }
    }

    records.push(JSON.stringify(serializeMessage(source, rawMessage, mediaPath)));
    kept += 1;
  }

  await writeFile(jsonlPath, records.join("\n") + (records.length ? "\n" : ""), "utf8");
  return { source: source.handle, scanned, kept, mediaDownloaded, jsonlPath };
}

function inferMediaExtension(message: Api.Message) {
  if (message.photo) {
    return ".jpg";
  }
  const document = message.document;
  const mimeType = document?.mimeType ?? "";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("pdf")) return ".pdf";
  return ".bin";
}

async function main() {
  const options = parseArgs();
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const selectedSources = SOURCES.filter((source) => options.sourceHandles.has(source.handle));
  if (selectedSources.length === 0) {
    throw new Error("No sources selected");
  }

  console.log("[archive] sources:", selectedSources.map((source) => `@${source.handle}`).join(", "));
  console.log("[archive] range:", options.from.toISOString(), "->", options.to.toISOString());

  const client = await createClient();
  const results = [];
  try {
    for (const source of selectedSources) {
      console.log("[archive] collecting", `@${source.handle}`);
      results.push(await collectSource(client, source, options));
    }
  } finally {
    await client.disconnect();
  }

  await writeFile(
    path.join(OUTPUT_ROOT, "collect-summary.json"),
    `${JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2)}\n`,
    "utf8",
  );
  console.table(results);
}

main().catch((error) => {
  console.error("[archive] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
