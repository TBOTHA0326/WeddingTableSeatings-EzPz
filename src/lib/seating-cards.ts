import type { Font } from "fontkit";
import { A4, MM_PER_POINT, escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, FONTS, MAX_GUESTS, parseNames, type FontId } from "./project";

// Preserve the supplied 787 × 1150 artwork, including its centre fold strip.
export const CARD_ASPECT = 1150 / 787;
// Most home printers reach within 5 mm of the edge; a 2 mm gap leaves room to cut each card out.
export const CARD_MARGIN = 5;
export const CARD_GAP = 2;
export const CARD_STORAGE_KEY = "ever-after-cards-v1";
export const CARD_GUESTS_KEY = "ever-after-card-guests-v1";
export const SIX_CARD_WIDTH = Math.floor((A4.height - 2 * CARD_MARGIN - 2 * CARD_GAP) / (3 * CARD_ASPECT));
export type NameLayout = "single" | "stacked";
export type CardSettings = { width: number; fontSize: number; fontId: FontId | "custom"; guides: boolean; sheetLayout: "six" | "custom"; nameLayout: NameLayout };
export const DEFAULT_CARD_SETTINGS: CardSettings = { width: SIX_CARD_WIDTH, fontSize: 32, fontId: "heirloom", guides: true, sheetLayout: "six", nameLayout: "single" };
// The largest box each name layout may fill, as fractions of the lower (standing) panel, clear of the artwork's foliage.
// "end" keeps one-line names low on the right like the reference; "centre" centres the first name over the surname.
export const NAME_AREAS: Record<NameLayout, { x: number; y: number; width: number; height: number; align: "end" | "centre" }> = {
  single: { x: 0.31, y: 0.625, width: 0.66, height: 0.32, align: "end" },
  stacked: { x: 0.27, y: 0.2, width: 0.66, height: 0.6, align: "centre" },
};
// A long surname shrinks on its own line, but no line may end up more than this much larger than another.
export const LINE_BALANCE = 1.35;
export type CardGuest = { id: string; name: string; lines: string[] };
// Each printed line of a name, with its ink's top-left corner in card millimetres.
export type NameLine = { label: Label; scale: number; x: number; y: number };
// x/y is the top-left of the space the card takes on the sheet; rotated cards lie on their side.
export type SeatingCard = { guest: CardGuest; lines: NameLine[]; x: number; y: number; rotated: boolean };
type Slot = { x: number; y: number; rotated: boolean };
export type CardLayout = { pages: SeatingCard[][]; errors: string[]; capacity: number; height: number; resized: number };

// Seating cards use one flat guest list, independent of the seating window's tables.
export function cardGuests(raw: string): CardGuest[] {
  return parseNames(raw).map((entry, index) => {
    const parts = entry.split("|").map((part) => part.trim()).filter(Boolean);
    const name = parts.join(" ");
    // Without "|", split after the first name so compound surnames (van der Merwe) stay together when stacked.
    const space = name.indexOf(" ");
    return { id: String(index), name, lines: parts.length > 1 ? parts : space < 0 ? [name] : [name.slice(0, space), name.slice(space + 1)] };
  });
}

export function restoreCardSettings(raw: string | null): CardSettings {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value) return DEFAULT_CARD_SETTINGS;
    return {
      // Older saved settings adopt the requested six-card default; explicit overrides persist.
      width: value.sheetLayout === "custom" && typeof value.width === "number" && Number.isFinite(value.width) ? Math.min(180, Math.max(60, value.width)) : SIX_CARD_WIDTH,
      fontSize: typeof value.fontSize === "number" && Number.isFinite(value.fontSize) ? Math.min(60, Math.max(12, value.fontSize)) : 32,
      fontId: value.fontId === "custom" || FONTS.some((font) => font.id === value.fontId) ? value.fontId : "heirloom",
      guides: value.guides !== false,
      sheetLayout: value.sheetLayout === "custom" ? "custom" : "six",
      nameLayout: value.nameLayout === "stacked" ? "stacked" : "single",
    };
  } catch { return DEFAULT_CARD_SETTINGS; }
}

