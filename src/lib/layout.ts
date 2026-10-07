import type { Font } from "fontkit";
import { MAX_GUESTS, type Settings } from "./project";

export const A4 = { width: 210, height: 297 } as const;
export const MM_PER_POINT = 25.4 / 72;
type Rect = { x: number; y: number; width: number; height: number };
export type Lettering = { d: string; x: number; y: number };
export type Label = Rect & { id: number; name: string; paths: Lettering[]; inkWidth: number; inkHeight: number };
export type Sheet = { labels: Label[] };
export type Layout = {
  pages: Sheet[]; errors: string[]; unsupported: string[]; longestWidth: number;
  maxHeight: number; suggestedSize: number; count: number;
};
export type LabelOverride = { font: Font; fontSize: number; nameStyle: Settings["nameStyle"] };

function nameLines(name: string, style: Settings["nameStyle"]): string[] {
  if (name.includes("|")) {
    const parts = name.split("|").map((part) => part.trim()).filter(Boolean);
    return style === "stacked" ? parts : [parts.join(" ")];
  }
  if (style === "single") return [name];
  const space = name.lastIndexOf(" ");
  return space < 0 ? [name] : [name.slice(0, space), name.slice(space + 1)];
}

export function measureLabel(font: Font, name: string, id: number, settings: Settings): Label {
  const size = settings.fontSize * MM_PER_POINT;
  const lineGap = size * 0.3;
  const lines = nameLines(name, settings.nameStyle).map((line) => {
    const run = font.layout(line);
    const scale = size / font.unitsPerEm;
    const bounds = { x1: run.bbox.minX * scale, x2: run.bbox.maxX * scale, y1: -run.bbox.maxY * scale, y2: -run.bbox.minY * scale };
    let cursorX = 0;
    let cursorY = 0;
    const commandLetters = { moveTo: "M", lineTo: "L", quadraticCurveTo: "Q", bezierCurveTo: "C", closePath: "Z" };
    const d = run.glyphs.map((glyph, index) => {
      const position = run.positions[index];
      const path = glyph.path.transform(scale, 0, 0, -scale, (cursorX + position.xOffset) * scale, -(cursorY + position.yOffset) * scale);
      cursorX += position.xAdvance;
      cursorY += position.yAdvance;
      return path.commands.map((command) => commandLetters[command.command] + command.args.map((arg) => Number(arg.toFixed(4))).join(" ")).join("");
    }).join("");
    return { d, bounds, width: bounds.x2 - bounds.x1, height: bounds.y2 - bounds.y1 };
  });
  const inkWidth = Math.max(...lines.map((line) => line.width));
  const inkHeight = lines.reduce((sum, line) => sum + line.height, 0) + Math.max(0, lines.length - 1) * lineGap;
  let top = settings.gap / 2;
  const paths = lines.map((line) => {
    const path = { d: line.d, x: settings.gap / 2 + (inkWidth - line.width) / 2 - line.bounds.x1, y: top - line.bounds.y1 };
    top += line.height + lineGap;
    return path;
  });
  return { id, name, x: 0, y: 0, width: inkWidth + settings.gap, height: inkHeight + settings.gap, inkWidth, inkHeight, paths };
}

const contains = (a: Rect, b: Rect) => b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width + 1e-7 && b.y + b.height <= a.y + a.height + 1e-7;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width - 1e-7 && a.x + a.width > b.x + 1e-7 && a.y < b.y + b.height - 1e-7 && a.y + a.height > b.y + 1e-7;

// MaxRects: place the largest labels first, without rotating or resizing any lettering.
function compactLayout(labels: Label[], margin: number): Sheet[] {
  const pages: { labels: Label[]; free: Rect[] }[] = [];
  const newPage = () => ({ labels: [] as Label[], free: [{ x: margin, y: margin, width: A4.width - 2 * margin, height: A4.height - 2 * margin }] });
  const ordered = [...labels].sort((a, b) => b.width * b.height - a.width * a.height || a.id - b.id);
  for (const label of ordered) {
    let best: { page: number; rect: Rect; short: number; long: number } | null = null;
    for (let index = 0; index < pages.length; index++) {
      for (const rect of pages[index].free) {
        if (label.width > rect.width + 1e-7 || label.height > rect.height + 1e-7) continue;
        const short = Math.min(rect.width - label.width, rect.height - label.height);
        const long = Math.max(rect.width - label.width, rect.height - label.height);
        if (!best || short < best.short || (short === best.short && long < best.long)) best = { page: index, rect, short, long };
      }
    }
    if (!best) {
      pages.push(newPage());
      best = { page: pages.length - 1, rect: pages[pages.length - 1].free[0], short: 0, long: 0 };
    }
    const page = pages[best.page];
    const placed = { ...label, x: best.rect.x, y: best.rect.y };
    page.labels.push(placed);
    const split: Rect[] = [];
    for (const free of page.free) {
      if (!overlaps(free, placed)) { split.push(free); continue; }
      if (placed.x > free.x) split.push({ ...free, width: placed.x - free.x });
      if (placed.x + placed.width < free.x + free.width) split.push({ ...free, x: placed.x + placed.width, width: free.x + free.width - placed.x - placed.width });
      if (placed.y > free.y) split.push({ ...free, height: placed.y - free.y });
      if (placed.y + placed.height < free.y + free.height) split.push({ ...free, y: placed.y + placed.height, height: free.y + free.height - placed.y - placed.height });
    }
    page.free = split.filter((rect, index) => rect.width > 1e-7 && rect.height > 1e-7 && !split.some((other, otherIndex) => otherIndex !== index && contains(other, rect) && (!contains(rect, other) || otherIndex < index)));
  }
  return pages.map((page) => ({ labels: page.labels }));
}

