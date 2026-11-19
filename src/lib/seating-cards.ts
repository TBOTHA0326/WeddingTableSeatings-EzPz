import type { Font } from "fontkit";
import { A4, escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, FONTS, MAX_GUESTS, parseNames, type FontId } from "./project";

// Preserve the supplied 787 × 1150 artwork, including its centre fold strip.
export const CARD_ASPECT = 1150 / 787;
export const CARD_MARGIN = 10;
export const CARD_GAP = 4;
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
  stacked: { x: 0.28, y: 0.2, width: 0.58, height: 0.6, align: "centre" },
};
export type CardGuest = { id: string; name: string; lines: string[] };
export type SeatingCard = { guest: CardGuest; label: Label; scale: number; x: number; y: number; nameX: number; nameY: number };
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

export function createCardLayout(font: Font, guests: CardGuest[], settings: CardSettings): CardLayout {
  const height = settings.width * CARD_ASPECT;
  const columns = settings.sheetLayout === "six" ? 2 : Math.floor((A4.width - 2 * CARD_MARGIN + CARD_GAP) / (settings.width + CARD_GAP));
  const rows = settings.sheetLayout === "six" ? 3 : Math.floor((A4.height - 2 * CARD_MARGIN + CARD_GAP) / (height + CARD_GAP));
  const result: CardLayout = { pages: [], errors: [], capacity: columns * rows, height, resized: 0 };
  if (!Number.isFinite(height) || settings.width < 60 || settings.width > 180 || !Number.isFinite(settings.fontSize) || settings.fontSize < 12 || settings.fontSize > 60 || !result.capacity || columns * settings.width + (columns - 1) * CARD_GAP > A4.width - 2 * CARD_MARGIN || rows * height + (rows - 1) * CARD_GAP > A4.height - 2 * CARD_MARGIN) {
    result.errors.push("Choose a card size that fits inside an A4 sheet."); return result;
  }
  if (guests.length > MAX_GUESTS) { result.errors.push(`Please keep the project to ${MAX_GUESTS} guests or fewer.`); return result; }
  const missing = [...new Set(guests.flatMap((guest) => [...guest.name].filter((char) => !/\s/.test(char) && !font.hasGlyphForCodePoint(char.codePointAt(0)!))))];
  if (missing.length) { result.errors.push(`This font is missing: ${missing.join(" ")}. Choose another font or import the full font file.`); return result; }
  const gridWidth = columns * settings.width + (columns - 1) * CARD_GAP;
  const gridHeight = rows * height + (rows - 1) * CARD_GAP;
  const half = height / 2;
  const area = NAME_AREAS[settings.nameLayout];
  const box = { x: area.x * settings.width, y: half + area.y * half, width: area.width * settings.width, height: area.height * half };
  for (const [index, guest] of guests.entries()) {
    const stacked = settings.nameLayout === "stacked";
    const label = measureLabel(font, stacked ? guest.lines.join("|") : guest.name, index, { ...DEFAULT_SETTINGS, gap: 0, fontSize: settings.fontSize, nameStyle: settings.nameLayout });
    if (!Number.isFinite(label.inkWidth) || !Number.isFinite(label.inkHeight) || label.inkWidth <= 0 || label.inkHeight <= 0 || !label.paths.some((path) => path.d)) {
      result.errors.push(`There is no printable lettering in “${guest.name}”.`); continue;
    }
    // Shrink only when the actual flourishes would leave the name area.
    const scale = Math.min(1, box.width / label.inkWidth, box.height / label.inkHeight);
    if (scale < 1) result.resized++;
    const spareX = box.width - label.inkWidth * scale;
    const spareY = box.height - label.inkHeight * scale;
    const share = area.align === "end" ? 1 : 0.5;
    const slot = index % result.capacity;
    const page = Math.floor(index / result.capacity);
    result.pages[page] ??= [];
    result.pages[page].push({ guest, label, scale, nameX: box.x + spareX * share, nameY: box.y + spareY * share,
      x: (A4.width - gridWidth) / 2 + (slot % columns) * (settings.width + CARD_GAP),
      y: (A4.height - gridHeight) / 2 + Math.floor(slot / columns) * (height + CARD_GAP),
    });
  }
  if (result.errors.length) result.pages = [];
  return result;
}

export function cardMarkup(card: SeatingCard, width: number, artwork: string, guides = false): string {
  const height = width * CARD_ASPECT;
  const half = height / 2;
  const paths = card.label.paths.map((path) => `<path d="${path.d}" transform="translate(${path.x} ${path.y})"/>`).join("");
  return `<g><title>${escapeXml(card.guest.name)}</title><image href="${escapeXml(artwork)}" width="${width}" height="${height}" preserveAspectRatio="none"/><g data-name="${escapeXml(card.guest.name)}" fill="#151310" transform="translate(${card.nameX} ${card.nameY}) scale(${card.scale})">${paths}</g>${guides ? `<rect width="${width}" height="${height}" fill="none" stroke="#837b70" stroke-width="0.15" stroke-dasharray="1 1"/><path d="M0 ${half}H${width}" stroke="#837b70" stroke-width="0.15" stroke-dasharray="2 1"/>` : ""}</g>`;
}

export function cardSheetSvg(cards: SeatingCard[], width: number, artwork: string, guides: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Ever After — fold-over seating cards</title><desc>Print at actual size, cut around each card, and fold at the centre. Names appear only on the lower panel.</desc><rect width="210" height="297" fill="white"/>${cards.map((card) => `<g transform="translate(${card.x} ${card.y})">${cardMarkup(card, width, artwork, guides)}</g>`).join("")}</svg>`;
}
