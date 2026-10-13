import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

test("Seating cards share guest tables, print exact artwork with lower-panel outlined names, and paginate", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan | Botha\nAmelia | van der Merwe\nTiaan | Botha");
  await page.getByRole("link", { name: "Seating cards" }).click();
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await expect(page.locator(".count-badge")).toHaveText("19 guests");
  await expect(page.getByRole("button", { name: "A4 sheets", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".card-sheet-preview image")).toHaveCount(6);
  await page.getByRole("button", { name: "Flat card", exact: true }).click();
  await expect(page.getByRole("img", { name: "Fold-over seating card for Tiaan Botha", exact: true })).toBeVisible();
  const source = await readFile("public/ActualCardArtwork.jpeg");
  expect(await page.locator(".card-artwork image").getAttribute("href")).toBe(`data:image/jpeg;base64,${source.toString("base64")}`);
  const nameTransform = await page.locator(".card-artwork [data-name]").getAttribute("transform");
  expect(Number(nameTransform?.match(/translate\([^ ]+ ([^)]+)\)/)?.[1])).toBeGreaterThan(61 * 1150 / 787 / 2);
  await page.getByLabel("CARDS TO PRINT").selectOption("example-1");
  await page.getByRole("button", { name: "SVG Print ready" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sheet", exact: true }).click();
  const download = await downloadPromise;
  const svg = await readFile((await download.path())!, "utf8");
  expect((svg.match(/<image /g) ?? []).length).toBe(3);
  expect(svg).toContain('width="210mm" height="297mm"');
  expect(svg).toContain(`data:image/jpeg;base64,${source.toString("base64")}`);
  expect(svg).not.toContain("<text");
  expect(svg).toContain('data-name="Amelia van der Merwe"');
  await page.getByLabel("CARDS TO PRINT").selectOption("all");
  await page.getByRole("button", { name: "A4 sheets", exact: true }).click();
  await page.getByRole("button", { name: "Next card sheet" }).click();
  await expect(page.locator(".page-navigation")).toContainText("Sheet 2 of 4");
  const zipPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all sheets", exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await zipPromise).path())!));
  expect(zip.file(/\.svg$/)).toHaveLength(4);
  const combined = (await Promise.all(zip.file(/\.svg$/).map((file) => file.async("string")))).join("");
  expect((combined.match(/data-name=/g) ?? []).length).toBe(19);
  expect(errors).toEqual([]);
});

test("Card PNG has opaque artwork, correct A4 dimensions, 300 DPI, and optional guides", async ({ page }) => {
  await page.goto("/seating-cards");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan | Botha");
  await page.getByLabel("CARDS TO PRINT").selectOption("example-1");
  await page.getByLabel("Cut & fold guides").uncheck();
  await expect(page.locator(".card-sheet-preview [stroke-dasharray]")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sheet", exact: true }).click();
  const bytes = await readFile((await (await downloadPromise).path())!);
  expect(bytes.readUInt32BE(16)).toBe(2480);
  expect(bytes.readUInt32BE(20)).toBe(3508);
  expect(bytes.toString("ascii", 37, 41)).toBe("pHYs");
  expect(bytes.readUInt32BE(41)).toBe(11811);
  const pixels = await page.evaluate(async (base64) => {
    const image = new window.Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height).data;
    let colored = 0; let transparent = 0;
    for (let i = 0; i < data.length; i += 4) { if (data[i + 3] !== 255) transparent++; if (data[i] < 245 && data[i + 1] < 245) colored++; }
    return { colored, transparent };
  }, bytes.toString("base64"));
  expect(pixels.transparent).toBe(0);
  expect(pixels.colored).toBeGreaterThan(100_000);
});

test("Custom font import, size and guides persist; unsupported names block downloads", async ({ page }) => {
  await page.goto("/seating-cards");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await page.getByLabel("Import exact font file").setInputFiles("public/fonts/angelface.otf");
  await expect(page.getByLabel("Name lettering")).toHaveValue("custom");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await page.getByLabel("Card width").fill("100"); await page.getByLabel("Card width").blur();
  await page.getByLabel("Cut & fold guides").uncheck();
  await page.reload();
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await expect(page.getByLabel("Name lettering")).toHaveValue("custom");
  await expect(page.getByLabel("Card width")).toHaveValue("100");
  await expect(page.getByLabel("A4 layout", { exact: true })).toHaveValue("custom");
  await expect(page.getByLabel("Cut & fold guides")).not.toBeChecked();
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan 🦄");
  await expect(page.locator(".fit-notices")).toContainText("missing");
  await expect(page.getByRole("button", { name: /Download (all sheets|sheet)/ })).toBeDisabled();
});

test("Mobile cards page has no overflow and can preview the standing face", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seating-cards");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Front face", exact: true }).click();
  await expect(page.getByRole("img", { name: /Front face for Amelia van der Merwe/ })).toBeVisible();
  await page.getByRole("button", { name: "A4 sheets", exact: true }).click();
  await expect(page.getByRole("img", { name: "A4 seating card sheet 1", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Print prepares every guest on A4 pages with embedded artwork", async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printCalled = "true"; }; });
  await page.goto("/seating-cards");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  const printed = page.frameLocator('iframe[title="Print wedding seating cards"]');
  await expect(printed.locator('html[data-print-called="true"]')).toHaveCount(1);
  await expect(printed.locator("body > svg")).toHaveCount(4);
  await expect(printed.locator("[data-name]")).toHaveCount(24);
  await expect(printed.locator("image")).toHaveCount(24);
  expect(await printed.locator("body > svg").first().getAttribute("width")).toBe("210mm");
});

test("Six-card A4 preview updates names and a custom layout can be overridden and reset", async ({ page }) => {
  await page.goto("/seating-cards");
  await expect(page.getByTestId("card-status")).toContainText("Ready to cut & fold");
  await expect(page.getByLabel("A4 layout", { exact: true })).toHaveValue("six");
  await expect(page.locator(".card-sheet-preview [data-name]")).toHaveCount(6);
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan Botha\nAmelia van der Merwe\nOliver Botha\nCharlotte de Villiers\nJames Williams\nIsabella du Plessis");
  await page.getByLabel("CARDS TO PRINT").selectOption("example-1");
  await expect(page.locator('.card-sheet-preview [data-name="Tiaan Botha"]')).toHaveCount(1);
  await expect(page.locator(".card-sheet-preview [data-name]")).toHaveCount(6);
  await page.getByLabel("Card width").fill("90"); await page.getByLabel("Card width").blur();
  await expect(page.getByLabel("A4 layout", { exact: true })).toHaveValue("custom");
  await expect(page.locator(".card-sheet-preview [data-name]")).toHaveCount(4);
  await page.reload();
  await expect(page.getByLabel("Card width")).toHaveValue("90");
  await expect(page.getByLabel("A4 layout", { exact: true })).toHaveValue("custom");
  await page.getByLabel("A4 layout", { exact: true }).selectOption("six");
  await expect(page.getByLabel("Card width")).toHaveValue("61");
  await expect(page.locator(".card-sheet-preview [data-name]")).toHaveCount(6);
});
