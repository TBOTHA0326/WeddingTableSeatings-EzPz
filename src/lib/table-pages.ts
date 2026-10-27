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
// Errors block printing. Warnings only flag lettering that comes close to the artwork; `fit` then
// holds the largest sizes that keep every table fully clear.
export type TablePageLayout = { pages: TablePage[]; errors: string[]; warnings: string[]; fit?: { nameSize: number; headingSize: number } };

// Clear lettering bounds (mm) for each 1 mm row of the artwork, kept 3 mm away from the
// ink wash (top left), the botanicals (bottom right) and inside the gold frame.
// Rows where left equals right are not available.
const CLEAR_LEFT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,95,95,95,89,89,85,84,84,84,83,83,79,76,72,72,72,72,72,70,70,70,70,70,70,50,50,49,49,49,50,50,50,50,50,50,50,50,48,48,47,47,44,43,43,39,39,38,38,36,33,33,28,27,27,27,25,22,22,22,22,20,19,19,19,19,16,16,16,15,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const CLEAR_RIGHT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,95,95,95,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,171,162,162,162,162,162,162,162,162,162,162,161,161,161,161,161,161,161,161,161,161,161,163,163,163,157,157,157,157,157,157,157,157,157,157,158,158,159,159,159,159,159,159,160,156,156,156,156,156,156,156,156,156,157,157,157,150,150,150,150,150,150,150,151,130,130,130,130,130,130,130,132,133,134,134,135,135,136,136,137,137,137,138,138,139,139,140,140,131,130,129,129,129,129,129,129,120,119,119,119,119,119,119,119,119,119,119,124,124,124,123,123,123,123,119,119,119,119,119,119,119,119,119,124,123,123,122,121,120,120,119,118,118,115,114,114,114,113,113,112,111,110,110,108,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

const CLEAR_MARGIN = 3;
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

// Room (mm) between the lettering and the clear area's edge; negative when it reaches into the margin.
function clearance(block: Block, top: number): number {
  let room = Infinity;
  for (const item of block.items) {
    const left = AXIS + item.x0;
    const right = AXIS + item.x1;
    for (let row = Math.floor(top + item.y0); row <= Math.ceil(top + item.y1); row++) {
      if (row < 0 || row >= PAGE.height || CLEAR_LEFT[row] === CLEAR_RIGHT[row]) return -Infinity;
      room = Math.min(room, left - CLEAR_LEFT[row], CLEAR_RIGHT[row] - right);
    }
  }
  return room;
}

// Every table uses the same column count, and all share the heading height closest to the open middle.
function arrangeAll(measured: Measured[], nameFont: Font, settings: TablePageSettings, nameScale: number, headingScale: number, columns: 1 | 2) {
  const blocks = measured.map((table) => arrange(table, nameFont, settings, nameScale, headingScale, table.names.length > 1 ? columns : 1));
  const tallest = Math.max(...blocks.map((block) => block.height));
  return { blocks, centred: PREFERRED_CENTRE_Y - tallest / 2 };
}

// The heading height nearest the middle where everything is clear, or failing that, the one with the most room.
function placeAll(measured: Measured[], nameFont: Font, settings: TablePageSettings, nameScale: number, headingScale: number, columns: 1 | 2): { top: number; blocks: Block[]; room: number[] } {
  const { blocks, centred } = arrangeAll(measured, nameFont, settings, nameScale, headingScale, columns);
  const tops = Array.from({ length: PAGE.height }, (_, top) => top).sort((a, b) => Math.abs(a - centred) - Math.abs(b - centred));
  let best: { top: number; blocks: Block[]; room: number[] } | null = null;
  for (const top of tops) {
    const room = blocks.map((block) => clearance(block, top));
    if (Math.min(...room) >= 0) return { top, blocks, room };
    if (!best || Math.min(...room) > Math.min(...best.room)) best = { top, blocks, room };
  }
  return best!;
}

const clear = (placement: { room: number[] }) => Math.min(...placement.room) >= 0;

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
  const result: TablePageLayout = { pages: [], errors, warnings: [] };
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
  const placed = place(1, 1);
  if (!clear(placed)) {
    const close = measured.filter((_, index) => placed.room[index] < 0).map(({ table }) => tableHeading(table.number));
    result.warnings.push(`On ${close.join(", ")}, some lettering comes within ${CLEAR_MARGIN} mm of the artwork. If the preview looks right to you, it’s fine to print.`);
    // Prefer shrinking only the names; shrink the heading too only when it is the problem.
    const names = largestScale((scale) => clear(place(scale, 1)));
    const both = names * settings.nameSize >= 12 ? 1 : largestScale((scale) => clear(place(scale, scale)));
    const fit = { nameSize: Math.floor(settings.nameSize * (both < 1 ? both : names) * 2) / 2, headingSize: Math.floor(settings.headingSize * both * 2) / 2 };
    if (fit.nameSize >= 12 && fit.headingSize >= 24) result.fit = fit;
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
