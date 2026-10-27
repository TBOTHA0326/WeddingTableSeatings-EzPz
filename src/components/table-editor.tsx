"use client";

import { useRef, useState } from "react";
import { FileUp, Heart, Plus, Trash2, X } from "lucide-react";
import { EXAMPLE_TABLES, parseNames, type Table } from "@/lib/project";

type Props = { tables: Table[]; activeId: string; setActiveId: (id: string) => void; setTables: (tables: Table[]) => void; guests: number; ready: boolean; description: string; hint?: string };

// Shared by the seating window and the table pages: both edit the same saved tables.
export function TableEditor({ tables, activeId, setActiveId, setTables, guests, ready, description, hint }: Props) {
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
  return <>
        <div className="section-heading"><p className="eyebrow">01 / YOUR FAVOURITE PEOPLE</p><span className="count-badge">{guests} guests</span></div>
        <h2>A place for everyone.</h2><p className="section-description">{description}</p>
        <div className="table-selector" aria-label="Select a table">{tables.map((table) => <button key={table.id} className={table.id === active.id ? "table-chip selected" : "table-chip"} onClick={() => setActiveId(table.id)} aria-pressed={table.id === active.id}>Table {table.number || "?"}<span>{parseNames(table.names).length}</span></button>)}<button className="table-chip add-chip" onClick={addTable} disabled={tables.length >= 60 || !ready} aria-label="Add a table"><Plus size={15} /></button></div>
        <div className="table-editor-header"><label className="field-label" htmlFor="table-number">TABLE NUMBER</label><button className="text-button subtle" onClick={removeTable} aria-label={`Remove table ${active.number}`}><Trash2 size={13} />Remove</button></div>
        <input id="table-number" className="text-input table-number-input" value={active.number} maxLength={20} onChange={(event) => changeTable({ number: event.target.value })} disabled={!ready} />
        <div className="table-editor-header guest-label"><label className="field-label" htmlFor="guest-names">GUEST NAMES</label><button className="text-button" onClick={() => importRef.current?.click()} disabled={!ready}><FileUp size={13} />Import .txt</button></div>
        <textarea id="guest-names" spellCheck={false} className="names-input" value={active.names} onChange={(event) => changeTable({ names: event.target.value })} placeholder={"Amelia | van der Merwe\nOliver | Botha\nCharlotte | de Villiers"} disabled={!ready} aria-describedby="names-hint" />
        <input ref={importRef} type="file" accept=".txt,text/plain" className="sr-only" tabIndex={-1} onChange={(event) => void importNames(event.target.files?.[0])} />
        <p className="field-hint" id="names-hint">{hint ?? <>One guest per line. Use <span className="pipe-example">First name | Surname</span> to keep a surname together in the two-line style.</>}</p>
        {importError && <p className="inline-error" role="alert">{importError}</p>}
        {undo && <div className="undo-notice">Table removed.<button onClick={() => { setTables(undo); setActiveId(undo[0].id); setUndo(null); }}>Undo</button><button aria-label="Dismiss undo" onClick={() => setUndo(null)}><X size={12} /></button></div>}
        <div className="little-note"><Heart size={15} /><span>{tables.every((table) => EXAMPLE_TABLES.some((example) => example.id === table.id && example.names === table.names)) ? "A few example guests to get you started." : "Your guest list stays in this browser."}</span></div>
  </>;
}
