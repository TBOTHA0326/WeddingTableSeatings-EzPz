"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, DoorOpen, File, Heart, Info, LoaderCircle, Moon, Sparkles, Sun, TriangleAlert, X } from "lucide-react";
import { A4, type Label, type Sheet } from "@/lib/layout";
import type { Pane } from "@/lib/panes";
import { WEDDING_TABLES, parseNames, type Settings } from "@/lib/project";
import { useProject } from "@/hooks/use-project";
import { useLettering } from "@/hooks/use-lettering";
import { useExport } from "@/hooks/use-export";
import { Bow } from "./bow";
import { StudioControls } from "./studio-controls";
import { PrintGuide } from "./print-guide";
import { StudioNav } from "./studio-nav";

function lightInk(hex: string) {
  const rgb = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16));
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) > 165;
}

export function NameStudio() {
  const { tables, settings, setTables, updateSettings, ready, saveState } = useProject();
  const deferredTables = useDeferredValue(tables);
  const { layout, panes, names, loading, fontError, retryFont } = useLettering(deferredTables, settings);
  const [activeId, setActiveId] = useState(WEDDING_TABLES[0].id);
  const [view, setView] = useState<"glass" | "sheets">("glass");
  const [pageIndex, setPageIndex] = useState(0);
  const [guides, setGuides] = useState(true);
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const exports = useExport();
  const activeTable = tables.find((table) => table.id === activeId) ?? tables[0];
  const selectedPane = panes.find((pane) => pane.tableId === activeTable.id);
  const occupiedPanes = panes.filter((pane) => pane.labels.length > 0);
  const populatedTables = tables.filter((table) => parseNames(table.names).length > 0);
  const enoughPanes = populatedTables.length <= settings.paneCount;
  const allFit = panes.every((pane) => pane.fits);
  const effectivePage = Math.max(0, Math.min(pageIndex, layout.pages.length - 1));
  const sheet = layout.pages[effectivePage];
  const dark = darkOverride ?? lightInk(settings.color);
  const updating = tables !== deferredTables;
  const tableErrors = useMemo(() => {
    if (populatedTables.some((table) => !table.number.trim())) return ["Give every populated table a number or name."];
    const numbers = populatedTables.map((table) => table.number.trim().toLowerCase());
    if (new Set(numbers).size < numbers.length) return ["Two tables have the same number. Give each table its own number or name."];
    return [];
  }, [populatedTables]);
  const canExport = ready && !loading && !fontError && !updating && names.length > 0 && layout.pages.length > 0 && !layout.errors.length && !tableErrors.length && enoughPanes && allFit;
  const scale = Math.min(1, layout.suggestedSize / settings.fontSize, ...panes.filter((pane) => !pane.fits).map((pane) => pane.suggestedSize / settings.fontSize));
  const fittedSize = Math.floor(settings.fontSize * scale * 10) / 10;
  const fittedHeading = Math.floor(settings.headingSize * scale * 10) / 10;
  const canFit = scale < 1 && fittedSize >= 12 && fittedHeading >= 16;
  const errors = [...tableErrors, ...layout.errors];
  const glassErrors = panes.filter((pane) => !pane.fits);
  const anyIssue = errors.length || !enoughPanes || !allFit;
  const totalGuests = tables.reduce((count, table) => count + parseNames(table.names).length, 0);

  return <div className="studio-app">
    <header className="site-header"><Link className="brand" href="/" aria-label="Ever After home"><Bow /><span><strong>ever after<span className="brand-period">.</span></strong><small>THE WEDDING NAME STUDIO</small></span></Link>
      <p className="header-motto">For your favourite people, on your favourite day.</p>
      <div className="header-actions"><span className="saved-status"><span className={saveState === "unavailable" ? "save-dot offline" : "save-dot"} />{saveState === "saved" ? "Saved on this device" : saveState === "unavailable" ? "Autosave unavailable" : "Saving your details…"}</span><button className="help-button" onClick={() => setShowGuide(true)}><CircleHelp size={16} /><span>Print guide</span></button></div>
    </header>
    <main className="studio-main">
      <StudioNav active="window" />
      <section className="studio-intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> A LITTLE DETAIL, A LOT OF LOVE</p><h1>Everyone has a place.<br className="mobile-break" /> <em>Make it beautiful.</em></h1><p>A lovely seating window, made simple. Your people, your panes, your perfect lettering.</p></div><div className="intro-decoration" aria-hidden="true"><span>made with</span><Heart size={28} strokeWidth={1} /><span>a little love</span></div></section>
      <div className="workspace">
        <StudioControls tables={tables} activeId={activeTable.id} setActiveId={setActiveId} setTables={setTables} settings={settings} updateSettings={updateSettings} guests={totalGuests} sheets={layout.pages.length} paneFit={allFit && enoughPanes} format={exports.format} setFormat={exports.setFormat} canExport={canExport} busy={exports.busy} progress={exports.progress} download={() => void exports.download(layout.pages, settings.color)} ready={ready} />
        <section className="preview-panel" aria-label="Wedding seating previews">
          <div className="preview-header"><div className="preview-tabs" role="group" aria-label="Preview mode"><button className={view === "glass" ? "selected" : ""} aria-pressed={view === "glass"} onClick={() => setView("glass")}><DoorOpen size={16} />On the glass</button><button className={view === "sheets" ? "selected" : ""} aria-pressed={view === "sheets"} onClick={() => setView("sheets")}><File size={16} />A4 print sheets{layout.pages.length > 0 && <span>{layout.pages.length}</span>}</button></div><span className="live-badge"><span />LIVE PREVIEW</span></div>
          <div className="preview-summary"><div><strong>{totalGuests}</strong><span>guests</span></div><span className="stat-divider" /><div><strong>{populatedTables.length}<small> / {settings.paneCount}</small></strong><span>glass panes</span></div><span className="stat-divider" /><div><strong>{loading ? "—" : layout.pages.length || "—"}</strong><span>A4 sheets</span></div><div className={`fit-badge ${anyIssue ? "warning" : ""}`} data-testid="fit-status">{anyIssue ? <TriangleAlert size={14} /> : <Check size={14} />}{loading ? "Measuring your lettering" : anyIssue ? "A little adjustment needed" : totalGuests ? "Everything fits beautifully" : "Ready for your guest list"}</div></div>
          {(!enoughPanes || glassErrors.length > 0 || errors.length > 0 || fontError) && <div className="fit-notices" role="alert">
            {!enoughPanes && <p><TriangleAlert size={15} /><span>You have {populatedTables.length} tables and {settings.paneCount} panes. Add {populatedTables.length - settings.paneCount} {populatedTables.length - settings.paneCount === 1 ? "pane" : "panes"}, or combine your tables.</span><button onClick={() => updateSettings({ paneCount: populatedTables.length })}>Use {populatedTables.length} panes <ArrowRight size={13} /></button></p>}
            {glassErrors.length > 0 && <p><TriangleAlert size={15} /><span>{glassErrors.map((pane) => `Table ${pane.number}`).join(", ")} {glassErrors.length === 1 ? "needs" : "need"} more room inside the glass. Try smaller lettering, less spacing, or larger panes.</span></p>}
            {errors.map((error) => <p key={error}><TriangleAlert size={15} /><span>{error}</span></p>)}
            {canFit && <button className="fit-action" onClick={() => updateSettings({ fontSize: fittedSize, headingSize: fittedHeading })}><Sparkles size={14} />Fit all lettering · names {fittedSize} pt / headings {fittedHeading} pt</button>}
            {fontError && <p><TriangleAlert size={15} /><span>{fontError}</span><button onClick={retryFont}>Try again</button></p>}
          </div>}
          <div className="preview-toolbar"><div>{view === "glass" ? <><span className="preview-toolbar-label">YOUR WINDOW</span><span className="toolbar-detail">{settings.paneWidth} × {settings.paneHeight} cm per pane</span></> : <><span className="preview-toolbar-label">A4 · PORTRAIT</span><span className="toolbar-detail">210 × 297 mm</span></>}</div><div className="toolbar-actions">{view === "sheets" && <label className="guides-toggle"><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />Cutting guides</label>}<button className="icon-button" aria-label={dark ? "Use light preview background" : "Use dark preview background"} title="Change preview background only" onClick={() => setDarkOverride(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>{view === "sheets" && <button className="icon-button" aria-label="Download current sheet" title={`Download this sheet as ${exports.format.toUpperCase()}`} disabled={!canExport || exports.busy} onClick={() => void exports.download([sheet], settings.color, effectivePage + 1)}><ArrowDownToLine size={16} /></button>}</div></div>
          <div className={`preview-stage ${view === "sheets" ? "sheet-stage" : "glass-stage"} ${dark ? "dark-preview" : ""}`} aria-busy={loading || updating}>
            {loading ? <div className="preview-loading"><Bow /><LoaderCircle className="spinning" size={18} /><p>Finding the lovely little curves…</p></div> : fontError ? <div className="preview-empty"><TriangleAlert size={28} /><h3>Let’s try that font again.</h3><button className="secondary-button" onClick={retryFont}>Reload font</button></div> : view === "glass" ? <GlassPreview panes={occupiedPanes} selectedPane={selectedPane} settings={settings} activeId={activeTable.id} onSelect={setActiveId} color={settings.color} /> : sheet ? <div className="a4-preview-wrap"><span className="paper-width">210 mm</span><div className="a4-paper"><SheetArtwork sheet={sheet} color={settings.color} guides={guides} margin={settings.margin} /></div><span className="paper-height">297 mm</span></div> : <div className="preview-empty"><Bow /><h3>{errors.length ? "A little more room for your names." : "Your favourite people go here."}</h3><p>{errors.length ? "Adjust the lettering to create your print sheets." : "Add guests to a table and your sheets will appear, as if by magic."}</p></div>}
          </div>
          <div className="preview-footer">{view === "glass" ? <><span><Info size={14} />A layout preview. Stick each name onto the glass separately.</span><span className="footer-dimensions">One table, one pane.</span></> : <><span>{sheet ? `${sheet.labels.length} stickers on this sheet` : "Transparent lettering, ready for glass."}</span><div className="page-navigation"><button className="icon-button" aria-label="Previous A4 sheet" disabled={effectivePage === 0} onClick={() => setPageIndex(effectivePage - 1)}><ChevronLeft size={17} /></button><span>Sheet <strong>{layout.pages.length ? effectivePage + 1 : "—"}</strong> of {layout.pages.length || "—"}</span><button className="icon-button" aria-label="Next A4 sheet" disabled={effectivePage >= layout.pages.length - 1} onClick={() => setPageIndex(effectivePage + 1)}><ChevronRight size={17} /></button></div></>}</div>
          <div className="print-reminder"><span className="reminder-icon"><Check size={15} /></span><p><strong>A little care, a lovely result.</strong> The glass and guides are just for your preview. Downloads contain only the lettering, with a transparent background.</p><button className="text-button" onClick={() => setShowGuide(true)}>How to print <ArrowRight size={13} /></button></div>
        </section>
      </div>
    </main>
    <footer className="site-footer"><span>Designed for a day you’ll never forget.</span><span>With love, <em>ever after.</em><Heart size={11} /></span></footer>
    {exports.message && <div className={`download-toast ${exports.message.error ? "error" : ""}`} role={exports.message.error ? "alert" : "status"}>{exports.message.error ? <TriangleAlert size={18} /> : <Check size={18} />}<span>{exports.message.text}</span><button className="icon-button" aria-label="Dismiss download message" onClick={() => exports.setMessage(null)}><X size={16} /></button></div>}
    {showGuide && <PrintGuide onClose={() => setShowGuide(false)} />}
  </div>;
}

function LetteringPaths({ labels, color }: { labels: Label[]; color: string }) {
  return <g fill={color}>{labels.map((label) => <g key={label.id} transform={`translate(${label.x} ${label.y})`}><title>{label.name.replaceAll("|", " ")}</title>{label.paths.map((path, index) => <path key={index} d={path.d} transform={`translate(${path.x} ${path.y})`} />)}</g>)}</g>;
}

function SheetArtwork({ sheet, color, guides, margin }: { sheet: Sheet; color: string; guides: boolean; margin: number }) {
  return <svg viewBox={`0 0 ${A4.width} ${A4.height}`} className="sheet-artwork" role="img" aria-label="A4 print sheet with outlined name lettering">
    {guides && <g fill="none" stroke="currentColor" strokeWidth="0.2" className="cutting-lines"><rect x={margin} y={margin} width={A4.width - 2 * margin} height={A4.height - 2 * margin} strokeDasharray="2 2" />{sheet.labels.map((label) => <rect key={label.id} x={label.x} y={label.y} width={label.width} height={label.height} rx="0.8" strokeDasharray="0.8 1.2" />)}</g>}
    <LetteringPaths labels={sheet.labels} color={color} />
  </svg>;
}

function PaneArtwork({ pane, settings, color }: { pane?: Pane; settings: Settings; color: string }) {
  const width = settings.paneWidth * 10;
  const height = settings.paneHeight * 10;
  return <svg viewBox={`0 0 ${width} ${height}`} className="pane-artwork" role="img" aria-label={pane?.labels.length ? `Glass pane preview for Table ${pane.number}` : "An empty glass pane"}>{pane?.labels.length ? <LetteringPaths labels={pane.labels} color={color} /> : <g className="empty-pane-mark"><path d={`M${width / 2 - 5} ${height / 2}h10M${width / 2} ${height / 2 - 5}v10`} stroke="currentColor" strokeWidth="0.6" /><text x={width / 2} y={height / 2 + 14} textAnchor="middle" fontSize="5" fill="currentColor">a little room for love</text></g>}</svg>;
}

function GlassPreview({ panes, selectedPane, settings, activeId, onSelect, color }: { panes: Pane[]; selectedPane?: Pane; settings: Settings; activeId: string; onSelect: (id: string) => void; color: string }) {
  const shown = Math.min(settings.paneCount, 12);
  const columns = shown === 1 ? 1 : shown > 8 ? 3 : 2;
  return <div className="glass-preview-content">
    <div className="door-preview-section"><p className="preview-caption">THE BIG PICTURE</p><div className="wooden-door" style={{ "--door-columns": columns, "--pane-ratio": settings.paneWidth / settings.paneHeight } as React.CSSProperties}>{Array.from({ length: shown }, (_, index) => <button key={index} className={`door-pane ${panes[index]?.tableId === activeId ? "active" : ""}`} disabled={!panes[index]} aria-label={panes[index] ? `Preview Table ${panes[index].number} on glass` : `Empty glass pane ${index + 1}`} onClick={() => panes[index] && onSelect(panes[index].tableId)}><PaneArtwork pane={panes[index]} settings={settings} color={color} /></button>)}<span className="door-handle" aria-hidden="true" /></div><p className="door-caption">{panes.length} of {settings.paneCount} panes filled{settings.paneCount > 12 && <small>Showing the first 12 panes</small>}</p></div>
    <div className="pane-detail-section"><p className="preview-caption">A CLOSER LOOK <span>· TABLE {selectedPane?.number || "—"}</span></p><div className="pane-detail-wrap" style={{ "--pane-ratio": settings.paneWidth / settings.paneHeight } as React.CSSProperties}><span className="pane-width-measure">{settings.paneWidth} cm</span><div className={`pane-detail ${selectedPane?.fits === false ? "pane-overflow" : ""}`}><PaneArtwork pane={selectedPane} settings={settings} color={color} /></div><span className="pane-height-measure">{settings.paneHeight} cm</span></div><p className="pane-detail-caption">{selectedPane?.labels.length ? `${selectedPane.labels.length - 1} guests · ${settings.fontSize} pt names · ${settings.headingSize} pt heading` : "Add guests to bring this pane to life."}</p></div>
  </div>;
}
