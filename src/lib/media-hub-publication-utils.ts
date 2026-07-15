import type { PublicLatestItem } from "@/lib/public-api-data";

export function isSsiDailyIndexDataCurrent(
  latestData: PublicLatestItem[],
  periodEndDate: string,
) {
  return latestData.length > 0 && latestData.every((item) => item.date === periodEndDate);
}

export function isId3xMediaHubTelegramPaused() {
  return /^(1|true|yes)$/i.test(
    process.env.ID3X_MEDIA_HUB_TELEGRAM_PAUSED?.trim() ?? "",
  );
}

export function parseJsonNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function formatShortTelegramDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year?.slice(-2)}`;
}
