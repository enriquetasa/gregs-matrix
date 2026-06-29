import { test, expect } from "@playwright/test";

async function createMatrix(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create matrix" }).click();
  await expect(page).toHaveURL(/\/m\/[0-9a-z]{10}$/);
}

async function dragTopicToQuadrant(
  page: import("@playwright/test").Page,
  topicText: string,
  targetQuadrant: string,
) {
  const topic = page.locator("[data-topic]", { hasText: topicText });
  const target = page.locator(`[data-quadrant="${targetQuadrant}"]`);
  const from = await topic.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) {
    throw new Error("Could not resolve drag source or drop target.");
  }

  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = to.y + to.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 3 });
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();
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

    const topic = page.locator("[data-topic]", { hasText: "Call the vendor" });
    await expect(topic).toBeVisible();
    await topic.getByRole("button", { name: "Remove topic", exact: true }).click();
    await expect(page.getByText("Call the vendor")).toHaveCount(0);
  });

  test("moves a topic between quadrants via drag and drop", async ({ page }) => {
    await createMatrix(page);

    await page.locator('[data-quadrant="DO_NOW"]').click();
    await page.getByPlaceholder("Short sentence…").fill("Move me");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Move me")).toBeVisible();

    await dragTopicToQuadrant(page, "Move me", "IGNORE");
    await expect(page.locator('[data-quadrant="IGNORE"]').getByText("Move me")).toBeVisible({
      timeout: 10_000,
    });
  });
});
