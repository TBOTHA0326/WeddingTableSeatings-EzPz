import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

test("Each table becomes one framed page that shares tables with the seating window", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan | Botha\nHannah Botha\nZaylé van Waveren");
  await page.getByRole("link", { name: "Table pages" }).click();
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.getByLabel("GUEST NAMES", { exact: true })).toHaveValue("Tiaan | Botha\nHannah Botha\nZaylé van Waveren");
  await expect(page.locator(".preview-summary")).toContainText("3table pages");
  const preview = page.getByRole("img", { name: "Table page preview for Table 1", exact: true });
  await expect(preview.locator("image")).toHaveAttribute("href", "/TablePageArtwork.jpeg");
  await expect(preview.locator('[data-name="Table 1"]')).toHaveCount(1);
  await expect(preview.locator('[data-name="Tiaan Botha"]')).toHaveCount(1);
  await expect(preview.locator("[data-name]")).toHaveCount(4);
  await page.getByRole("button", { name: "Next table page" }).click();
  await expect(page.getByRole("img", { name: "Table page preview for Table 2", exact: true })).toBeVisible();
  await expect(page.getByLabel("TABLE NUMBER")).toHaveValue("2");
  await page.getByLabel("TABLE NUMBER").fill("Bridal Table");
  await expect(page.getByRole("img", { name: "Table page preview for Bridal Table", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "SVG Print ready" }).click();
  const zipPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all pages", exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await zipPromise).path())!));
  expect(Object.keys(zip.files).sort()).toEqual(["ever-after-bridal-table.svg", "ever-after-table-1.svg", "ever-after-table-3.svg"]);
  const svg = await zip.file("ever-after-table-1.svg")!.async("string");
  const source = await readFile("public/TablePageArtwork.jpeg");
  expect(svg).toContain('width="185mm" height="260mm"');
  expect(svg).toContain(`data:image/jpeg;base64,${source.toString("base64")}`);
  expect(svg).toContain('data-name="Zaylé van Waveren"');
  expect(svg).not.toMatch(/<text\b|font-family/);
  expect(errors).toEqual([]);
});

test("A table page PNG is the artwork's exact 18.5 × 26 cm at 300 DPI", async ({ page }) => {
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "This page" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ever-after-table-1.png");
  const bytes = await readFile((await download.path())!);
  expect(bytes.readUInt32BE(16)).toBe(2185);
  expect(bytes.readUInt32BE(20)).toBe(3071);
  expect(bytes.toString("ascii", 37, 41)).toBe("pHYs");
  expect(bytes.readUInt32BE(41)).toBe(11811);
});

test("Settings persist, crowded tables offer a fit, and problems block downloads", async ({ page }) => {
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await page.getByLabel("Guest names", { exact: true }).selectOption("allura");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill(Array.from({ length: 24 }, (_, index) => `Guest Number ${index + 1}`).join("\n"));
  await expect(page.locator(".fit-notices")).toContainText("Table 1 doesn’t fit");
  await expect(page.getByRole("button", { name: /Download (all pages|page)/ })).toBeDisabled();
  await page.getByRole("button", { name: "Two columns" }).click();
  await page.getByRole("button", { name: /Fit every table · names/ }).click();
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.locator(".toolbar-detail")).toContainText("two columns");
  const nameSize = await page.getByLabel("Name size").inputValue();
  expect(Number(nameSize)).toBeLessThan(20);
  await page.getByLabel("Space below heading").fill("25");
  await page.reload();
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.getByLabel("GUEST NAMES", { exact: true })).toHaveValue(/^Guest Number 1\n/);
  await expect(page.getByLabel("Guest names", { exact: true })).toHaveValue("allura");
  await expect(page.getByLabel("Name size")).toHaveValue(nameSize);
  await expect(page.getByLabel("Space below heading")).toHaveValue("25");
  await expect(page.getByRole("button", { name: "Two columns" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("TABLE NUMBER").fill("2");
  await expect(page.locator(".fit-notices")).toContainText("same number");
  await expect(page.getByRole("button", { name: /Download (all pages|page)/ })).toBeDisabled();
  await page.getByLabel("TABLE NUMBER").fill("1");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan 🦄");
  await expect(page.locator(".fit-notices")).toContainText("missing");
  await expect(page.getByRole("button", { name: /Download (all pages|page)/ })).toBeDisabled();
});

test("Print prepares one sized page per table, and the mobile page has no overflow", async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printCalled = "true"; }; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  const printed = page.frameLocator('iframe[title="Print table pages"]');
  await expect(printed.locator('html[data-print-called="true"]')).toHaveCount(1);
  await expect(printed.locator("body > svg")).toHaveCount(3);
  await expect(printed.locator("body > svg image")).toHaveCount(3);
  expect(await printed.locator("body > svg").first().getAttribute("height")).toBe("260mm");
});
