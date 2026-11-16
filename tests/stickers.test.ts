import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import paper from "paper/dist/paper-core";
import { parseFont } from "../src/lib/fonts";
import { FONTS } from "../src/lib/project";
import { DEFAULT_DOOR, DEFAULT_STICKER, DEFAULT_STICKER_PROJECT, GLASS_WIDTH, doorHeight, doorMarkup, measureSticker, restoreStickerProject, stickerErrors, stickerFilename, stickerGuidesMarkup, stickerHeight, stickerOnDoorMarkup, stickerPixels, stickerScale, stickerSvg, stickerTop, stickerWarnings, widthForHeight, type Sticker } from "../src/lib/stickers";
import { mergeOutlines, weldOutlines } from "../src/lib/weld";

const fontFor = (id: string) => parseFont(new Uint8Array(readFileSync(`public${FONTS.find((font) => font.id === id)!.file}`)));
const heirloom = fontFor("heirloom");
const sticker = (patch: Partial<Sticker> = {}): Sticker => ({ ...DEFAULT_STICKER, ...patch });

// Two outlines crossing would be cut through. A sharp point where one outline turns back on itself is fine.
function crossingOutlines(item: paper.PathItem) {
  return item.getCrossings(item).filter((crossing) => {
    const other = crossing.intersection;
    const curves = crossing.path.curves.length;
    const turnsBack = crossing.path === other.path && [1, curves - 1].includes(Math.abs(crossing.curve.index - other.curve.index));
    return !turnsBack;
  });
}

// Whether a point is painted, using the same rule browsers use for font outlines.
function rings(item: paper.PathItem) {
  const paths = (item instanceof paper.CompoundPath ? item.children : [item]) as paper.Path[];
  return paths.map((path) => { const flat = path.clone({ insert: false }) as paper.Path; flat.flatten(0.03); return flat.segments.map((segment) => segment.point); });
}
function painted(outlines: paper.Point[][], x: number, y: number) {
  let winding = 0;
  for (const ring of outlines) for (let index = 0; index < ring.length; index++) {
    const a = ring[index]; const b = ring[(index + 1) % ring.length];
    const side = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
    if (a.y <= y && b.y > y && side > 0) winding++;
    else if (a.y > y && b.y <= y && side < 0) winding--;
  }
  return winding !== 0;
}

test("Sizes are real centimetres, keep their proportions, and measure to the lettering's edges", () => {
  const label = measureSticker(heirloom, "Find your seat")!;
  assert.ok(label);
  const height = stickerHeight(label, 36);
  assert.ok(Math.abs(height - 36 * label.inkHeight / label.inkWidth) < 1e-9);
  assert.ok(Math.abs(widthForHeight(label, height) - 36) < 1e-9);
  assert.equal(stickerHeight(label, 72), height * 2);
  const merged = mergeOutlines(label.paths);
  merged.scale(stickerScale(sticker({ width: 36 }), label), new paper.Point(0, 0));
  assert.ok(Math.abs(merged.bounds.width - 360) < 0.5, `true width ${merged.bounds.width} mm`);
  assert.ok(Math.abs(merged.bounds.height - height * 10) < 0.5, `true height ${merged.bounds.height} mm`);
});

test("Line breaks stack within one sticker, and blank words have nothing to print", () => {
  const one = measureSticker(heirloom, "Find your seat")!;
  const two = measureSticker(heirloom, "Find your\n  seat\n")!;
  assert.equal(two.paths.length, 2);
  assert.ok(two.inkHeight > one.inkHeight);
  assert.ok(two.inkWidth < one.inkWidth);
  assert.equal(measureSticker(heirloom, "  \n "), null);
});

test("Every font's overlaps merge into clean outlines", () => {
  let overlapping = 0;
  for (const { id } of FONTS) {
    const font = fontFor(id);
    for (const text of ["Find your seat", "Zaylé\nvan Waveren"]) {
      const label = measureSticker(font, text)!;
      const raw = paper.PathItem.create(label.paths[0].d);
      if (crossingOutlines(raw).length) overlapping++;
      const merged = mergeOutlines(label.paths);
      assert.equal(crossingOutlines(merged).length, 0, `${id}: ${text} still has crossing outlines`);
    }
  }
  assert.ok(overlapping > 0, "the sample should exercise overlapping outlines");
});

