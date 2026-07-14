import { validateProductionEnv } from "./check-production-env.mjs";

const baseEnv = {
  ALLOWED_EMBED_ORIGINS: "https://example.com",
  CORTEX_CHUNK_MANIFEST_PATH: ".cortex/chunk-manifest.json",
  CORTEX_INTERNAL_API_SECRET: "12345678901234567890123456789012",
  CRON_SECRET: "12345678901234567890123456789012",
  DATABASE_URL: "postgresql://user:pass@example.com:5432/index",
  DEMO_AUTH_SECRET: "12345678901234567890123456789012",
  MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS: "-1001",
  MEDIA_HUB_CATCHUP_SECRET: "catchup-secret",
  MEDIA_HUB_REPAIR_SECRET: "repair-secret",
  MEDIA_HUB_SMOKE_TEST_SECRET: "smoke-secret",
  MEDIA_HUB_TELEGRAM_CHAT_ID: "-1001",
  OPENAI_API_KEY: "sk-ci-placeholder",
  PLATFORM_CONTACT_TO_EMAIL: "ops@example.com",
  RESEND_API_KEY: "re_ci_placeholder",
  RESPONDENT_EMAIL_CRON_SECRET: "respondent-email-secret",
  RESPONDENT_TELEGRAM_CRON_SECRET: "respondent-telegram-secret",
  SPIKE_AUTO_PUBLISH_CRON_SECRET: "spike-auto-secret",
  SPIKE_DAILY_CATCHUP_SECRET: "spike-catchup-secret",
  SPIKE_MEDIA_HUB_CRON_SECRET: "spike-media-secret",
  SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID: "-1001",
  SPIKE_TELEGRAM_BOT_TOKEN: "spike-token-placeholder",
  TELEGRAM_CONNECTOR_POST_CHAT_IDS: "-1001",
  TELEGRAM_CONNECTOR_READ_CHAT_IDS: "-1001",
  TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook-secret",
  TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook-secret",
  UGA_INDEX_RUNTIME_MODE: "production",
  UGA_PASSWORD_RESET_REPLY_TO: "inbox@example.com",
  UGA_PASSWORD_RESET_SENDER: "UGA Index <security@example.com>",
  UGA_TELEGRAM_BOT_TOKEN: "uga-token-placeholder",
};

const projectCases = [
  {
    project: "spike-ua-index",
    env: {
      INDEX_TENANT: "spike-ua",
      NEXT_PUBLIC_SITE_URL: "https://spike.1d3x.com",
      SSI_WHATSAPP_ENABLED: "1",
      SSI_WHATSAPP_TARGET_GROUP_ID: "120363410742125046@g.us",
      SSI_WHATSAPP_WEBHOOK_SECRET: "whatsapp-secret",
      SSI_WHATSAPP_WEBHOOK_URL: "https://worker.example.com/send",
    },
  },
  {
    project: "uga-index",
    env: {
      INDEX_TENANT: "uga-ua",
      NEXT_PUBLIC_SITE_URL: "https://index.uga.ua",
    },
  },
  {
    project: "1d3x",
    env: {
      ID3X_TELEGRAM_BOT_TOKEN: "id3x-token-placeholder",
      INDEX_TENANT: "1d3x",
      NEXT_PUBLIC_SITE_URL: "https://1d3x.com",
    },
  },
];

let failed = false;

for (const { project, env } of projectCases) {
  const result = validateProductionEnv({ ...baseEnv, ...env }, { project });
  if (result.ok) {
    console.log(`${project}: production env smoke passed`);
    continue;
  }

  failed = true;
  console.error(`${project}: production env smoke failed`);
  for (const item of result.missing) console.error(`- missing: ${item}`);
  for (const item of result.invalid) console.error(`- invalid: ${item}`);
  for (const item of result.warnings) console.error(`- warning: ${item}`);
}

if (failed) {
  process.exitCode = 1;
}
