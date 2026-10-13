import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFont } from "../src/lib/fonts";
import { A4 } from "../src/lib/layout";
import { CARD_ASPECT, CARD_MARGIN, DEFAULT_CARD_SETTINGS, cardGuests, cardMarkup, cardSheetSvg, createCardLayout, restoreCardSettings } from "../src/lib/seating-cards";

const font = parseFont(new Uint8Array(readFileSync("public/fonts/heirloom.otf")));
const guests = cardGuests([{ id: "table-1", number: "1", names: "Tiaan | Botha\nAmelia | van der Merwe\nTiaan | Botha" }]);

test("Shared guests preserve compound surnames and duplicate names as separate cards", () => {
  assert.equal(guests[1].name, "Amelia van der Merwe");
  assert.equal(guests.length, 3);
  assert.equal(new Set(guests.map((guest) => guest.id)).size, 3);
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
  assert.ok(card.label.inkWidth * card.scale <= DEFAULT_CARD_SETTINGS.width * 0.60 + 1e-7);
  assert.ok(card.label.inkHeight * card.scale <= layout.height / 2 * 0.32 + 1e-7);
  const markup = cardMarkup(card, DEFAULT_CARD_SETTINGS.width, "data:image/jpeg;base64,example");
  const [x, y] = [...markup.matchAll(/transform="translate\(([^ ]+) ([^)]+)\) scale/g)][0].slice(1).map(Number);
  assert.ok(x >= DEFAULT_CARD_SETTINGS.width * 0.37 - 1e-7);
  assert.ok(y > layout.height / 2);
  assert.ok(y + card.label.inkHeight * card.scale < layout.height);
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
