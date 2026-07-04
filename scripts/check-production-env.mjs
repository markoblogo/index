import { pathToFileURL } from "node:url";

const PROJECT_TENANTS = {
  "1d3x": ["1d3x", "platform"],
  "spike-ua-index": ["spike-ua"],
  "uga-index": ["uga-ua"],
};

const PROJECT_SITE_HOSTS = {
  "1d3x": ["1d3x.com", "www.1d3x.com"],
  "spike-ua-index": ["spike.1d3x.com", "spike-ua.cr0pto.com"],
  "uga-index": ["index.uga.ua", "uga.1d3x.com", "index-uga.cr0pto.com"],
};

const COMMON_REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ALLOWED_EMBED_ORIGINS",
  "DEMO_AUTH_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

const COMMON_SECRET_KEYS = [
  "CRON_SECRET",
  "DEMO_AUTH_SECRET",
];

const PROJECT_REQUIRED = {
  "1d3x": [],
  "spike-ua-index": [
    "SPIKE_AUTO_PUBLISH_CRON_SECRET",
    "SPIKE_DAILY_CATCHUP_SECRET",
    "SPIKE_MEDIA_HUB_CRON_SECRET",
    "MEDIA_HUB_CATCHUP_SECRET",
    "MEDIA_HUB_REPAIR_SECRET",
    "MEDIA_HUB_SMOKE_TEST_SECRET",
    "TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET",
    "TELEGRAM_RESPONDENT_WEBHOOK_SECRET",
  ],
  "uga-index": [
    "RESPONDENT_EMAIL_CRON_SECRET",
    "RESPONDENT_TELEGRAM_CRON_SECRET",
  ],
};

const PROJECT_TOKEN_GROUPS = {
  "1d3x": [
    ["ID3X_TELEGRAM_BOT_TOKEN", "MEDIA_HUB_TELEGRAM_BOT_TOKEN"],
  ],
  "spike-ua-index": [
    ["SPIKE_TELEGRAM_BOT_TOKEN", "INDEX_TELEGRAM_BOT_TOKEN"],
  ],
  "uga-index": [
    ["UGA_TELEGRAM_BOT_TOKEN", "INDEX_TELEGRAM_BOT_TOKEN"],
  ],
};

const PROJECT_WARNINGS = {
  "1d3x": ["PLATFORM_CONTACT_TO_EMAIL"],
  "spike-ua-index": ["OPENAI_API_KEY", "MEDIA_HUB_TELEGRAM_CHAT_ID", "SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID"],
  "uga-index": ["UGA_PASSWORD_RESET_SENDER", "UGA_PASSWORD_RESET_REPLY_TO"],
};

const TELEGRAM_MEDIA_HUB_PROJECTS = new Set(["1d3x", "spike-ua-index"]);

