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

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);

    await expect(page.getByText("Image downloaded")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Image export failed")).toHaveCount(0);
  });

  test("PDF export completes without error toast", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create matrix" }).click();
    await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);

    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: "Export PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    await expect(page.getByText("PDF downloaded")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("PDF export failed")).toHaveCount(0);
  });
});
