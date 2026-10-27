import type { Font } from "fontkit";
import { MM_PER_POINT, escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, FONTS, MAX_GUESTS, parseNames, type FontId, type Table } from "./project";

// The supplied artwork: 18.5 × 26 cm at 300 DPI.
export const PAGE = { width: 185, height: 260 } as const;
export const PAGE_PIXELS = { width: 2185, height: 3071 } as const;
export const TABLE_PAGE_STORAGE_KEY = "ever-after-table-pages-v1";
export type TablePageSettings = { headingFontId: FontId; nameFontId: FontId; headingSize: number; nameSize: number; lineSpacing: number; color: string; matchSizes: boolean };
export const DEFAULT_TABLE_PAGE_SETTINGS: TablePageSettings = { headingFontId: "heirloom", nameFontId: "heirloom", headingSize: 72, nameSize: 30, lineSpacing: 1.4, color: "#24211e", matchSizes: true };
export type PlacedLine = { label: Label; x: number; y: number; scale: number };
export type TablePage = { tableId: string; heading: string; lines: PlacedLine[]; guests: number; scale: number; columns: 1 | 2; nameSize: number; headingSize: number };
export type TablePageLayout = { pages: TablePage[]; errors: string[] };

// Clear lettering bounds (mm) for each 1 mm row of the artwork, kept 6 mm away from the
// ink wash (top left), the botanicals (bottom right) and inside the gold frame.
// Rows where left equals right are not available.
const CLEAR_LEFT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,98,98,98,98,98,98,98,89,89,89,88,88,88,87,87,83,75,75,71,71,69,69,69,69,69,69,56,56,56,56,56,54,54,54,54,54,54,54,54,54,54,51,51,51,51,48,47,47,43,42,42,41,40,35,34,31,31,31,31,28,26,26,26,26,23,22,22,22,22,19,19,19,19,18,18,18,18,18,18,18,18,17,17,16,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const CLEAR_RIGHT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,98,98,98,98,98,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,154,154,154,154,154,154,154,154,154,154,154,154,154,154,154,154,141,141,141,141,141,141,141,141,141,141,141,141,141,141,142,142,143,143,143,143,143,143,143,128,128,128,128,128,128,128,128,128,128,128,128,128,128,129,130,131,132,132,133,133,133,134,134,128,127,126,126,126,126,126,126,117,117,117,116,116,116,116,116,116,116,116,116,116,116,116,116,116,117,121,116,116,116,116,116,116,116,116,116,116,116,116,116,116,117,116,116,115,112,112,112,111,110,110,109,108,108,107,105,105,104,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

const PREFERRED_CENTRE = { x: 92.5, y: 128 };
const MIN_SCALE = 0.1;
type Item = { label: Label; x0: number; x1: number; y0: number; y1: number };
type Block = { items: Item[]; height: number; columns: 1 | 2 };

export function tableHeading(number: string): string {
  const value = number.trim();
  return /^\d+$/.test(value) ? `Table ${value}` : value;
}

// Positions are at scale 1, relative to the centre axis and the top of the lettering block.
function arrange(heading: Label, names: Label[], settings: TablePageSettings, columns: 1 | 2): Block {
  const pitch = settings.nameSize * MM_PER_POINT * settings.lineSpacing;
  const ascent = (label: Label) => label.paths[0]?.y ?? 0;
  const items: Item[] = [{ label: heading, x0: -heading.inkWidth / 2, x1: heading.inkWidth / 2, y0: -ascent(heading), y1: heading.inkHeight - ascent(heading) }];
  const firstBaseline = items[0].y1 + pitch * 1.1;
  const rows = columns === 1 ? names.length : Math.ceil(names.length / 2);
  const columnWidth = Math.max(0, ...names.map((label) => label.inkWidth));
  const gutter = settings.nameSize * MM_PER_POINT * 1.2;
  names.forEach((label, index) => {
    const column = columns === 1 ? 0 : index < rows ? -1 : 1;
    const centre = column * (columnWidth + gutter) / 2;
    const baseline = firstBaseline + (index % rows) * pitch;
    items.push({ label, x0: centre - label.inkWidth / 2, x1: centre + label.inkWidth / 2, y0: baseline - ascent(label), y1: baseline + label.inkHeight - ascent(label) });
  });
  const top = Math.min(...items.map((item) => item.y0));
  for (const item of items) { item.y0 -= top; item.y1 -= top; }
  return { items, height: Math.max(...items.map((item) => item.y1)), columns };
}

function fits(block: Block, scale: number, cx: number, top: number): boolean {
  for (const item of block.items) {
    const left = cx + item.x0 * scale;
    const right = cx + item.x1 * scale;
    for (let row = Math.floor(top + item.y0 * scale); row <= Math.ceil(top + item.y1 * scale); row++) {
      if (row < 0 || row >= PAGE.height || left < CLEAR_LEFT[row] || right > CLEAR_RIGHT[row]) return false;
    }
  }
  return true;
}

// The best position at this scale: the block centre nearest the open middle of the artwork.
function position(block: Block, scale: number): { cx: number; top: number } | null {
  let best: { cx: number; top: number; distance: number } | null = null;
  for (let cx = 56; cx <= 112; cx += 1) {
    for (let top = 0; top + block.height * scale < PAGE.height; top += 1) {
      const distance = (cx - PREFERRED_CENTRE.x) ** 2 + (top + block.height * scale / 2 - PREFERRED_CENTRE.y) ** 2;
      if ((!best || distance < best.distance) && fits(block, scale, cx, top)) best = { cx, top, distance };
    }
  }
  return best;
}

