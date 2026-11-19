import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFont } from "../src/lib/fonts";
import { A4 } from "../src/lib/layout";
import { CARD_ASPECT, CARD_MARGIN, DEFAULT_CARD_SETTINGS, LINE_BALANCE, NAME_AREAS, cardGuests, cardMarkup, cardSheetSvg, createCardLayout, restoreCardSettings, type SeatingCard } from "../src/lib/seating-cards";

const font = parseFont(new Uint8Array(readFileSync("public/fonts/heirloom.otf")));
const guests = cardGuests("Tiaan | Botha\nAmelia | van der Merwe\nTiaan Botha");

test("Guest list preserves compound surnames and duplicate names as separate cards", () => {
  assert.equal(guests[1].name, "Amelia van der Merwe");
  assert.equal(guests[2].name, guests[0].name);
  assert.equal(guests.length, 3);
  assert.equal(new Set(guests.map((guest) => guest.id)).size, 3);
  assert.deepEqual(guests[1].lines, ["Amelia", "van der Merwe"]);
  assert.deepEqual(guests[2].lines, ["Tiaan", "Botha"]);
  assert.deepEqual(cardGuests("Amelia van der Merwe\nMary Anne | Smith\nCher").map((guest) => guest.lines), [["Amelia", "van der Merwe"], ["Mary Anne", "Smith"], ["Cher"]]);
});

test("A4 packing preserves the artwork ratio, margins, and every card without overlaps", () => {
  for (const width of [60, 90, 100, 180]) {
    const names = Array.from({ length: 25 }, (_, index) => ({ ...guests[index % guests.length], id: String(index) }));
    const layout = createCardLayout(font, names, { ...DEFAULT_CARD_SETTINGS, width, sheetLayout: "custom" });
    assert.deepEqual(layout.errors, []);
    assert.equal(layout.pages.flat().length, 25);
    assert.equal(layout.height, width * CARD_ASPECT);
    for (const page of layout.pages) {
      for (const card of page) {
        assert.ok(card.x >= CARD_MARGIN && card.y >= CARD_MARGIN);
        assert.ok(card.x + width <= A4.width - CARD_MARGIN + 1e-7);
        assert.ok(card.y + layout.height <= A4.height - CARD_MARGIN + 1e-7);
        for (const other of page) {
          if (other === card) continue;
          assert.ok(card.x + width <= other.x || other.x + width <= card.x || card.y + layout.height <= other.y || other.y + layout.height <= card.y);
        }
      }
    }
  }
  assert.equal(createCardLayout(font, guests, DEFAULT_CARD_SETTINGS).capacity, 6);
});

test("Six-card preset packs two columns by three rows and custom overrides restore", () => {
  const names = Array.from({ length: 13 }, (_, index) => ({ ...guests[index % guests.length], id: String(index) }));
  const layout = createCardLayout(font, names, DEFAULT_CARD_SETTINGS);
  assert.deepEqual(layout.pages.map((page) => page.length), [6, 6, 1]);
  assert.equal(new Set(layout.pages[0].map((card) => card.x)).size, 2);
  assert.equal(new Set(layout.pages[0].map((card) => card.y)).size, 3);
  assert.deepEqual(restoreCardSettings('{"width":90,"fontId":"allura","fontSize":24,"guides":false}'), { ...DEFAULT_CARD_SETTINGS, fontId: "allura", fontSize: 24, guides: false });
  const custom = { ...DEFAULT_CARD_SETTINGS, sheetLayout: "custom" as const, width: 90 };
  assert.deepEqual(restoreCardSettings(JSON.stringify(custom)), custom);
  assert.equal(createCardLayout(font, names, custom).capacity, 4);
});

