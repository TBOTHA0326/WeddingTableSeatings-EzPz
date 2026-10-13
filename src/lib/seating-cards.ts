import type { Font } from "fontkit";
import { A4, escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, MAX_GUESTS, parseNames, type FontId, type Table } from "./project";

// Preserve the supplied 787 × 1150 artwork, including its centre fold strip.
export const CARD_ASPECT = 1150 / 787;
export const CARD_MARGIN = 10;
export const CARD_GAP = 4;
export const CARD_STORAGE_KEY = "ever-after-cards-v1";
export type CardSettings = { width: number; fontSize: number; fontId: FontId | "custom"; guides: boolean };
export const DEFAULT_CARD_SETTINGS: CardSettings = { width: 90, fontSize: 32, fontId: "heirloom", guides: true };
export type CardGuest = { id: string; name: string; table: string };
export type SeatingCard = { guest: CardGuest; label: Label; scale: number; x: number; y: number };
export type CardLayout = { pages: SeatingCard[][]; errors: string[]; capacity: number; height: number; resized: number };

export function cardGuests(tables: Table[]): CardGuest[] {
  return tables.flatMap((table) => parseNames(table.names).map((name, index) => ({
    id: `${table.id}:${index}`, name: name.split("|").map((part) => part.trim()).filter(Boolean).join(" "), table: table.number,
  })));
}

export function restoreCardSettings(raw: string | null): CardSettings {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value) return DEFAULT_CARD_SETTINGS;
    return {
      width: typeof value.width === "number" && Number.isFinite(value.width) ? Math.min(180, Math.max(60, value.width)) : 90,
      fontSize: typeof value.fontSize === "number" && Number.isFinite(value.fontSize) ? Math.min(60, Math.max(12, value.fontSize)) : 32,
      fontId: ["heirloom", "angelface", "great-vibes", "allura", "cormorant", "custom"].includes(value.fontId) ? value.fontId : "heirloom",
      guides: value.guides !== false,
    };
  } catch { return DEFAULT_CARD_SETTINGS; }
}

export function createCardLayout(font: Font, guests: CardGuest[], settings: CardSettings): CardLayout {
  const height = settings.width * CARD_ASPECT;
  const columns = Math.floor((A4.width - 2 * CARD_MARGIN + CARD_GAP) / (settings.width + CARD_GAP));
  const rows = Math.floor((A4.height - 2 * CARD_MARGIN + CARD_GAP) / (height + CARD_GAP));
  const result: CardLayout = { pages: [], errors: [], capacity: columns * rows, height, resized: 0 };
  if (!Number.isFinite(height) || settings.width < 60 || settings.width > 180 || !Number.isFinite(settings.fontSize) || settings.fontSize < 12 || settings.fontSize > 60 || !result.capacity) {
    result.errors.push("Choose a card size that fits inside an A4 sheet."); return result;
  }
  if (guests.length > MAX_GUESTS) { result.errors.push(`Please keep the project to ${MAX_GUESTS} guests or fewer.`); return result; }
  const missing = [...new Set(guests.flatMap((guest) => [...guest.name].filter((char) => !/\s/.test(char) && !font.hasGlyphForCodePoint(char.codePointAt(0)!))))];
  if (missing.length) { result.errors.push(`This font is missing: ${missing.join(" ")}. Choose another font or import the full font file.`); return result; }
  const gridWidth = columns * settings.width + (columns - 1) * CARD_GAP;
  const gridHeight = rows * height + (rows - 1) * CARD_GAP;
  for (const [index, guest] of guests.entries()) {
    const label = measureLabel(font, guest.name, index, { ...DEFAULT_SETTINGS, gap: 0, fontSize: settings.fontSize, nameStyle: "single" });
    if (!Number.isFinite(label.inkWidth) || !Number.isFinite(label.inkHeight) || label.inkWidth <= 0 || label.inkHeight <= 0 || !label.paths.some((path) => path.d)) {
      result.errors.push(`There is no printable lettering in “${guest.name}”.`); continue;
    }
    // Match the reference's lower-right name area, measuring the actual flourishes.
    const scale = Math.min(1, settings.width * 0.60 / label.inkWidth, height / 2 * 0.32 / label.inkHeight);
    if (scale < 1) result.resized++;
    const slot = index % result.capacity;
    const page = Math.floor(index / result.capacity);
    result.pages[page] ??= [];
    result.pages[page].push({ guest, label, scale,
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
  const inkWidth = card.label.inkWidth * card.scale;
  const inkHeight = card.label.inkHeight * card.scale;
  const nameX = width * 0.97 - inkWidth;
  const nameY = half + half * 0.945 - inkHeight;
  const paths = card.label.paths.map((path) => `<path d="${path.d}" transform="translate(${path.x} ${path.y})"/>`).join("");
  return `<g><title>${escapeXml(card.guest.name)}</title><image href="${escapeXml(artwork)}" width="${width}" height="${height}" preserveAspectRatio="none"/><g data-name="${escapeXml(card.guest.name)}" fill="#151310" transform="translate(${nameX} ${nameY}) scale(${card.scale})">${paths}</g>${guides ? `<rect width="${width}" height="${height}" fill="none" stroke="#837b70" stroke-width="0.15" stroke-dasharray="1 1"/><path d="M0 ${half}H${width}" stroke="#837b70" stroke-width="0.15" stroke-dasharray="2 1"/>` : ""}</g>`;
}

export function cardSheetSvg(cards: SeatingCard[], width: number, artwork: string, guides: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Ever After — fold-over seating cards</title><desc>Print at actual size, cut around each card, and fold at the centre. Names appear only on the lower panel.</desc><rect width="210" height="297" fill="white"/>${cards.map((card) => `<g transform="translate(${card.x} ${card.y})">${cardMarkup(card, width, artwork, guides)}</g>`).join("")}</svg>`;
}
