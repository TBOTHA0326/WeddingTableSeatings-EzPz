"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, Grid2X2, Plus, SlidersHorizontal, Type, Users } from "lucide-react";
import type { Settings, Table } from "@/lib/project";
import type { ExportFormat } from "@/lib/export";
import { FontSelect } from "./font-select";
import { TableEditor } from "./table-editor";

type Props = {
  tables: Table[]; activeId: string; setActiveId: (id: string) => void; setTables: (tables: Table[]) => void;
  settings: Settings; updateSettings: (settings: Partial<Settings>) => void;
  guests: number; sheets: number; paneFit: boolean; format: ExportFormat; setFormat: (format: ExportFormat) => void;
  canExport: boolean; busy: boolean; progress: string; download: () => void; ready: boolean;
};
export const COLORS = [{ name: "Ink", value: "#24211e" }, { name: "Camel", value: "#95724d" }, { name: "White", value: "#ffffff" }, { name: "Champagne", value: "#c6aa7b" }];

export function StudioControls(props: Props) {
  const { tables, activeId, setActiveId, setTables, settings, updateSettings } = props;
  const [tab, setTab] = useState<"tables" | "lettering" | "glass">("tables");
  return <aside className="controls-panel" aria-label="Wedding seating settings">
    <div className="control-tabs" role="tablist" aria-label="Studio settings">
      {([{ id: "tables", label: "Tables", Icon: Users }, { id: "lettering", label: "Lettering", Icon: Type }, { id: "glass", label: "Glass panes", Icon: Grid2X2 }] as const).map(({ id, label, Icon }) => <button key={id} role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { const tabs = ["tables", "lettering", "glass"] as const; const index = (tabs.indexOf(id) + (event.key === "ArrowRight" ? 1 : 2)) % 3; setTab(tabs[index]); document.getElementById(`tab-${tabs[index]}`)?.focus(); }
      }} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}
    </div>
    <div className="controls-body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === "tables" && <TableEditor tables={tables} activeId={activeId} setActiveId={setActiveId} setTables={setTables} guests={props.guests} ready={props.ready} description="One table per pane. A little love in every name." />}
      {tab === "lettering" && <>
        <p className="eyebrow">02 / MAKE IT FEEL LIKE YOU</p><h2>A lovely first impression.</h2>
        <p className="section-description">Pick the lettering for your special day.</p>
        <label className="field-label" htmlFor="name-font">NAME FONT</label><div className="select-wrap"><FontSelect id="name-font" value={settings.fontId} onChange={(fontId) => updateSettings({ fontId: fontId as Settings["fontId"] })} /><ChevronDown size={15} /></div>
        <RangeControl label="Guest name size" id="font-size" value={settings.fontSize} min={12} max={60} suffix="pt" onChange={(fontSize) => updateSettings({ fontSize })} />
        <p className="field-hint">One shared size for all names. Larger is lovelier; smaller saves sheets.</p>
        <span className="field-label colour-label">LETTERING COLOUR</span>
        <div className="color-options">{COLORS.map((color) => <button key={color.value} style={{ backgroundColor: color.value }} className={`color-swatch ${settings.color.toLowerCase() === color.value ? "selected" : ""}`} aria-label={`${color.name} lettering`} aria-pressed={settings.color.toLowerCase() === color.value} onClick={() => updateSettings({ color: color.value })}>{settings.color.toLowerCase() === color.value && <Check size={14} color={color.value === "#ffffff" || color.value === "#c6aa7b" ? "#24211e" : "#fff"} />}</button>)}<label className="custom-color" title="Choose any colour"><Plus size={15} /><input type="color" value={settings.color} aria-label="Custom lettering colour" onChange={(event) => updateSettings({ color: event.target.value })} /></label><span className="hex-color">{settings.color.toUpperCase()}</span></div>
        <span className="field-label">NAME STYLE</span><div className="segmented-control"><button className={settings.nameStyle === "single" ? "selected" : ""} onClick={() => updateSettings({ nameStyle: "single" })}>One line</button><button className={settings.nameStyle === "stacked" ? "selected" : ""} onClick={() => updateSettings({ nameStyle: "stacked" })}>Two lines</button></div>
        <div className="packing-heading"><Type size={15} /><span>THE TABLE HEADING</span></div>
        <label className="field-label" htmlFor="heading-font">HEADING FONT</label><div className="select-wrap"><FontSelect id="heading-font" value={settings.headingFontId} onChange={(headingFontId) => updateSettings({ headingFontId: headingFontId as Settings["headingFontId"] })} /><ChevronDown size={15} /></div>
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
