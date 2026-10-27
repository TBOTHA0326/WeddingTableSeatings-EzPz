import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFont } from "../src/lib/fonts";
import { DEFAULT_TABLE_PAGE_SETTINGS, PAGE, createTablePages, restoreTablePageSettings, tableHeading, tablePageSvg } from "../src/lib/table-pages";
import { DEFAULT_SETTINGS, EXAMPLE_TABLES, WEDDING_GUESTS, WEDDING_TABLES, parseNames, restoreProject } from "../src/lib/project";

const font = parseFont(new Uint8Array(readFileSync("public/fonts/heirloom.otf")));
const table = (number: string, names: string[]) => ({ id: `table-${number}`, number, names: names.join("\n") });
const guests = (count: number) => Array.from({ length: count }, (_, index) => `Frans van Kradenburg ${index + 1}`);

test("Every populated table gets one page with its heading first and every guest", () => {
  const layout = createTablePages(font, font, [table("1", ["Tiaan | Botha", "Zaylé van Waveren"]), table("2", []), table("Bridal Table", ["Hannah Botha"])], DEFAULT_TABLE_PAGE_SETTINGS);
  assert.deepEqual(layout.errors, []);
  assert.deepEqual(layout.pages.map((page) => page.heading), ["Table 1", "Bridal Table"]);
  assert.deepEqual(layout.pages[0].lines.map((line) => line.label.name), ["Table 1", "Tiaan | Botha", "Zaylé van Waveren"]);
  assert.ok(layout.pages[0].lines.every((line) => line.scale === 1));
  assert.equal(tableHeading(" 12 "), "Table 12");
});

test("Every page is centred on one line, with the heading at the same height and its own gap", () => {
  const tables = [table("1", guests(9)), table("2", ["Ann Sanders"]), table("10", guests(6))];
  const layout = createTablePages(font, font, tables, DEFAULT_TABLE_PAGE_SETTINGS);
  assert.deepEqual(layout.errors, []);
  for (const page of layout.pages) for (const line of page.lines) assert.ok(Math.abs(line.x + line.label.inkWidth * line.scale / 2 - PAGE.width / 2) < 1e-9, `${line.label.name} is off centre`);
  assert.equal(new Set(layout.pages.map((page) => page.lines[0].y)).size, 1);
  const gap = (headingGap: number) => {
    const [heading, first] = createTablePages(font, font, [table("1", ["Tiaan Botha"])], { ...DEFAULT_TABLE_PAGE_SETTINGS, headingGap }).pages[0].lines;
    return first.y - (heading.y + heading.label.inkHeight);
  };
  assert.ok(Math.abs(gap(30) - gap(10) - 20) < 1e-9);
});

test("Heading and name sizes are independent and exactly as chosen", () => {
  const names = (headingSize: number) => createTablePages(font, font, [table("1", guests(6))], { ...DEFAULT_TABLE_PAGE_SETTINGS, headingSize }).pages[0].lines.slice(1).map((line) => [line.label.inkWidth * line.scale, line.label.inkHeight * line.scale]);
  assert.deepEqual(names(60), names(64));
});

test("Lettering stays inside the frame and clear of the artwork at every table size", () => {
  // Decorated corners (mm) measured from the artwork: ink wash top left, botanicals bottom right.
  const decorated = [{ x: 0, y: 0, width: 60, height: 40 }, { x: 0, y: 0, width: 20, height: 75 }, { x: 150, y: 150, width: 35, height: 110 }, { x: 125, y: 200, width: 60, height: 60 }];
  for (const [count, columns] of [[1, 1], [6, 1], [12, 1], [20, 2], [28, 2]] as const) {
    let settings = { ...DEFAULT_TABLE_PAGE_SETTINGS, columns };
    const first = createTablePages(font, font, [table("1", guests(count))], settings);
    if (first.fit) settings = { ...settings, ...first.fit };
    const layout = createTablePages(font, font, [table("1", guests(count))], settings);
    assert.deepEqual([...layout.errors, ...layout.warnings], []);
    for (const line of layout.pages[0].lines) {
      const box = { x: line.x, y: line.y, width: line.label.inkWidth * line.scale, height: line.label.inkHeight * line.scale };
      assert.ok(box.x >= 12 && box.y >= 14 && box.x + box.width <= PAGE.width - 12 && box.y + box.height <= PAGE.height - 14, `${count} guests: ${line.label.name} leaves the frame`);
      for (const area of decorated) assert.ok(box.x >= area.x + area.width || box.x + box.width <= area.x || box.y >= area.y + area.height || box.y + box.height <= area.y, `${count} guests: ${line.label.name} overlaps the artwork`);
    }
  }
});

