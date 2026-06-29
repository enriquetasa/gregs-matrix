import { test, expect } from "@playwright/test";

async function createMatrix(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create matrix" }).click();
  await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);
}

test.describe("crud", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to run Playwright against a real Postgres database.",
  );

  test("adds and deletes a topic from a quadrant", async ({ page }) => {
    await createMatrix(page);

    await page.locator('[data-quadrant="DO_NOW"]').click();
    await expect(page.getByRole("heading", { name: /New note — Do now/i })).toBeVisible();
    await page.getByPlaceholder("Short sentence…").fill("Call the vendor");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText("Call the vendor")).toBeVisible();
    await page.getByRole("button", { name: "Remove topic" }).click();
    await expect(page.getByText("Call the vendor")).toHaveCount(0);
  });

  test("moves a topic between quadrants via drag and drop", async ({ page }) => {
    await createMatrix(page);

    await page.locator('[data-quadrant="DO_NOW"]').click();
    await page.getByPlaceholder("Short sentence…").fill("Move me");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Move me")).toBeVisible();

    const topic = page.locator("[data-topic]", { hasText: "Move me" });
    await topic.dragTo(page.locator('[data-quadrant="IGNORE"]'));
    await expect(page.locator('[data-quadrant="IGNORE"]').getByText("Move me")).toBeVisible({
      timeout: 10_000,
    });
  });
});
