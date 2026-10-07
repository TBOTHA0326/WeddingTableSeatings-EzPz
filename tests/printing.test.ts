import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseFont } from "../src/lib/fonts";
import { A4, createLayout, measureLabel, sheetSvg, type LabelOverride } from "../src/lib/layout";
import { createPanes, PANE_PADDING } from "../src/lib/panes";
import { DEFAULT_SETTINGS, EXAMPLE_NAMES, EXAMPLE_TABLES, FONTS, parseNames, restoreProject } from "../src/lib/project";
import { PNG_HEIGHT, PNG_WIDTH, withPngResolution } from "../src/lib/export";

const fonts = new Map(FONTS.map((font) => [font.id, parseFont(new Uint8Array(readFileSync(`public${font.file}`)))]));
const font = fonts.get("angelface")!;
const headingFont = fonts.get("cormorant")!;

for (const { id, name } of FONTS) {
  for (const arrangement of ["compact", "grid"] as const) {
    test(`${name}: ${arrangement} exports every name within A4 without overlaps`, () => {
      const names = Array.from({ length: 140 }, (_, index) => `${parseNames(EXAMPLE_NAMES)[index % 24]} ${index + 1}`);
      const settings = { ...DEFAULT_SETTINGS, fontId: id, arrangement };
      const layout = createLayout(fonts.get(id)!, names, settings);
      assert.deepEqual(layout.errors, []);
      assert.ok(layout.pages.length > 1);
      assert.deepEqual(layout.pages.flatMap((page) => page.labels.map((label) => label.id)).sort((a, b) => a - b), names.map((_, index) => index));
      for (const page of layout.pages) {
        for (const [index, label] of page.labels.entries()) {
          assert.ok(label.x >= settings.margin - 1e-6 && label.y >= settings.margin - 1e-6);
          assert.ok(label.x + label.width <= A4.width - settings.margin + 1e-6);
          assert.ok(label.y + label.height <= A4.height - settings.margin + 1e-6);
          for (const other of page.labels.slice(index + 1)) {
            assert.ok(label.x + label.width <= other.x + 1e-6 || other.x + other.width <= label.x + 1e-6 || label.y + label.height <= other.y + 1e-6 || other.y + other.height <= label.y + 1e-6, `Overlapping labels: ${label.name} and ${other.name}`);
          }
        }
        const svg = sheetSvg(page, "#ffffff");
        assert.match(svg, /width="210mm" height="297mm" viewBox="0 0 210 297"/);
        assert.match(svg, /fill="#ffffff"/);
        assert.doesNotMatch(svg, /<(?:text|rect|image|style)\b|font-family|@font-face/);
      }
    });
  }
}

test("Lettering keeps its point size across names; changes scale every name uniformly", () => {
  for (const name of ["Mia Botha", "Charlotte van der Merwe", "William Pretorius"]) {
    const normal = measureLabel(font, name, 0, DEFAULT_SETTINGS);
    const larger = measureLabel(font, name, 0, { ...DEFAULT_SETTINGS, fontSize: DEFAULT_SETTINGS.fontSize * 1.5 });
    assert.ok(Math.abs(larger.inkWidth / normal.inkWidth - 1.5) < 1e-6);
    assert.ok(Math.abs(larger.inkHeight / normal.inkHeight - 1.5) < 1e-6);
  }
});

test("Large headings use their own font and size in both glass and A4 output", () => {
  const overrides = new Map<number, LabelOverride>([[0, { font: headingFont, fontSize: DEFAULT_SETTINGS.headingSize, nameStyle: "single" }]]);
  const print = createLayout(font, ["Table 1", "Amelia | van der Merwe"], { ...DEFAULT_SETTINGS, nameStyle: "stacked" }, overrides);
  const pane = createPanes(font, headingFont, [{ id: "table-1", number: "1", names: "Amelia | van der Merwe" }], { ...DEFAULT_SETTINGS, nameStyle: "stacked" })[0];
  for (const item of pane.labels) {
    const sticker = print.pages.flatMap((page) => page.labels).find((label) => label.id === item.id)!;
    assert.ok(Math.abs(sticker.inkWidth - item.inkWidth) < 1e-6);
    assert.ok(Math.abs(sticker.inkHeight - item.inkHeight) < 1e-6);
  }
  assert.equal(pane.labels[0].paths.length, 1);
  assert.equal(pane.labels[1].paths.length, 2);
});

