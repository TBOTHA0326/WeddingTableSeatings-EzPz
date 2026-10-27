import type { Font } from "fontkit";
import { MM_PER_POINT, escapeXml, measureLabel, type Label } from "./layout";
import { DEFAULT_SETTINGS, FONTS, MAX_GUESTS, parseNames, type FontId, type Table } from "./project";

// The supplied artwork: 18.5 × 26 cm at 300 DPI.
export const PAGE = { width: 185, height: 260 } as const;
export const PAGE_PIXELS = { width: 2185, height: 3071 } as const;
export const TABLE_PAGE_STORAGE_KEY = "ever-after-table-pages-v1";
export type TablePageSettings = { headingFontId: FontId; nameFontId: FontId; headingSize: number; nameSize: number; lineSpacing: number; headingGap: number; columns: 1 | 2; color: string };
export const DEFAULT_TABLE_PAGE_SETTINGS: TablePageSettings = { headingFontId: "heirloom", nameFontId: "heirloom", headingSize: 72, nameSize: 20, lineSpacing: 1.4, headingGap: 14, columns: 1, color: "#24211e" };
export type PlacedLine = { label: Label; x: number; y: number; scale: number };
export type TablePage = { tableId: string; heading: string; lines: PlacedLine[]; guests: number; columns: 1 | 2 };
// When the chosen sizes do not fit, `fit` holds the largest sizes that fit every table, and the
// pages are still laid out (overlapping the artwork) so the preview shows the problem.
export type TablePageLayout = { pages: TablePage[]; errors: string[]; fit?: { nameSize: number; headingSize: number } };

// Clear lettering bounds (mm) for each 1 mm row of the artwork, kept 6 mm away from the
// ink wash (top left), the botanicals (bottom right) and inside the gold frame.
// Rows where left equals right are not available.
const CLEAR_LEFT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,98,98,98,98,98,98,98,89,89,89,88,88,88,87,87,83,75,75,71,71,69,69,69,69,69,69,56,56,56,56,56,54,54,54,54,54,54,54,54,54,54,51,51,51,51,48,47,47,43,42,42,41,40,35,34,31,31,31,31,28,26,26,26,26,23,22,22,22,22,19,19,19,19,18,18,18,18,18,18,18,18,17,17,16,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const CLEAR_RIGHT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,98,98,98,98,98,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,159,154,154,154,154,154,154,154,154,154,154,154,154,154,154,154,154,141,141,141,141,141,141,141,141,141,141,141,141,141,141,142,142,143,143,143,143,143,143,143,128,128,128,128,128,128,128,128,128,128,128,128,128,128,129,130,131,132,132,133,133,133,134,134,128,127,126,126,126,126,126,126,117,117,117,116,116,116,116,116,116,116,116,116,116,116,116,116,116,117,121,116,116,116,116,116,116,116,116,116,116,116,116,116,116,117,116,116,115,112,112,112,111,110,110,109,108,108,107,105,105,104,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// Every page shares one centre line and one heading height, so the panes match.
const AXIS = PAGE.width / 2;
const PREFERRED_CENTRE_Y = 128;
type Item = { label: Label; scale: number; x0: number; x1: number; y0: number; y1: number };
type Block = { items: Item[]; height: number; columns: 1 | 2 };
type Measured = { table: Table; heading: Label; names: Label[] };

export function tableHeading(number: string): string {
  const value = number.trim();
  return /^\d+$/.test(value) ? `Table ${value}` : value;
}

// Extents in mm, relative to the centre line and the top of the heading.
function arrange({ heading, names }: Measured, nameFont: Font, settings: TablePageSettings, nameScale: number, headingScale: number, columns: 1 | 2): Block {
  const size = settings.nameSize * MM_PER_POINT * nameScale;
  const pitch = size * settings.lineSpacing;
  const capHeight = (nameFont.capHeight || nameFont.ascent * 0.7) / nameFont.unitsPerEm * size;
  const headingWidth = heading.inkWidth * headingScale;
  const items: Item[] = [{ label: heading, scale: headingScale, x0: -headingWidth / 2, x1: headingWidth / 2, y0: 0, y1: heading.inkHeight * headingScale }];
  // The heading gap is measured from the bottom of the heading to the top of a capital letter.
  const firstBaseline = items[0].y1 + settings.headingGap + capHeight;
  const rows = columns === 1 ? names.length : Math.ceil(names.length / 2);
  const columnWidth = Math.max(0, ...names.map((label) => label.inkWidth)) * nameScale;
  const gutter = size * 1.2;
  names.forEach((label, index) => {
    const centre = columns === 1 ? 0 : (index < rows ? -1 : 1) * (columnWidth + gutter) / 2;
    const top = firstBaseline + (index % rows) * pitch - (label.paths[0]?.y ?? 0) * nameScale;
    items.push({ label, scale: nameScale, x0: centre - label.inkWidth * nameScale / 2, x1: centre + label.inkWidth * nameScale / 2, y0: top, y1: top + label.inkHeight * nameScale });
  });
  const offset = Math.min(...items.map((item) => item.y0));
  for (const item of items) { item.y0 -= offset; item.y1 -= offset; }
  return { items, height: Math.max(...items.map((item) => item.y1)), columns };
}

