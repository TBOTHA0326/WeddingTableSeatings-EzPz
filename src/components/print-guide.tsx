"use client";

import { useEffect, useRef } from "react";
import { Check, Download, Heart, X } from "lucide-react";
import { Bow } from "./bow";

export function PrintGuide({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="print-dialog" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="guide-title">
    <button className="icon-button modal-close" aria-label="Close print guide" onClick={onClose}><X size={20} /></button>
    <Bow className="guide-bow" />
    <p className="eyebrow">FROM SCREEN TO YOUR SPECIAL DAY</p>
    <h2 id="guide-title">A few lovely details.</h2>
    <p className="guide-intro">Your downloads are ready for your DTF printer. Here’s what to tell them.</p>
    <ol className="guide-list">
      <li><Download size={20} /><div><strong>Send the SVG if you can.</strong><p>The lettering is outlined, so the printer won’t need any fonts. PNG is also available at 300 DPI (2480 × 3508 px).</p></div></li>
      <li><Check size={20} /><div><strong>A4, at actual size.</strong><p>Ask for 210 × 297 mm at 100% scale. Both formats have transparent backgrounds. Preview borders, glass, and cutting guides are never printed.</p></div></li>
      <li><Heart size={20} /><div><strong>One table, one glass pane.</strong><p>The A4 sheets pack separate stickers to save paper. Use the glass preview to arrange them on each pane. Every guest name uses the same font size.</p></div></li>
    </ol>
    <div className="guide-note">Before printing the whole set, try one name on your glass. Check size and fine strokes with your printer, and let them handle any mirroring their transfer process needs.</div>
    <button className="primary-button" onClick={onClose}>Lovely, got it <Check size={16} /></button>
  </dialog>;
}
