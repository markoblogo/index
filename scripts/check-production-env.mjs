const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ALLOWED_EMBED_ORIGINS",
  "DEMO_AUTH_SECRET",
  "UGA_INDEX_RUNTIME_MODE",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

const missing = required.filter((key) => !process.env[key]);

if (process.env.UGA_INDEX_RUNTIME_MODE !== "production") {
  missing.push("UGA_INDEX_RUNTIME_MODE=production");
}

const tenantId =
  process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT ?? "";
const hasRespondentTelegramToken =
  Boolean(process.env.INDEX_TELEGRAM_BOT_TOKEN) ||
  (tenantId === "spike-ua"
    ? Boolean(process.env.SPIKE_TELEGRAM_BOT_TOKEN)
    : Boolean(process.env.UGA_TELEGRAM_BOT_TOKEN));

if (!hasRespondentTelegramToken) {
  missing.push(
    tenantId === "spike-ua"
      ? "SPIKE_TELEGRAM_BOT_TOKEN (or INDEX_TELEGRAM_BOT_TOKEN)"
      : "UGA_TELEGRAM_BOT_TOKEN (or INDEX_TELEGRAM_BOT_TOKEN)",
  );
}

if (missing.length > 0) {
  console.error("Missing or invalid production environment:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Production environment check passed.");
