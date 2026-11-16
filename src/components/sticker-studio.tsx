"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import type { Font } from "fontkit";
import { ArrowDownToLine, Check, Heart, LoaderCircle, Plus, Scissors, Trash2, TriangleAlert } from "lucide-react";
import { loadFont } from "@/hooks/use-lettering";
import { downloadBlob, svgToPng, type ExportFormat } from "@/lib/export";
import { STORAGE_KEY, WEDDING_TABLES, restoreProject, type FontId } from "@/lib/project";
import { DEFAULT_STICKER, DEFAULT_STICKER_PROJECT, GLASS_WIDTH, MAX_STICKERS, MAX_STICKER_CM, MIN_STICKER_CM, STICKER_STORAGE_KEY, doorHeight, doorMarkup, formatCm, measureSticker, restoreStickerProject, stickerErrors, stickerFilename, stickerGuidesMarkup, stickerHeight, stickerOnDoorMarkup, stickerPixels, stickerScale, stickerSvg, stickerTop, stickerWarnings, widthForHeight, type Door, type Sticker, type StickerProject } from "@/lib/stickers";
import { ARTWORK_URL, PICTURE_PAGES, TABLE_PAGE_STORAGE_KEY, createTablePages, picturePageContent, restoreTablePageSettings, tablePageContent } from "@/lib/table-pages";
import { Bow } from "./bow";
import { FontSelect } from "./font-select";
import { COLORS } from "./studio-controls";
import { StudioNav } from "./studio-nav";

const WALL = 4;
const DOOR_COLORS = [{ name: "Black", value: "#1d1c1a" }, { name: "White", value: "#f6f3ec" }, { name: "Natural wood", value: "#a07a52" }];
const CLOSE_UP_GLASS = 11;

function useStickerProject() {
  const [project, setProject] = useState<StickerProject>(DEFAULT_STICKER_PROJECT);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setProject(restoreStickerProject(localStorage.getItem(STICKER_STORAGE_KEY))); } catch { setSaveError(true); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(project)); } catch { queueMicrotask(() => setSaveError(true)); }
  }, [project, ready]);
  return { ...project, ready, saveError, setProject };
}

function useFonts(ids: FontId[]) {
  const [fonts, setFonts] = useState<Partial<Record<FontId, Font>>>({});
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const key = [...new Set(ids)].sort().join();
  useEffect(() => {
    let active = true;
    const wanted = key.split(",") as FontId[];
    Promise.all(wanted.map((id) => loadFont(id))).then((loaded) => {
      if (!active) return;
      setFonts((current) => ({ ...current, ...Object.fromEntries(wanted.map((id, index) => [id, loaded[index]])) }));
      setError("");
    }).catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "This font could not be loaded."); });
    return () => { active = false; };
  }, [key, revision]);
  return { fonts, error, retry: () => setRevision((value) => value + 1) };
}

// The panes show what will really hang there: the saved table pages, then the picture pages.
function useDoorPanes() {
  const [panes, setPanes] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const tables = restoreProject(localStorage.getItem(STORAGE_KEY))?.tables ?? WEDDING_TABLES;
      const settings = restoreTablePageSettings(localStorage.getItem(TABLE_PAGE_STORAGE_KEY));
      const [nameFont, headingFont] = await Promise.all([loadFont(settings.nameFontId), loadFont(settings.headingFontId)]);
      const pages = createTablePages(nameFont, headingFont, tables, settings).pages.map((page) => tablePageContent(page, ARTWORK_URL, settings.color));
      if (active) setPanes([...pages, ...PICTURE_PAGES.map((picture) => picturePageContent(picture, picture.file))]);
    };
    // The door still previews with empty glass if the saved pages can't be drawn.
    load().catch(() => {});
    return () => { active = false; };
  }, []);
  return panes;
}

