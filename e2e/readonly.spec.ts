import { test, expect } from "@playwright/test";

test.describe("readonly", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to run Playwright against a real Postgres database.",
  );

  test("disables editing affordances in read-only mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create matrix" }).click();
    await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);

    await page.locator('[data-quadrant="DO_NOW"]').click();
    await page.getByPlaceholder("Short sentence…").fill("Visible note");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Visible note")).toBeVisible();

    const readOnlyUrl = `${page.url()}?ro=1`;
    await page.goto(readOnlyUrl);
    await expect(page.getByText("Visible note")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove topic" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Matrix password…" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Export matrix as PNG" }),
    ).toBeVisible();
  });
});