export function validateProductionEnv(env = process.env, options = {}) {
  const project = normalizeProject(options.project ?? env.VERCEL_PROJECT ?? env.VERCEL_PROJECT_NAME ?? "");
  const missing = [];
  const invalid = [];
  const warnings = [];

  for (const key of COMMON_REQUIRED) {
    if (!hasValue(env, key)) missing.push(key);
  }

  for (const key of COMMON_SECRET_KEYS) {
    if (hasValue(env, key) && String(env[key]).trim().length < 24) {
      invalid.push(`${key} must be at least 24 characters`);
    }
  }

  if (!project) {
    warnings.push("Project not specified; pass --project 1d3x|spike-ua-index|uga-index for tenant-specific checks.");
  } else {
    const expectedTenants = PROJECT_TENANTS[project] ?? [];
    const tenant = env.INDEX_TENANT || env.NEXT_PUBLIC_INDEX_TENANT || "";
    if (expectedTenants.length > 0 && !expectedTenants.includes(tenant)) {
      invalid.push(`INDEX_TENANT/NEXT_PUBLIC_INDEX_TENANT must be one of: ${expectedTenants.join(", ")}`);
    }
    const expectedHosts = PROJECT_SITE_HOSTS[project] ?? [];
    const configuredSiteHost = getUrlHost(env.NEXT_PUBLIC_SITE_URL);
    if (expectedHosts.length > 0 && configuredSiteHost && !expectedHosts.includes(configuredSiteHost)) {
      invalid.push(`NEXT_PUBLIC_SITE_URL host must be one of: ${expectedHosts.join(", ")}`);
    }

    for (const key of PROJECT_REQUIRED[project] ?? []) {
      if (!hasValue(env, key)) missing.push(key);
    }

    for (const group of PROJECT_TOKEN_GROUPS[project] ?? []) {
      if (!group.some((key) => hasValue(env, key))) {
        missing.push(`${group.join(" or ")}`);
      }
    }

    for (const key of PROJECT_WARNINGS[project] ?? []) {
      if (!hasValue(env, key)) warnings.push(`${key} is not set`);
    }

    if (project === "uga-index" && env.UGA_INDEX_RUNTIME_MODE !== "production") {
      invalid.push("UGA_INDEX_RUNTIME_MODE=production");
    }

    if (project === "spike-ua-index" && env.SSI_WHATSAPP_ENABLED === "1") {
      if (!hasValue(env, "SSI_WHATSAPP_WEBHOOK_URL")) missing.push("SSI_WHATSAPP_WEBHOOK_URL");
      if (!hasValue(env, "SSI_WHATSAPP_WEBHOOK_SECRET")) missing.push("SSI_WHATSAPP_WEBHOOK_SECRET");
      if (!hasValue(env, "SSI_WHATSAPP_TARGET_GROUP_ID") && !hasValue(env, "SSI_WHATSAPP_TARGET_GROUP_NAME")) {
        missing.push("SSI_WHATSAPP_TARGET_GROUP_ID or SSI_WHATSAPP_TARGET_GROUP_NAME");
      }
    }

    if (TELEGRAM_MEDIA_HUB_PROJECTS.has(project)) {
      if (
        !hasValue(env, "TELEGRAM_CONNECTOR_READ_CHAT_IDS") &&
        !hasValue(env, "MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS") &&
        !hasValue(env, "MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS")
      ) {
        warnings.push("Telegram MediaHub ingestion has no read/user allowlist; set TELEGRAM_CONNECTOR_READ_CHAT_IDS or MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_*");
      }
      if (env.TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED === "0" && !hasValue(env, "TELEGRAM_CONNECTOR_POST_CHAT_IDS")) {
        invalid.push("TELEGRAM_CONNECTOR_POST_CHAT_IDS is required when TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED=0");
      }
    }
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    project: project || null,
    missing: unique(missing),
    invalid: unique(invalid),
    warnings: unique(warnings),
  };
}

export function getProjectFromArgs(args = process.argv.slice(2)) {
  const exact = args.find((arg) => arg.startsWith("--project="));
  if (exact) return exact.slice("--project=".length);
  const index = args.indexOf("--project");
  return index >= 0 ? args[index + 1] : "";
}

function normalizeProject(value) {
  const normalized = String(value || "").trim();
  return Object.keys(PROJECT_TENANTS).includes(normalized) ? normalized : "";
}

function hasValue(env, key) {
  return typeof env[key] === "string" && env[key].trim().length > 0;
}

function getUrlHost(value) {
  try {
    return new URL(String(value || "")).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function unique(items) {
  return [...new Set(items)];
}

function main() {
  const result = validateProductionEnv(process.env, { project: getProjectFromArgs() });

  if (!result.ok) {
    console.error("Missing or invalid production environment:");
    for (const item of result.missing) console.error(`- missing: ${item}`);
    for (const item of result.invalid) console.error(`- invalid: ${item}`);
    for (const item of result.warnings) console.error(`- warning: ${item}`);
    process.exit(1);
  }

  for (const item of result.warnings) console.warn(`Production environment warning: ${item}`);
  console.log(`Production environment check passed${result.project ? ` for ${result.project}` : ""}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
