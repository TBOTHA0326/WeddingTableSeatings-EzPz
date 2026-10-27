import { expect, test } from "@playwright/test";
import { EXAMPLE_TABLES, STORAGE_KEY, DEFAULT_SETTINGS } from "../../src/lib/project";
import { CARD_GUESTS_KEY } from "../../src/lib/seating-cards";

test("A new browser starts with the wedding seating plan and every card guest", async ({ page }) => {
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.locator(".preview-summary")).toContainText("72guests");
  await expect(page.locator(".preview-summary")).toContainText("7table pages");
  await expect(page.getByLabel("GUEST NAMES", { exact: true })).toHaveValue(/^Taylo Vrey\nTheunis Laubsher\n/);
  await expect(page.getByRole("img", { name: "Table page preview for Table 1", exact: true }).locator('[data-name="Christna Meyer"]')).toHaveCount(1);
  await page.getByRole("link", { name: "Seating cards" }).click();
  await expect(page.locator(".count-badge")).toHaveText("76 guests");
  await expect(page.getByLabel("GUEST NAMES", { exact: true })).toHaveValue(/^Tiaan Botha\nHannah Botha\n[\s\S]*\nQMusic\nJoe West$/);
});

test("Untouched example data moves to the wedding plan, while edited data is kept", async ({ page }) => {
  await page.addInitScript(([projectKey, project, cardKey, cards]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(projectKey, project); localStorage.setItem(cardKey, cards); sessionStorage.setItem("seeded", "1"); }
  }, [STORAGE_KEY, JSON.stringify({ tables: EXAMPLE_TABLES, settings: DEFAULT_SETTINGS }), CARD_GUESTS_KEY, EXAMPLE_TABLES.map((table) => table.names).join("\n")]);
  await page.goto("/table-pages");
  await expect(page.locator(".preview-summary")).toContainText("7table pages");
  await page.goto("/seating-cards");
  await expect(page.locator(".count-badge")).toHaveText("76 guests");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan Botha\nHannah Botha");
  await page.reload();
  await expect(page.locator(".count-badge")).toHaveText("2 guests");
});