function largestScale(block: Block): number {
  if (position(block, 1)) return 1;
  let low = 0; let high = 1;
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2;
    if (position(block, middle)) low = middle; else high = middle;
  }
  return low;
}

export function createTablePages(nameFont: Font, headingFont: Font, tables: Table[], settings: TablePageSettings): TablePageLayout {
  const errors: string[] = [];
  const result: TablePageLayout = { pages: [], errors };
  const populated = tables.map((table) => ({ table, names: parseNames(table.names) })).filter(({ names }) => names.length);
  if (populated.reduce((count, { names }) => count + names.length, 0) > MAX_GUESTS) { errors.push(`Please keep the project to ${MAX_GUESTS} guests or fewer.`); return result; }
  if (populated.some(({ table }) => !table.number.trim())) errors.push("Give every table with guests a number or name.");
  const headings = populated.map(({ table }) => tableHeading(table.number).toLowerCase()).filter(Boolean);
  if (new Set(headings).size < headings.length) errors.push("Two tables have the same number. Give each table its own number or name.");
  const missing = new Set<string>();
  for (const { table, names } of populated) {
    for (const character of tableHeading(table.number)) if (!/\s/.test(character) && !headingFont.hasGlyphForCodePoint(character.codePointAt(0)!)) missing.add(character);
    for (const character of names.join("").replaceAll("|", "")) if (!/\s/.test(character) && !nameFont.hasGlyphForCodePoint(character.codePointAt(0)!)) missing.add(character);
  }
  if (missing.size) errors.push(`This font is missing these characters: ${[...missing].join(" ")}. Try another font or edit the names.`);
  if (errors.length) return result;
  const base = { ...DEFAULT_SETTINGS, gap: 0, nameStyle: "single" as const };
  const blocks = populated.map(({ table, names }) => {
    const heading = measureLabel(headingFont, tableHeading(table.number), 0, { ...base, fontSize: settings.headingSize });
    const labels = names.map((name, index) => measureLabel(nameFont, name, index + 1, { ...base, fontSize: settings.nameSize }));
    const single = arrange(heading, labels, settings, 1);
    const singleScale = largestScale(single);
    // Long lists switch to two columns only when that prints noticeably larger.
    if (labels.length < 8 || singleScale >= 1) return { table, block: single, scale: singleScale };
    const double = arrange(heading, labels, settings, 2);
    const doubleScale = largestScale(double);
    return doubleScale > singleScale * 1.1 ? { table, block: double, scale: doubleScale } : { table, block: single, scale: singleScale };
  });
  const shared = Math.min(...blocks.map(({ scale }) => scale));
  for (const { table, block, scale: own } of blocks) {
    const scale = settings.matchSizes ? shared : own;
    const placed = scale >= MIN_SCALE ? position(block, scale) : null;
    if (!placed) { errors.push(`${tableHeading(table.number)} has too many guests to fit on one page. Split it across two tables or use a smaller font.`); continue; }
    result.pages.push({
      tableId: table.id, heading: tableHeading(table.number), guests: block.items.length - 1, scale, columns: block.columns,
      nameSize: Math.floor(settings.nameSize * scale * 10) / 10, headingSize: Math.floor(settings.headingSize * scale * 10) / 10,
      lines: block.items.map((item) => ({ label: item.label, scale, x: placed.cx + item.x0 * scale, y: placed.top + item.y0 * scale })),
    });
  }
  if (errors.length) result.pages = [];
  return result;
}

export function tablePageSvg(page: TablePage, artwork: string, color: string): string {
  const lines = page.lines.map((line) => `<g data-name="${escapeXml(line.label.name.split("|").map((part) => part.trim()).filter(Boolean).join(" "))}" transform="translate(${line.x.toFixed(4)} ${line.y.toFixed(4)}) scale(${line.scale.toFixed(5)})">${line.label.paths.map((path) => `<path transform="translate(${path.x.toFixed(4)} ${path.y.toFixed(4)})" d="${path.d}"/>`).join("")}</g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.width}mm" height="${PAGE.height}mm" viewBox="0 0 ${PAGE.width} ${PAGE.height}"><title>${escapeXml(page.heading)} — Ever After</title><image href="${escapeXml(artwork)}" width="${PAGE.width}" height="${PAGE.height}" preserveAspectRatio="none"/><g fill="${escapeXml(color)}">${lines}</g></svg>`;
}

const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function restoreTablePageSettings(raw: string | null): TablePageSettings {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value) return DEFAULT_TABLE_PAGE_SETTINGS;
    const font = (id: unknown, fallback: FontId) => FONTS.some((option) => option.id === id) ? id as FontId : fallback;
    return {
      headingFontId: font(value.headingFontId, DEFAULT_TABLE_PAGE_SETTINGS.headingFontId),
      nameFontId: font(value.nameFontId, DEFAULT_TABLE_PAGE_SETTINGS.nameFontId),
      headingSize: clamp(value.headingSize, DEFAULT_TABLE_PAGE_SETTINGS.headingSize, 24, 120),
      nameSize: clamp(value.nameSize, DEFAULT_TABLE_PAGE_SETTINGS.nameSize, 12, 72),
      lineSpacing: clamp(value.lineSpacing, DEFAULT_TABLE_PAGE_SETTINGS.lineSpacing, 1, 2.5),
      color: /^#[a-f\d]{6}$/i.test(value.color ?? "") ? value.color : DEFAULT_TABLE_PAGE_SETTINGS.color,
      matchSizes: value.matchSizes !== false,
    };
  } catch { return DEFAULT_TABLE_PAGE_SETTINGS; }
}