// Typing is free while the box has focus; only sizes within range reach the sticker.
function CmField({ id, label, value, min, max, onChange }: { id: string; label: string; value?: number; min: number; max: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return <div className="number-field"><label htmlFor={id}>{label}</label><div><input id={id} type="number" min={min} max={max} step="0.5" value={draft ?? (value === undefined ? "" : String(Math.round(value * 100) / 100))} onChange={(event) => {
    setDraft(event.target.value);
    const number = event.target.valueAsNumber;
    if (Number.isFinite(number) && number >= min && number <= max) onChange(number);
  }} onBlur={() => setDraft(null)} /><span>cm</span></div></div>;
}

function DoorView({ label, viewBox, base, overlay }: { label: string; viewBox: { x: number; y: number; width: number; height: number }; base: string; overlay: string }) {
  const box = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  return <div className="door-view" role="img" aria-label={label} style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}><svg viewBox={box} dangerouslySetInnerHTML={{ __html: base }} /><svg viewBox={box} data-testid="door-stickers" dangerouslySetInnerHTML={{ __html: overlay }} /></div>;
}

export function StickerStudio() {
  const { stickers, door, ready, saveError, setProject } = useStickerProject();
  const [activeId, setActiveId] = useState(DEFAULT_STICKER.id);
  const [format, setFormat] = useState<ExportFormat>("svg");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const { fonts, error: fontError, retry } = useFonts(stickers.map((sticker) => sticker.fontId));
  const panes = useDoorPanes();
  const active = stickers.find((sticker) => sticker.id === activeId) ?? stickers[0];

  const update = (patch: Partial<Sticker>) => setProject((current) => ({ ...current, stickers: current.stickers.map((sticker) => sticker.id === active.id ? { ...sticker, ...patch } : sticker) }));
  const updateDoor = (patch: Partial<Door>) => setProject((current) => ({ ...current, door: { ...current.door, ...patch } }));
  const addSticker = () => {
    const id = crypto.randomUUID();
    // The first sticker sits below the groove, so a new one starts in the space above it.
    setProject((current) => ({ ...current, stickers: [...current.stickers, { ...active, id, text: "Your words", width: Math.min(active.width, 24), center: current.door.groove / 2 }] }));
    setActiveId(id);
  };
  const removeSticker = () => {
    const remaining = stickers.filter((sticker) => sticker.id !== active.id);
    setProject((current) => ({ ...current, stickers: remaining }));
    setActiveId(remaining[0].id);
  };

  const measured = useMemo(() => stickers.flatMap((sticker) => {
    const font = fonts[sticker.fontId];
    if (!font) return [];
    const errors = stickerErrors(font, sticker);
    const label = errors.length ? null : measureSticker(font, sticker.text);
    return [{ sticker, errors, label, height: label ? stickerHeight(label, sticker.width) : 0 }];
  }), [stickers, fonts]);
  const printable = measured.flatMap(({ sticker, label, height }) => label ? [{ sticker, label, height }] : []);
  const current = printable.find((item) => item.sticker.id === active.id);
  const activeFontReady = !!fonts[active.fontId];
  const loading = !ready || measured.length < stickers.length && !fontError;
  const errors = [...new Set([...measured.flatMap((item) => item.errors), ...(fontError ? [fontError] : []), ...(actionError ? [actionError] : [])])];
  const warnings = printable.flatMap(({ sticker, height }) => stickerWarnings(sticker, height, door));
  const canExport = !loading && !errors.length && printable.length > 0 && !busy;

  const height = doorHeight(door);
  const wholeDoor = { x: -WALL, y: -WALL, width: door.width + WALL * 2, height: height + WALL * 2 };
  const closeUp = { x: -WALL, y: -WALL, width: door.width + WALL * 2, height: door.top + CLOSE_UP_GLASS + WALL };
  const wholeBase = useMemo(() => doorMarkup(door, panes), [door, panes]);
  const closeUpBase = useMemo(() => doorMarkup(door, panes, 1), [door, panes]);
  const stickersOnDoor = printable.map(({ sticker, label }) => stickerOnDoorMarkup(sticker, label, door)).join("");
  const guides = current ? stickerGuidesMarkup(current.sticker, current.height, door) : "";
  const sideMargin = (door.width - active.width) / 2;
  const topEdge = current ? stickerTop(current.sticker, current.height) : 0;

  const download = async (items: typeof printable) => {
    if (!canExport) return;
    setBusy(true); setActionError("");
    try {
      const { weldOutlines } = await import("@/lib/weld");
      const zip = items.length > 1 ? new JSZip() : null;
      for (const [index, { sticker, label }] of items.entries()) {
        setMessage(`Preparing sticker ${index + 1} of ${items.length}…`);
        const svg = stickerSvg(sticker, label, weldOutlines(label.paths, stickerScale(sticker, label)));
        const blob = format === "png" ? await svgToPng(svg, undefined, stickerPixels(sticker, label)) : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const filename = stickerFilename(sticker, stickers.indexOf(sticker), label, format);
        if (zip) zip.file(filename, await blob.arrayBuffer()); else downloadBlob(blob, filename);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (zip) downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `ever-after-${items.length}-vinyl-stickers-${format}.zip`);
      setMessage("Your stickers are ready for the vinyl.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Download failed. Please try again."); setMessage(""); }
    finally { setBusy(false); }
  };

  return <div className="studio-app card-studio sticker-studio">
    <header className="site-header"><Link className="brand" href="/" aria-label="Ever After home"><Bow /><span><strong>ever after<span className="brand-period">.</span></strong><small>THE WEDDING NAME STUDIO</small></span></Link><p className="header-motto">A few lovely words, cut to size.</p><span className="saved-status"><span className="save-dot" />{saveError ? "Autosave unavailable" : ready ? "Saved on this device" : "Saving your details…"}</span></header>
    <main className="studio-main"><StudioNav active="stickers" />
      <section className="studio-intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> WORDS FOR THE DOOR</p><h1>A few lovely words.<br className="mobile-break" /> <em>Cut to size.</em></h1><p>Type your words, choose any font, and set the exact size in centimetres. See them on the door before you cut.</p></div><div className="intro-decoration" aria-hidden="true"><span>made for</span><Heart size={28} strokeWidth={1} /><span>your door</span></div></section>
      <div className="workspace">
        <aside className="controls-panel card-controls" aria-label="Vinyl sticker settings">
          <div className="card-controls-body">
            <div className="section-heading"><p className="eyebrow">01 / YOUR WORDS</p><span className="count-badge">{stickers.length} {stickers.length === 1 ? "sticker" : "stickers"}</span></div><h2>Say it on the door.</h2><p className="section-description">Each sticker is its own file, at its own size.</p>
            <div className="table-selector" aria-label="Select a sticker">{stickers.map((sticker, index) => <button key={sticker.id} className={`table-chip sticker-chip ${sticker.id === active.id ? "selected" : ""}`} aria-pressed={sticker.id === active.id} onClick={() => setActiveId(sticker.id)}><b>{sticker.text.trim().split(/\r?\n/)[0] || `Sticker ${index + 1}`}</b><span>{formatCm(sticker.width)} cm</span></button>)}<button className="table-chip add-chip" aria-label="Add a sticker" onClick={addSticker} disabled={!ready || stickers.length >= MAX_STICKERS}><Plus size={15} /></button></div>
            <div className="table-editor-header guest-label"><label className="field-label" htmlFor="sticker-text">THE WORDS</label>{stickers.length > 1 && <button className="text-button subtle" onClick={removeSticker} aria-label={`Remove sticker ${active.text}`}><Trash2 size={13} />Remove</button>}</div>
            <textarea id="sticker-text" className="names-input sticker-text" value={active.text} disabled={!ready} spellCheck={false} aria-describedby="sticker-text-hint" placeholder="Find your seat" onChange={(event) => update({ text: event.target.value })} /><p className="field-hint" id="sticker-text-hint">Press Enter to put words on a new line within the same sticker.</p>
            <label className="card-field" htmlFor="sticker-font">Font</label><FontSelect id="sticker-font" className="text-input" value={active.fontId} disabled={!ready} onChange={(fontId) => { setActionError(""); update({ fontId: fontId as FontId }); }} />
            <div className="dimension-fields"><CmField key={`width-${active.id}`} id="sticker-width" label="Width" value={active.width} min={MIN_STICKER_CM} max={MAX_STICKER_CM} onChange={(width) => update({ width })} /><span className="dimension-times">×</span><CmField key={`height-${active.id}-${active.fontId}`} id="sticker-height" label="Height" value={current?.height} min={MIN_STICKER_CM / 4} max={MAX_STICKER_CM} onChange={(value) => { if (current) update({ width: Math.min(MAX_STICKER_CM, Math.max(MIN_STICKER_CM, widthForHeight(current.label, value))) }); }} /></div>
            <p className="field-hint">Width and height stay in proportion, measured to the very edges of the lettering.</p>
            <label className="card-field" htmlFor="sticker-width-slider">Quick resize <span>{formatCm(active.width)} cm wide</span></label><input id="sticker-width-slider" type="range" min="5" max={Math.max(door.width, Math.ceil(active.width))} step="0.5" value={active.width} disabled={!ready} onChange={(event) => update({ width: Number(event.target.value) })} />
            <label className="card-field" htmlFor="sticker-position">From the top of the door <span>{formatCm(topEdge)} cm</span></label><input id="sticker-position" type="range" min="0" max={door.top} step="0.5" value={Math.min(door.top, Math.max(0, topEdge))} disabled={!ready || !current} onChange={(event) => { if (current) update({ center: Number(event.target.value) + current.height / 2 }); }} />
            <span className="card-field">Vinyl colour</span>
            <div className="color-options">{COLORS.map((color) => <button key={color.value} style={{ backgroundColor: color.value }} className={`color-swatch ${active.color.toLowerCase() === color.value ? "selected" : ""}`} aria-label={`${color.name} vinyl`} aria-pressed={active.color.toLowerCase() === color.value} onClick={() => update({ color: color.value })}>{active.color.toLowerCase() === color.value && <Check size={14} color={color.value === "#ffffff" || color.value === "#c6aa7b" ? "#24211e" : "#fff"} />}</button>)}<label className="custom-color" title="Choose any colour"><Plus size={15} /><input type="color" value={active.color} aria-label="Custom vinyl colour" onChange={(event) => update({ color: event.target.value })} /></label><span className="hex-color">{active.color.toUpperCase()}</span></div>
            <div className="card-control-section"><p className="eyebrow">02 / YOUR DOOR</p><p className="field-hint">Set to your measurements. Change them here if anything differs.</p>
              <div className="dimension-fields"><CmField id="door-width" label="Door width" value={door.width} min={Math.ceil(GLASS_WIDTH) + 2} max={150} onChange={(width) => updateDoor({ width })} /></div>
              <div className="dimension-fields"><CmField id="door-top" label="Top to the glass" value={door.top} min={5} max={80} onChange={(top) => updateDoor({ top, groove: Math.min(door.groove, top) })} /><CmField id="door-groove" label="Top to the groove" value={door.groove} min={0} max={door.top} onChange={(groove) => updateDoor({ groove })} /></div>
              <span className="card-field">Door colour</span>
              <div className="color-options">{DOOR_COLORS.map((color) => <button key={color.value} style={{ backgroundColor: color.value }} className={`color-swatch ${door.color.toLowerCase() === color.value ? "selected" : ""}`} aria-label={`${color.name} door`} aria-pressed={door.color.toLowerCase() === color.value} onClick={() => updateDoor({ color: color.value })}>{door.color.toLowerCase() === color.value && <Check size={14} color={color.value === "#f6f3ec" ? "#24211e" : "#fff"} />}</button>)}<label className="custom-color" title="Choose any colour"><Plus size={15} /><input type="color" value={door.color} aria-label="Custom door colour" onChange={(event) => updateDoor({ color: event.target.value })} /></label><span className="hex-color">{door.color.toUpperCase()}</span></div>
            </div>
          </div>
          <div className="download-panel card-download-panel">
            <div className="export-formats" role="group" aria-label="Sticker download format"><button aria-pressed={format === "svg"} className={format === "svg" ? "selected" : ""} onClick={() => setFormat("svg")}>SVG <small>Vector · for cutting</small></button><button aria-pressed={format === "png"} className={format === "png" ? "selected" : ""} onClick={() => setFormat("png")}>PNG <small>Transparent · 300 DPI</small></button></div>
            <button className="primary-button download-button" disabled={!canExport} onClick={() => void download(printable)}>{busy ? <LoaderCircle size={16} className="spinning" /> : <ArrowDownToLine size={16} />}<span>{busy ? "Preparing stickers…" : `Download ${printable.length > 1 ? "all stickers" : "sticker"}`}</span></button>
            <p className="export-footnote">Files are the exact size you set, with no background.<br />Multiple stickers download together in a ZIP.</p>
          </div>
        </aside>
        <section className="preview-panel" aria-label="Vinyl sticker previews">
          <div className="preview-header"><div className="preview-tabs"><button className="selected" aria-pressed="true">On the door</button></div><span className="live-badge"><span />LIVE PREVIEW</span></div>
          <div className="preview-summary"><div><strong>{printable.length}</strong><span>{printable.length === 1 ? "sticker" : "stickers"}</span></div><span className="stat-divider" /><div><strong>{current ? `${formatCm(current.sticker.width)} × ${formatCm(current.height)}` : "—"}<small> cm</small></strong><span>this sticker</span></div><div className={`fit-badge ${errors.length || warnings.length ? "warning" : ""}`} data-testid="sticker-status">{errors.length || warnings.length ? <TriangleAlert size={14} /> : <Check size={14} />}{loading ? "Measuring your words" : errors.length ? "A little adjustment needed" : !printable.length ? "Ready for your words" : warnings.length ? "Ready to cut · check the fit" : "Ready to cut"}</div></div>
          {errors.length + warnings.length > 0 && <div className="fit-notices" role="alert">{[...errors, ...warnings].map((text) => <p key={text}><TriangleAlert size={15} /><span>{text}</span></p>)}{fontError && <button className="text-button" onClick={retry}>Try loading again</button>}{actionError && <button className="text-button" onClick={() => setActionError("")}>Dismiss</button>}</div>}
          <div className="preview-toolbar"><div><span className="preview-toolbar-label">{door.width} × {formatCm(height)} CM DOOR</span><span className="toolbar-detail">{current ? `${formatCm(sideMargin)} cm from each side · ${formatCm(topEdge)} cm from the top` : "Type some words to place them"}</span></div></div>
          <div className="preview-stage card-preview-stage sticker-door-stage" aria-busy={loading}>
            {!ready || (!activeFontReady && !fontError) ? <div className="preview-loading"><Bow /><LoaderCircle className="spinning" size={22} /><p>Making something lovely…</p></div> : <div className="sticker-door-preview">
              <div className="sticker-whole-door"><p className="preview-caption">THE WHOLE DOOR</p><DoorView label="The whole door with your stickers" viewBox={wholeDoor} base={wholeBase} overlay={stickersOnDoor} /></div>
              <div><p className="preview-caption">A CLOSER LOOK <span>· THE TOP OF THE DOOR</span></p><DoorView label="The top of the door with your stickers" viewBox={closeUp} base={closeUpBase} overlay={stickersOnDoor + guides} /><p className="door-caption-note">Drawn to scale. The dashed outline and measurements are only for this preview. The panes show your table and picture pages in order, as an illustration.</p></div>
            </div>}
          </div>
          <div className="preview-footer"><button className="text-button" disabled={!canExport || !current} onClick={() => { if (current) void download([current]); }}><ArrowDownToLine size={13} />This sticker</button></div>
          <div className="print-reminder"><span className="reminder-icon"><Scissors size={15} /></span><p><strong>Made for the cutter.</strong> SVG downloads merge overlapping letters into one clean outline, so the blade won’t slice through joined script. Cut vinyl can struggle with hairlines thinner than about 1–2 mm, so thin scripts need to be large, or choose a bolder font. Your supplier can confirm their minimum.</p></div>
        </section>
      </div>
    </main><footer className="site-footer"><span>Your words and door measurements stay on this device.</span><span>Made for a day you’ll <em>never forget.</em></span></footer>
    <div className="card-live-message" role="status" aria-live="polite">{message}</div>
  </div>;
}
