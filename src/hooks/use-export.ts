"use client";

import { useState } from "react";
import { exportSheets, type ExportFormat } from "@/lib/export";
import type { Sheet } from "@/lib/layout";

export function useExport() {
  const [format, setFormat] = useState<ExportFormat>("svg");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const download = async (pages: Sheet[], color: string, pageNumber?: number) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await exportSheets(pages, color, format, setProgress, pageNumber);
      setMessage({ text: `${pages.length === 1 ? "Your sheet is" : "Your sheets are"} ready. Happy wedding planning!`, error: false });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Download failed. Please try again.", error: true }); }
    finally { setBusy(false); setProgress(""); }
  };
  return { format, setFormat, busy, progress, message, setMessage, download };
}
