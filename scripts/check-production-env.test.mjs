import { describe, expect, it } from "vitest";
import { getProjectFromArgs, validateProductionEnv } from "./check-production-env.mjs";

const baseEnv = {
  ALLOWED_EMBED_ORIGINS: "https://example.com",
  CRON_SECRET: "x".repeat(32),
  DATABASE_URL: "postgresql://user:pass@example.com/db",
  DEMO_AUTH_SECRET: "y".repeat(32),
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  RESEND_API_KEY: "re_test",
};

describe("check-production-env", () => {
  it("passes a complete SPIKE production environment including WhatsApp settings", () => {
    const result = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "spike-ua",
      MEDIA_HUB_REPAIR_SECRET: "repair",
      MEDIA_HUB_SMOKE_TEST_SECRET: "smoke",
      OPENAI_API_KEY: "sk-test",
      SPIKE_AUTO_PUBLISH_CRON_SECRET: "auto",
      SPIKE_DAILY_CATCHUP_SECRET: "catchup",
      SPIKE_MEDIA_HUB_CRON_SECRET: "media",
      SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID: "-1001",
      SPIKE_TELEGRAM_BOT_TOKEN: "token",
      SSI_WHATSAPP_ENABLED: "1",
      SSI_WHATSAPP_TARGET_GROUP_ID: "group",
      SSI_WHATSAPP_WEBHOOK_SECRET: "whatsapp-secret",
      SSI_WHATSAPP_WEBHOOK_URL: "https://worker.example.com/send",
      TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook",
      TELEGRAM_CONNECTOR_READ_CHAT_IDS: "-1001",
      TELEGRAM_CONNECTOR_POST_CHAT_IDS: "-1001",
      TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook",
    }, { project: "spike-ua-index" });

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it("warns when MediaHub Telegram ingestion has no read allowlist", () => {
    const result = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "spike-ua",
      MEDIA_HUB_REPAIR_SECRET: "repair",
      MEDIA_HUB_SMOKE_TEST_SECRET: "smoke",
      SPIKE_AUTO_PUBLISH_CRON_SECRET: "auto",
      SPIKE_DAILY_CATCHUP_SECRET: "catchup",
      SPIKE_MEDIA_HUB_CRON_SECRET: "media",
      SPIKE_TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook",
      TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook",
    }, { project: "spike-ua-index" });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain("Telegram MediaHub ingestion has no read/user allowlist; set TELEGRAM_CONNECTOR_READ_CHAT_IDS or MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_*");
  });

  it("fails when connector autopost approval is disabled without explicit post chats", () => {
    const result = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "spike-ua",
      MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS: "-1001",
      MEDIA_HUB_REPAIR_SECRET: "repair",
      MEDIA_HUB_SMOKE_TEST_SECRET: "smoke",
      SPIKE_AUTO_PUBLISH_CRON_SECRET: "auto",
      SPIKE_DAILY_CATCHUP_SECRET: "catchup",
      SPIKE_MEDIA_HUB_CRON_SECRET: "media",
      SPIKE_TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED: "0",
      TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook",
      TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook",
    }, { project: "spike-ua-index" });

    expect(result.ok).toBe(false);
    expect(result.invalid).toContain("TELEGRAM_CONNECTOR_POST_CHAT_IDS is required when TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED=0");
  });

  it("fails closed when SPIKE WhatsApp is enabled without worker configuration", () => {
    const result = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "spike-ua",
      MEDIA_HUB_REPAIR_SECRET: "repair",
      MEDIA_HUB_SMOKE_TEST_SECRET: "smoke",
      SPIKE_AUTO_PUBLISH_CRON_SECRET: "auto",
      SPIKE_DAILY_CATCHUP_SECRET: "catchup",
      SPIKE_MEDIA_HUB_CRON_SECRET: "media",
      SPIKE_TELEGRAM_BOT_TOKEN: "token",
      SSI_WHATSAPP_ENABLED: "1",
      TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook",
      TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook",
    }, { project: "spike-ua-index" });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("SSI_WHATSAPP_WEBHOOK_URL");
    expect(result.missing).toContain("SSI_WHATSAPP_WEBHOOK_SECRET");
    expect(result.missing).toContain("SSI_WHATSAPP_TARGET_GROUP_ID or SSI_WHATSAPP_TARGET_GROUP_NAME");
  });

  it("requires UGA production runtime mode only for the UGA project", () => {
    const uga = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "uga-ua",
      RESPONDENT_EMAIL_CRON_SECRET: "email",
      RESPONDENT_TELEGRAM_CRON_SECRET: "telegram",
      UGA_INDEX_RUNTIME_MODE: "demo",
      UGA_TELEGRAM_BOT_TOKEN: "token",
    }, { project: "uga-index" });
    const spike = validateProductionEnv({
      ...baseEnv,
      INDEX_TENANT: "spike-ua",
      MEDIA_HUB_REPAIR_SECRET: "repair",
      MEDIA_HUB_SMOKE_TEST_SECRET: "smoke",
      SPIKE_AUTO_PUBLISH_CRON_SECRET: "auto",
      SPIKE_DAILY_CATCHUP_SECRET: "catchup",
      SPIKE_MEDIA_HUB_CRON_SECRET: "media",
      SPIKE_TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "media-webhook",
      TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "respondent-webhook",
    }, { project: "spike-ua-index" });

    expect(uga.invalid).toContain("UGA_INDEX_RUNTIME_MODE=production");
    expect(spike.invalid).not.toContain("UGA_INDEX_RUNTIME_MODE=production");
  });

  it("parses project arguments", () => {
    expect(getProjectFromArgs(["--project", "spike-ua-index"])).toBe("spike-ua-index");
    expect(getProjectFromArgs(["--project=uga-index"])).toBe("uga-index");
  });
});
