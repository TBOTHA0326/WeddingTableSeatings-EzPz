import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

test("Words are sized in centimetres, previewed on the door, and download at that exact size", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Vinyl stickers" }).click();
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  await expect(page.getByLabel("Font", { exact: true }).locator("option")).toHaveCount(80);

  await page.getByLabel("THE WORDS").fill("Welcome");
  await page.getByLabel("Font", { exact: true }).selectOption("playfair-display-italic");
  await page.getByLabel("Width", { exact: true }).fill("30");
  // Blank until the newly chosen font has loaded and measured the words.
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue(/^\d/);
  const height = Number(await page.getByLabel("Height", { exact: true }).inputValue());
  expect(height).toBeGreaterThan(1);
  expect(height).toBeLessThan(15);
  await expect(page.locator(".preview-summary")).toContainText(`30 × ${Math.round(height * 10) / 10}`);

  await page.getByLabel("Height", { exact: true }).fill(String(Math.round(height * 2 * 100) / 100));
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue(/^(59\.\d+|60(\.\d+)?)$/);
  await page.getByLabel("Width", { exact: true }).fill("");
  await page.getByLabel("Width", { exact: true }).fill("30");
  await expect(page.locator(".preview-summary")).toContainText("30 ×");

  // Both views show both starting stickers; only the close-up has measuring guides, for the one being edited.
  const whole = page.getByRole("img", { name: "The whole door with your stickers" });
  const closeUp = page.getByRole("img", { name: "The top of the door with your stickers" });
  await expect(whole.locator("[data-sticker]")).toHaveCount(2);
  await expect(closeUp.locator("[data-sticker]")).toHaveCount(2);
  await expect(whole.locator("[data-guides]")).toHaveCount(0);
  await expect(closeUp.locator("[data-guides]")).toHaveCount(1);
  await expect(closeUp.locator("[data-guides]")).toContainText("30 cm");
  // The panes show the real saved pages.
  await expect(whole.locator('[data-name="Table 1"]')).toHaveCount(1);
  await expect(whole.locator('image[href="/TablePageArtwork.jpeg"]')).toHaveCount(7);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "This sticker" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ever-after-sticker-1-welcome-30x[\d.]+cm\.svg$/);
  const svg = await readFile((await download.path())!, "utf8");
  expect(svg).toMatch(/width="30\.000cm" height="[\d.]+cm" viewBox="0 0 300\.0000 /);
  expect((svg.match(/<path /g) ?? []).length).toBe(1);
  expect(svg).not.toMatch(/<rect|<image|<text\b|transform=|data-guides/);
  expect(errors).toEqual([]);
});

test("Stickers warn about the door, keep their settings, and download together", async ({ page }) => {
  await page.goto("/vinyl-stickers");
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  await page.getByLabel("Width", { exact: true }).fill("70");
  await expect(page.locator(".fit-notices")).toContainText("is 70 cm wide, but the door is 61 cm wide");
  await expect(page.getByTestId("sticker-status")).toContainText("check the fit");
  await expect(page.getByRole("button", { name: "Download all stickers", exact: true })).toBeEnabled();
  await page.getByLabel("Door width").fill("80");
  await expect(page.locator(".fit-notices")).not.toContainText("door is");
  await page.getByLabel("Width", { exact: true }).fill("24");
  await page.getByRole("button", { name: "White door" }).click();
  await expect(page.getByRole("img", { name: "The whole door with your stickers" }).locator('rect[fill="#f6f3ec"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Add a sticker" }).click();
  await page.getByLabel("THE WORDS").fill("Zaylé\nvan Waveren");
  await page.getByLabel("Font", { exact: true }).selectOption("great-vibes");
  await page.getByRole("button", { name: "Camel vinyl" }).click();
  await page.getByLabel("From the top of the door").fill("1");
  await expect(page.getByRole("img", { name: "The whole door with your stickers" }).locator("[data-sticker]")).toHaveCount(3);

  await page.reload();
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  await expect(page.getByLabel("Door width")).toHaveValue("80");
  await expect(page.getByRole("button", { name: "White door" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Zaylé/ }).click();
  await expect(page.getByLabel("THE WORDS")).toHaveValue("Zaylé\nvan Waveren");
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue("great-vibes");
  await expect(page.getByRole("button", { name: "Camel vinyl" })).toHaveAttribute("aria-pressed", "true");

  const zipPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all stickers", exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await zipPromise).path())!));
  const names = Object.keys(zip.files).sort();
  expect(names).toHaveLength(3);
  expect(names[0]).toMatch(/^ever-after-sticker-1-find-your-24x[\d.]+cm\.svg$/);
  expect(names[1]).toMatch(/^ever-after-sticker-2-seat-18\.6x[\d.]+cm\.svg$/);
  expect(names[2]).toMatch(/^ever-after-sticker-3-zayle-van-waveren-24x[\d.]+cm\.svg$/);

  await page.getByRole("button", { name: /^Remove sticker/ }).click();
  await expect(page.getByRole("img", { name: "The whole door with your stickers" }).locator("[data-sticker]")).toHaveCount(2);
  await page.getByRole("button", { name: /^Remove sticker/ }).click();
  await expect(page.getByRole("img", { name: "The whole door with your stickers" }).locator("[data-sticker]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Remove sticker/ })).toHaveCount(0);
});

test("A sticker PNG is transparent, 300 DPI, and the exact size", async ({ page }) => {
  await page.goto("/vinyl-stickers");
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  await page.getByLabel("Width", { exact: true }).fill("20");
  await page.getByRole("button", { name: "PNG Transparent" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "This sticker" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes = await readFile((await download.path())!);
  expect(bytes.readUInt32BE(16)).toBe(2362);
  expect(bytes[25]).toBe(6);
  expect(bytes.toString("ascii", 37, 41)).toBe("pHYs");
  expect(bytes.readUInt32BE(41)).toBe(11811);
  const alpha = await page.evaluate(async (data) => {
    const image = new window.Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let inked = 0; for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) inked++;
    return { inked, total: image.width * image.height };
  }, bytes.toString("base64"));
  expect(alpha.inked).toBeGreaterThan(1000);
  expect(alpha.inked).toBeLessThan(alpha.total / 2);
});

test("Missing letters block downloads, and the mobile page has no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vinyl-stickers");
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("THE WORDS").fill("Welcome 🦄");
  await expect(page.locator(".fit-notices")).toContainText("missing");
  await expect(page.getByRole("button", { name: /^Download (all stickers|sticker)$/ })).toBeDisabled();
  await page.getByLabel("THE WORDS").fill("");
  await expect(page.getByTestId("sticker-status")).toContainText("Ready to cut");
  await expect(page.getByRole("img", { name: "The whole door with your stickers" }).locator("[data-sticker]")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