test("Merging leaves the lettering looking exactly the same", () => {
  for (const id of ["heirloom", "great-vibes", "herr-von-muellerhoff", "montserrat", "playfair-display-italic", "cinzel-decorative", "dancing-script", "mr-dafoe"]) {
    const label = measureSticker(fontFor(id), "Find your\nseat Zaylé")!;
    const before = label.paths.flatMap((path) => rings(paper.PathItem.create(path.d)).map((ring) => ring.map((point) => point.add(new paper.Point(path.x, path.y)))));
    const after = rings(paper.PathItem.create(weldOutlines(label.paths, 1)));
    let inside = 0; let different = 0;
    for (let y = 0.11; y < label.inkHeight; y += 1.1) for (let x = 0.13; x < label.inkWidth; x += 1.1) {
      const was = painted(before, x, y);
      if (was) inside++;
      if (was !== painted(after, x, y)) different++;
    }
    assert.ok(inside > 50, `${id} should paint enough sample points`);
    assert.ok(different / inside < 0.02, `${id} changed at ${different} of ${inside} sample points`);
  }
});

test("Downloads are one vector shape at the exact size, with no background or guides", () => {
  const label = measureSticker(heirloom, "Find <your> seat")!;
  const item = sticker({ text: "Find <your> seat", width: 36, color: "#95724d" });
  const svg = stickerSvg(item, label, weldOutlines(label.paths, stickerScale(item, label)));
  const height = stickerHeight(label, 36);
  assert.match(svg, new RegExp(`width="36\\.000cm" height="${height.toFixed(3).replace(".", "\\.")}cm"`));
  assert.match(svg, new RegExp(`viewBox="0 0 360\\.0000 ${(height * 10).toFixed(4).replace(".", "\\.")}"`));
  assert.equal((svg.match(/<path /g) ?? []).length, 1);
  assert.match(svg, /<path fill="#95724d"/);
  assert.match(svg, /<title>Find &lt;your&gt; seat<\/title>/);
  assert.doesNotMatch(svg, /<rect|<image|<text\b|transform=|stroke|data-guides/);
  const bounds = paper.PathItem.create(svg.match(/ d="([^"]+)"/)![1]).bounds;
  assert.ok(bounds.left > -0.5 && bounds.top > -0.5 && bounds.right < 360.5 && bounds.bottom < height * 10 + 0.5, "the shape fills the page in millimetres");
  assert.deepEqual(stickerPixels(item, label), { width: 4252, height: Math.round(height / 2.54 * 300) });
  assert.match(stickerFilename(sticker({ text: "Zaylé &\nvan Waveren", width: 40 }), 1, label, "svg"), /^ever-after-sticker-2-zayle-van-waveren-40x[\d.]+cm\.svg$/);
});

test("Fit warnings describe the door, while real problems are errors", () => {
  const door = DEFAULT_DOOR;
  assert.deepEqual(stickerWarnings(sticker({ width: 36, center: 14.25 }), 7, door), []);
  assert.match(stickerWarnings(sticker({ width: 70 }), 7, door)[0], /is 70 cm wide, but the door is 61 cm wide/);
  assert.match(stickerWarnings(sticker({ center: 2 }), 7, door)[0], /runs 1\.5 cm off the top/);
  assert.match(stickerWarnings(sticker({ center: 18 }), 7, door)[0], /runs 0\.5 cm onto the glass/);
  // The groove is a slot about 8 mm tall, so lettering just clear of the line can still touch it.
  assert.match(stickerWarnings(sticker({ center: 6.4 }), 7, door)[0], /crosses the groove/);
  assert.deepEqual(stickerWarnings(sticker({ center: 6 }), 7, door), []);
  assert.match(stickerWarnings(sticker({ center: 9 }), 7, door)[0], /crosses the groove/);
  assert.match(stickerErrors(heirloom, sticker({ text: "Tiaan 🦄" }))[0], /missing these characters: 🦄/);
  assert.deepEqual(stickerErrors(heirloom, sticker()), []);
  assert.match(stickerErrors(heirloom, sticker({ text: "A\nB\nC\nD\nE\nF\nG\nH", width: 120 }))[0], /taller than 120 cm/);
});

