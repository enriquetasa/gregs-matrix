import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to run Playwright against a real Postgres database.",
  );

  test("requires password to view a protected matrix", async ({ browser }) => {
    const owner = await browser.newContext();
    const ownerPage = await owner.newPage();
    await ownerPage.goto("/");
    await ownerPage.getByLabel("Password (optional)").fill("secret");
    await ownerPage.getByRole("button", { name: "Create matrix" }).click();
    await expect(ownerPage).toHaveURL(/\/m\/[0-9a-z]{10}$/);
    const matrixUrl = ownerPage.url();
    await owner.close();

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(matrixUrl);
    await expect(guestPage.getByRole("heading", { name: "Enter password" })).toBeVisible();

    await guestPage.getByPlaceholder("Password").fill("wrong");
    await guestPage.getByRole("button", { name: "Unlock" }).click();
    await expect(guestPage.getByRole("heading", { name: "Enter password" })).toBeVisible();

    await guestPage.getByPlaceholder("Password").fill("secret");
    await guestPage.getByRole("button", { name: "Unlock" }).click();
    await expect(guestPage.getByText("Importance × Ease")).toBeVisible();
    await guest.close();
  });
});
