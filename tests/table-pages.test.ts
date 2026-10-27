import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFont } from "../src/lib/fonts";
import { DEFAULT_TABLE_PAGE_SETTINGS, PAGE, createTablePages, restoreTablePageSettings, tableHeading, tablePageSvg } from "../src/lib/table-pages";

const font = parseFont(new Uint8Array(readFileSync("public/fonts/heirloom.otf")));
const table = (number: string, names: string[]) => ({ id: `table-${number}`, number, names: names.join("\n") });
const guests = (count: number) => Array.from({ length: count }, (_, index) => `Frans van Kradenburg ${index + 1}`);

test("Every populated table gets one page with its heading first and every guest", () => {
  const layout = createTablePages(font, font, [table("1", ["Tiaan | Botha", "Zaylé van Waveren"]), table("2", []), table("Bridal Table", ["Hannah Botha"])], DEFAULT_TABLE_PAGE_SETTINGS);
  assert.deepEqual(layout.errors, []);
  assert.deepEqual(layout.pages.map((page) => page.heading), ["Table 1", "Bridal Table"]);
  assert.deepEqual(layout.pages[0].lines.map((line) => line.label.name), ["Table 1", "Tiaan | Botha", "Zaylé van Waveren"]);
  assert.equal(layout.pages[0].scale, 1);
  assert.equal(tableHeading(" 12 "), "Table 12");
});

test("Lettering stays inside the frame and clear of the artwork at every table size", () => {
  // Decorated corners (mm) measured from the artwork: ink wash top left, botanicals bottom right.
  const decorated = [{ x: 0, y: 0, width: 60, height: 40 }, { x: 0, y: 0, width: 20, height: 75 }, { x: 150, y: 150, width: 35, height: 110 }, { x: 125, y: 200, width: 60, height: 60 }];
  for (const count of [1, 6, 12, 20, 32]) {
    const layout = createTablePages(font, font, [table("1", guests(count))], { ...DEFAULT_TABLE_PAGE_SETTINGS, matchSizes: false });
    assert.deepEqual(layout.errors, []);
    for (const line of layout.pages[0].lines) {
      const box = { x: line.x, y: line.y, width: line.label.inkWidth * line.scale, height: line.label.inkHeight * line.scale };
      assert.ok(box.x >= 12 && box.y >= 14 && box.x + box.width <= PAGE.width - 12 && box.y + box.height <= PAGE.height - 14, `${count} guests: ${line.label.name} leaves the frame`);
      for (const area of decorated) assert.ok(box.x >= area.x + area.width || box.x + box.width <= area.x || box.y >= area.y + area.height || box.y + box.height <= area.y, `${count} guests: ${line.label.name} overlaps the artwork`);
    }
  }
});

test("Long tables move into two columns, and matching sizes uses the busiest table", () => {
  const tables = [table("1", guests(24)), table("2", guests(4))];
  const own = createTablePages(font, font, tables, { ...DEFAULT_TABLE_PAGE_SETTINGS, matchSizes: false });
  assert.equal(own.pages[0].columns, 2);
  assert.equal(own.pages[1].columns, 1);
  assert.ok(own.pages[1].nameSize > own.pages[0].nameSize);
  const matched = createTablePages(font, font, tables, DEFAULT_TABLE_PAGE_SETTINGS);
  assert.equal(matched.pages[0].nameSize, matched.pages[1].nameSize);
  assert.equal(matched.pages[0].nameSize, own.pages[0].nameSize);
});

test("Missing numbers, duplicates, missing glyphs and impossible tables block pages", () => {
  const check = (tables: ReturnType<typeof table>[], pattern: RegExp) => {
    const layout = createTablePages(font, font, tables, DEFAULT_TABLE_PAGE_SETTINGS);
    assert.equal(layout.pages.length, 0);
    assert.match(layout.errors.join(" "), pattern);
  };
  check([table(" ", ["Tiaan Botha"])], /number/);
  check([table("1", ["Tiaan Botha"]), table("01", ["Hannah Botha"]), { ...table("1", ["Ann Sanders"]), id: "copy" }], /same number/);
  check([table("1", ["Tiaan 🦄"])], /missing/);
  check([table("1", guests(400))], /too many guests/);
});

test("Exports are the artwork's exact size with outlined lettering, and settings restore safely", () => {
  const layout = createTablePages(font, font, [table("1", ["Tiaan | Botha"])], DEFAULT_TABLE_PAGE_SETTINGS);
  const svg = tablePageSvg(layout.pages[0], "data:image/jpeg;base64,example", "#95724d");
  assert.match(svg, /width="185mm" height="260mm" viewBox="0 0 185 260"/);
  assert.match(svg, /<image href="data:image\/jpeg;base64,example" width="185" height="260"/);
  assert.match(svg, /data-name="Tiaan Botha"/);
  assert.match(svg, /fill="#95724d"/);
  assert.doesNotMatch(svg, /<text\b|font-family/);
  assert.deepEqual(restoreTablePageSettings('{"nameSize":500,"headingFontId":"missing","color":"red","matchSizes":false}'), { ...DEFAULT_TABLE_PAGE_SETTINGS, nameSize: 72, matchSizes: false });
  assert.deepEqual(restoreTablePageSettings("not json"), DEFAULT_TABLE_PAGE_SETTINGS);
});
