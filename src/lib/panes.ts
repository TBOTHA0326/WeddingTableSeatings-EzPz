import type { Font } from "fontkit";
import { MM_PER_POINT, measureLabel, type Label } from "./layout";
import { parseNames, type Settings, type Table } from "./project";

export const PANE_PADDING = 15;
export type Pane = { tableId: string; number: string; labels: Label[]; width: number; height: number; fits: boolean; suggestedSize: number; suggestedHeadingSize: number; contentWidth: number; contentHeight: number };

export function createPanes(font: Font, headingFont: Font, tables: Table[], settings: Settings): Pane[] {
  const width = settings.paneWidth * 10;
  const height = settings.paneHeight * 10;
  const availableWidth = width - 2 * PANE_PADDING;
  const availableHeight = height - 2 * PANE_PADDING;
  return tables.map((table) => {
    const names = parseNames(table.names);
    const labels = names.length ? [`Table ${table.number.trim() || "?"}`, ...names].map((name, index) => measureLabel(index === 0 ? headingFont : font, name, index, { ...settings, fontSize: index === 0 ? settings.headingSize : settings.fontSize, nameStyle: index === 0 ? "single" : settings.nameStyle, gap: 0 })) : [];
    const headingGap = settings.fontSize * MM_PER_POINT * 1.2;
    const fixedGap = Math.max(0, names.length - 1) * settings.paneSpacing;
    const inkHeight = labels.reduce((total, label) => total + label.inkHeight, 0);
    const contentHeight = inkHeight + (names.length ? headingGap : 0) + fixedGap;
    const contentWidth = Math.max(0, ...labels.map((label) => label.width));
    const ratio = Math.min(availableWidth / (contentWidth || 1), (availableHeight - fixedGap) / (inkHeight + headingGap || 1));
    let top = (height - contentHeight) / 2;
    const positioned = labels.map((label, index) => {
      const placed = { ...label, x: (width - label.width) / 2, y: top };
      top += label.height + (index === 0 ? headingGap : settings.paneSpacing);
      return placed;
    });
    return { tableId: table.id, number: table.number, labels: positioned, width, height, fits: contentWidth <= availableWidth && contentHeight <= availableHeight, suggestedSize: Math.max(0, Math.floor(settings.fontSize * ratio * 10) / 10), suggestedHeadingSize: Math.max(0, Math.floor(settings.headingSize * ratio * 10) / 10), contentWidth, contentHeight };
  });
}
