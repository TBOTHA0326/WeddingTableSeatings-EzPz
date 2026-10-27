import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { useExampleGuests } from "./fixtures";

test.beforeEach(async ({ page }) => useExampleGuests(page));

test("Table, glass-capacity and physical fit controls respond and persist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByRole("tab", { name: "Glass panes" }).click();
  await page.getByLabel("Number of glass panes").fill("2");
  await expect(page.locator(".fit-notices")).toContainText("3 tables and 2 panes");
  await expect(page.getByRole("button", { name: /^Download (all sheets|sheet)$/ })).toBeDisabled();
  await page.getByRole("button", { name: "Use 3 panes" }).click();
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByLabel("Pane height").fill("13");
  await expect(page.getByTestId("fit-status")).toContainText("adjustment needed");
  await page.getByRole("button", { name: /Fit all lettering/ }).click();
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await expect(page.locator(".saved-status")).toHaveText("Saved on this device");
  await page.reload();
  await page.getByRole("tab", { name: "Glass panes" }).click();
  await expect(page.getByLabel("Pane height")).toHaveValue("13");
  await expect(page.getByLabel("Number of glass panes")).toHaveValue("3");
});

test("All five supplied fonts shape names, and SVG contains only transparent outlines", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByRole("tab", { name: "Lettering" }).click();
  for (const name of ["Vintage Heirloom", "Great Vibes", "Allura", "Cormorant", "Angelface"]) {
    await page.getByRole("button", { name: new RegExp(name), exact: false }).click();
    await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
    await expect(page.locator(".pane-detail path").first()).toBeVisible();
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download (all sheets|sheet)$/ }).click();
  const download = await downloadPromise;
  const data = await readFile((await download.path())!);
  const svg = download.suggestedFilename().endsWith(".zip") ? await (await JSZip.loadAsync(data)).file(/\.svg$/)[0].async("string") : data.toString();
  expect(svg).toContain('width="210mm" height="297mm"');
  expect(svg).toContain("<path");
  expect(svg).not.toMatch(/<(?:text|rect|image|style)\b/);
  expect(errors).toEqual([]);
});

test("PNG download has an alpha channel, 300 DPI and the exact A4 pixel dimensions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByRole("tab", { name: "Lettering" }).click();
  await page.getByRole("button", { name: "White lettering" }).click();
  await expect(page.locator(".preview-stage")).toHaveClass(/dark-preview/);
  await page.getByRole("button", { name: "PNG Transparent" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download (all sheets|sheet)$/ }).click();
  const download = await downloadPromise;
  let png: Buffer = await readFile((await download.path())!);
  if (download.suggestedFilename().endsWith(".zip")) png = await (await JSZip.loadAsync(png)).file(/\.png$/)[0].async("nodebuffer");
  expect(png.readUInt32BE(16)).toBe(2480);
  expect(png.readUInt32BE(20)).toBe(3508);
  expect(png[25]).toBe(6); // truecolour + alpha
  expect(png.toString("ascii", 37, 41)).toBe("pHYs");
  expect(png.readUInt32BE(41)).toBe(11811);
  const alpha = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) visible++;
    return { corner: pixels[3], visible };
  }, png.toString("base64"));
  expect(alpha.corner).toBe(0);
  expect(alpha.visible).toBeGreaterThan(1000);
  expect(alpha.visible).toBeLessThan(2480 * 3508 / 2);
});

test("A mobile screen has no horizontal overflow and supports table editing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Add a table" }).click();
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Mia | Botha\nOliver | van der Merwe");
  await expect(page.locator(".count-badge")).toHaveText("26 guests");
  await page.getByRole("button", { name: "A4 print sheets" }).click();
  await expect(page.getByRole("img", { name: "A4 print sheet with outlined name lettering" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("A large guest list downloads every A4 page in a ZIP and supports individual sheets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await page.getByRole("tab", { name: "Glass panes" }).click();
  await page.getByLabel("Pane height").fill("200");
  await page.getByRole("tab", { name: "Tables" }).click();
  await page.getByLabel("GUEST NAMES", { exact: true }).fill(Array.from({ length: 60 }, (_, index) => `Amelia van der Merwe ${index + 1}`).join("\n"));
  await expect(page.getByTestId("fit-status")).toContainText("Everything fits beautifully");
  await expect(page.locator(".count-badge")).toHaveText("76 guests");
  await expect(page.locator(".download-summary strong")).not.toHaveText("1");
  const sheetCount = Number(await page.locator(".download-summary strong").textContent());
  const svgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all sheets" }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toMatch(/\.zip$/);
  const svgZip = await JSZip.loadAsync(await readFile((await svgDownload.path())!));
  expect(svgZip.file(/\.svg$/)).toHaveLength(sheetCount);
  const allLettering = (await Promise.all(svgZip.file(/\.svg$/).map((file) => file.async("string")))).join("");
  expect((allLettering.match(/<title>Amelia van der Merwe \d+<\/title>/g) ?? []).length).toBe(60);
  await page.getByRole("button", { name: "PNG Transparent" }).click();
  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all sheets" }).click();
  const pngDownload = await pngDownloadPromise;
  const pngZip = await JSZip.loadAsync(await readFile((await pngDownload.path())!));
  expect(pngZip.file(/\.png$/)).toHaveLength(sheetCount);
  await page.getByRole("button", { name: "A4 print sheets" }).click();
  await page.getByRole("button", { name: "Next A4 sheet" }).click();
  await expect(page.locator(".page-navigation")).toContainText(`Sheet 2 of ${sheetCount}`);
  const currentDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download current sheet" }).click();
  expect((await currentDownloadPromise).suggestedFilename()).toBe("ever-after-a4-02.png");
});
