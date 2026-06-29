import { test, expect } from "@playwright/test";

test.describe("export", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to run Playwright against a real Postgres database.",
  );

  test("PNG export completes without error toast", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create matrix" }).click();
    await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);

    const exportButton = page.getByRole("button", {
      name: "Export matrix as PNG",
    });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    await expect(page.getByText("Image downloaded")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Image export failed")).toHaveCount(0);
  });

  test("PDF export completes without error toast", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create matrix" }).click();
    await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);

    const exportButton = page.getByRole("button", {
      name: "Export matrix as PDF",
    });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    await expect(page.getByText("PDF downloaded")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("PDF export failed")).toHaveCount(0);
  });
});
