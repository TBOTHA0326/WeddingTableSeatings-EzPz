import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { useExampleGuests } from "./fixtures";

// The real pictures are personal and kept out of git, so a stand-in with different proportions plays each one.
const STAND_IN_PICTURE = "public/ActualCardArtwork.jpeg";

test.beforeEach(async ({ page }) => {
  await useExampleGuests(page);
  await page.route("**/picture-pages/*", (route) => route.fulfill({ path: STAND_IN_PICTURE }));
});

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
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("img", { name: "Table page preview for Table 2", exact: true })).toBeVisible();
  await expect(page.getByLabel("TABLE NUMBER")).toHaveValue("2");
  await page.getByLabel("TABLE NUMBER").fill("Bridal Table");
  await expect(page.getByRole("img", { name: "Table page preview for Bridal Table", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "SVG Print ready" }).click();
  const zipPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all pages", exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await zipPromise).path())!));
  expect(Object.keys(zip.files).sort()).toEqual(["ever-after-bridal-table.svg", "ever-after-picture-couple.svg", "ever-after-picture-date.svg", "ever-after-picture-hands.svg", "ever-after-picture-monogram.svg", "ever-after-picture-ring.svg", "ever-after-table-1.svg", "ever-after-table-3.svg"]);
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

test("Settings persist, crowded tables warn and offer a fit, and real problems block downloads", async ({ page }) => {
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.getByLabel("Guest names", { exact: true }).locator("option")).toHaveCount(80);
  expect(await page.getByLabel("Guest names", { exact: true }).locator("optgroup").evaluateAll((groups) => groups.map((group) => group.getAttribute("label")))).toEqual(["Elegant script", "Handwritten", "Classic serif", "Display", "Clean sans serif"]);
  await page.getByLabel("Table heading").selectOption("cinzel");
  await page.getByLabel("Guest names", { exact: true }).selectOption("allura");
  await page.getByLabel("GUEST NAMES", { exact: true }).fill(Array.from({ length: 24 }, (_, index) => `Guest Number ${index + 1}`).join("\n"));
  await expect(page.locator(".fit-notices")).toContainText("some lettering comes within 3 mm of the artwork");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print · check the spacing");
  await expect(page.getByRole("button", { name: /Download (all pages|page)/ })).toBeEnabled();
  await page.getByRole("button", { name: "Two columns" }).click();
  await page.getByRole("button", { name: /Give every table more room · names/ }).click();
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

test("Picture pages print at the page size with no lettering, alongside the tables", async ({ page }) => {
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.locator(".preview-summary")).toContainText("5picture pages");
  await page.getByRole("button", { name: "Preview Ring photo" }).click();
  const ring = page.getByRole("img", { name: "Picture page preview for Ring photo", exact: true });
  await expect(ring.locator("image")).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
  await expect(ring.locator("[data-name]")).toHaveCount(0);
  await expect(page.locator(".page-navigation")).toContainText("7 of 8");
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByRole("img", { name: "Picture page preview for Hands photo", exact: true }).locator("image")).toHaveAttribute("preserveAspectRatio", "xMinYMid slice");
  await page.getByRole("button", { name: "Preview Couple photo" }).click();
  await expect(page.locator(".page-navigation")).toContainText("8 of 8");
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();

  const pngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "This page" }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe("ever-after-picture-couple.png");
  const bytes = await readFile((await png.path())!);
  expect(bytes.readUInt32BE(16)).toBe(2185);
  expect(bytes.readUInt32BE(20)).toBe(3071);
  expect(bytes.readUInt32BE(41)).toBe(11811);
  // A picture that only fitted inside the page would leave white bars reaching the corners.
  const corners = await page.evaluate(async (data) => {
    const image = new window.Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
    return [[0, 0], [image.width - 1, 0], [0, image.height - 1], [image.width - 1, image.height - 1]].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data].join());
  }, bytes.toString("base64"));
  expect(corners).not.toContain("255,255,255,255");

  await page.getByRole("button", { name: "SVG Print ready" }).click();
  const svgPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "This page" }).click();
  const svg = await readFile((await (await svgPromise).path())!, "utf8");
  expect(svg).toContain('width="185mm" height="260mm"');
  expect(svg).toContain(`data:image/jpeg;base64,${(await readFile(STAND_IN_PICTURE)).toString("base64")}`);
  expect(svg).not.toMatch(/<path\b|<text\b|data-name/);

  await page.getByRole("button", { name: /^Table 2/ }).click();
  await expect(page.getByRole("img", { name: "Table page preview for Table 2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview T & H monogram" }).click();
  await expect(page.getByRole("img", { name: "Picture page preview for T & H monogram", exact: true })).toBeVisible();
  await page.getByLabel("GUEST NAMES", { exact: true }).fill("Tiaan Botha");
  await expect(page.getByRole("img", { name: "Table page preview for Table 2", exact: true })).toBeVisible();
});

test("Without the picture files, table pages still work on their own", async ({ page }) => {
  await page.route("**/picture-pages/*", (route) => route.fulfill({ status: 404 }));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  await expect(page.getByRole("button", { name: "Download all pages", exact: true })).toBeEnabled();
  await expect(page.locator(".preview-summary")).not.toContainText("picture pages");
  await expect(page.getByRole("group", { name: "Preview a picture page" })).toHaveCount(0);
  await expect(page.locator(".export-footnote")).toContainText("3 pages");
  expect(errors).toEqual([]);
});

test("Print prepares one sized page per table and picture, and the mobile page has no overflow", async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printCalled = "true"; }; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-pages");
  await expect(page.getByTestId("page-status")).toContainText("Ready to print");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  const printed = page.frameLocator('iframe[title="Print table pages"]');
  await expect(printed.locator('html[data-print-called="true"]')).toHaveCount(1);
  await expect(printed.locator("body > svg")).toHaveCount(8);
  await expect(printed.locator("body > svg image")).toHaveCount(8);
  expect(await printed.locator("body > svg").first().getAttribute("height")).toBe("260mm");
});