test("Crowded tables print with a warning and a fit suggestion that shrinks the names first", () => {
  const tables = [table("1", guests(14)), table("2", guests(4))];
  const crowded = createTablePages(font, font, tables, { ...DEFAULT_TABLE_PAGE_SETTINGS, nameSize: 30 });
  assert.deepEqual(crowded.errors, []);
  assert.match(crowded.warnings[0], /^On Table 1\b.*some lettering comes within 3 mm of the artwork/);
  assert.equal(crowded.pages.length, 2, "crowded pages are still laid out");
  assert.equal(crowded.fit?.headingSize, DEFAULT_TABLE_PAGE_SETTINGS.headingSize);
  assert.ok(crowded.fit!.nameSize < 30);
  const fitted = createTablePages(font, font, tables, { ...DEFAULT_TABLE_PAGE_SETTINGS, ...crowded.fit });
  assert.deepEqual([...fitted.errors, ...fitted.warnings], []);
  assert.deepEqual(fitted.pages.map((page) => page.columns), [1, 1]);
  const twoColumns = { ...DEFAULT_TABLE_PAGE_SETTINGS, nameSize: 30, columns: 2 as const };
  const columns = createTablePages(font, font, tables, { ...twoColumns, ...createTablePages(font, font, tables, twoColumns).fit });
  assert.deepEqual(columns.pages.map((page) => page.columns), [2, 2]);
});

test("Missing numbers, duplicates and missing glyphs block pages; impossible tables warn", () => {
  const check = (tables: ReturnType<typeof table>[], pattern: RegExp) => {
    const layout = createTablePages(font, font, tables, DEFAULT_TABLE_PAGE_SETTINGS);
    assert.match([...layout.errors, ...layout.warnings].join(" "), pattern);
  };
  check([table(" ", ["Tiaan Botha"])], /number/);
  check([table("1", ["Tiaan Botha"]), table("01", ["Hannah Botha"]), { ...table("1", ["Ann Sanders"]), id: "copy" }], /same number/);
  check([table("1", ["Tiaan 🦄"])], /missing/);
  check([table("1", guests(400))], /comes within/);
});

test("Exports are the artwork's exact size with outlined lettering, and settings restore safely", () => {
  const layout = createTablePages(font, font, [table("1", ["Tiaan | Botha"])], DEFAULT_TABLE_PAGE_SETTINGS);
  const svg = tablePageSvg(layout.pages[0], "data:image/jpeg;base64,example", "#95724d");
  assert.match(svg, /width="185mm" height="260mm" viewBox="0 0 185 260"/);
  assert.match(svg, /<image href="data:image\/jpeg;base64,example" width="185" height="260"/);
  assert.match(svg, /data-name="Tiaan Botha"/);
  assert.match(svg, /fill="#95724d"/);
  assert.doesNotMatch(svg, /<text\b|font-family/);
  assert.deepEqual(restoreTablePageSettings('{"nameSize":500,"headingFontId":"missing","color":"red","columns":3}'), { ...DEFAULT_TABLE_PAGE_SETTINGS, nameSize: 72 });
  assert.deepEqual(restoreTablePageSettings("not json"), DEFAULT_TABLE_PAGE_SETTINGS);
});

test("The wedding seating plan prints at the default sizes, and untouched examples move to it", () => {
  const layout = createTablePages(font, font, WEDDING_TABLES, DEFAULT_TABLE_PAGE_SETTINGS);
  assert.deepEqual([...layout.errors, ...layout.warnings], []);
  assert.deepEqual(layout.pages.map((page) => [page.heading, page.guests]), [["Table 1", 12], ["Table 2", 12], ["Table 3", 12], ["Table 4", 11], ["Table 5", 7], ["Table 6", 8], ["Table 7", 10]]);
  assert.equal(parseNames(WEDDING_GUESTS).length, 76);
  const seated = WEDDING_TABLES.flatMap((table) => parseNames(table.names));
  assert.deepEqual(parseNames(WEDDING_GUESTS).filter((name) => !seated.includes(name)), ["Tiaan Botha", "Hannah Botha", "QMusic", "Joe West"]);
  assert.deepEqual(restoreProject(JSON.stringify({ tables: EXAMPLE_TABLES, settings: DEFAULT_SETTINGS }))!.tables, WEDDING_TABLES);
  const edited = [{ ...EXAMPLE_TABLES[0], names: "Tiaan Botha" }, ...EXAMPLE_TABLES.slice(1)];
  assert.deepEqual(restoreProject(JSON.stringify({ tables: edited, settings: DEFAULT_SETTINGS }))!.tables, edited);
});
