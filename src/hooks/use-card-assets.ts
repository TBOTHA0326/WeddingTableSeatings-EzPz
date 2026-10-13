"use client";

import { useCallback, useEffect, useState } from "react";
import type { Font } from "fontkit";
import { parseFont } from "@/lib/fonts";
import { FONTS } from "@/lib/project";
import type { CardSettings } from "@/lib/seating-cards";

type SavedFont = { name: string; bytes: ArrayBuffer };
function fontDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ever-after-card-assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("assets");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Font storage is unavailable in this browser."));
  });
}
async function storedFont(value?: SavedFont): Promise<SavedFont | undefined> {
  const db = await fontDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("assets", value ? "readwrite" : "readonly");
      const request = value ? transaction.objectStore("assets").put(value, "font") : transaction.objectStore("assets").get("font");
      transaction.oncomplete = () => resolve(value ?? request.result);
      transaction.onerror = () => reject(new Error("Your font could not be saved on this device."));
      transaction.onabort = () => reject(new Error("Your font could not be saved on this device."));
    });
  } finally { db.close(); }
}
export function useCardAssets(fontId: CardSettings["fontId"]) {
  const [artwork, setArtwork] = useState("");
  const [artError, setArtError] = useState("");
  const [loaded, setLoaded] = useState<{ id: CardSettings["fontId"]; font?: Font; name?: string; error?: string }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/ActualCardArtwork.jpeg").then((response) => {
      if (!response.ok) throw new Error("The card artwork could not be loaded. Please try again.");
      return response.blob();
    }).then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The card artwork could not be read."));
      reader.readAsDataURL(blob);
    })).then((value) => { if (active) setArtwork(value); }).catch((error) => { if (active) setArtError(error.message); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (fontId === "custom") {
        const saved = await storedFont();
        if (!saved) throw new Error("Import your font file to use custom lettering.");
        return { font: parseFont(new Uint8Array(saved.bytes)), name: saved.name };
      }
      const chosen = FONTS.find((font) => font.id === fontId)!;
      const response = await fetch(chosen.file);
      if (!response.ok) throw new Error("Your font could not be loaded. Please try again.");
      return { font: parseFont(new Uint8Array(await response.arrayBuffer())), name: chosen.name };
    };
    load().then((value) => { if (active) setLoaded({ id: fontId, ...value }); })
      .catch((error) => { if (active) setLoaded({ id: fontId, error: error instanceof Error ? error.message : "This font could not be read." }); });
    return () => { active = false; };
  }, [fontId, revision]);
  const importFont = useCallback(async (file: File) => {
    if (!/\.(ttf|otf|woff|woff2)$/i.test(file.name) || file.size > 2_000_000) throw new Error("Choose a TTF, OTF, WOFF or WOFF2 font smaller than 2 MB.");
    const bytes = await file.arrayBuffer();
    const font = parseFont(new Uint8Array(bytes));
    // Exercise glyph outlines before persisting a font (some preview fonts omit them).
    const run = font.layout("Tiaan Botha");
    if (!run.glyphs.some((glyph) => glyph.path.commands.length)) throw new Error("This font does not contain printable outlines. Please import the full font file.");
    await storedFont({ name: font.familyName || file.name, bytes });
    setRevision((value) => value + 1);
  }, []);
  const current = loaded?.id === fontId ? loaded : undefined;
  return { artwork, font: current?.font, fontName: current?.name, error: artError || current?.error, importFont, retry: () => { setArtError(""); setRevision((value) => value + 1); } };
}
