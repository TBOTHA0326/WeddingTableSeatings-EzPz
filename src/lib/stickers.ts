import type { Font } from "fontkit";
import { escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, FONTS, type FontId } from "./project";
import { PAGE } from "./table-pages";

export const STICKER_STORAGE_KEY = "ever-after-stickers-v1";
export const MIN_STICKER_CM = 1;
export const MAX_STICKER_CM = 120;
export const MAX_STICKERS = 30;
const PNG_DPI = 300;
const MEASURE_SIZE = 100;

export type Sticker = { id: string; text: string; fontId: FontId; width: number; center: number; color: string };
// In centimetres: the door's width, the solid section above the glass, and the groove's distance from the top.
export type Door = { width: number; top: number; groove: number; color: string };
export type StickerProject = { stickers: Sticker[]; door: Door };

// The couple's black door, as measured: 61 cm wide, the groove 10 cm down, the glass 21 cm down.
export const DEFAULT_DOOR: Door = { width: 61, top: 21, groove: 10, color: "#1d1c1a" };
// "Find Your" just above the groove and "Seat" just below it, at the same lettering size.
export const DEFAULT_STICKERS: Sticker[] = [
  { id: "sticker-1", text: "Find Your", fontId: "heirloom", width: 29.4, center: 5.01, color: "#ffffff" },
  { id: "sticker-2", text: "Seat", fontId: "heirloom", width: 18.6, center: 14.26, color: "#ffffff" },
];
export const DEFAULT_STICKER = DEFAULT_STICKERS[0];
export const DEFAULT_STICKER_PROJECT: StickerProject = { stickers: DEFAULT_STICKERS, door: DEFAULT_DOOR };
// The first version's untouched starting point, which moves to the measured door.
const FIRST_DEFAULT = JSON.stringify({ stickers: [{ id: "sticker-1", text: "Find your seat", fontId: "heirloom", width: 36, center: 14.25, color: "#24211e" }], door: { width: 58, top: 19.5, groove: 9 } });

const PANE = { width: PAGE.width / 10, height: PAGE.height / 10 };
const COLUMNS = 2;
const ROWS = 6;
const MUNTIN = 2;
const BOTTOM_RAIL = 17.5;
// The groove is a slot about 8 mm tall, centred on its measurement.
const GROOVE_SLOT = 0.8;
export const GLASS_WIDTH = COLUMNS * PANE.width + (COLUMNS - 1) * MUNTIN;
const GLASS_HEIGHT = ROWS * PANE.height + (ROWS - 1) * MUNTIN;
export const doorHeight = (door: Door) => door.top + GLASS_HEIGHT + BOTTOM_RAIL;

// Each line of the box stays on its own line in the sticker.
function stickerLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.normalize("NFC").replaceAll("|", " ").trim().replace(/\s+/g, " ")).filter(Boolean);
}

// Measured once at a fixed size; the sticker's width in centimetres then sets the scale.
export function measureSticker(font: Font, text: string): Label | null {
  const lines = stickerLines(text);
  if (!lines.length) return null;
  const label = measureLabel(font, lines.join("|"), 0, { ...DEFAULT_SETTINGS, fontSize: MEASURE_SIZE, gap: 0, nameStyle: lines.length > 1 ? "stacked" : "single" });
  return label.inkWidth > 0 && label.inkHeight > 0 && Number.isFinite(label.inkWidth) ? label : null;
}

export const stickerHeight = (label: Label, width: number) => width * label.inkHeight / label.inkWidth;
export const widthForHeight = (label: Label, height: number) => height * label.inkWidth / label.inkHeight;
export const stickerTop = (sticker: Sticker, height: number) => sticker.center - height / 2;
export const formatCm = (value: number) => String(Math.round(value * 10) / 10);
export function isDark(hex: string): boolean {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue < 128;
}
const quoted = (sticker: Sticker) => `“${stickerLines(sticker.text).join(" ")}”`;

export function stickerErrors(font: Font, sticker: Sticker): string[] {
  const missing = [...new Set([...stickerLines(sticker.text).join("").replace(/\s/g, "")].filter((character) => !font.hasGlyphForCodePoint(character.codePointAt(0)!)))];
  if (missing.length) return [`This font is missing these characters: ${missing.join(" ")}. Try another font or edit the words.`];
  const label = measureSticker(font, sticker.text);
  if (label && stickerHeight(label, sticker.width) > MAX_STICKER_CM) return [`${quoted(sticker)} would be taller than ${MAX_STICKER_CM} cm. Make it narrower.`];
  return [];
}

