"use client";

import { useEffect, useMemo, useState } from "react";
import type { Font } from "fontkit";
import { FONTS, MAX_GUESTS, parseNames, type FontId, type Settings, type Table } from "@/lib/project";
import { parseFont } from "@/lib/fonts";
import { createPanes } from "@/lib/panes";
import { createLayout, type Layout, type LabelOverride } from "@/lib/layout";

const cache = new Map<FontId, Promise<Font>>();
function loadFont(id: FontId): Promise<Font> {
  if (!cache.has(id)) {
    const file = FONTS.find((font) => font.id === id)!.file;
    cache.set(id, fetch(file).then((response) => {
      if (!response.ok) throw new Error("Your font could not be loaded. Please try again.");
      return response.arrayBuffer();
    }).then((data) => parseFont(new Uint8Array(data))).catch((error) => { cache.delete(id); throw error; }));
  }
  return cache.get(id)!;
}

export function useLettering(tables: Table[], settings: Settings) {
  const [loaded, setLoaded] = useState<{ key: string; font?: Font; headingFont?: Font; error?: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const key = `${settings.fontId}:${settings.headingFontId}`;
    Promise.all([loadFont(settings.fontId), loadFont(settings.headingFontId)]).then(([font, headingFont]) => { if (active) setLoaded({ key, font, headingFont }); })
      .catch((error) => { if (active) setLoaded({ key, error: error instanceof Error ? error.message : "Please try another font." }); });
    return () => { active = false; };
  }, [settings.fontId, settings.headingFontId, retry]);
  const names = useMemo(() => tables.flatMap((table) => parseNames(table.names)), [tables]);
  const printedNames = useMemo(() => tables.flatMap((table) => {
    const guests = parseNames(table.names);
    return guests.length ? [`Table ${table.number.trim() || "?"}`, ...guests] : [];
  }), [tables]);
  const key = `${settings.fontId}:${settings.headingFontId}`;
  const font = loaded?.key === key ? loaded.font : undefined;
  const headingFont = loaded?.key === key ? loaded.headingFont : undefined;
  const error = loaded?.key === key ? loaded.error : undefined;
  const layout = useMemo<Layout>(() => {
    const empty: Layout = { pages: [], errors: [], unsupported: [], longestWidth: 0, maxHeight: 0, suggestedSize: settings.fontSize, count: names.length };
    if (names.length > MAX_GUESTS) return { ...empty, errors: [`Please keep each project to ${MAX_GUESTS} guests or fewer.`] };
    if (!font || !headingFont) return empty;
    const overrides = new Map<number, LabelOverride>();
    let index = 0;
    tables.forEach((table) => {
      const guests = parseNames(table.names);
      if (guests.length) { overrides.set(index, { font: headingFont, fontSize: settings.headingSize, nameStyle: "single" }); index += guests.length + 1; }
    });
    try { return createLayout(font, printedNames, settings, overrides); }
    catch { return { ...empty, errors: ["This font could not shape one of the names. Please try a different font."] }; }
  }, [font, headingFont, names.length, printedNames, settings, tables]);
  const panes = useMemo(() => {
    if (!font || !headingFont || names.length > 1000 || layout.unsupported.length) return [];
    try { return createPanes(font, headingFont, tables, settings); } catch { return []; }
  }, [font, headingFont, layout.unsupported.length, names.length, settings, tables]);
  return { layout, panes, names, loading: !font && !error, fontError: error, retryFont: () => setRetry((value) => value + 1) };
}
