"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import JSZip from "jszip";
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, FileUp, Heart, LoaderCircle, Plus, Printer, Scissors, TriangleAlert } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useCardAssets } from "@/hooks/use-card-assets";
import { FONTS, MAX_GUESTS, parseNames } from "@/lib/project";
import { downloadBlob, svgToPng, type ExportFormat } from "@/lib/export";
import { CARD_ASPECT, CARD_STORAGE_KEY, DEFAULT_CARD_SETTINGS, cardGuests, cardMarkup, cardSheetSvg, createCardLayout, restoreCardSettings, type CardSettings } from "@/lib/seating-cards";
import { Bow } from "./bow";
import { StudioNav } from "./studio-nav";

function useCardSettings() {
  const [settings, setSettings] = useState(DEFAULT_CARD_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setSettings(restoreCardSettings(localStorage.getItem(CARD_STORAGE_KEY))); } catch { setSaveError(true); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(settings)); } catch { queueMicrotask(() => setSaveError(true)); }
  }, [settings, ready]);
  return { settings, ready, saveError, update: (patch: Partial<CardSettings>) => setSettings((current) => ({ ...current, ...patch })) };
}

export function SeatingCardStudio() {
  const project = useProject();
  const { settings, ready, saveError, update } = useCardSettings();
  const assets = useCardAssets(settings.fontId);
  const [activeId, setActiveId] = useState("example-1");
  const [scope, setScope] = useState("all");
  const [view, setView] = useState<"fold" | "front" | "sheets">("fold");
  const [guestIndex, setGuestIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const fontInput = useRef<HTMLInputElement>(null);
  const namesInput = useRef<HTMLInputElement>(null);
  const active = project.tables.find((table) => table.id === activeId) ?? project.tables[0];
  const allGuests = useMemo(() => cardGuests(project.tables), [project.tables]);
  const guests = useMemo(() => scope === "all" ? allGuests : cardGuests(project.tables.filter((table) => table.id === scope)), [allGuests, project.tables, scope]);
  const layout = useMemo(() => {
    if (!assets.font) return { pages: [], errors: [], capacity: 0, height: settings.width * CARD_ASPECT, resized: 0 };
    try { return createCardLayout(assets.font, guests, settings); }
    catch { return { pages: [], errors: ["This font could not shape the names. Choose another font or import the full font file."], capacity: 0, height: settings.width * CARD_ASPECT, resized: 0 }; }
  }, [assets.font, guests, settings]);
  const cards = layout.pages.flat();
  const effectiveGuest = Math.min(guestIndex, Math.max(0, cards.length - 1));
  const effectivePage = Math.min(pageIndex, Math.max(0, layout.pages.length - 1));
  const current = cards[effectiveGuest];
  const loading = !ready || !project.ready || (!assets.font && !assets.error) || (!assets.artwork && !assets.error);
  const errors = [...layout.errors, ...(allGuests.length > MAX_GUESTS ? [`Please keep the project to ${MAX_GUESTS} guests or fewer.`] : []), ...(assets.error ? [assets.error] : []), ...(actionError ? [actionError] : [])];
  const canExport = !loading && !errors.length && cards.length > 0 && !!assets.artwork && !busy;
  const changeNames = (names: string) => project.setTables(project.tables.map((table) => table.id === active.id ? { ...table, names } : table));
  const addTable = () => {
    let number = 1;
    while (project.tables.some((table) => table.number === String(number))) number++;
    const id = crypto.randomUUID();
    project.setTables([...project.tables, { id, number: String(number), names: "" }]); setActiveId(id);
  };
  const uploadFont = async (file?: File) => {
    if (!file) return;
    setBusy(true); setActionError("");
    try { await assets.importFont(file); update({ fontId: "custom" }); setMessage("Your font is saved on this device."); }
    catch (error) { setActionError(error instanceof Error ? error.message : "This font could not be imported."); }
    finally { setBusy(false); if (fontInput.current) fontInput.current.value = ""; }
  };
  const importNames = async (file?: File) => {
    if (!file) return;
    setActionError("");
    try {
      if (file.size > 200_000) throw new Error("Choose a text file smaller than 200 KB.");
      changeNames(await file.text());
    } catch (error) { setActionError(error instanceof Error ? error.message : "The names could not be read."); }
    finally { if (namesInput.current) namesInput.current.value = ""; }
  };
  const download = async (onlyCurrent = false) => {
    if (!canExport) return;
    setBusy(true); setActionError("");
    const pages = onlyCurrent ? [layout.pages[effectivePage]] : layout.pages;
    try {
      const zip = pages.length > 1 ? new JSZip() : null;
      for (const [index, page] of pages.entries()) {
        setMessage(`Preparing sheet ${index + 1} of ${pages.length}…`);
        const svg = cardSheetSvg(page, settings.width, assets.artwork, settings.guides);
        const blob = format === "png" ? await svgToPng(svg, "#ffffff") : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const filename = `ever-after-seating-cards-a4-${String((onlyCurrent ? effectivePage : index) + 1).padStart(2, "0")}.${format}`;
        if (zip) zip.file(filename, await blob.arrayBuffer()); else downloadBlob(blob, filename);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (zip) downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `ever-after-seating-cards-${pages.length}-a4-${format}.zip`);
      setMessage("Your seating cards are ready to print.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Download failed. Please try again."); setMessage(""); }
    finally { setBusy(false); }
  };
  const printCards = () => {
    if (!canExport) return;
    const frame = document.createElement("iframe");
    frame.className = "card-print-frame";
    frame.title = "Print wedding seating cards";
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
    frame.srcdoc = `<!doctype html><html><head><title>Ever After — Seating Cards</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0}svg{display:block;width:210mm;height:297mm;break-after:page;print-color-adjust:exact;-webkit-print-color-adjust:exact}svg:last-child{break-after:auto}</style></head><body>${layout.pages.map((page) => cardSheetSvg(page, settings.width, assets.artwork, settings.guides)).join("")}</body></html>`;
    document.body.appendChild(frame);
  };

  return <div className="studio-app card-studio">
    <header className="site-header"><Link className="brand" href="/" aria-label="Ever After home"><Bow /><span><strong>ever after<span className="brand-period">.</span></strong><small>THE WEDDING NAME STUDIO</small></span></Link><p className="header-motto">A little welcome, for every seat.</p><span className="saved-status"><span className="save-dot" />{saveError || project.saveState === "unavailable" ? "Autosave unavailable" : project.saveState === "saved" ? "Saved on this device" : "Saving your details…"}</span></header>
    <main className="studio-main"><StudioNav active="cards" />
      <section className="studio-intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> A NAME, A SEAT, A LITTLE KEEPSAKE</p><h1>A warm welcome.<br className="mobile-break" /> <em>Beautifully folded.</em></h1><p>Your original artwork. Every guest’s name. Ready to cut, fold, and place on the table.</p></div><div className="intro-decoration" aria-hidden="true"><span>made for</span><Heart size={28} strokeWidth={1} /><span>your people</span></div></section>
      <div className="workspace">
        <aside className="controls-panel card-controls" aria-label="Seating card settings">
          <div className="card-controls-body">
            <div className="section-heading"><p className="eyebrow">01 / YOUR FAVOURITE PEOPLE</p><span className="count-badge">{allGuests.length} guests</span></div><h2>One for every guest.</h2><p className="section-description">Your guest tables are shared with the seating window.</p>
            <div className="table-selector" aria-label="Select a table">{project.tables.map((table) => <button className={`table-chip ${table.id === active.id ? "selected" : ""}`} key={table.id} aria-pressed={table.id === active.id} onClick={() => setActiveId(table.id)}>Table {table.number || "?"}<span>{parseNames(table.names).length}</span></button>)}<button className="table-chip add-chip" aria-label="Add a table" onClick={addTable} disabled={!project.ready || project.tables.length >= 60}><Plus size={15} /></button></div>
            <label className="field-label" htmlFor="card-table">TABLE NUMBER</label><input id="card-table" className="text-input" value={active.number} maxLength={20} disabled={!project.ready} onChange={(event) => project.setTables(project.tables.map((table) => table.id === active.id ? { ...table, number: event.target.value } : table))} />
            <div className="table-editor-header guest-label"><label className="field-label" htmlFor="card-names">GUEST NAMES</label><button className="text-button" disabled={!project.ready} onClick={() => namesInput.current?.click()}><FileUp size={13} />Import .txt</button></div><textarea id="card-names" className="names-input" value={active.names} disabled={!project.ready} spellCheck={false} aria-describedby="card-names-hint" onChange={(event) => changeNames(event.target.value)} placeholder={"Tiaan | Botha\nAmelia | van der Merwe"} /><p className="field-hint" id="card-names-hint">One guest per line. First name and surname print together on one line. The <span className="pipe-example">|</span> is removed.</p>
            <input type="file" ref={namesInput} accept=".txt,text/plain" className="sr-only" tabIndex={-1} aria-label="Import guest names file" onChange={(event) => void importNames(event.target.files?.[0])} />
            <div className="card-control-section"><p className="eyebrow">02 / THE FINISHING TOUCHES</p><label className="card-field" htmlFor="card-font">Name lettering</label><select id="card-font" className="text-input" value={settings.fontId} disabled={!ready || busy} onChange={(event) => { setActionError(""); update({ fontId: event.target.value as CardSettings["fontId"] }); }}>{FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}<option value="custom">Imported font{settings.fontId === "custom" && assets.fontName ? ` · ${assets.fontName}` : ""}</option></select>
              <button className="text-button card-upload-font" onClick={() => fontInput.current?.click()} disabled={!ready || busy}><FileUp size={14} />Import exact font</button><input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2" aria-label="Import exact font file" className="sr-only" tabIndex={-1} onChange={(event) => void uploadFont(event.target.files?.[0])} />
              <p className="field-hint">Use your font file for an exact match. Imported fonts stay on this device. Vintage Heirloom is the starting style.</p>
              <label className="card-field" htmlFor="card-font-size">Name size <span>{settings.fontSize} pt</span></label><input id="card-font-size" type="range" min="12" max="60" value={settings.fontSize} disabled={!ready} onChange={(event) => update({ fontSize: Number(event.target.value) })} /><p className="field-hint">Long names shrink just enough to keep every flourish inside the lower-right name area.</p>
              <label className="card-field" htmlFor="card-width">Card width <span>mm</span></label><input key={settings.width} id="card-width" className="text-input" type="number" min="60" max="180" step="1" defaultValue={settings.width} disabled={!ready} onBlur={(event) => { const width = Number(event.target.value); const safeWidth = Number.isFinite(width) && event.target.value ? Math.max(60, Math.min(180, width)) : settings.width; event.target.value = String(safeWidth); update({ width: safeWidth }); }} /><p className="field-hint">Standing face: {settings.width} × {(layout.height / 2).toFixed(1)} mm. The original artwork’s proportions stay fixed.</p>
            </div>
            <div className="card-artwork-note"><Check size={16} /><div><strong>Your original artwork</strong><p>Flowers, border, and texture preserved from your blank reference.</p></div></div>
          </div>
          <div className="download-panel card-download-panel"><label className="field-label" htmlFor="card-scope">CARDS TO PRINT</label><select id="card-scope" className="text-input" value={scope} onChange={(event) => { setScope(event.target.value); setPageIndex(0); setGuestIndex(0); }}><option value="all">All tables · {allGuests.length} guests</option>{project.tables.map((table) => <option key={table.id} value={table.id}>Table {table.number || "?"} · {parseNames(table.names).length} guests</option>)}</select>
            <div className="export-formats" role="group" aria-label="Card download format"><button aria-pressed={format === "png"} className={format === "png" ? "selected" : ""} onClick={() => setFormat("png")}>PNG <small>300 DPI</small></button><button aria-pressed={format === "svg"} className={format === "svg" ? "selected" : ""} onClick={() => setFormat("svg")}>SVG <small>Print ready</small></button></div>
            <button className="primary-button download-button" disabled={!canExport} onClick={() => void download()}>{busy ? <LoaderCircle size={16} className="spinning" /> : <ArrowDownToLine size={16} />}<span>{busy ? "Preparing cards…" : `Download ${layout.pages.length > 1 ? "all sheets" : "sheet"}`}</span></button><button className="secondary-button card-print-button" disabled={!canExport} onClick={printCards}><Printer size={15} />Print / Save as PDF</button><p className="export-footnote">{guests.length} cards · {layout.pages.length} A4 sheets{layout.capacity > 0 && ` · ${layout.capacity} cards per sheet`}<br />Multiple sheets download together in a ZIP.</p>
          </div>
        </aside>
        <section className="preview-panel" aria-label="Seating card previews">
          <div className="preview-header"><div className="preview-tabs" role="group" aria-label="Card preview mode">{([{ id: "fold", name: "Flat card" }, { id: "front", name: "Front face" }, { id: "sheets", name: "A4 sheets" }] as const).map((item) => <button key={item.id} className={view === item.id ? "selected" : ""} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.name}</button>)}</div><span className="live-badge"><span />LIVE PREVIEW</span></div>
          <div className="preview-summary"><div><strong>{guests.length}</strong><span>seating cards</span></div><span className="stat-divider" /><div><strong>{layout.pages.length || "—"}</strong><span>A4 sheets</span></div><div className={`fit-badge ${errors.length ? "warning" : ""}`} data-testid="card-status">{errors.length ? <TriangleAlert size={14} /> : <Check size={14} />}{loading ? "Preparing your cards" : errors.length ? "A little adjustment needed" : cards.length ? "Ready to cut & fold" : "Ready for your guest list"}</div></div>
          {errors.length > 0 && <div className="fit-notices" role="alert">{errors.map((error) => <p key={error}><TriangleAlert size={15} /><span>{error}</span></p>)}{assets.error && <button className="text-button" onClick={assets.retry}>Try loading again</button>}{actionError && <button className="text-button" onClick={() => setActionError("")}>Dismiss</button>}</div>}
          <div className="preview-toolbar"><div><span className="preview-toolbar-label">{view === "sheets" ? "A4 · PORTRAIT" : view === "front" ? "THE STANDING FACE" : "CUT, THEN FOLD IN HALF"}</span><span className="toolbar-detail">{view === "sheets" ? "210 × 297 mm" : `${settings.width} × ${(view === "front" ? layout.height / 2 : layout.height).toFixed(1)} mm`}</span></div><label className="guides-toggle"><input type="checkbox" checked={settings.guides} onChange={(event) => update({ guides: event.target.checked })} />Cut & fold guides</label></div>
          <div className={`preview-stage card-preview-stage ${view === "sheets" ? "card-sheet-stage" : ""}`}>
            {loading ? <div className="preview-loading"><Bow /><LoaderCircle className="spinning" size={22} /><p>Making something lovely…</p></div> : current ? view === "sheets" ? <div className="card-sheet-preview" role="img" aria-label={`A4 seating card sheet ${effectivePage + 1}`} dangerouslySetInnerHTML={{ __html: cardSheetSvg(layout.pages[effectivePage], settings.width, assets.artwork, settings.guides) }} /> : <div className={`card-preview-wrap ${view === "front" ? "card-front-preview" : ""}`}><svg role="img" aria-label={`${view === "front" ? "Front face" : "Fold-over seating card"} for ${current.guest.name}`} className="card-artwork" viewBox={`0 ${view === "front" ? layout.height / 2 : 0} ${settings.width} ${view === "front" ? layout.height / 2 : layout.height}`} dangerouslySetInnerHTML={{ __html: cardMarkup(current, settings.width, assets.artwork, view === "fold" && settings.guides) }} />{view === "fold" && <span className="card-fold-label">FOLD HERE</span>}</div> : <div className="preview-empty"><Heart size={28} /><h3>A place with their name on it.</h3><p>Add guests to this table to preview their seating cards.</p></div>}
          </div>
          <div className="preview-footer">{view === "sheets" ? <><button className="text-button" disabled={!canExport} onClick={() => void download(true)}><ArrowDownToLine size={13} />This sheet</button><div className="page-navigation"><button className="icon-button" aria-label="Previous card sheet" disabled={effectivePage === 0} onClick={() => setPageIndex(effectivePage - 1)}><ChevronLeft size={14} /></button><strong>Sheet {layout.pages.length ? effectivePage + 1 : 0} of {layout.pages.length}</strong><button className="icon-button" aria-label="Next card sheet" disabled={effectivePage >= layout.pages.length - 1} onClick={() => setPageIndex(effectivePage + 1)}><ChevronRight size={14} /></button></div></> : <><span className="card-guest-caption">{current?.guest.name ?? "No guests yet"}{current && ` · Table ${current.guest.table || "?"}`}</span><div className="page-navigation"><button className="icon-button" aria-label="Previous guest card" disabled={effectiveGuest === 0} onClick={() => setGuestIndex(effectiveGuest - 1)}><ChevronLeft size={14} /></button><strong>{cards.length ? effectiveGuest + 1 : 0} / {cards.length}</strong><button className="icon-button" aria-label="Next guest card" disabled={effectiveGuest >= cards.length - 1} onClick={() => setGuestIndex(effectiveGuest + 1)}><ChevronRight size={14} /></button></div></>}</div>
          {layout.resized > 0 && <p className="card-fit-note">{layout.resized} {layout.resized === 1 ? "name was" : "names were"} reduced to fit the reference’s name area.</p>}
          <div className="print-reminder"><span className="reminder-icon"><Scissors size={15} /></span><p><strong>Print at 100% / actual size on cardstock.</strong> Cut around each complete card, score through the centre, and fold to stand. The upper panel stays blank. For PDF, turn off browser headers and footers and use A4.</p></div>
        </section>
      </div>
      <details className="card-reference-details"><summary>Your placement reference</summary><div className="card-reference-content"><Image src="/FontAndPlacementReference.jpeg" width={1536} height={1024} alt="Supplied reference: Tiaan Botha in script near the lower-right corner of the card" unoptimized /><div><p className="eyebrow">THE LITTLE DETAILS</p><h2>Just like your reference.</h2><p>The full name sits on one line, low on the right of the lower panel. The upper panel is left blank for folding.</p><p>Vintage Heirloom provides a similar script style. Import the exact font whenever you have it.</p><a className="text-button" href="/FontAndPlacementReference.jpeg" target="_blank" rel="noreferrer">Open original reference ↗</a></div></div></details>
    </main><footer className="site-footer"><span>Your guest list and imported font stay on this device.</span><span>Made for a day you’ll <em>never forget.</em></span></footer>
    <div className="card-live-message" role="status" aria-live="polite">{message}</div>
  </div>;
}
