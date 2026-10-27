"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import type { Font } from "fontkit";
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Heart, LoaderCircle, Plus, Printer, TriangleAlert } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { loadFont } from "@/hooks/use-lettering";
import { FONTS, parseNames } from "@/lib/project";
import { downloadBlob, svgToPng, type ExportFormat } from "@/lib/export";
import { DEFAULT_TABLE_PAGE_SETTINGS, PAGE, PAGE_PIXELS, TABLE_PAGE_STORAGE_KEY, createTablePages, restoreTablePageSettings, tablePageSvg, type TablePage, type TablePageLayout, type TablePageSettings } from "@/lib/table-pages";
import { Bow } from "./bow";
import { COLORS } from "./studio-controls";
import { StudioNav } from "./studio-nav";
import { TableEditor } from "./table-editor";

const ARTWORK_URL = "/TablePageArtwork.jpeg";

function useTablePageSettings() {
  const [settings, setSettings] = useState(DEFAULT_TABLE_PAGE_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setSettings(restoreTablePageSettings(localStorage.getItem(TABLE_PAGE_STORAGE_KEY))); } catch { setSaveError(true); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(TABLE_PAGE_STORAGE_KEY, JSON.stringify(settings)); } catch { queueMicrotask(() => setSaveError(true)); }
  }, [settings, ready]);
  return { settings, ready, saveError, update: (patch: Partial<TablePageSettings>) => setSettings((current) => ({ ...current, ...patch })) };
}

function useTablePageAssets(nameFontId: TablePageSettings["nameFontId"], headingFontId: TablePageSettings["headingFontId"]) {
  const [fonts, setFonts] = useState<{ key: string; nameFont?: Font; headingFont?: Font; error?: string }>();
  const [artwork, setArtwork] = useState("");
  const [artError, setArtError] = useState("");
  const [revision, setRevision] = useState(0);
  const key = `${nameFontId}:${headingFontId}`;
  useEffect(() => {
    let active = true;
    Promise.all([loadFont(nameFontId), loadFont(headingFontId)]).then(([nameFont, headingFont]) => { if (active) setFonts({ key, nameFont, headingFont }); })
      .catch((error) => { if (active) setFonts({ key, error: error instanceof Error ? error.message : "Please try another font." }); });
    return () => { active = false; };
  }, [key, nameFontId, headingFontId, revision]);
  // Downloads embed the artwork so every file prints on its own.
  useEffect(() => {
    let active = true;
    fetch(ARTWORK_URL).then((response) => {
      if (!response.ok) throw new Error("The table page artwork could not be loaded. Please try again.");
      return response.blob();
    }).then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The table page artwork could not be read."));
      reader.readAsDataURL(blob);
    })).then((value) => { if (active) setArtwork(value); }).catch((error) => { if (active) setArtError(error.message); });
    return () => { active = false; };
  }, [revision]);
  const current = fonts?.key === key ? fonts : undefined;
  return { nameFont: current?.nameFont, headingFont: current?.headingFont, artwork, error: artError || current?.error, retry: () => { setArtError(""); setRevision((value) => value + 1); } };
}

const fileSlug = (page: TablePage) => page.heading.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";

