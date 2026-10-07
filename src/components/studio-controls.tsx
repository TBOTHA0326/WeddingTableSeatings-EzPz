"use client";

import { useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, FileUp, Grid2X2, Heart, Plus, SlidersHorizontal, Trash2, Type, Users, X } from "lucide-react";
import { EXAMPLE_TABLES, FONTS, parseNames, type Settings, type Table } from "@/lib/project";
import type { ExportFormat } from "@/lib/export";

type Props = {
  tables: Table[]; activeId: string; setActiveId: (id: string) => void; setTables: (tables: Table[]) => void;
  settings: Settings; updateSettings: (settings: Partial<Settings>) => void;
  guests: number; sheets: number; paneFit: boolean; format: ExportFormat; setFormat: (format: ExportFormat) => void;
  canExport: boolean; busy: boolean; progress: string; download: () => void; ready: boolean;
};
const COLORS = [{ name: "Ink", value: "#24211e" }, { name: "Camel", value: "#95724d" }, { name: "White", value: "#ffffff" }, { name: "Champagne", value: "#c6aa7b" }];

export function StudioControls(props: Props) {
  const { tables, activeId, setActiveId, setTables, settings, updateSettings } = props;
  const [tab, setTab] = useState<"tables" | "lettering" | "glass">("tables");
  const [undo, setUndo] = useState<Table[] | null>(null);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const active = tables.find((table) => table.id === activeId) ?? tables[0];
  const changeTable = (patch: Partial<Table>) => setTables(tables.map((table) => table.id === active.id ? { ...table, ...patch } : table));
  const addTable = () => {
    let number = 1;
    while (tables.some((table) => table.number === String(number))) number++;
    const id = crypto.randomUUID();
    setTables([...tables, { id, number: String(number), names: "" }]);
    setActiveId(id);
  };
  const removeTable = () => {
    setUndo(tables);
    const remaining = tables.filter((table) => table.id !== active.id);
    setTables(remaining.length ? remaining : [{ ...active, names: "" }]);
    setActiveId(remaining[0]?.id ?? active.id);
  };
  const importNames = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error("Please use a text file smaller than 200 KB.");
      changeTable({ names: await file.text() });
      setImportError("");
    } catch (error) { setImportError(error instanceof Error ? error.message : "This file could not be imported."); }
    if (importRef.current) importRef.current.value = "";
  };
  return <aside className="controls-panel" aria-label="Wedding seating settings">
    <div className="control-tabs" role="tablist" aria-label="Studio settings">
      {([{ id: "tables", label: "Tables", Icon: Users }, { id: "lettering", label: "Lettering", Icon: Type }, { id: "glass", label: "Glass panes", Icon: Grid2X2 }] as const).map(({ id, label, Icon }) => <button key={id} role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { const tabs = ["tables", "lettering", "glass"] as const; const index = (tabs.indexOf(id) + (event.key === "ArrowRight" ? 1 : 2)) % 3; setTab(tabs[index]); document.getElementById(`tab-${tabs[index]}`)?.focus(); }
      }} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}
    </div>
    <div className="controls-body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === "tables" && <>
        <div className="section-heading"><p className="eyebrow">01 / YOUR FAVOURITE PEOPLE</p><span className="count-badge">{props.guests} guests</span></div>
        <h2>A place for everyone.</h2><p className="section-description">One table per pane. A little love in every name.</p>
        <div className="table-selector" aria-label="Select a table">{tables.map((table) => <button key={table.id} className={table.id === active.id ? "table-chip selected" : "table-chip"} onClick={() => setActiveId(table.id)} aria-pressed={table.id === active.id}>Table {table.number || "?"}<span>{parseNames(table.names).length}</span></button>)}<button className="table-chip add-chip" onClick={addTable} disabled={tables.length >= 60 || !props.ready} aria-label="Add a table"><Plus size={15} /></button></div>
        <div className="table-editor-header"><label className="field-label" htmlFor="table-number">TABLE NUMBER</label><button className="text-button subtle" onClick={removeTable} aria-label={`Remove table ${active.number}`}><Trash2 size={13} />Remove</button></div>
        <input id="table-number" className="text-input table-number-input" value={active.number} maxLength={20} onChange={(event) => changeTable({ number: event.target.value })} disabled={!props.ready} />
        <div className="table-editor-header guest-label"><label className="field-label" htmlFor="guest-names">GUEST NAMES</label><button className="text-button" onClick={() => importRef.current?.click()} disabled={!props.ready}><FileUp size={13} />Import .txt</button></div>
        <textarea id="guest-names" spellCheck={false} className="names-input" value={active.names} onChange={(event) => changeTable({ names: event.target.value })} placeholder={"Amelia | van der Merwe\nOliver | Botha\nCharlotte | de Villiers"} disabled={!props.ready} aria-describedby="names-hint" />
        <input ref={importRef} type="file" accept=".txt,text/plain" className="sr-only" tabIndex={-1} onChange={(event) => void importNames(event.target.files?.[0])} />
        <p className="field-hint" id="names-hint">One guest per line. Use <span className="pipe-example">First name | Surname</span> to keep a surname together in the two-line style.</p>
        {importError && <p className="inline-error" role="alert">{importError}</p>}
        {undo && <div className="undo-notice">Table removed.<button onClick={() => { setTables(undo); setActiveId(undo[0].id); setUndo(null); }}>Undo</button><button aria-label="Dismiss undo" onClick={() => setUndo(null)}><X size={12} /></button></div>}
        <div className="little-note"><Heart size={15} /><span>{tables.every((table) => EXAMPLE_TABLES.some((example) => example.id === table.id && example.names === table.names)) ? "A few example guests to get you started." : "Your guest list stays in this browser."}</span></div>
      </>}
      {tab === "lettering" && <>
        <p className="eyebrow">02 / MAKE IT FEEL LIKE YOU</p><h2>A lovely first impression.</h2>
        <p className="section-description">Pick the lettering for your special day.</p>
        <div className="font-options" role="group" aria-label="Choose a font">{FONTS.map((font) => <button key={font.id} className={`font-option ${settings.fontId === font.id ? "selected" : ""}`} aria-pressed={settings.fontId === font.id} onClick={() => updateSettings({ fontId: font.id })}><div><span className="font-sample" style={{ fontFamily: `'${font.family}'` }}>{font.name}</span><span className="font-note">{font.note}{font.source && <em>{font.source}</em>}</span></div><span className="radio-mark">{settings.fontId === font.id && <Check size={12} />}</span></button>)}</div>
        <RangeControl label="Guest name size" id="font-size" value={settings.fontSize} min={12} max={60} suffix="pt" onChange={(fontSize) => updateSettings({ fontSize })} />
        <p className="field-hint">One shared size for all names. Larger is lovelier; smaller saves sheets.</p>
        <span className="field-label colour-label">LETTERING COLOUR</span>
        <div className="color-options">{COLORS.map((color) => <button key={color.value} style={{ backgroundColor: color.value }} className={`color-swatch ${settings.color.toLowerCase() === color.value ? "selected" : ""}`} aria-label={`${color.name} lettering`} aria-pressed={settings.color.toLowerCase() === color.value} onClick={() => updateSettings({ color: color.value })}>{settings.color.toLowerCase() === color.value && <Check size={14} color={color.value === "#ffffff" || color.value === "#c6aa7b" ? "#24211e" : "#fff"} />}</button>)}<label className="custom-color" title="Choose any colour"><Plus size={15} /><input type="color" value={settings.color} aria-label="Custom lettering colour" onChange={(event) => updateSettings({ color: event.target.value })} /></label><span className="hex-color">{settings.color.toUpperCase()}</span></div>
        <span className="field-label">NAME STYLE</span><div className="segmented-control"><button className={settings.nameStyle === "single" ? "selected" : ""} onClick={() => updateSettings({ nameStyle: "single" })}>One line</button><button className={settings.nameStyle === "stacked" ? "selected" : ""} onClick={() => updateSettings({ nameStyle: "stacked" })}>Two lines</button></div>
        <div className="packing-heading"><Type size={15} /><span>THE TABLE HEADING</span></div>
        <label className="field-label" htmlFor="heading-font">HEADING FONT</label><div className="select-wrap"><select id="heading-font" value={settings.headingFontId} onChange={(event) => updateSettings({ headingFontId: event.target.value as Settings["headingFontId"] })}>{FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}</select><ChevronDown size={15} /></div>
        <RangeControl label="Table heading size" id="heading-size" value={settings.headingSize} min={16} max={100} suffix="pt" onChange={(headingSize) => updateSettings({ headingSize })} />
      </>}
      {tab === "glass" && <>
        <p className="eyebrow">03 / YOUR WEDDING WINDOW</p><h2>Let’s find the perfect fit.</h2><p className="section-description">Measure one glass pane. Use the visible glass inside the wooden frame.</p>
        <div className="dimension-fields"><NumberField id="pane-width" label="Pane width" value={settings.paneWidth} min={5} max={150} unit="cm" onChange={(paneWidth) => updateSettings({ paneWidth })} /><span className="dimension-times">×</span><NumberField id="pane-height" label="Pane height" value={settings.paneHeight} min={5} max={200} unit="cm" onChange={(paneHeight) => updateSettings({ paneHeight })} /></div>
        <NumberField id="pane-count" label="Number of glass panes" value={settings.paneCount} min={1} max={60} unit="panes" onChange={(paneCount) => updateSettings({ paneCount: Math.round(paneCount) })} />
        <p className="field-hint">Each table gets its own pane. Dimensions apply to all panes, with 1.5 cm of clear space around the lettering.</p>
        <RangeControl id="pane-spacing" label="Space between guests" value={settings.paneSpacing} min={2} max={20} suffix="mm" onChange={(paneSpacing) => updateSettings({ paneSpacing })} />
        <div className="packing-heading"><SlidersHorizontal size={15} /><span>A4 PRINT LAYOUT</span></div>
        <label htmlFor="arrangement" className="field-label">ARRANGE THE STICKERS</label><div className="select-wrap"><select id="arrangement" value={settings.arrangement} onChange={(event) => updateSettings({ arrangement: event.target.value as Settings["arrangement"] })}><option value="compact">Save paper · smart packing</option><option value="grid">Neat rows · equal columns</option></select><ChevronDown size={15} /></div>
        <RangeControl id="cutting-gap" label="Space for cutting" value={settings.gap} min={2} max={12} suffix="mm" onChange={(gap) => updateSettings({ gap })} />
        <RangeControl id="page-margin" label="A4 page margin" value={settings.margin} min={5} max={20} suffix="mm" onChange={(margin) => updateSettings({ margin })} />
      </>}
    </div>
    <div className="download-panel">
      <div className="download-summary"><div><span className="field-label">READY FOR YOUR PRINTER</span><p><strong>{props.sheets || "—"}</strong> A4 {props.sheets === 1 ? "sheet" : "sheets"}<span>for {props.guests} guests</span></p></div><span className={`ready-dot ${props.canExport ? "good" : ""}`} /></div>
      <div className="export-formats" role="group" aria-label="Download format"><button className={props.format === "svg" ? "selected" : ""} onClick={() => props.setFormat("svg")}><span>SVG</span><small>Vector · best quality</small></button><button className={props.format === "png" ? "selected" : ""} onClick={() => props.setFormat("png")}><span>PNG</span><small>Transparent · 300 DPI</small></button></div>
      <button className="primary-button download-button" disabled={!props.canExport || props.busy} onClick={props.download}>{props.busy ? <span className="button-spinner" /> : <ArrowDownToLine size={17} />}{props.busy ? "Creating your sheets…" : `Download ${props.sheets > 1 ? "all sheets" : "sheet"}`}</button>
      <p className="export-footnote" aria-live="polite">{props.busy ? props.progress : props.sheets > 1 ? "All sheets in one ZIP · transparent background" : "A4 actual size · transparent background"}</p>
    </div>
  </aside>;
}

function RangeControl({ id, label, value, min, max, suffix, onChange }: { id: string; label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="range-field"><div><label htmlFor={id}>{label}</label><output htmlFor={id}>{value} <span>{suffix}</span></output></div><input id={id} type="range" value={value} min={min} max={max} step={suffix === "pt" ? 0.1 : 1} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-progress": `${(value - min) / (max - min) * 100}%` } as React.CSSProperties} /></div>;
}

function NumberField({ id, label, value, min, max, unit, onChange }: { id: string; label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return <div className="number-field"><label htmlFor={id}>{label}</label><div><input id={id} type="number" min={min} max={max} step={unit === "cm" ? 0.5 : 1} value={value} onChange={(event) => { const number = event.target.valueAsNumber; if (Number.isFinite(number)) onChange(number); }} onBlur={() => onChange(Math.min(max, Math.max(min, value)))} /><span>{unit}</span></div></div>;
}