// These only flag how a sticker sits on the door; they never block a download.
export function stickerWarnings(sticker: Sticker, height: number, door: Door): string[] {
  const warnings: string[] = [];
  const top = stickerTop(sticker, height);
  const bottom = top + height;
  if (sticker.width > door.width) warnings.push(`${quoted(sticker)} is ${formatCm(sticker.width)} cm wide, but the door is ${formatCm(door.width)} cm wide.`);
  if (top < 0) warnings.push(`${quoted(sticker)} runs ${formatCm(-top)} cm off the top of the door.`);
  if (bottom > door.top) warnings.push(`${quoted(sticker)} runs ${formatCm(bottom - door.top)} cm onto the glass.`);
  if (top < door.groove + GROOVE_SLOT / 2 && bottom > door.groove - GROOVE_SLOT / 2) warnings.push(`${quoted(sticker)} crosses the groove in the door, where vinyl won’t stick flat.`);
  return warnings;
}

function pathsMarkup(label: Label): string {
  return label.paths.map((path) => `<path transform="translate(${path.x.toFixed(4)} ${path.y.toFixed(4)})" d="${path.d}"/>`).join("");
}

// The door is drawn in centimetres. `panes` holds page markup for each pane, filled row by row.
export function doorMarkup(door: Door, panes: string[], rows = ROWS): string {
  const height = doorHeight(door);
  const left = (door.width - GLASS_WIDTH) / 2;
  const glass = Array.from({ length: rows * COLUMNS }, (_, index) => {
    const x = left + (index % COLUMNS) * (PANE.width + MUNTIN);
    const y = door.top + Math.floor(index / COLUMNS) * (PANE.height + MUNTIN);
    return `<rect x="${x}" y="${y}" width="${PANE.width}" height="${PANE.height}" fill="#b5b8a8" stroke="#00000030" stroke-width="0.25"/>${panes[index] ? `<svg x="${x}" y="${y}" width="${PANE.width}" height="${PANE.height}" viewBox="0 0 ${PAGE.width} ${PAGE.height}">${panes[index]}</svg>` : ""}`;
  }).join("");
  return `<rect x="-100" y="-100" width="${door.width + 200}" height="${height + 200}" fill="#d8d6c7"/><rect x="0.35" y="0.35" width="${door.width}" height="${height}" fill="#00000018"/><rect width="${door.width}" height="${height}" fill="${escapeXml(door.color)}" stroke="#00000040" stroke-width="0.15"/><rect x="-0.45" y="9" width="0.7" height="12" fill="#b4b2a8"/><rect x="-0.45" y="${height - 28}" width="0.7" height="12" fill="#b4b2a8"/><rect x="${left - 1.5}" y="${door.groove - GROOVE_SLOT / 2}" width="${GLASS_WIDTH + 3}" height="${GROOVE_SLOT}" fill="#000000" fill-opacity="0.45"/><line x1="${left - 1.5}" x2="${left + GLASS_WIDTH + 1.5}" y1="${door.groove + GROOVE_SLOT / 2}" y2="${door.groove + GROOVE_SLOT / 2}" stroke="#ffffff" stroke-opacity="0.22" stroke-width="0.12"/>${glass}`;
}

export function stickerOnDoorMarkup(sticker: Sticker, label: Label, door: Door): string {
  const scale = sticker.width / label.inkWidth;
  const x = (door.width - sticker.width) / 2;
  const y = stickerTop(sticker, stickerHeight(label, sticker.width));
  return `<g data-sticker="${escapeXml(sticker.id)}" fill="${escapeXml(sticker.color)}" transform="translate(${x.toFixed(4)} ${y.toFixed(4)}) scale(${scale.toFixed(6)})">${pathsMarkup(label)}</g>`;
}

