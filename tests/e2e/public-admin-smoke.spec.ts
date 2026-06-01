import { expect, test } from "@playwright/test";

type SmokeTenant = "1d3x" | "uga-ua" | "spike-ua";

const tenant = resolveSmokeTenant(process.env.PLAYWRIGHT_TENANT);

const tenantCopy = {
  "1d3x": {
    brand: /Local commodity indices/,
    embedHeading: null,
    login: null,
  },
  "uga-ua": {
    brand: /UGA Index/,
    embedHeading: "UGA Index",
    login: {
      adminEmail: "admin@uga.ua",
      respondentEmail: "bunge@uga-index.demo",
    },
  },
  "spike-ua": {
    brand: /SPIKE SPOT\s*INDEX/,
    embedHeading: "SPIKE SPOT INDEX",
    login: null,
  },
} as const;

function resolveSmokeTenant(value: string | undefined): SmokeTenant {
  return value === "1d3x" || value === "spike-ua" ? value : "uga-ua";
}

test("public homepage renders for active tenant", async ({ page }) => {
  await page.goto(tenant === "1d3x" ? "/" : "/uk");
  await expect(page.locator("h1").first()).toContainText(tenantCopy[tenant].brand);
});

test("embed renders for index tenants", async ({ page }, testInfo) => {
  test.skip(tenant === "1d3x", "Platform app does not publish index embeds.");

  if (testInfo.project.name === "mobile") {
    return;
  }

  await page.waitForLoadState("networkidle");

  await page.goto("/embed/cards?locale=uk&theme=light&layout=compact");
  await expect(
    page.getByRole("heading", { name: tenantCopy[tenant].embedHeading ?? "" }),
  ).toBeVisible();
  await expect(page.getByText(/Кукурудза|Corn/).first()).toBeVisible();
});

test("admin and respondent preview login routes work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Auth smoke is covered on desktop.");
  test.skip(tenantCopy[tenant].login === null, "Login smoke is tenant-specific.");

  const login = tenantCopy[tenant].login;
  if (!login) {
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(login.adminEmail);
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/daily-inputs|\/setup-password/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(login.respondentEmail);
  await page.getByLabel("Password").fill("respondent");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/respondent|\/setup-password/);
});