// The six-card preset is a 2 × 3 grid. Custom widths try upright, sideways and mixed strips of cards,
// keeping whichever fits the most (then the fewest sideways cards), centred on the page.
export function sheetSlots(width: number, sheetLayout: CardSettings["sheetLayout"]): Slot[] {
  const height = width * CARD_ASPECT;
  const room = { width: A4.width - 2 * CARD_MARGIN, height: A4.height - 2 * CARD_MARGIN };
  const fit = (space: number, size: number) => Math.max(0, Math.floor((space + CARD_GAP + 1e-9) / (size + CARD_GAP)));
  type Strip = { rotated: boolean; count: number; depth: number; length: number };
  const strip = (rotated: boolean, vertical: boolean): Strip => {
    const [across, along] = rotated ? [height, width] : [width, height];
    const [depth, size, space] = vertical ? [across, along, room.height] : [along, across, room.width];
    const count = Math.min(fit(space, size), sheetLayout === "six" ? 3 : Infinity);
    return { rotated, count, depth, length: count * size + Math.max(0, count - 1) * CARD_GAP };
  };
  let best: { vertical: boolean; strips: Strip[]; total: number; rotated: number } | null = null;
  for (const vertical of sheetLayout === "six" ? [true] : [true, false]) {
    const upright = strip(false, vertical), sideways = strip(true, vertical);
    const [uprightStrips, sidewaysStrips] = sheetLayout === "six" ? [[2], [0]] : [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]];
    for (const a of uprightStrips) for (const b of sidewaysStrips) {
      const strips = [...Array(a).fill(upright), ...Array(b).fill(sideways)].filter((item) => item.count > 0);
      if (!strips.length) continue;
      const depth = strips.reduce((sum, item) => sum + item.depth, 0) + (strips.length - 1) * CARD_GAP;
      if (depth > (vertical ? room.width : room.height) + 1e-9) continue;
      const total = strips.reduce((sum, item) => sum + item.count, 0);
      const rotated = strips.filter((item) => item.rotated).reduce((sum, item) => sum + item.count, 0);
      if (!best || total > best.total || (total === best.total && rotated < best.rotated)) best = { vertical, strips, total, rotated };
    }
  }
  if (!best) return [];
  const { vertical, strips } = best;
  const depth = strips.reduce((sum, item) => sum + item.depth, 0) + (strips.length - 1) * CARD_GAP;
  const length = Math.max(...strips.map((item) => item.length));
  const origin = vertical ? { x: (A4.width - depth) / 2, y: (A4.height - length) / 2 } : { x: (A4.width - length) / 2, y: (A4.height - depth) / 2 };
  const slots: Slot[] = [];
  let offset = 0;
  for (const item of strips) {
    const step = (item.rotated ? (vertical ? width : height) : (vertical ? height : width)) + CARD_GAP;
    const start = (length - item.length) / 2;
    for (let index = 0; index < item.count; index++) {
      const along = start + index * step;
      slots.push(vertical ? { x: origin.x + offset, y: origin.y + along, rotated: item.rotated } : { x: origin.x + along, y: origin.y + offset, rotated: item.rotated });
    }
    offset += item.depth + CARD_GAP;
  }
  return slots;
}

