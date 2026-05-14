import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to run Playwright against a real Postgres database.",
  );

  test("creates a matrix and shows the board", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create matrix" }).click();
    await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);
    await expect(page.getByText("Ease × Importance")).toBeVisible();
    await expect(page.getByText("Do now")).toBeVisible();
  });
});