test("The door is to scale: panes fit, with one centred column of glass and stickers", () => {
  assert.equal(doorHeight(DEFAULT_DOOR), 21 + 6 * 26 + 5 * 2 + 17.5);
  assert.equal(GLASS_WIDTH, 39);
  const markup = doorMarkup(DEFAULT_DOOR, ["<circle/>"]);
  assert.equal((markup.match(/fill="#b5b8a8"/g) ?? []).length, 12);
  assert.equal((markup.match(/<circle\/>/g) ?? []).length, 1);
  assert.match(markup, /<rect x="11" y="21" width="18.5" height="26"/);
  assert.match(markup, /<svg x="11" y="21" width="18.5" height="26" viewBox="0 0 185 260">/);
  assert.match(markup, /<rect width="61" height="204.5" fill="#1d1c1a"/);
  assert.equal((doorMarkup(DEFAULT_DOOR, [], 1).match(/fill="#b5b8a8"/g) ?? []).length, 2);
  const label = measureSticker(heirloom, "Find your seat")!;
  const item = sticker({ width: 30, center: 14 });
  const height = stickerHeight(label, 30);
  const markupOnDoor = stickerOnDoorMarkup(item, label, DEFAULT_DOOR);
  assert.ok(markupOnDoor.includes(`translate(15.5000 ${stickerTop(item, height).toFixed(4)})`), "centred across the door");
  assert.match(stickerGuidesMarkup(item, height, DEFAULT_DOOR), />30 cm</);
  // Guides stay readable on a dark door and on a light one.
  assert.match(stickerGuidesMarkup(item, height, DEFAULT_DOOR), /stroke="#d9bf90"/);
  assert.match(stickerGuidesMarkup(item, height, { ...DEFAULT_DOOR, color: "#f6f3ec" }), /stroke="#95724d"/);
});

test("The starting layout is Find Your above the groove and Seat below it, matching in size", () => {
  const [top, seat] = DEFAULT_STICKER_PROJECT.stickers;
  assert.deepEqual([top.text, seat.text, top.color, seat.color], ["Find Your", "Seat", "#ffffff", "#ffffff"]);
  const topLabel = measureSticker(heirloom, top.text)!;
  const seatLabel = measureSticker(heirloom, seat.text)!;
  const topHeight = stickerHeight(topLabel, top.width);
  const seatHeight = stickerHeight(seatLabel, seat.width);
  const groove = DEFAULT_DOOR.groove;
  assert.ok(stickerTop(top, topHeight) >= 1 && stickerTop(top, topHeight) + topHeight <= groove - 1.1, "Find Your sits above the groove with clearance");
  assert.ok(stickerTop(seat, seatHeight) >= groove + 1.1 && stickerTop(seat, seatHeight) + seatHeight <= DEFAULT_DOOR.top - 0.9, "Seat sits between the groove and the glass");
  assert.ok(Math.abs(top.width / topLabel.inkWidth / (seat.width / seatLabel.inkWidth) - 1) < 0.01, "both lines share one lettering size");
  for (const item of [top, seat]) assert.deepEqual(stickerWarnings(item, stickerHeight(measureSticker(heirloom, item.text)!, item.width), DEFAULT_DOOR), []);
  // A browser still holding the first version's untouched starting point moves to this layout.
  const first = JSON.stringify({ stickers: [{ id: "sticker-1", text: "Find your seat", fontId: "heirloom", width: 36, center: 14.25, color: "#24211e" }], door: { width: 58, top: 19.5, groove: 9 } });
  assert.deepEqual(restoreStickerProject(first), DEFAULT_STICKER_PROJECT);
  const edited = restoreStickerProject(first.replace('"width":36', '"width":30'));
  assert.equal(edited.stickers[0].width, 30);
  assert.deepEqual(edited.door, { width: 58, top: 19.5, groove: 9, color: DEFAULT_DOOR.color });
});

test("Saved stickers and doors restore safely", () => {
  assert.deepEqual(restoreStickerProject(null), DEFAULT_STICKER_PROJECT);
  assert.deepEqual(restoreStickerProject("not json"), DEFAULT_STICKER_PROJECT);
  assert.deepEqual(restoreStickerProject('{"stickers":[],"door":{}}'), DEFAULT_STICKER_PROJECT);
  const restored = restoreStickerProject(JSON.stringify({ door: { width: 1, top: 10, groove: 50 }, stickers: [
    { id: "a", text: "Hello", fontId: "missing", width: 900, center: "x", color: "red" },
    { id: "a", text: "Duplicate" },
    { id: "b", text: "Keep", fontId: "parisienne", width: 20, center: 5, color: "#ffffff" },
    { text: "No id" },
  ] }));
  assert.deepEqual(restored.door, { width: 41, top: 10, groove: 10, color: DEFAULT_DOOR.color });
  assert.deepEqual(restored.stickers, [
    { id: "a", text: "Hello", fontId: DEFAULT_STICKER.fontId, width: 120, center: DEFAULT_STICKER.center, color: DEFAULT_STICKER.color },
    { id: "b", text: "Keep", fontId: "parisienne", width: 20, center: 5, color: "#ffffff" },
  ]);
});
