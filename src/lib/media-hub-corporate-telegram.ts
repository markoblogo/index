import type { MediaHubManualMaterialTenant } from "@/lib/media-hub-manual-materials";

export const CORPORATE_TELEGRAM_PEER_ID = "1865902381";
export const CORPORATE_TELEGRAM_BOT_API_CHAT_ID = "-1001865902381";

const SSI_KEYWORDS = [
  "spike spot index",
  "ssi",
  "spike.1d3x.com",
  "ukraine",
  "ukrainian grain",
  "black sea",
  "odesa",
  "odessa",
  "danube",
  "chornomorsk",
  "pivdennyi",
  "izmail",
  "reni",
  "cpt odesa",
  "sunflower",
  "rapeseed",
  "soybean",
  "corn",
  "wheat",
];

const ID3X_KEYWORDS = [
  "1d3x",
  "id3x",
  "idex",
  "idex_grains",
  "idex_grains_bot",
  "1d3x.com",
  "global",
  "cbot",
  "matif",
  "brazil",
  "argentina",
  "usda",
  "global grains",
  "global oilseeds",
  "freight",
  "futures",
  "crop weather",
];

export function normalizeTelegramBotApiChatId(value?: string | number | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("-100")) {
    return raw;
  }
  if (raw.startsWith("-")) {
    return raw;
  }
  return `-100${raw}`;
}

export function getCorporateTelegramChatIds() {
  const configuredChatId = process.env.MEDIA_HUB_CORPORATE_TELEGRAM_CHAT_ID?.trim();
  const configuredPeerId = process.env.MEDIA_HUB_CORPORATE_TELEGRAM_PEER_ID?.trim();
  const peerId = configuredPeerId || CORPORATE_TELEGRAM_PEER_ID;
  const botApiChatId = configuredChatId || normalizeTelegramBotApiChatId(peerId);

  return {
    botApiChatId,
    peerId,
  };
}

export function isCorporateTelegramChat(chatId: string | number) {
  const normalized = String(chatId);
  const { botApiChatId, peerId } = getCorporateTelegramChatIds();
  return normalized === botApiChatId ||
    normalized === peerId ||
    normalized === normalizeTelegramBotApiChatId(peerId);
}

export function inferCorporateTelegramTenants(text: string): MediaHubManualMaterialTenant[] {
  const body = text.toLowerCase();
  const tenants = new Set<MediaHubManualMaterialTenant>();
  if (body.includes("#ssi")) {
    tenants.add("spike-ua");
  }
  if (body.includes("#1d3x") || body.includes("#id3x")) {
    tenants.add("1d3x");
  }
  if (tenants.size > 0) {
    return [...tenants];
  }

  if (SSI_KEYWORDS.some((keyword) => body.includes(keyword))) {
    tenants.add("spike-ua");
  }
  if (ID3X_KEYWORDS.some((keyword) => body.includes(keyword))) {
    tenants.add("1d3x");
  }

  return [...tenants];
}

export const __mediaHubCorporateTelegramTestHooks = {
  inferCorporateTelegramTenants,
  isCorporateTelegramChat,
  normalizeTelegramBotApiChatId,
};