test("Pane dimensions detect overflow and proposed sizes fit all tables", () => {
  assert.ok(createPanes(font, headingFont, EXAMPLE_TABLES, DEFAULT_SETTINGS).every((pane) => pane.fits));
  const settings = { ...DEFAULT_SETTINGS, paneHeight: 13 };
  const panes = createPanes(font, headingFont, EXAMPLE_TABLES, settings);
  assert.ok(panes.some((pane) => !pane.fits));
  const ratio = Math.min(...panes.map((pane) => pane.suggestedSize / settings.fontSize));
  const resized = createPanes(font, headingFont, EXAMPLE_TABLES, { ...settings, fontSize: Math.floor(settings.fontSize * ratio * 10) / 10, headingSize: Math.floor(settings.headingSize * ratio * 10) / 10 });
  assert.ok(resized.every((pane) => pane.fits));
  for (const pane of resized) for (const label of pane.labels) {
    assert.ok(label.x >= PANE_PADDING - 1e-6 && label.y >= PANE_PADDING - 1e-6);
    assert.ok(label.x + label.width <= pane.width - PANE_PADDING + 1e-6);
    assert.ok(label.y + label.height <= pane.height - PANE_PADDING + 1e-6);
  }
});

test("Oversized and unsupported names block export instead of silently shrinking or replacing letters", () => {
  const tooWide = createLayout(font, ["Charlotte ".repeat(20)], DEFAULT_SETTINGS);
  assert.equal(tooWide.pages.length, 0);
  assert.ok(tooWide.suggestedSize < DEFAULT_SETTINGS.fontSize);
  const missing = createLayout(font, ["Mia 🦄"], DEFAULT_SETTINGS);
  assert.deepEqual(missing.unsupported, ["🦄"]);
  assert.equal(missing.pages.length, 0);
  assert.equal(createLayout(font, [], DEFAULT_SETTINGS).pages.length, 0);
});

test("Names preserve duplicates and compound surnames; SVG titles escape input safely", () => {
  assert.deepEqual(parseNames("  Mia | van der Merwe\r\n\nMia | van der Merwe  "), ["Mia | van der Merwe", "Mia | van der Merwe"]);
  const label = measureLabel(font, "Amelia | van der Merwe", 0, { ...DEFAULT_SETTINGS, nameStyle: "stacked" });
  assert.equal(label.paths.length, 2);
  const svg = sheetSvg({ labels: [{ ...label, name: '<Mia & "Oliver">' }] }, "#24211e");
  assert.match(svg, /&lt;Mia &amp; &quot;Oliver&quot;&gt;/);
  assert.throws(() => sheetSvg({ labels: [label] }, 'red" onload="alert(1)'));
});

test("PNG dimensions and density metadata preserve A4 at 300 DPI", () => {
  assert.equal(PNG_WIDTH, 2480);
  assert.equal(PNG_HEIGHT, 3508);
  const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64"));
  const output = withPngResolution(png, 300);
  assert.equal(Buffer.from(output.subarray(37, 41)).toString(), "pHYs");
  const view = new DataView(output.buffer);
  assert.equal(view.getUint32(41), 11811);
  assert.equal(view.getUint32(45), 11811);
  assert.equal(output[49], 1);
});

test("Saved projects retain empty guest lists and validate corrupted settings", () => {
  assert.equal(restoreProject("invalid json"), null);
  assert.equal(restoreProject(JSON.stringify({ tables: [], settings: {} })), null);
  const saved = restoreProject(JSON.stringify({ tables: [{ id: "one", number: "1", names: "" }], settings: { ...DEFAULT_SETTINGS, fontSize: -1, color: "bad", paneCount: 0 } }))!;
  assert.equal(saved.tables[0].names, "");
  assert.equal(saved.settings.fontSize, 12);
  assert.equal(saved.settings.color, DEFAULT_SETTINGS.color);
  assert.equal(saved.settings.paneCount, 1);
});