export function TablePageStudio() {
  const project = useProject();
  const { settings, ready, saveError, update } = useTablePageSettings();
  const assets = useTablePageAssets(settings.nameFontId, settings.headingFontId);
  const deferredTables = useDeferredValue(project.tables);
  const [activeId, setActiveId] = useState("example-1");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const layout = useMemo<TablePageLayout>(() => {
    if (!assets.nameFont || !assets.headingFont) return { pages: [], errors: [] };
    try { return createTablePages(assets.nameFont, assets.headingFont, deferredTables, settings); }
    catch { return { pages: [], errors: ["This font could not shape one of the names. Please try a different font."] }; }
  }, [assets.nameFont, assets.headingFont, deferredTables, settings]);
  const guests = project.tables.reduce((count, table) => count + parseNames(table.names).length, 0);
  const pageIndex = Math.max(0, layout.pages.findIndex((page) => page.tableId === activeId));
  const current = layout.pages[pageIndex];
  const loading = !ready || !project.ready || (!assets.nameFont && !assets.error);
  const updating = project.tables !== deferredTables;
  const errors = [...layout.errors, ...(assets.error ? [assets.error] : []), ...(actionError ? [actionError] : [])];
  const canExport = !loading && !updating && !errors.length && layout.pages.length > 0 && !!assets.artwork && !busy;
  const smallest = layout.pages.length ? Math.min(...layout.pages.map((page) => page.nameSize)) : 0;

  const download = async (onlyCurrent = false) => {
    if (!canExport) return;
    setBusy(true); setActionError("");
    const pages = onlyCurrent ? [current] : layout.pages;
    try {
      const zip = pages.length > 1 ? new JSZip() : null;
      for (const [index, page] of pages.entries()) {
        setMessage(`Preparing ${page.heading} (${index + 1} of ${pages.length})…`);
        const svg = tablePageSvg(page, assets.artwork, settings.color);
        const blob = format === "png" ? await svgToPng(svg, "#ffffff", PAGE_PIXELS) : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const filename = `ever-after-${fileSlug(page)}.${format}`;
        if (zip) zip.file(filename, await blob.arrayBuffer()); else downloadBlob(blob, filename);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (zip) downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `ever-after-${pages.length}-table-pages-${format}.zip`);
      setMessage("Your table pages are ready to print.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Download failed. Please try again."); setMessage(""); }
    finally { setBusy(false); }
  };
  const printPages = () => {
    if (!canExport) return;
    const frame = document.createElement("iframe");
    frame.className = "card-print-frame";
    frame.title = "Print table pages";
    const cleanup = () => frame.remove();
    frame.onload = async () => {
      try {
        const doc = frame.contentDocument!;
        await Promise.all([...doc.querySelectorAll("image")].map((element) => new Promise<void>((resolve, reject) => {
          const image = new window.Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error("The artwork could not be prepared for printing.")); image.src = element.getAttribute("href")!;
        })));
        frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
        frame.contentWindow?.focus(); frame.contentWindow?.print();
      } catch (error) { setActionError(error instanceof Error ? error.message : "Printing could not be opened."); cleanup(); }
    };
    frame.srcdoc = `<!doctype html><html><head><title>Ever After — Table Pages</title><style>@page{size:${PAGE.width}mm ${PAGE.height}mm;margin:0}*{box-sizing:border-box}body{margin:0}svg{display:block;width:${PAGE.width}mm;height:${PAGE.height}mm;break-after:page;print-color-adjust:exact;-webkit-print-color-adjust:exact}svg:last-child{break-after:auto}</style></head><body>${layout.pages.map((page) => tablePageSvg(page, assets.artwork, settings.color)).join("")}</body></html>`;
    document.body.appendChild(frame);
  };

  return <div className="studio-app card-studio table-page-studio">
    <header className="site-header"><Link className="brand" href="/" aria-label="Ever After home"><Bow /><span><strong>ever after<span className="brand-period">.</span></strong><small>THE WEDDING NAME STUDIO</small></span></Link><p className="header-motto">Every table, beautifully framed.</p><span className="saved-status"><span className="save-dot" />{saveError || project.saveState === "unavailable" ? "Autosave unavailable" : project.saveState === "saved" ? "Saved on this device" : "Saving your details…"}</span></header>
    <main className="studio-main"><StudioNav active="pages" />
      <section className="studio-intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> ONE TABLE, ONE PAGE</p><h1>Find your seat.<br className="mobile-break" /> <em>Beautifully framed.</em></h1><p>Your artwork, your tables, every guest’s name. Printed at 18.5 × 26 cm for each glass pane.</p></div><div className="intro-decoration" aria-hidden="true"><span>made for</span><Heart size={28} strokeWidth={1} /><span>your people</span></div></section>
      <div className="workspace">
        <aside className="controls-panel card-controls" aria-label="Table page settings">
          <div className="card-controls-body">
            <TableEditor tables={project.tables} activeId={activeId} setActiveId={setActiveId} setTables={project.setTables} guests={guests} ready={project.ready} description="Each table prints on its own page. Your tables are shared with the seating window." hint="One guest per line, first name and surname. The table number becomes the page heading." />
            <div className="card-control-section"><p className="eyebrow">02 / THE LETTERING</p>
              <label className="card-field" htmlFor="page-heading-font">Table heading</label><select id="page-heading-font" className="text-input" value={settings.headingFontId} disabled={!ready} onChange={(event) => update({ headingFontId: event.target.value as TablePageSettings["headingFontId"] })}>{FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}</select>
              <label className="card-field" htmlFor="page-heading-size">Heading size <span>{settings.headingSize} pt</span></label><input id="page-heading-size" type="range" min="24" max="120" value={settings.headingSize} disabled={!ready} onChange={(event) => update({ headingSize: Number(event.target.value) })} />
              <label className="card-field" htmlFor="page-name-font">Guest names</label><select id="page-name-font" className="text-input" value={settings.nameFontId} disabled={!ready} onChange={(event) => update({ nameFontId: event.target.value as TablePageSettings["nameFontId"] })}>{FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}</select>
              <label className="card-field" htmlFor="page-name-size">Name size <span>{settings.nameSize} pt</span></label><input id="page-name-size" type="range" min="12" max="72" value={settings.nameSize} disabled={!ready} onChange={(event) => update({ nameSize: Number(event.target.value) })} />
              <label className="card-field" htmlFor="page-line-spacing">Line spacing <span>{settings.lineSpacing.toFixed(1)}×</span></label><input id="page-line-spacing" type="range" min="1" max="2.5" step="0.1" value={settings.lineSpacing} disabled={!ready} onChange={(event) => update({ lineSpacing: Number(event.target.value) })} />
              <p className="field-hint">These are the largest sizes. Busier tables shrink just enough to stay clear of the ink wash and botanicals, and long lists move into two columns.</p>
              <span className="card-field">Lettering colour</span>
              <div className="color-options">{COLORS.map((color) => <button key={color.value} style={{ backgroundColor: color.value }} className={`color-swatch ${settings.color.toLowerCase() === color.value ? "selected" : ""}`} aria-label={`${color.name} lettering`} aria-pressed={settings.color.toLowerCase() === color.value} onClick={() => update({ color: color.value })}>{settings.color.toLowerCase() === color.value && <Check size={14} color={color.value === "#ffffff" || color.value === "#c6aa7b" ? "#24211e" : "#fff"} />}</button>)}<label className="custom-color" title="Choose any colour"><Plus size={15} /><input type="color" value={settings.color} aria-label="Custom lettering colour" onChange={(event) => update({ color: event.target.value })} /></label><span className="hex-color">{settings.color.toUpperCase()}</span></div>
              <label className="guides-toggle"><input type="checkbox" checked={settings.matchSizes} disabled={!ready} onChange={(event) => update({ matchSizes: event.target.checked })} />Same lettering size on every table</label>
            </div>
          </div>
          <div className="download-panel card-download-panel">
            <div className="export-formats" role="group" aria-label="Table page download format"><button aria-pressed={format === "png"} className={format === "png" ? "selected" : ""} onClick={() => setFormat("png")}>PNG <small>300 DPI</small></button><button aria-pressed={format === "svg"} className={format === "svg" ? "selected" : ""} onClick={() => setFormat("svg")}>SVG <small>Print ready</small></button></div>
            <button className="primary-button download-button" disabled={!canExport} onClick={() => void download()}>{busy ? <LoaderCircle size={16} className="spinning" /> : <ArrowDownToLine size={16} />}<span>{busy ? "Preparing pages…" : `Download ${layout.pages.length > 1 ? "all pages" : "page"}`}</span></button><button className="secondary-button card-print-button" disabled={!canExport} onClick={printPages}><Printer size={15} />Print / Save as PDF</button><p className="export-footnote">{layout.pages.length} {layout.pages.length === 1 ? "page" : "pages"} · {PAGE.width / 10} × {PAGE.height / 10} cm each<br />Multiple pages download together in a ZIP.</p>
          </div>
        </aside>
        <section className="preview-panel" aria-label="Table page previews">
          <div className="preview-header"><div className="preview-tabs"><button className="selected" aria-pressed="true">Table pages{layout.pages.length > 0 && <span>{layout.pages.length}</span>}</button></div><span className="live-badge"><span />LIVE PREVIEW</span></div>
          <div className="preview-summary"><div><strong>{guests}</strong><span>guests</span></div><span className="stat-divider" /><div><strong>{layout.pages.length || "—"}</strong><span>table pages</span></div><div className={`fit-badge ${errors.length ? "warning" : ""}`} data-testid="page-status">{errors.length ? <TriangleAlert size={14} /> : <Check size={14} />}{loading ? "Preparing your pages" : errors.length ? "A little adjustment needed" : layout.pages.length ? "Ready to print" : "Ready for your guest list"}</div></div>
          {errors.length > 0 && <div className="fit-notices" role="alert">{errors.map((error) => <p key={error}><TriangleAlert size={15} /><span>{error}</span></p>)}{assets.error && <button className="text-button" onClick={assets.retry}>Try loading again</button>}{actionError && <button className="text-button" onClick={() => setActionError("")}>Dismiss</button>}</div>}
          <div className="preview-toolbar"><div><span className="preview-toolbar-label">{current ? current.heading.toUpperCase() : "YOUR TABLE PAGE"}</span><span className="toolbar-detail">{current ? `${current.guests} guests · names ${current.nameSize} pt${current.columns === 2 ? " · two columns" : ""}` : `${PAGE.width} × ${PAGE.height} mm`}</span></div></div>
          <div className="preview-stage card-preview-stage" aria-busy={loading || updating}>
            {loading ? <div className="preview-loading"><Bow /><LoaderCircle className="spinning" size={22} /><p>Making something lovely…</p></div> : current ? <div className="table-page-preview" role="img" aria-label={`Table page preview for ${current.heading}`} dangerouslySetInnerHTML={{ __html: tablePageSvg(current, ARTWORK_URL, settings.color) }} /> : <div className="preview-empty"><Heart size={28} /><h3>A page for every table.</h3><p>Add guests to a table to preview its page.</p></div>}
          </div>
          <div className="preview-footer"><button className="text-button" disabled={!canExport} onClick={() => void download(true)}><ArrowDownToLine size={13} />This page</button><div className="page-navigation"><button className="icon-button" aria-label="Previous table page" disabled={pageIndex === 0} onClick={() => setActiveId(layout.pages[pageIndex - 1].tableId)}><ChevronLeft size={14} /></button><strong>{current ? `${pageIndex + 1} of ${layout.pages.length}` : "—"}</strong><button className="icon-button" aria-label="Next table page" disabled={pageIndex >= layout.pages.length - 1} onClick={() => setActiveId(layout.pages[pageIndex + 1].tableId)}><ChevronRight size={14} /></button></div></div>
          {settings.matchSizes && layout.pages.length > 1 && <p className="card-fit-note">Every table prints at {smallest} pt so the pages match. Turn off “Same lettering size” to let smaller tables print larger.</p>}
        </section>
      </div>
    </main><footer className="site-footer"><span>Your guest list stays on this device.</span><span>Made for a day you’ll <em>never forget.</em></span></footer>
    <div className="card-live-message" role="status" aria-live="polite">{message}</div>
  </div>;
}