test("Name flourishes fit entirely in the lower-right panel, including very long names", () => {
  const layout = createCardLayout(font, [{ ...guests[0], name: "Alexandria Sophia van der Merwe Botha de Villiers" }], { ...DEFAULT_CARD_SETTINGS, fontSize: 60 });
  assert.deepEqual(layout.errors, []);
  assert.equal(layout.resized, 1);
  const card = layout.pages[0][0];
  assert.equal(card.lines.length, 1);
  const [line] = card.lines;
  const area = NAME_AREAS.single;
  assert.ok(line.label.inkWidth * line.scale <= DEFAULT_CARD_SETTINGS.width * area.width + 1e-7);
  assert.ok(line.label.inkHeight * line.scale <= layout.height / 2 * area.height + 1e-7);
  const markup = cardMarkup(card, DEFAULT_CARD_SETTINGS.width, "data:image/jpeg;base64,example");
  const [x, y] = [...markup.matchAll(/transform="translate\(([^ ]+) ([^)]+)\) scale/g)][0].slice(1).map(Number);
  assert.ok(x >= DEFAULT_CARD_SETTINGS.width * area.x - 1e-7);
  assert.ok(Math.abs(x + line.label.inkWidth * line.scale - DEFAULT_CARD_SETTINGS.width * (area.x + area.width)) < 1e-7);
  assert.ok(y > layout.height / 2);
  assert.ok(y + line.label.inkHeight * line.scale < layout.height);
});

const inBox = (card: SeatingCard, height: number, area: (typeof NAME_AREAS)["stacked"], width: number) => card.lines.every((line) =>
  line.x >= width * area.x - 1e-7 && line.x + line.label.inkWidth * line.scale <= width * (area.x + area.width) + 1e-7 &&
  line.y >= height / 2 * (1 + area.y) - 1e-7 && line.y + line.label.inkHeight * line.scale <= height / 2 * (1 + area.y + area.height) + 1e-7);

test("Stacked names centre the first name over the surname and print larger than one line", () => {
  const settings = { ...DEFAULT_CARD_SETTINGS, fontSize: 60 };
  const amelia = [guests[1]];
  const single = createCardLayout(font, amelia, settings).pages[0][0];
  const layout = createCardLayout(font, amelia, { ...settings, nameLayout: "stacked" });
  assert.deepEqual(layout.errors, []);
  const card = layout.pages[0][0];
  assert.equal(card.lines.length, 2);
  assert.ok(Math.min(...card.lines.map((line) => line.scale)) > single.lines[0].scale * 1.3);
  const half = layout.height / 2, area = NAME_AREAS.stacked, width = settings.width;
  assert.ok(inBox(card, layout.height, area, width));
  const centres = card.lines.map((line) => line.x + line.label.inkWidth * line.scale / 2);
  assert.ok(Math.abs(centres[0] - centres[1]) < 1e-7);
  assert.ok(Math.abs(centres[0] - width * (area.x + area.width / 2)) < 1e-7);
  const [top, bottom] = card.lines;
  assert.ok(bottom.y > top.y + top.label.inkHeight * top.scale);
  assert.ok(Math.abs((top.y + bottom.y + bottom.label.inkHeight * bottom.scale) / 2 - half * (1 + area.y + area.height / 2)) < 1e-7);
  assert.equal(cardMarkup(card, width, "data:image/jpeg;base64,example").match(/<path d=/g)?.length, 2);
  assert.equal(restoreCardSettings(JSON.stringify({ ...settings, nameLayout: "stacked" })).nameLayout, "stacked");
  assert.equal(restoreCardSettings('{"nameLayout":"sideways"}').nameLayout, "single");
});

test("A long surname shrinks on its own line without dragging the first name down to its size", () => {
  const width = DEFAULT_CARD_SETTINGS.width;
  for (const fontSize of [32, 60]) {
    const layout = createCardLayout(font, cardGuests("Frans van Kradenburg\nGert Grobler"), { ...DEFAULT_CARD_SETTINGS, fontSize, nameLayout: "stacked" });
    assert.deepEqual(layout.errors, []);
    const [frans, gert] = layout.pages[0];
    for (const card of [frans, gert]) {
      assert.ok(inBox(card, layout.height, NAME_AREAS.stacked, width));
      assert.ok(card.lines.every((line) => line.scale <= 1));
      const [first, surname] = card.lines.map((line) => line.scale);
      assert.ok(Math.max(first, surname) <= Math.min(first, surname) * LINE_BALANCE + 1e-9);
    }
    const [first, surname] = frans.lines.map((line) => line.scale);
    assert.ok(surname < 1 && first > surname * 1.3);
  }
  const short = createCardLayout(font, cardGuests("Gert Grobler"), { ...DEFAULT_CARD_SETTINGS, fontSize: 24, nameLayout: "stacked" });
  assert.equal(short.resized, 0);
  assert.deepEqual(short.pages[0][0].lines.map((line) => line.scale), [1, 1]);
  // Raising the size never makes any line print smaller.
  const sizes = (fontSize: number) => createCardLayout(font, cardGuests("Tiaan Botha\nFrans van Kradenburg\nAlexandria | de Villiers"), { ...DEFAULT_CARD_SETTINGS, fontSize, nameLayout: "stacked" }).pages[0].flatMap((card) => card.lines.map((line) => line.scale * fontSize));
  for (let fontSize = 12; fontSize < 60; fontSize += 4) sizes(fontSize).forEach((size, line) => assert.ok(sizes(fontSize + 4)[line] >= size - 1e-9));
});

test("Exports embed the original artwork, outline lettering, and optional cut/fold guides", () => {
  const layout = createCardLayout(font, guests, DEFAULT_CARD_SETTINGS);
  const svg = cardSheetSvg(layout.pages[0], DEFAULT_CARD_SETTINGS.width, "data:image/jpeg;base64,example", true);
  assert.match(svg, /width="210mm" height="297mm"/);
  assert.equal((svg.match(/<image /g) ?? []).length, 3);
  assert.match(svg, /data:image\/jpeg;base64,example/);
  assert.match(svg, /<path d=/);
  assert.doesNotMatch(svg, /<text\b|font-family|https?:\/\/(?!www.w3.org)/);
  assert.match(svg, /stroke-dasharray/);
  assert.doesNotMatch(cardSheetSvg(layout.pages[0], DEFAULT_CARD_SETTINGS.width, "data:image/jpeg;base64,example", false), /stroke-dasharray/);
  assert.equal((svg.match(/data-name="Tiaan Botha"/g) ?? []).length, 2);
});

test("Invalid sizes, missing glyphs, and excess guests block printable pages", () => {
  for (const width of [NaN, 0, 500]) assert.equal(createCardLayout(font, guests, { ...DEFAULT_CARD_SETTINGS, width }).pages.length, 0);
  const unsupported = createCardLayout(font, [{ ...guests[0], name: "Tiaan 🦄" }], DEFAULT_CARD_SETTINGS);
  assert.equal(unsupported.pages.length, 0);
  assert.match(unsupported.errors[0], /missing/);
  assert.equal(createCardLayout(font, Array.from({ length: 1001 }, () => guests[0]), DEFAULT_CARD_SETTINGS).pages.length, 0);
  assert.deepEqual(restoreCardSettings('{"width":500,"fontSize":0,"fontId":"missing","sheetLayout":"custom"}'), { ...DEFAULT_CARD_SETTINGS, sheetLayout: "custom", width: 180, fontSize: 12 });
});