// Measuring lines for the sticker being edited. They appear in the preview only, never in a download.
export function stickerGuidesMarkup(sticker: Sticker, height: number, door: Door): string {
  const x = (door.width - sticker.width) / 2;
  const y = stickerTop(sticker, height);
  const right = x + sticker.width;
  const ink = isDark(door.color) ? ["#d9bf90", "#ead8b6"] : ["#95724d", "#76542e"];
  const line = `stroke="${ink[0]}" stroke-width="0.12"`;
  // Outlined in the door colour, so a label that lands on the wall above the door still reads.
  const text = `fill="${ink[1]}" stroke="${escapeXml(door.color)}" stroke-width="0.35" paint-order="stroke" font-size="1.35" font-family="DM Sans, sans-serif"`;
  return `<g data-guides="true"><rect x="${x}" y="${y}" width="${sticker.width}" height="${height}" fill="none" ${line} stroke-dasharray="0.5 0.4"/><line x1="${x}" x2="${right}" y1="${y - 0.5}" y2="${y - 0.5}" ${line}/><line x1="${x}" x2="${x}" y1="${y - 0.85}" y2="${y - 0.15}" ${line}/><line x1="${right}" x2="${right}" y1="${y - 0.85}" y2="${y - 0.15}" ${line}/><text x="${door.width / 2}" y="${y - 1.1}" text-anchor="middle" ${text}>${formatCm(sticker.width)} cm</text><line x1="${right + 1}" x2="${right + 1}" y1="${y}" y2="${y + height}" ${line}/><text x="${right + 1.6}" y="${y + height / 2 + 0.45}" ${text}>${formatCm(height)} cm</text></g>`;
}

// Exactly the sticker's real size, as one merged vector shape with no background.
export function stickerSvg(sticker: Sticker, label: Label, weldedPath: string): string {
  const height = stickerHeight(label, sticker.width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sticker.width.toFixed(3)}cm" height="${height.toFixed(3)}cm" viewBox="0 0 ${(sticker.width * 10).toFixed(4)} ${(height * 10).toFixed(4)}"><title>${escapeXml(stickerLines(sticker.text).join(" "))}</title><path fill="${escapeXml(sticker.color)}" d="${weldedPath}"/></svg>`;
}

// Label units are millimetres at the measuring size; this converts them to millimetres at the real size.
export const stickerScale = (sticker: Sticker, label: Label) => sticker.width * 10 / label.inkWidth;

export function stickerPixels(sticker: Sticker, label: Label) {
  const pixels = (centimetres: number) => Math.max(1, Math.round(centimetres / 2.54 * PNG_DPI));
  return { width: pixels(sticker.width), height: pixels(stickerHeight(label, sticker.width)) };
}

export function stickerFilename(sticker: Sticker, index: number, label: Label, format: string): string {
  const slug = stickerLines(sticker.text).join(" ").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "words";
  return `ever-after-sticker-${index + 1}-${slug.slice(0, 40)}-${formatCm(sticker.width)}x${formatCm(stickerHeight(label, sticker.width))}cm.${format}`;
}

const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function restoreStickerProject(raw: string | null): StickerProject {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || raw === FIRST_DEFAULT) return DEFAULT_STICKER_PROJECT;
    const top = clamp(saved.door?.top, DEFAULT_DOOR.top, 5, 80);
    const door: Door = {
      width: clamp(saved.door?.width, DEFAULT_DOOR.width, Math.ceil(GLASS_WIDTH) + 2, 150), top, groove: clamp(saved.door?.groove, Math.min(DEFAULT_DOOR.groove, top), 0, top),
      color: /^#[a-f\d]{6}$/i.test(saved.door?.color ?? "") ? saved.door.color : DEFAULT_DOOR.color,
    };
    const seen = new Set<string>();
    const stickers: Sticker[] = (Array.isArray(saved.stickers) ? saved.stickers : []).slice(0, MAX_STICKERS).flatMap((value: Partial<Sticker>): Sticker[] => {
      if (typeof value?.id !== "string" || seen.has(value.id) || typeof value.text !== "string") return [];
      seen.add(value.id);
      return [{
        id: value.id, text: value.text.slice(0, 500),
        fontId: FONTS.some((font) => font.id === value.fontId) ? value.fontId as FontId : DEFAULT_STICKER.fontId,
        width: clamp(value.width, DEFAULT_STICKER.width, MIN_STICKER_CM, MAX_STICKER_CM),
        center: clamp(value.center, DEFAULT_STICKER.center, -50, 300),
        color: /^#[a-f\d]{6}$/i.test(value.color ?? "") ? value.color! : DEFAULT_STICKER.color,
      }];
    });
    return { stickers: stickers.length ? stickers : DEFAULT_STICKERS, door };
  } catch { return DEFAULT_STICKER_PROJECT; }
}
