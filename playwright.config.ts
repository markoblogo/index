import { defineConfig, devices } from "@playwright/test";

const tenant = process.env.PLAYWRIGHT_TENANT ?? "uga-ua";
const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node scripts/run-next-app.mjs --tenant ${tenant} -- dev -p ${port}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