export function createCardLayout(font: Font, guests: CardGuest[], settings: CardSettings): CardLayout {
  const height = settings.width * CARD_ASPECT;
  const valid = Number.isFinite(height) && settings.width >= 60 && settings.width <= 180;
  const slots = valid ? sheetSlots(settings.width, settings.sheetLayout) : [];
  const result: CardLayout = { pages: [], errors: [], capacity: slots.length, height, resized: 0 };
  if (!valid || !Number.isFinite(settings.fontSize) || settings.fontSize < 12 || settings.fontSize > 60 || !result.capacity) {
    result.errors.push("Choose a card size that fits inside an A4 sheet."); return result;
  }
  if (guests.length > MAX_GUESTS) { result.errors.push(`Please keep the project to ${MAX_GUESTS} guests or fewer.`); return result; }
  const missing = [...new Set(guests.flatMap((guest) => [...guest.name].filter((char) => !/\s/.test(char) && !font.hasGlyphForCodePoint(char.codePointAt(0)!))))];
  if (missing.length) { result.errors.push(`This font is missing: ${missing.join(" ")}. Choose another font or import the full font file.`); return result; }
  const half = height / 2;
  const area = NAME_AREAS[settings.nameLayout];
  const box = { x: area.x * settings.width, y: half + area.y * half, width: area.width * settings.width, height: area.height * half };
  const share = area.align === "end" ? 1 : 0.5;
  const lineGap = settings.fontSize * MM_PER_POINT * 0.3;
  for (const [index, guest] of guests.entries()) {
    const labels = (settings.nameLayout === "stacked" ? guest.lines : [guest.name]).map((text) => measureLabel(font, text, index, { ...DEFAULT_SETTINGS, gap: 0, fontSize: settings.fontSize, nameStyle: "single" }));
    if (labels.some((label) => !Number.isFinite(label.inkWidth) || !Number.isFinite(label.inkHeight) || label.inkWidth <= 0 || label.inkHeight <= 0 || !label.paths.some((path) => path.d))) {
      result.errors.push(`There is no printable lettering in “${guest.name}”.`); continue;
    }
    // Shrink only when the actual flourishes would leave the name area. Every line starts at one shared size;
    // when a long line forced that down, the others grow back (up to LINE_BALANCE) into any height left over.
    const gapAt = (current: number[]) => lineGap * Math.min(...current);
    const blockHeight = (current: number[]) => labels.reduce((sum, label, line) => sum + label.inkHeight * current[line], 0) + gapAt(current) * (labels.length - 1);
    const widthFits = labels.map((label) => Math.min(1, box.width / label.inkWidth));
    const shared = Math.min(...widthFits, box.height / blockHeight(labels.map(() => 1)));
    const base = labels.map(() => shared);
    const target = widthFits.map((fit) => Math.min(fit, shared * LINE_BALANCE));
    const extra = blockHeight(target) - blockHeight(base);
    const grow = extra > 0 ? Math.max(0, Math.min(1, (box.height - blockHeight(base)) / extra)) : 0;
    const scales = base.map((scale, line) => scale + (target[line] - scale) * grow);
    if (scales.some((scale) => scale < 1)) result.resized++;
    const blockWidth = Math.max(...labels.map((label, line) => label.inkWidth * scales[line]));
    const blockX = box.x + (box.width - blockWidth) * share;
    let lineY = box.y + (box.height - blockHeight(scales)) * share;
    const lines = labels.map((label, line) => {
      const placed = { label, scale: scales[line], x: blockX + (blockWidth - label.inkWidth * scales[line]) / 2, y: lineY };
      lineY += label.inkHeight * scales[line] + gapAt(scales);
      return placed;
    });
    const page = Math.floor(index / result.capacity);
    result.pages[page] ??= [];
    result.pages[page].push({ guest, lines, ...slots[index % result.capacity] });
  }
  if (result.errors.length) result.pages = [];
  return result;
}

export function cardMarkup(card: SeatingCard, width: number, artwork: string, guides = false): string {
  const height = width * CARD_ASPECT;
  const half = height / 2;
  const lines = card.lines.map((line) => `<g transform="translate(${line.x} ${line.y}) scale(${line.scale})">${line.label.paths.map((path) => `<path d="${path.d}" transform="translate(${path.x} ${path.y})"/>`).join("")}</g>`).join("");
  return `<g><title>${escapeXml(card.guest.name)}</title><image href="${escapeXml(artwork)}" width="${width}" height="${height}" preserveAspectRatio="none"/><g data-name="${escapeXml(card.guest.name)}" fill="#151310">${lines}</g>${guides ? `<rect width="${width}" height="${height}" fill="none" stroke="#837b70" stroke-width="0.15" stroke-dasharray="1 1"/><path d="M0 ${half}H${width}" stroke="#837b70" stroke-width="0.15" stroke-dasharray="2 1"/>` : ""}</g>`;
}

export function cardSheetSvg(cards: SeatingCard[], width: number, artwork: string, guides: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Ever After — fold-over seating cards</title><desc>Print at actual size, cut around each card, and fold at the centre. Names appear only on the lower panel.</desc><rect width="210" height="297" fill="white"/>${cards.map((card) => `<g transform="translate(${card.rotated ? card.x + width * CARD_ASPECT : card.x} ${card.y})${card.rotated ? " rotate(90)" : ""}">${cardMarkup(card, width, artwork, guides)}</g>`).join("")}</svg>`;
}
