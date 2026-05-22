import { expect, test } from "@playwright/test";

test("public homepage and embed render", async ({ page }, testInfo) => {
  await page.goto("/uk");
  await expect(page.locator("h1", { hasText: "UGA Index" })).toBeVisible();
  await expect(page.getByText("Поточні значення індексу")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    return;
  }
  await page.waitForLoadState("networkidle");

  await page.goto("/embed/cards?locale=uk&theme=light&layout=compact");
  await expect(page.getByRole("heading", { name: "UGA Index" })).toBeVisible();
  await expect(page.getByText("Кукурудза").first()).toBeVisible();
});

test("admin and respondent preview login routes work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Auth smoke is covered on desktop.");

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@uga.ua");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/daily-inputs|\/setup-password/);

  await page.goto("/logout");
  await page.goto("/login");
  await page.getByLabel("Email").fill("bunge@uga-index.demo");
  await page.getByLabel("Password").fill("respondent");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/respondent|\/setup-password/);
});
