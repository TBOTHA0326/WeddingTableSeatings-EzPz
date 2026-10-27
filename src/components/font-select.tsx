import type { ReactNode } from "react";
import { FONT_CATEGORIES, FONTS } from "@/lib/project";

type Props = { id: string; value: string; onChange: (value: string) => void; disabled?: boolean; className?: string; children?: ReactNode };

// Grouped by style; the couple's own fonts lead their group.
export function FontSelect({ id, value, onChange, disabled, className, children }: Props) {
  return <select id={id} className={className} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
    {FONT_CATEGORIES.map((category) => <optgroup key={category.id} label={category.name}>
      {FONTS.filter((font) => font.category === category.id).map((font) => <option key={font.id} value={font.id}>{font.name}{"source" in font ? " · your font" : ""}</option>)}
    </optgroup>)}
    {children}
  </select>;
}