function gridLayout(labels: Label[], margin: number): Sheet[] {
  if (!labels.length) return [];
  const width = Math.max(...labels.map((label) => label.width));
  const height = Math.max(...labels.map((label) => label.height));
  const columns = Math.max(1, Math.floor((A4.width - 2 * margin) / width));
  const rows = Math.max(1, Math.floor((A4.height - 2 * margin) / height));
  const capacity = columns * rows;
  const pages: Sheet[] = [];
  labels.forEach((label, index) => {
    const page = Math.floor(index / capacity);
    const slot = index % capacity;
    pages[page] ??= { labels: [] };
    pages[page].labels.push({ ...label, x: margin + (slot % columns) * width + (width - label.width) / 2, y: margin + Math.floor(slot / columns) * height + (height - label.height) / 2 });
  });
  return pages;
}

export function createLayout(font: Font, names: string[], settings: Settings, overrides: Map<number, LabelOverride> = new Map()): Layout {
  const errors: string[] = [];
  const result: Layout = { pages: [], errors, unsupported: [], longestWidth: 0, maxHeight: 0, suggestedSize: settings.fontSize, count: names.length };
  if (names.length > MAX_GUESTS + 60) { errors.push(`Please keep each project to ${MAX_GUESTS} guests or fewer.`); return result; }
  result.unsupported = [...new Set(names.flatMap((name, index) => {
    const characters = [...new Set(name.replaceAll("|", "").replace(/\s/g, ""))];
    const selectedFont = overrides.get(index)?.font ?? font;
    return characters.filter((character) => !selectedFont.hasGlyphForCodePoint(character.codePointAt(0)!));
  }))];
  if (result.unsupported.length) errors.push(`This font is missing these characters: ${result.unsupported.join(" ")}. Try another font or edit the names.`);
  const labels = names.map((name, index) => {
    const override = overrides.get(index);
    return measureLabel(override?.font ?? font, name, index, override ? { ...settings, fontSize: override.fontSize, nameStyle: override.nameStyle } : settings);
  });
  result.longestWidth = Math.max(0, ...labels.map((label) => label.inkWidth));
  result.maxHeight = Math.max(0, ...labels.map((label) => label.inkHeight));
  const availableWidth = A4.width - settings.margin * 2;
  const availableHeight = A4.height - settings.margin * 2;
  const oversized = labels.filter((label) => label.width > availableWidth + 1e-7 || label.height > availableHeight + 1e-7);
  const invalid = labels.filter((label) => !Number.isFinite(label.width) || !Number.isFinite(label.height) || !label.paths.some((path) => path.d));
  if (invalid.length) errors.push(`There is no printable lettering in: ${invalid.slice(0, 3).map((label) => label.name).join(", ")}.`);
  if (oversized.length) {
    const ratio = Math.min((availableWidth - settings.gap) / result.longestWidth, (availableHeight - settings.gap) / result.maxHeight);
    result.suggestedSize = Math.floor(settings.fontSize * ratio * 10) / 10;
    errors.push(`${oversized.length === 1 ? "A name is" : `${oversized.length} names are`} too large for A4. Reduce the shared size or use two lines.`);
  }
  if (errors.length) return result;
  const grid = gridLayout(labels, settings.margin);
  if (settings.arrangement === "grid") result.pages = grid;
  else {
    const compact = compactLayout(labels, settings.margin);
    result.pages = compact.length <= grid.length ? compact : grid;
  }
  return result;
}

export const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

export function sheetSvg(sheet: Sheet, color: string): string {
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error("Choose a valid six-digit hex colour.");
  const shapes = sheet.labels.map((label) => `<g transform="translate(${label.x.toFixed(4)} ${label.y.toFixed(4)})"><title>${escapeXml(label.name.replaceAll("|", " "))}</title>${label.paths.map((path) => `<path transform="translate(${path.x.toFixed(4)} ${path.y.toFixed(4)})" d="${path.d}"/>`).join("")}</g>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><title>Ever After — A4 name lettering</title><desc>Transparent background. Lettering converted to vector outlines. Print at 100% / actual size.</desc><g fill="${color}">${shapes}</g></svg>`;
}
