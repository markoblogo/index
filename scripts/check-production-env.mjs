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

if (missing.length > 0) {
  console.error("Missing or invalid production environment:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Production environment check passed.");
