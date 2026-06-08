const args = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);

function getArgValue(name) {
  const withEquals = `--${name}=`;
  const exact = args.find((arg) => arg.startsWith(withEquals));

  if (exact) {
    return exact.slice(withEquals.length);
  }

  const index = args.indexOf(`--${name}`);

  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return null;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function getTenantId() {
  return (
    process.env.INDEX_TENANT ??
    process.env.NEXT_PUBLIC_INDEX_TENANT ??
    "uga-ua"
  );
}

function getBotToken() {
  const tenantId = getTenantId();

  if (tenantId === "spike-ua") {
    return (
      process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
      process.env.INDEX_TELEGRAM_BOT_TOKEN ??
      null
    );
  }

  return (
    process.env.UGA_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN ??
    null
  );
}

function getWebhookUrl() {
  const explicit = getArgValue("url");

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required or pass --url https://your-domain.tld",
    );
  }

  return `${siteUrl}/api/telegram/respondent`;
}

async function telegramCall(method, payload = undefined) {
  const token = getBotToken();

  if (!token) {
    throw new Error(
      "Telegram bot token is missing. Set SPIKE_TELEGRAM_BOT_TOKEN, UGA_TELEGRAM_BOT_TOKEN or INDEX_TELEGRAM_BOT_TOKEN.",
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: payload ? JSON.stringify(payload) : undefined,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    method: payload ? "POST" : "GET",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${data.description ?? response.statusText}`,
    );
  }

  return data.result ?? data;
}

async function main() {
  const mode = getArgValue("mode") ?? "set";

  if (mode === "info") {
    const result = await telegramCall("getWebhookInfo");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (mode === "delete") {
    const dropPendingUpdates = hasFlag("drop-pending");
    const result = await telegramCall("deleteWebhook", {
      drop_pending_updates: dropPendingUpdates,
    });
    console.log(
      JSON.stringify(
        {
          deleted: true,
          dropPendingUpdates,
          result,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (mode !== "set") {
    throw new Error('Unsupported --mode. Use "set", "info" or "delete".');
  }

  const url = getWebhookUrl();
  const payload = {
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: hasFlag("drop-pending"),
    url,
  };
  const secret = process.env.TELEGRAM_RESPONDENT_WEBHOOK_SECRET?.trim();

  if (secret) {
    payload.secret_token = secret;
  }

  const result = await telegramCall("setWebhook", payload);
  console.log(
    JSON.stringify(
      {
        secretProtected: Boolean(secret),
        url,
        webhookConfigured: true,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "[respondent-telegram-webhook]",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