function fits(block: Block, top: number): boolean {
  for (const item of block.items) {
    const left = AXIS + item.x0;
    const right = AXIS + item.x1;
    for (let row = Math.floor(top + item.y0); row <= Math.ceil(top + item.y1); row++) {
      if (row < 0 || row >= PAGE.height || left < CLEAR_LEFT[row] || right > CLEAR_RIGHT[row]) return false;
    }
  }
  return true;
}

// Every table uses the same column count, and all share the heading height closest to the open middle.
function arrangeAll(measured: Measured[], nameFont: Font, settings: TablePageSettings, nameScale: number, headingScale: number, columns: 1 | 2) {
  const blocks = measured.map((table) => arrange(table, nameFont, settings, nameScale, headingScale, table.names.length > 1 ? columns : 1));
  const tallest = Math.max(...blocks.map((block) => block.height));
  return { blocks, centred: PREFERRED_CENTRE_Y - tallest / 2 };
}

function placeAll(measured: Measured[], nameFont: Font, settings: TablePageSettings, nameScale: number, headingScale: number, columns: 1 | 2): { top: number; blocks: Block[] } | null {
  const { blocks, centred } = arrangeAll(measured, nameFont, settings, nameScale, headingScale, columns);
  const tops = Array.from({ length: PAGE.height }, (_, top) => top).sort((a, b) => Math.abs(a - centred) - Math.abs(b - centred));
  const top = tops.find((candidate) => blocks.every((block) => fits(block, candidate)));
  return top === undefined ? null : { top, blocks };
}

function largestScale(test: (scale: number) => boolean): number {
  let low = 0; let high = 1;
  for (let step = 0; step < 14; step++) {
    const middle = (low + high) / 2;
    if (test(middle)) low = middle; else high = middle;
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
  if (errors.length || !populated.length) return result;
  const base = { ...DEFAULT_SETTINGS, gap: 0, nameStyle: "single" as const };
  const measured: Measured[] = populated.map(({ table, names }) => ({
    table,
    heading: measureLabel(headingFont, tableHeading(table.number), 0, { ...base, fontSize: settings.headingSize }),
    names: names.map((name, index) => measureLabel(nameFont, name, index + 1, { ...base, fontSize: settings.nameSize })),
  }));
  const place = (nameScale: number, headingScale: number, tables = measured) => placeAll(tables, nameFont, settings, nameScale, headingScale, settings.columns);
  let placed = place(1, 1);
  if (!placed) {
    const crowded = measured.filter((table) => !place(1, 1, [table])).map(({ table }) => tableHeading(table.number));
    errors.push(crowded.length ? `${crowded.join(", ")} ${crowded.length === 1 ? "doesn’t" : "don’t"} fit at these sizes. Make the lettering smaller${settings.columns === 1 ? ", tighten the spacing, or try two columns." : " or tighten the spacing."}` : "The tables can’t share one heading position at these sizes. Make the lettering a little smaller.");
    // Prefer shrinking only the names; shrink the heading too only when it is the problem.
    const names = largestScale((scale) => !!place(scale, 1));
    const both = names * settings.nameSize >= 12 ? 1 : largestScale((scale) => !!place(scale, scale));
    const fit = { nameSize: Math.floor(settings.nameSize * (both < 1 ? both : names) * 2) / 2, headingSize: Math.floor(settings.headingSize * both * 2) / 2 };
    if (fit.nameSize >= 12 && fit.headingSize >= 24) result.fit = fit;
    const { blocks, centred } = arrangeAll(measured, nameFont, settings, 1, 1, settings.columns);
    placed = { blocks, top: Math.max(0, centred) };
  }
  result.pages = measured.map(({ table }, index) => {
    const block = placed.blocks[index];
    return {
      tableId: table.id, heading: tableHeading(table.number), guests: block.items.length - 1, columns: block.columns,
      lines: block.items.map((item) => ({ label: item.label, scale: item.scale, x: AXIS + item.x0, y: placed.top + item.y0 })),
    };
  });
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
      headingGap: clamp(value.headingGap, DEFAULT_TABLE_PAGE_SETTINGS.headingGap, 0, 40),
      columns: value.columns === 2 ? 2 : 1,
      color: /^#[a-f\d]{6}$/i.test(value.color ?? "") ? value.color : DEFAULT_TABLE_PAGE_SETTINGS.color,
    };
  } catch { return DEFAULT_TABLE_PAGE_SETTINGS; }
}
